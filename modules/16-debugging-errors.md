# M16 调试与错误处理

> 本模块建立从错误契约到故障定位的工程闭环。学完后应能设计返回值与 `errno` 的使用方式，区分断言和可恢复错误，在明确的平台环境中使用 GDB/LLDB、ASan/UBSan、Valgrind，并用日志、测试和防御式编程保留有效证据。

## E16.01 错误返回值、输出参数与 errno

- **标签**：`错误处理` `返回值` `输入验证` `stdlib`
- **难度**：进阶
- **前置**：E15.02
- **关联**：E15.01、E16.06、E18.06

### 概念解释

错误契约应同时回答“如何报告失败”“成功后结果在哪里”和“失败后对象处于什么状态”。C 项目常用状态返回值加输出参数，把正常结果与错误通道分开；`errno` 则是标准库和部分平台 API 使用的附加错误通道，不能替代函数自身返回值。

`errno` 是 `<errno.h>` 定义的宏，展开为可修改左值，并具有线程局部存储持续期。它只在接口文档规定的情形下有意义，不能把它当作每次调用都会自动清零的全局错误框。

### 语法要点

- 自定义函数可返回枚举状态，如 `PARSE_OK`、`PARSE_INVALID`、`PARSE_RANGE`；成功时才写输出参数。所有指针参数的有效性应在契约中说明。
- 对 `strtol` 等明确规定使用 `errno` 的接口，调用前写 `errno = 0`，再依据返回值、结束指针和 `errno == ERANGE` 综合判断。
- 标准库函数成功后可以保留或改变 `errno`，除非标准另有规定；因此不要在无关调用之后再读取它来解释早先错误。
- `strerror(errnum)` 返回错误消息字符串，调用方不得修改；返回存储可能被后续调用覆盖。`perror` 输出当前 `errno` 对应信息，但只有底层接口确实设置了它才有诊断意义。
- 返回码集合应稳定且互斥，不要一方面用负值表示错误，另一方面又允许负值成为成功结果而未说明区别。

### 使用场景

解析配置端口时，用状态枚举区分语法错误和范围错误，通过输出参数返回端口号。打开文件等接口若只保证返回空指针而未在 ISO C 中保证具体 `errno`，可移植代码不能把某个 `errno` 值当成标准保证；平台补充契约须明确标注。

### 示例

```c
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>

enum parse_status {
    PARSE_OK,
    PARSE_INVALID,
    PARSE_RANGE
};

static enum parse_status parse_port(const char *text, unsigned int *port)
{
    char *end;
    long value;

    if (text == NULL || port == NULL) {
        return PARSE_INVALID;
    }
    errno = 0;
    value = strtol(text, &end, 10);
    if (end == text || *end != '\0') {
        return PARSE_INVALID;
    }
    if (errno == ERANGE || value < 1 || value > 65535) {
        return PARSE_RANGE;
    }
    *port = (unsigned int)value;
    return PARSE_OK;
}

int main(int argc, char **argv)
{
    unsigned int port = 0;
    enum parse_status status;

    if (argc != 2) {
        fprintf(stderr, "usage: %s port\n", argv[0]);
        return 1;
    }
    status = parse_port(argv[1], &port);
    if (status == PARSE_INVALID) {
        fputs("port is not a decimal integer\n", stderr);
        return 1;
    }
    if (status == PARSE_RANGE) {
        fputs("port is outside 1..65535\n", stderr);
        return 1;
    }
    printf("port=%u\n", port);
    return 0;
}
```

### 注意事项

- 失败后是否修改输出参数必须固定；本例失败时保持 `port` 不变，调用方不应使用未确认的半成品。
- 若需要保留 `errno` 供后续报告，应在检测到失败后立即保存为 `int saved_errno = errno;`，避免日志函数等后续调用改变它。
- 不要把所有失败压缩成同一个 `-1`，否则调用方无法选择重试、提示输入或终止等不同策略。

### 常见问题

**问：为什么每次调用函数前都检查 `errno`，却发现它“无缘无故”非零？**

