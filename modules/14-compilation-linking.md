# M14 编译与链接

> 本模块把 ISO C 的翻译单元、声明、定义和链接属性与实际构建流程连接起来。学完后应能拆分多文件程序、解释常见链接诊断，并在明确的工具链环境下使用 GCC/Clang、MSVC、Make 或 CMake 构建 C11/C17 程序。

## E14.01 预处理、编译、汇编与链接流水线

- **标签**：`编译` `链接` `构建` `GCC` `Clang` `MSVC`
- **难度**：入门
- **前置**：E13.01
- **关联**：E14.02、E14.06

### 概念解释

常见本机工具链把源码依次处理为预处理结果、汇编代码、目标文件和可执行文件。ISO C 用“翻译阶段”规定源码语义，并不强制实现必须生成汇编或目标文件；实际工具命令是这些抽象阶段的常见实现方式。

预处理处理指令和宏，编译进行词法、语法、语义分析并生成代码，汇编生成目标文件，链接解析跨目标文件和库的符号并安排最终映像。理解阶段有助于判断一条诊断来自源码、单个目标文件还是符号组合。

### 语法要点

- 在 Linux、macOS 或 Windows 的 MinGW/Clang 命令行中，GCC/Clang 常用 `-E` 只做预处理、`-S` 生成汇编、`-c` 编译但不链接；输出名可用 `-o` 指定。
- 链接多个文件时，可把 `.c` 文件一次传给编译器驱动，也可先生成 `.o`/`.obj` 再链接。驱动会同时承担选项传递和库链接，不建议直接手工调用底层链接器，除非了解目标平台 ABI。
- `-std=c11` 或 `-std=c17` 是 GCC/Clang 的标准模式选项；`-Wall -Wextra -Wpedantic` 启用常用严格警告，但都不属于 ISO C 语法。
- MSVC 的 `cl` 使用 `/TC` 指定 C 源码、`/c` 只编译、`/std:c11` 或 `/std:c17` 选择相应标准模式；命令须在“Visual Studio 开发者命令提示符”或已初始化 MSVC 环境的终端运行。

### 使用场景

排查宏展开时查看预处理结果；排查单个源文件的类型错误时只编译；遇到“未定义引用”时重点检查链接输入和库顺序。若只是验证算法，通常直接一步构建即可，不必保存所有中间产物。

### 示例

`main.c`：

```c
#include <stdio.h>

#define MESSAGE "build pipeline"

int main(void)
{
    puts(MESSAGE);
    return 0;
}
```

以下命令适用于安装 GCC 或 Clang 的 Linux/macOS shell，以及使用相应 MinGW 工具链的 Windows shell：

```sh
cc -std=c17 -Wall -Wextra -Wpedantic -E main.c -o main.i
cc -std=c17 -Wall -Wextra -Wpedantic -S main.c -o main.s
cc -std=c17 -Wall -Wextra -Wpedantic -c main.c -o main.o
cc main.o -o main
./main
```

以下命令适用于已初始化环境的 Windows MSVC 开发者命令提示符，不适用于 POSIX shell：

```bat
cl /nologo /TC /std:c17 /W4 /c main.c
link main.obj /OUT:main.exe
main.exe
```

### 注意事项

- 把编译警告当作需要理解的诊断，不要用强制转换或关闭警告掩盖根因；修复后应重新完整构建。
- 中间文件后缀、目标文件格式和库搜索路径由工具链与平台决定，不是 ISO C 的可移植接口。
- 编译成功只说明当前翻译单元通过相应检查，不能证明链接成功，更不能证明程序没有未定义行为。

### 常见问题

**问：为什么 `gcc -c main.c` 成功，而完整构建却提示找不到函数？**

答：`-c` 只编译当前源文件，通常允许保留对外部函数的引用，不执行最终符号解析。完整构建会链接所有目标文件和库，若声明的函数没有定义、对象文件遗漏或库顺序错误，就会在此时失败。

## E14.02 翻译单元与外部符号可见性

- **标签**：`编译` `链接` `作用域` `声明与定义`
- **难度**：进阶
- **前置**：E14.01
- **关联**：E13.01、E14.03