答：`errno` 可能由此前的库调用留下，成功调用通常不负责清零。只有某接口文档说明失败时会设置它，并且你已确认该调用失败，才应读取对应错误；需要检测范围时，在调用前主动置零。

## E16.02 用 assert 检查不变量而非处理输入

- **标签**：`assert` `调试` `测试` `错误处理`
- **难度**：入门
- **前置**：E15.06
- **关联**：E16.01、E16.06、E18.01

### 概念解释

调试断言把“若代码正确就绝不会发生”的条件变成即时故障点，使错误尽量靠近根因暴露。它与可恢复错误处理互补：外部数据非法是正常可能事件，内部不变量被破坏才适合断言。

断言失败后的终止是有意行为，目的是阻止损坏状态继续扩散；若应用必须清理资源或向用户返回错误，就不能只依赖断言。

### 语法要点

- 断言条件应是纯检查，不包含分配、输入、递增计数等必要副作用。
- 对公共函数的外部输入使用普通 `if` 和状态返回；对内部算法前提可加 `assert`，但不能因此省略公开边界检查。
- 在包含 `<assert.h>` 前定义 `NDEBUG` 会禁用运行时断言，因此测试覆盖和正确性不能依赖它一定执行。
- 调试构建可同时使用严格警告和动态检查；断言不会检查越界访问已经造成的内存破坏，也不能发现所有未定义行为。

### 使用场景

二分查找内部可断言 `low <= high`，链表插入后可断言新节点链接满足局部不变量。用户给出的索引、网络消息长度或分配结果则必须始终执行运行时验证。

### 示例

```c
#include <assert.h>
#include <stddef.h>
#include <stdio.h>

static size_t midpoint(size_t low, size_t high)
{
    assert(low <= high);
    return low + (high - low) / 2;
}

static int checked_midpoint(size_t low, size_t high, size_t *result)
{
    if (result == NULL || low > high) {
        return -1;
    }
    *result = midpoint(low, high);
    return 0;
}

int main(void)
{
    size_t result = 0;

    if (checked_midpoint(2, 8, &result) != 0) {
        fputs("invalid range\n", stderr);
        return 1;
    }
    printf("midpoint=%zu\n", result);
    return 0;
}
```

`low + (high - low) / 2` 避免了 `(low + high) / 2` 的无符号回绕；断言记录私有函数前提，公开包装仍执行完整检查。

### 注意事项

- 不要用断言检查 `malloc` 返回值后再解引用；发布构建中检查消失会留下空指针风险。
- 不要在断言里比较并同时推进迭代器，禁用后算法会改变；先执行操作，再单独断言结果。
- 断言消息通常不含丰富业务上下文，关键错误仍应记录输入、状态和错误码。

### 常见问题

**问：既然公开函数已经检查 `low > high`，内部再写 `assert(low <= high)` 是否重复？**

答：运行时检查是接口契约，断言则帮助重构时验证内部调用假设，两者目的不同。若断言与检查始终完全相同且没有诊断价值，可以简化；但不能只保留会随 `NDEBUG` 消失的断言。

## E16.03 GDB 与 LLDB 的断点、单步和调用栈

- **标签**：`调试` `GDB` `LLDB` `GCC` `Clang`
- **难度**：工程
- **前置**：E14.01
- **关联**：E16.04、E16.05、E18.08

### 概念解释

源码级调试器把机器执行位置映射回源码，让开发者暂停程序、检查变量、单步跟踪和查看调用栈。调试信息、适当优化级别和未剥离的符号表能提高可读性；崩溃后的首要证据通常是调用栈与当前帧，而不是立即修改代码碰运气。

GDB 与 LLDB 命令相似但不完全等价，所支持的目标文件、编译器和平台组合也不同。以下以本机命令行调试为例。

### 语法要点

- GDB 常用命令：`break main` 在函数设断点，`run` 启动，`next` 越过函数调用，`step` 进入函数，`print expression` 求值，`backtrace` 查看栈，`frame n` 切换帧，`continue` 继续。
- LLDB 对应命令：`breakpoint set --name main`，`run`，`next`，`step`，`frame variable` 查看局部变量，`bt` 查看栈，`frame select n` 切换帧。
- GDB 的 `print` 和 LLDB 的 `expression` 可能执行目标程序中的函数；检查时应避免引入额外副作用。
- 编译时使用 `-g -O0` 便于入门调试。`-O0` 不是发现错误的保证，优化构建也需测试；高优化下变量可能被优化掉或源码行映射交错。