### 概念解释

一个源文件及其递归包含的所有头文件，经条件编译后形成一个翻译单元。编译器通常分别处理翻译单元，再由链接器组合目标文件；因此某个 `.c` 文件中的局部修改不会自动改变其他翻译单元已经看到的声明。

文件作用域名称可以具有外部链接、内部链接或无链接。外部链接名称可被其他翻译单元引用，内部链接名称只在本翻译单元内可见，无链接名称只表示当前作用域中的对象或函数等实体。

### 语法要点

- 文件作用域的普通函数和变量定义默认具有外部链接；文件作用域用 `static` 修饰后具有内部链接。
- 一个翻译单元通过兼容声明引用另一个翻译单元的外部定义。声明与定义的链接属性、类型必须一致，否则程序行为可能未定义，链接器也未必能发现类型不匹配。
- 不同翻译单元中的内部链接同名对象或函数是不同实体；同名外部链接定义则通常冲突。
- 头文件的内容在包含处成为翻译单元的一部分，不是独立编译单元。`.c` 文件也不应通过 `#include` 拼成缺少边界设计的“大文件”。

### 使用场景

把公共接口放在一个头文件中，把只服务当前实现的辅助函数设为 `static`，既减少符号污染，也避免其他文件依赖私有细节。公共 API 与私有辅助函数混在同一外部命名空间时，应优先调整链接属性，而不是仅靠命名约定。

### 示例

`sum.h`：

```c
#ifndef SUM_H
#define SUM_H

int sum_positive(int left, int right);

#endif
```

`sum.c`：

```c
#include "sum.h"

#include <limits.h>

static int is_nonnegative(int value)
{
    return value >= 0;
}

int sum_positive(int left, int right)
{
    if (!is_nonnegative(left) || !is_nonnegative(right)) {
        return -1;
    }
    if (right > INT_MAX - left) {
        return -1;
    }
    return left + right;
}
```

`main.c`：

```c
#include "sum.h"

#include <stdio.h>

int main(void)
{
    int result = sum_positive(2, 3);

    if (result < 0) {
        return 1;
    }
    printf("%d\n", result);
    return 0;
}
```

此例在加法前检查 `INT_MAX` 边界，失败时返回 `-1`；`is_nonnegative` 只在 `sum.c` 的翻译单元可见。

### 注意事项

- 函数实现若仅当前文件使用，应显式写 `static`；否则它会占用外部符号名，并可能被意外链接调用。
- 修改头文件后，构建系统必须重新编译所有依赖它的翻译单元；不完整增量构建可能保留不兼容旧目标文件。
- 链接器通常只比较符号名而非完整 C 类型，跨文件声明一致性必须由头文件和编译检查保障。

### 常见问题

**问：另一个 `.c` 文件不能直接调用 `static` 函数，是否说明它没有被编译？**

答：不是。该函数仍可编译进所属目标文件，并能在本翻译单元内正常调用；`static` 限制的是链接可见性，不是“删除代码”或“禁止生成代码”。

## E14.03 声明、定义、extern 与 static

- **标签**：`声明与定义` `生命周期` `链接` `作用域`
- **难度**：进阶
- **前置**：E14.02
- **关联**：E13.01、E14.04、E14.05

### 概念解释

声明把名称及其类型介绍给编译器，定义还建立函数体或为对象分配存储；`extern` 与 `static` 控制链接属性或存储持续期，而不是简单的“全局开关”。正确拆分声明与定义，可让多个翻译单元共享同一实体，同时避免重复分配。

函数定义必须有函数体。对象定义会预留存储；文件作用域的 `extern int x;` 通常只是声明，`int x = 0;` 才是带初始化的定义。

### 语法要点

- 跨文件共享对象：头文件写 `extern int counter;`，且仅一个 `.c` 文件写 `int counter = 0;`。使用方不得再写另一个外部定义。
- 文件作用域 `static int hidden;` 定义内部链接对象，只在本翻译单元可见；文件作用域 `static` 函数同理。
- 块作用域 `static int calls;` 的对象具有静态存储持续期，但没有链接；它在程序执行期间只初始化一次，不与同名文件作用域对象自动共享。
- 函数原型中的形参 `static`（如数组参数边界语法）与链接属性无关；不要混淆同一关键字的不同语义。
- `extern` 声明与最终定义的类型必须兼容。不能在头文件声明 `extern int values[];`，却在某处定义不兼容类型。

### 使用场景

程序配置或统计对象需要跨文件访问时，用 `extern` 声明配合单一定义；当前模块私有缓存或辅助函数用文件作用域 `static`。若共享状态并非必要，优先通过函数参数和返回值传递，以降低耦合与并发风险。

### 示例

`counter.h`：

```c
#ifndef COUNTER_H
#define COUNTER_H

extern int counter;

void counter_increment(void);

#endif
```

`counter.c`：

```c
#include "counter.h"

int counter = 0;

static int internal_limit = 100;

void counter_increment(void)
{
    if (counter < internal_limit) {
        ++counter;
    }
}
```

`main.c`：

```c
#include "counter.h"

#include <stdio.h>

int main(void)
{
    counter_increment();
    counter_increment();
    printf("counter=%d\n", counter);
    return 0;
}
```

这里 `counter` 只有一个外部定义；`internal_limit` 是 `counter.c` 私有的内部链接对象。

### 注意事项

- 不要把“定义放在头文件”当成共享变量的捷径；include guard 无法阻止不同翻译单元各自定义同一外部符号。
- 可变的文件作用域对象会产生共享状态，多线程访问还需同步；`static` 本身不提供原子性或线程安全。
- 函数声明最好始终通过共同头文件共享，不要在使用处手写一份可能漂移的原型。

### 常见问题

**问：`static` 是否总表示变量只初始化一次？**

答：不是。块作用域对象的 `static` 表示静态存储持续期；文件作用域的 `static` 主要表示内部链接，而文件作用域对象本来就具有静态存储持续期。必须结合声明位置和对象/函数类别理解。

## E14.04 多文件项目的头文件组织

- **标签**：`头文件` `声明与定义` `构建` `可移植性`
- **难度**：工程
- **前置**：E13.01、E14.03
- **关联**：E14.02、E14.06、E15.01

### 概念解释

头文件是模块的编译期接口，应提供使用方所需的类型、宏和声明，同时隐藏实现细节。良好的头文件可独立包含、顺序不敏感、不会制造外部定义，并让每个实现文件明确包含自己依赖的接口。

组织头文件的目标不是尽量减少文件数，而是形成稳定的依赖方向：公共类型和契约在头中，函数体与私有状态在 `.c` 中。

### 语法要点

- 每个公共头文件使用唯一 include guard；内部使用什么标准类型，就直接包含定义该类型的最小标准头文件。
- 若接口只使用 `struct Item *`，可用 `struct Item;` 声明标签而无需暴露完整布局；若使用方需要按值创建对象，则必须提供完整定义。
- 公共函数原型应带参数类型，避免空参数列表 `int f();`；无参数写 `int f(void)`。
- 头文件可定义 `static inline` 函数，但应权衡代码体积、ABI 和实现暴露；普通非静态外部函数定义放在唯一 `.c` 文件中。
- 不需要在每个 `.c` 中重复 `extern` 声明，也不能靠包含顺序修补缺失类型。

### 使用场景

实现一个供多个源文件使用的缓冲区追加模块时，头文件公开容量、返回状态和函数原型，`.c` 文件包含格式化实现。若某个私有结构只被实现使用，就留在 `.c`，避免调用方依赖其布局。

### 示例

`text_buffer.h`：

```c
#ifndef TEXT_BUFFER_H
#define TEXT_BUFFER_H

#include <stddef.h>

int text_buffer_set(char *buffer, size_t capacity, const char *text);

#endif
```

`text_buffer.c`：

```c
#include "text_buffer.h"

#include <stdio.h>

int text_buffer_set(char *buffer, size_t capacity, const char *text)
{
    int written;

    if (buffer == NULL || text == NULL || capacity == 0) {
        return -1;
    }
    written = snprintf(buffer, capacity, "%s", text);
    if (written < 0 || (size_t)written >= capacity) {
        buffer[0] = '\0';
        return -1;
    }
    return 0;
}
```