### 使用场景

程序在特定索引附近崩溃时，在循环前设断点，检查索引、容量和指针，再单步观察首次异常状态。若崩溃只在优化版本发生，也可带调试信息编译优化版本，并结合 sanitizer，而不是只调试未优化版本。

### 示例

`main.c`：

```c
#include <stddef.h>
#include <stdio.h>

static int sum_values(const int *values, size_t count)
{
    int total = 0;
    size_t index;

    for (index = 0; index < count; ++index) {
        total += values[index];
    }
    return total;
}

int main(void)
{
    int values[] = {2, 4, 6, 8};
    int total = sum_values(values, sizeof values / sizeof values[0]);

    printf("total=%d\n", total);
    return 0;
}
```

以下构建命令适用于 Linux/macOS 的 GCC/Clang 或 Windows MinGW 环境：

```sh
cc -std=c17 -g -O0 -Wall -Wextra -Wpedantic main.c -o main
```

GDB 会话（适用于已安装 GDB 且支持该目标程序的终端）：

```text
gdb ./main
break sum_values
run
next
print index
print count
backtrace
continue
quit
```

LLDB 会话（适用于已安装 LLDB 的终端，macOS 上尤为常见）：

```text
lldb ./main
breakpoint set --name sum_values
run
next
frame variable
bt
continue
quit
```

### 注意事项

- 上述 `cc` 命令不生成 MSVC 的 PDB 调试工作流；MSVC 应使用其支持的调试器和 `/Zi` 等选项，不应假设 GDB 能直接处理所有 MSVC 产物。
- 调试器显示的值只在当前程序状态有效；若已发生未定义行为，栈和变量信息本身也可能受损。
- 不要在交互表达式中随意调用会写内存或等待输入的函数，否则可能改变被调试问题。

### 常见问题

**问：为什么优化构建中 `print variable` 显示变量已优化掉？**

答：优化器可能把值保留在寄存器、合并表达式或完全消除对象，调试信息未必能重建源码级视图。可使用 `-g` 保留信息并临时降低优化复现，同时保留对原优化配置的测试，因为故障可能只在优化后出现。

## E16.04 ASan 与 UBSan 动态插桩检查

- **标签**：`调试` `ASan` `UBSan` `未定义行为` `越界` `GCC`
- **难度**：工程
- **前置**：E16.03
- **关联**：E16.05、E18.01、E18.03

### 概念解释

AddressSanitizer（ASan）在内存访问与分配周围插入运行时检查，用于发现多种越界、释放后使用和双重释放；UndefinedBehaviorSanitizer（UBSan）在特定运算处检查有符号溢出、无效移位等未定义行为。二者属于编译器与运行时工具，不是 ISO C 标准库，也不能证明程序完全无错误。

插桩会增加运行开销并改变内存布局。检查报告应结合栈、输入和源码分析，不能因“加了工具仍运行”就忽略已经报告的违规。

### 语法要点

- GCC/Clang 常用 `-fsanitize=address`、`-fsanitize=undefined` 或逗号组合 `-fsanitize=address,undefined`；编译和最终链接都要带相同 sanitizer 选项，以链接对应运行时。
- `-g` 保留源码位置，`-O1` 在可调试性与优化场景间折中，`-fno-omit-frame-pointer` 常改善栈展开。
- GCC/Clang 的 `-fno-sanitize-recover=undefined` 可让支持的 UBSan 检查在报告后终止，适合测试失败即退出的场景；具体行为按工具链文档确认。
- ASan 的泄漏检测依赖目标平台和运行时支持，不能把某平台的 `ASAN_OPTIONS` 行为当作跨平台保证。

### 使用场景

单元测试和模糊测试构建中启用 ASan+UBSan，可在靠近故障点发现内存与算术违规。发布性能测试应使用正常构建；sanitizer 构建的时序和内存开销不代表发布性能。