`main.c`：

```c
#include "text_buffer.h"

#include <stdio.h>

int main(void)
{
    char buffer[16];

    if (text_buffer_set(buffer, sizeof buffer, "atlas") != 0) {
        fputs("text does not fit\n", stderr);
        return 1;
    }
    puts(buffer);
    return 0;
}
```

### 注意事项

- 公共函数契约要说明缓冲区是否始终 NUL 终止、失败后的对象状态及返回值含义，不能只靠实现偶然行为。
- 包含自身头文件应作为 `.c` 文件的前几项之一，可尽早发现头文件缺少依赖的问题。
- 前向声明不能用于需要对象大小的变量定义、按值参数定义或成员访问；不完整类型只在规则允许的上下文使用。

### 常见问题

**问：为什么 `text_buffer.c` 已经包含标准头文件，`main.c` 仍应包含模块头文件？**

答：标准头文件只提供库声明，不会自动提供项目模块接口。每个使用方必须看到自己调用函数的兼容原型；实现文件包含自身头文件还能让编译器核对原型与定义是否一致。

## E14.05 未定义引用、重复定义与库链接顺序

- **标签**：`链接` `构建` `错误处理` `GCC` `Clang`
- **难度**：工程
- **前置**：E14.02、E14.03
- **关联**：E14.04、E14.06、E15.04

### 概念解释

链接器把符号引用与定义配对。引用存在但找不到兼容定义时，常见诊断是“undefined reference/未定义引用”；同一外部符号出现多个强定义时，常见诊断是“multiple definition/重复定义”。错误文本因链接器而异，但排查都应从符号、输入对象和库顺序入手。

编译期“未声明”与链接期“未定义”不同：前者缺少可见声明，后者通常已有声明却缺少被链接的定义。

### 语法要点

- 未定义引用：检查实现文件是否参与构建、函数签名是否一致、定义是否被错误的条件编译排除，以及需要的库是否出现在链接命令中。
- 重复定义：检查头文件是否定义了普通外部函数或变量、同一 `.c` 是否被重复传给链接器、同一实现是否被多处 `#include`。
- GNU/Clang 常见静态库链接按从左到右解析未决引用，通常把依赖库放在使用它的对象之后，例如 `cc main.o -lm`。具体库语义由工具链文档规定。
- 仅声明为 `static` 的函数不能在另一翻译单元提供链接；应移除私有链接限制或把调用移到同一模块。
- C 与 C++ 混合链接还涉及语言链接和名称修饰，不能把 C++ 的 `extern "C"` 当作 ISO C 语法；本模块只讨论纯 C 构建。

### 使用场景

新增一个模块后若出现链接失败，先核对目标文件清单，再检查头文件与定义。数学函数在部分 Unix 工具链需要额外链接 `libm`，即使已经包含 `<math.h>`；头文件只提供声明，不会自动添加库。

### 示例

`answer.h`：

```c
#ifndef ANSWER_H
#define ANSWER_H

int get_answer(void);

#endif
```

`answer.c`：

```c
#include "answer.h"

int get_answer(void)
{
    return 42;
}
```

`main.c`：

```c
#include "answer.h"

#include <stdio.h>

int main(void)
{
    printf("%d\n", get_answer());
    return 0;
}
```

以下命令适用于 Linux/macOS 的 GCC/Clang 或 Windows MinGW 环境，它同时编译并链接两个实现文件：

```sh
cc -std=c17 -Wall -Wextra -Wpedantic main.c answer.c -o main
```

若只写 `cc main.c -o main`，在这些环境中通常会因缺少 `get_answer` 定义而链接失败。

### 注意事项

- 不要为消除重复定义而随意给一个冲突变量加 `static`；这会创建不同对象，可能改变程序语义。先确认应该共享还是各自独立。
- 不要通过复制函数原型修复未定义引用；原型只帮助编译，不会生成函数定义。
- 链接成功不验证跨语言 ABI 或不兼容声明，统一头文件仍是必要条件。

### 常见问题

**问：已经 `#include <math.h>`，为什么 GCC 链接 `sqrt` 仍可能失败？**

答：头文件只声明函数，不包含对应实现。许多 Unix-like 工具链把数学实现放在单独的 `libm` 中，需要在链接命令的对象文件之后添加 `-lm`；是否必须这样做取决于平台，不能推广为所有环境的固定要求。

## E14.06 使用 Make 或 CMake 管理构建

- **标签**：`构建` `编译` `链接` `Make` `CMake`
- **难度**：工程
- **前置**：E14.01、E14.04
- **关联**：E14.05、E16.03、E18.08

### 概念解释

构建系统记录源码、编译选项、头文件依赖和目标之间的关系，使重复构建一致且只重做必要工作。Make 直接描述规则与依赖，CMake 生成特定平台的原生构建文件；二者都不是 ISO C 的组成部分，但能把同一 C11/C17 项目交给不同工具链。

可维护的构建脚本至少应明确语言标准、目标源码、警告选项和头文件依赖，避免依赖开发者机器上的隐含状态。

### 语法要点

- Makefile 的规则形如 `target: prerequisites`，下一行命令必须以一个制表符开头；`CC`、`CFLAGS` 是常见变量约定。
- 对象规则应列出直接和间接头文件依赖。简单项目可显式列出，大型项目可用编译器自动生成依赖文件，但相关选项属于具体工具链。
- CMake 用 `add_executable` 定义目标，`target_compile_features(... c_std_11)` 或 `C_STANDARD` 属性要求标准；`C_EXTENSIONS NO` 禁止编译器扩展模式。
- CMake 的构建配置与生成器由命令行选择，Visual Studio、Ninja 和 Unix Makefiles 的行为不同；命令应在安装相应生成器的终端执行。

### 使用场景

两个以上翻译单元、需要稳定发布选项或多人协作时，构建脚本优于手敲长命令。单文件练习可用直接编译命令，但也应固定标准和警告选项。

### 示例

假设 `main.c`、`answer.c`、`answer.h` 与 E14.05 相同。以下 `Makefile` 适用于 GNU Make 和 GCC/Clang 风格编译器；命令行前缀必须是 Tab：

```make
CC = cc
CFLAGS = -std=c17 -Wall -Wextra -Wpedantic -O2

main: main.o answer.o
	$(CC) $(CFLAGS) main.o answer.o -o $@

main.o: main.c answer.h
	$(CC) $(CFLAGS) -c main.c -o $@

answer.o: answer.c answer.h
	$(CC) $(CFLAGS) -c answer.c -o $@
```

在 GNU Make 可用的 Linux/macOS shell 或 Windows MinGW/MSYS 环境中运行 `make`。下面是独立替代方案，不与上述 Makefile 同时必需：

```cmake
cmake_minimum_required(VERSION 3.21)
project(answer_demo LANGUAGES C)

add_executable(main main.c answer.c)
set_target_properties(main PROPERTIES
    C_STANDARD 17
    C_STANDARD_REQUIRED YES
    C_EXTENSIONS NO
)

if(CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(main PRIVATE -Wall -Wextra -Wpedantic)
elseif(MSVC)
    target_compile_options(main PRIVATE /W4)
endif()
```

CMake 命令适用于安装 CMake 3.16 或更新版本的平台；在源码目录外构建：

```sh
cmake -S . -B build
cmake --build build
```

### 注意事项

- 不要把绝对头文件路径、个人机器目录或某一编译器专有选项无条件写死；工具相关选项应按编译器能力配置。
- 发布构建与调试构建应通过明确配置区分；不要靠注释和取消注释多行命令切换。
- 清理规则会删除文件，执行前应确认目标目录只含构建产物；本例未提供破坏性清理命令。

### 常见问题

**问：CMake 中设置 `C_STANDARD 17` 后，是否就不需要检查编译器警告？**

答：不是。该属性控制请求的标准模式，并不启用全部严格诊断，也不保证代码无未定义行为。仍需设置合理警告、运行测试，并在关键配置中使用调试器或动态检查工具。