### 示例

`main.c` 使用安全的分配与访问路径：

```c
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    size_t count = 4;
    int *values = malloc(count * sizeof *values);
    size_t index;

    if (values == NULL) {
        fputs("allocation failed\n", stderr);
        return 1;
    }
    for (index = 0; index < count; ++index) {
        values[index] = (int)(index + 1);
    }
    printf("last=%d\n", values[count - 1]);
    free(values);
    return 0;
}
```

以下命令适用于支持这些 sanitizer 的 Linux GCC/Clang 环境；其他操作系统和目标需先查工具链支持矩阵：

```sh
cc -std=c17 -g -O1 -fno-omit-frame-pointer \
   -fsanitize=address,undefined -fno-sanitize-recover=undefined \
   main.c -o main
./main
```

### 注意事项

- 不要把 sanitizer 报告当成建议；它通常表示已发生真实违规，即使程序表面上继续运行，也应修复根因并添加回归测试。
- ASan 不一定发现所有越界逻辑错误，UBSan 也不覆盖所有标准未定义行为，例如所有生命周期违规或数据竞争。
- 通常不要把 ASan 插桩程序再放进 Valgrind 做同一轮检查；两套运行时可能相互干扰，应分别建立独立构建。

### 常见问题

**问：普通测试都通过，为什么还需要 ASan/UBSan？**

答：普通断言只验证预期结果，越界或溢出可能暂时没有可见影响。插桩能把部分隐藏违规在发生位置报告出来；但测试仍须覆盖边界输入，因为工具只能检查实际执行到的路径。

## E16.05 Valgrind Memcheck 内存与泄漏检查

- **标签**：`调试` `Valgrind` `动态内存` `内存泄漏` `未初始化`
- **难度**：工程
- **前置**：E16.03
- **关联**：M11 内存管理、E16.04、E18.03

### 概念解释

Valgrind Memcheck 在动态二进制检测框架中跟踪内存有效性和已定义性，可报告非法读写、未初始化值参与关键操作、双重释放和泄漏。它与源码插桩 sanitizer 的机制不同，通常无需给源码添加检测选项，但运行速度会显著下降。

Memcheck 的报告需要结合分配栈与访问栈解读；“still reachable”等泄漏类别也要按程序生命周期判断，而不是把所有输出机械视为同一种错误。

### 语法要点

- 常用命令为 `valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all --track-origins=yes ./program`。
- `--error-exitcode=1` 可让检测到错误时以指定非零状态退出，便于自动化测试；程序自身退出状态与工具错误状态需按配置区分。
- `--track-origins=yes` 跟踪未初始化值来源，会增加开销；`--leak-check=full` 显示每类泄漏的详细信息。
- Valgrind 的平台与目标架构支持有限。以下以受支持的 Linux 环境为例，不把它描述为原生 Windows 或所有 macOS 版本的通用工具。

### 使用场景

当释放后使用、未初始化分支或泄漏难以从普通测试定位时，用最小输入在 Memcheck 下重现。若项目已有 ASan 构建，应使用未插桩的独立二进制运行 Valgrind。

### 示例

`main.c`：

```c
#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    int *value = malloc(sizeof *value);

    if (value == NULL) {
        fputs("allocation failed\n", stderr);
        return 1;
    }
    *value = 42;
    printf("value=%d\n", *value);
    free(value);
    value = NULL;
    return 0;
}
```

在受支持的 Linux x86-64 等 Valgrind 环境中，先正常编译，再执行：

```sh
cc -std=c17 -g -O0 -Wall -Wextra -Wpedantic main.c -o main
valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all \
  --track-origins=yes --error-exitcode=1 ./main
```

### 注意事项

- Memcheck 不一定理解所有自定义分配器、内联汇编或特殊内存映射，相关误报/漏报需结合平台文档分析；不能用 suppression 文件掩盖未理解的错误。
- 程序结束前的可达全局缓存不一定需要立即释放，但长期服务中持续增长的不可达对象通常是实质泄漏。
- 检测工具无法证明未执行路径正确，应为失败分配、空输入和边界容量增加测试。

### 常见问题

**问：Valgrind 显示“没有泄漏”，是否说明内存管理完全正确？**

答：不能。它只说明本次执行和当前检测能力下没有发现相应问题；未执行的错误路径、逻辑上的所有权错误、某些生命周期问题仍可能存在。还要覆盖失败路径并结合代码审查和其他工具。

## E16.06 日志、回归测试与防御式编程

- **标签**：`调试` `测试` `错误处理` `输入验证` `边界检查`
- **难度**：工程
- **前置**：E16.01、E16.02
- **关联**：E13.05、E15.06、E18.08

### 概念解释

日志记录运行证据，回归测试验证修复后故障不再出现，防御式编程在系统边界拒绝无法处理的数据。三者应围绕同一错误契约协作：检查失败产生明确状态，日志保留上下文，测试同时覆盖成功与失败路径。

防御式编程不是在每层重复所有检查，也不是捕获错误后继续假装成功；它要求在信任边界验证输入，在内部保持清晰不变量，并尽早停止不可恢复的操作。

### 语法要点

- 日志至少包含事件、相关标识和错误码；必要时使用 `__FILE__`、`__LINE__`、`__func__`，但不要记录口令、密钥或不必要的个人数据。
- 错误日志通常写入 `stderr`，正常结果写入 `stdout`。日志 I/O 也可能失败，关键业务不能假设日志一定成功落盘。
- 测试判定必须始终生效，不能只用会被 `NDEBUG` 禁用的 `assert`。每个缺陷修复应添加能区分修复前后的最小用例。
- 公共函数验证空指针、容量、除零和算术边界；私有函数可用断言补充不变量。失败时保持输出对象不变或文档化其状态。
- 资源清理应沿单一明确路径执行，避免每个错误分支复制不完整的释放序列。

### 使用场景

实现除法模块时，在边界拒绝空输出指针、除零和 `INT_MIN / -1`，用状态码返回失败；调用方记录输入与状态，测试验证三种失败及一个成功案例。若失败不可恢复，应停止当前操作，而非写入任意默认值。

### 示例

```c
#include <limits.h>
#include <stdio.h>

enum divide_status {
    DIVIDE_OK,
    DIVIDE_INVALID,
    DIVIDE_OVERFLOW
};

static enum divide_status checked_divide(int left, int right, int *result)
{
    if (result == NULL || right == 0) {
        return DIVIDE_INVALID;
    }
    if (left == INT_MIN && right == -1) {
        return DIVIDE_OVERFLOW;
    }
    *result = left / right;
    return DIVIDE_OK;
}

static int run_tests(void)
{
    int result = 123;

    if (checked_divide(12, 3, &result) != DIVIDE_OK || result != 4) {
        fputs("test failed: normal division\n", stderr);
        return -1;
    }
    if (checked_divide(1, 0, &result) != DIVIDE_INVALID || result != 4) {
        fputs("test failed: zero divisor\n", stderr);
        return -1;
    }
    if (checked_divide(INT_MIN, -1, &result) != DIVIDE_OVERFLOW || result != 4) {
        fputs("test failed: overflow\n", stderr);
        return -1;
    }
    return 0;
}

int main(void)
{
    if (run_tests() != 0) {
        return 1;
    }
    puts("all tests passed");
    return 0;
}
```

### 注意事项

- 不要用“测试通过”替代发布构建验证；至少测试调试与发布配置，并让失败用例在 CI 或本地脚本中返回非零状态。
- 日志时间戳、线程标识等属于平台或应用机制，ISO C 不自动提供完整日志框架；引入平台接口时应明确标注。
- 失败后的输出保持不变是便于测试的契约之一，但若函数可能部分写入缓冲区，就必须明确说明，不能虚假保证原子性。

### 常见问题

**问：防御式编程是否意味着每个函数都检查所有指针和整数范围？**

答：不是。系统边界和公共接口必须验证不可信输入，私有内部函数可依赖已建立的不变量并用断言辅助。重复无差别检查会模糊责任；应先规定谁验证、失败如何传播、对象失败后是什么状态。
