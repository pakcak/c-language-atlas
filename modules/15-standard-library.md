# M15 标准库常用功能

> 本模块按 ISO C11/C17 梳理常用标准库的接口契约，而不只罗列函数名。学完后应能正确检查格式化 I/O、数值转换、动态内存、字符串与字符处理、数学与时间接口的返回值，并区分运行时断言、编译期断言和可移植整数类型。

## E15.01 stdio 格式化输出与行输入

- **标签**：`stdio` `文件` `输入验证` `错误处理`
- **难度**：入门
- **前置**：无
- **关联**：M12 文件操作、E15.03、E16.01、E18.06

### 概念解释

`<stdio.h>` 通过流提供格式化与字符 I/O。接口契约的核心是：格式串决定参数类型，输出长度必须受目标容量约束，输入成功、文件结束和 I/O 错误必须分别处理。返回“看起来正常”的文本并不能替代返回值检查。

标准流 `stdin`、`stdout`、`stderr` 已由宿主环境提供；文件流还涉及打开与关闭，详见 M12。

### 语法要点

- `int printf(const char *restrict format, ...);` 返回写出的字符数，输出或编码失败时返回负值。`fprintf(FILE *restrict stream, const char *restrict format, ...)` 还可指定流。
- `int snprintf(char *restrict s, size_t n, const char *restrict format, ...);` 最多写入 `n-1` 个字符并在 `n > 0` 时写 NUL。返回值是未截断时本应写出的字符数，不含 NUL；负值表示编码等错误。若 `result >= 0` 且 `(size_t)result >= n`，输出被截断。
- `char *fgets(char *restrict s, int n, FILE *restrict stream);` 最多读取 `n-1` 个字符并追加 NUL，成功返回 `s`，读到换行会保留换行；失败或开始即文件结束返回空指针。用 `ferror` 与 `feof` 区分原因。
- 格式与实参必须匹配：`int` 用 `%d`，`size_t` 用 `%zu`，`double` 在 `printf` 中用 `%f`。默认参数提升后仍不匹配的格式转换通常导致未定义行为。
- `fread`/`fwrite` 返回完整元素数而非字节数；短计数需要检查流状态。不要仅因返回值小于请求量就断定发生了同一种错误。

### 使用场景

用 `snprintf` 组装固定容量诊断文本，用 `fgets` 读取一行后再做完整解析。格式串来自不可信输入、需要无界输入或调用方无法提供容量时，不应直接套用这些接口；尤其绝不能把用户字符串当作 `printf` 的格式串。

### 示例

```c
#include <stdio.h>

int main(void)
{
    char line[64];
    char message[96];
    int length;

    if (fgets(line, sizeof line, stdin) == NULL) {
        if (ferror(stdin)) {
            fputs("input error\n", stderr);
        } else {
            fputs("no input\n", stderr);
        }
        return 1;
    }

    length = snprintf(message, sizeof message, "received: %s", line);
    if (length < 0) {
        fputs("formatting error\n", stderr);
        return 1;
    }
    if ((size_t)length >= sizeof message) {
        fputs("formatted message was truncated\n", stderr);
        return 1;
    }
    if (fputs(message, stdout) == EOF) {
        fputs("output error\n", stderr);
        return 1;
    }
    return 0;
}
```

### 注意事项

- `fgets` 返回成功不代表读到了整行；若缓冲区中没有换行且尚未到文件尾，可能只读到一段，后续协议解析要处理长行。
- `snprintf` 的容量是 `size_t`，返回值是 `int`；只有确认非负后再转换比较，避免负值转换成大无符号数。
- 对同一流进行多线程操作前须查阅实现文档并同步；不要假设所有标准 I/O 调用在你的平台上都自动满足应用级原子输出。

### 常见问题

**问：`snprintf` 返回目标缓冲区实际写入的字符数吗？**

答：不是。它返回若容量充足本应写出的字符数，不包含终止 NUL。因此返回值等于或大于容量恰好表示截断；用它推进缓冲区指针前必须先检查，否则会越界。

## E15.02 stdlib 数值转换与动态内存

- **标签**：`stdlib` `动态内存` `输入验证` `资源释放` `错误处理`
- **难度**：进阶
- **前置**：E15.01
- **关联**：M11 内存管理、E16.01、E18.03

### 概念解释

`<stdlib.h>` 同时提供字符串到数值的转换和堆内存管理。这些接口都把失败作为正常可能结果：`strtol` 需要区分无数字、越界和尾随字符，分配函数需要检查空指针并明确所有权，不能靠值恰好为零或程序通常不失败来省略检查。

转换和分配经常串联出现：先验证用户给出的数量，再检查乘法是否超过 `SIZE_MAX`，最后分配并在所有退出路径释放。

### 语法要点

- `long strtol(const char *restrict nptr, char **restrict endptr, int base);` 的 `base` 为 `0` 或 `2` 到 `36`。`base == 0` 会按前缀推断进制；只接受十进制时明确传 `10`。
- 调用前把 `errno` 置 `0`。成功后 `endptr` 指向第一个未转换字符；`end == nptr` 表示没有数字，`errno == ERANGE` 表示结果超出 `long` 范围，仍需检查 `*end` 是否允许。
- `void *malloc(size_t size);` 分配未初始化存储；`void *calloc(size_t nmemb, size_t size);` 分配并清零全部字节；两者失败返回空指针。大小为零时的返回行为由实现规则决定，不应依赖解引用。
- `void *realloc(void *ptr, size_t size);` 失败时返回空指针且原对象仍有效，因此应把结果先存到临时指针。`free(ptr)` 释放不再需要的对象，`free(NULL)` 无操作。
- `atoi` 无法可靠报告越界和无数字，不应代替需要严格输入验证的 `strtol`。

### 使用场景

命令行参数表示数组元素数量时，先完整转换并限制业务上限，再做分配。若输入可能为空、含尾随字母或超出范围，严格转换比 `atoi` 更合适；若不能承担内存失败处理，就不应隐藏分配失败。

### 示例

```c
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv)
{
    char *end;
    long parsed;
    size_t count;
    int *items;
    size_t index;

    if (argc != 2) {
        fprintf(stderr, "usage: %s count\n", argv[0]);
        return 1;
    }

    errno = 0;
    parsed = strtol(argv[1], &end, 10);
    if (end == argv[1] || *end != '\0' || errno == ERANGE || parsed <= 0) {
        fputs("count must be a positive decimal integer\n", stderr);
        return 1;
    }

    count = (size_t)parsed;
    if ((long)count != parsed || count > SIZE_MAX / sizeof *items) {
        fputs("count is too large\n", stderr);
        return 1;
    }
    items = calloc(count, sizeof *items);
    if (items == NULL) {
        fputs("allocation failed\n", stderr);
        return 1;
    }

    for (index = 0; index < count; ++index) {
        items[index] = (int)(index % 10U);
    }
    printf("allocated %zu items; last=%d\n", count, items[count - 1]);
    free(items);
    return 0;
}
```

### 注意事项

- `realloc` 不应写成 `p = realloc(p, n)` 而不留旧指针；失败时会丢失唯一所有权并泄漏。可移植代码也避免用 `realloc(p, 0)` 充当统一释放接口，直接使用 `free` 更清晰。
- `calloc` 会检查其元素大小的乘积是否可表示，但调用方传入的数量仍须符合业务边界；`malloc(count * size)` 则必须先自行检查乘法溢出。
- `strtol` 成功转成 `long` 不代表能安全转成更窄类型；还需与目标类型上下界比较。

### 常见问题

**问：`strtol` 没有设置 `ERANGE`，就可以直接把结果赋给 `int` 吗？**

答：不可以。`ERANGE` 只说明是否超出 `long` 的范围，不说明是否超出 `int`。必须再与 `INT_MIN`、`INT_MAX` 比较，或在目标是无符号类型时先拒绝负数并检查上限。

## E15.03 string 与 ctype 的字符串和字符契约

- **标签**：`string` `ctype` `字符串` `边界检查` `未定义行为`
- **难度**：进阶
- **前置**：E15.01
- **关联**：E18.02、E18.05

### 概念解释

`<string.h>` 的字符串函数通常以 NUL 终止为前提，内存函数则按显式字节数工作；`<ctype.h>` 按当前 locale 对单字节字符分类和转换。安全使用的关键是明确“长度是否含 NUL”“区域是否重叠”以及“传入字符分类宏的整数是否可表示为 `unsigned char`”。

`strcpy`、`strcat` 不接收目标容量，无法从接口上防止溢出；`strncpy` 又有固定宽度填充与可能不终止的语义，不是通用的安全替代品。

### 语法要点

- `size_t strlen(const char *s);` 返回首个 NUL 前的字符数，不含 NUL；若指针无效或范围内没有 NUL，行为未定义。
- `int strcmp(const char *s1, const char *s2);` 只保证小于、等于或大于零，不保证返回 `-1`、`0`、`1`。
- `void *memcpy(void *restrict s1, const void *restrict s2, size_t n);` 要求区域不重叠；可能重叠时使用 `void *memmove(void *s1, const void *s2, size_t n);`。二者都按字节数而非元素数计数。
- `isdigit`、`isspace`、`toupper` 等 `<ctype.h>` 接口的参数必须是 `EOF` 或可表示为 `unsigned char` 的值。普通 `char` 若为负，直接传入会产生未定义行为，应先转换。
- 字符分类受当前 C locale 影响；程序启动时默认处于 `"C"` locale，调用 `setlocale` 后结果可能改变。它们不是完整的 Unicode 分类接口。

### 使用场景

读取一行后去掉换行、检查标识符是否全为十进制数字，或在同一数组内移动一段字节时分别使用 `strcspn`、`isdigit` 和 `memmove`。处理多字节 UTF-8 的字符语义时，不应把每个字节当作独立 Unicode 字符。

### 示例

```c
#include <ctype.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
    char text[64];
    size_t length;
    size_t index;

    if (fgets(text, sizeof text, stdin) == NULL) {
        fputs("input failed\n", stderr);
        return 1;
    }
    text[strcspn(text, "\n")] = '\0';

    length = strlen(text);
    if (length == 0) {
        fputs("empty input\n", stderr);
        return 1;
    }
    for (index = 0; index < length; ++index) {
        unsigned char ch = (unsigned char)text[index];

        if (!isdigit(ch)) {
            fputs("input is not all digits\n", stderr);
            return 1;
        }
    }

    printf("digits: %s, length=%zu\n", text, length);
    return 0;
}
```

### 注意事项

- 复制字符串前必须确认目标容量至少为源长度加一；没有容量信息时，不要调用 `strcpy` 或 `strcat`。
- 即使字节数为零，也应遵守标准库对指针参数的有效性要求，不把空指针当作通用“空区间”传入。
- `toupper`/`tolower` 的返回值若不代表普通字符，可能为 `EOF`；需要存入 `char` 时先确认结果适合目标类型。

### 常见问题

**问：为什么 `isdigit(text[i])` 在某些输入下会被调试工具报告错误？**

答：若 `char` 有符号且字节值超过其正数范围，`text[i]` 会是负值；除 `EOF` 外，负值不满足 `<ctype.h>` 参数契约。应写 `isdigit((unsigned char)text[i])`，并确认输入确实采用单字节分类语义。

## E15.04 math 数学函数与 stdint 整数类型

- **标签**：`math` `整数` `浮点数` `可移植性` `实现定义`
- **难度**：进阶
- **前置**：无
- **关联**：E15.02、E16.01、E18.04

### 概念解释

`<math.h>` 提供浮点数学函数、分类宏和错误报告机制；`<stdint.h>` 提供具有明确宽度或最小宽度的整数类型及边界宏。二者都强调“结果必须有定义且能表示”：数学域错误不能靠打印 NaN 掩盖，精确宽度类型也不能假设在所有实现上都存在。

`int32_t` 等精确宽度类型是可选的，只有实现提供完全匹配的无填充、补码相应类型时才定义；`int_least32_t`、`int_fast32_t` 则表达不同选择目标。

### 语法要点

- `double sqrt(double x);` 对负数通常发生域错误；`double pow(double x, double y);` 的定义域与参数组合有关。`isfinite(x)`、`isnan(x)` 等分类宏可检查浮点类别。
- `<math.h>` 的数学错误可通过 `errno`、浮点异常或两者报告，取决于 `math_errhandling` 与 `MATH_ERRNO`、`MATH_ERREXCEPT`。调用方应按实现支持的方式检查，不能假设每次域错误都设置 `errno`。
- `intN_t`/`uintN_t` 表示精确 `N` 位类型（若提供），`int_leastN_t` 表示至少 `N` 位的最小类型，`int_fastN_t` 表示面向速度选择的至少 `N` 位类型。
- `SIZE_MAX`、`UINT32_MAX` 等边界宏只有在相应类型可用时适用；`UINT32_C(...)` 等宏生成适合最小宽度类型的常量。
- `<inttypes.h>` 的 `PRId32`、`PRIuLEAST32` 等格式宏与相应类型配套，不应凭平台经验把窄整数格式写死为 `%d` 或 `%u`。

### 使用场景

协议字段要求固定位宽时选择相应的精确宽度类型，普通数组索引仍优先使用 `size_t`。数学计算前检查定义域，计算后按算法需要检查有限性；在 Unix-like GCC/Clang 环境使用数学库时，可能还需单独链接 `libm`。

### 示例

```c
#include <inttypes.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>

int main(void)
{
    uint_least32_t value = UINT32_C(4000000000);
    double input = 2.0;
    double result = sqrt(input);

    if (!isfinite(result)) {
        fputs("square root is not finite\n", stderr);
        return 1;
    }
    printf("value=%" PRIuLEAST32 ", sqrt=%.17g\n", value, result);
    return 0;
}
```

以下命令仅适用于需要单独数学库的 GCC/Clang Unix-like 环境；库放在对象/源码之后：

```sh
cc -std=c17 -Wall -Wextra -Wpedantic main.c -lm -o main
```

### 注意事项

- 不要把浮点“返回了一个值”视为成功；域错误、溢出和无穷结果需要按接口契约及算法要求检查。
- 固定位宽不等于可任意进行整数运算，溢出、转换和格式化规则仍适用；有符号整数溢出仍是未定义行为。
- `fast` 类型不保证每次都快，`least` 类型也不保证恰好指定位数；可移植性与性能目标应通过目标平台测量验证。

### 常见问题

**问：为什么不能保证每台支持 C17 的机器都有 `uint64_t`？**

答：ISO C 把精确宽度类型定义为可选，因为某些实现的字长、填充位或表示方式无法提供完全匹配的类型。要求可移植时可使用 `uint_least64_t`，协议序列化则还需另外处理字节序，不能只靠类型宽度。

## E15.05 time 日历时间与处理器时间

- **标签**：`time` `性能` `可移植性` `可重入`
- **难度**：进阶
- **前置**：无
- **关联**：E15.04、E16.06、E18.07

### 概念解释

`<time.h>` 区分日历时间与处理器时间：`time` 获取当前日历时间，`clock` 估计程序消耗的处理器时间。两者的类型、精度和起点不同，不能都用简单的整数减法或除以固定常数来互换。

`struct tm` 把日历时间拆成年月日等字段，`gmtime` 和 `localtime` 分别转换到 UTC 与本地时区；格式化输出由 `strftime` 完成。

### 语法要点

- `time_t time(time_t *timer);` 失败返回 `(time_t)-1`。`time_t` 是可表示时间的算术类型，其编码与精度由实现决定。
- `double difftime(time_t time1, time_t time0);` 返回以秒为单位的差值，是相比直接整数减法更可移植的时间差接口。
- `clock_t clock(void);` 返回程序使用的处理器时间，失败返回 `(clock_t)-1`。若可表示，除以 `CLOCKS_PER_SEC` 得到秒数；等待 I/O 的时间通常不计入处理器时间。
- `struct tm *gmtime(const time_t *timer);` 与 `localtime` 可能返回指向静态存储对象的指针，后续调用会覆盖内容；失败返回空指针。不要把返回对象长期保存而不复制。
- `size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);` 返回写入字符数（不含 NUL），结果无法容纳时返回 `0`；`0` 也可能是某些格式产生的空结果，格式化契约需明确。

### 使用场景

记录日志日期用 `time` 加 `gmtime`/`localtime`，测量纯计算消耗的 CPU 时间可用 `clock`。测量真实经过时间、实现高精度计时器或单调超时时，ISO C 的这些接口通常不够，应使用明确标注平台的单调时钟 API。

### 示例

```c
#include <stdio.h>
#include <time.h>

int main(void)
{
    time_t now = time(NULL);
    struct tm *utc;
    char text[32];

    if (now == (time_t)-1) {
        fputs("calendar time unavailable\n", stderr);
        return 1;
    }
    utc = gmtime(&now);
    if (utc == NULL) {
        fputs("UTC conversion failed\n", stderr);
        return 1;
    }
    if (strftime(text, sizeof text, "%Y-%m-%dT%H:%M:%SZ", utc) == 0) {
        fputs("time formatting failed\n", stderr);
        return 1;
    }
    puts(text);
    return 0;
}
```

### 注意事项

- `localtime` 的结果受时区与夏令时规则影响， UTC 格式化才适合本例末尾字面量 `Z`；不能把本地时间错误标记成 UTC。
- `gmtime`、`localtime` 的共享静态对象不应被并发无同步使用；POSIX 的 `gmtime_r`、Windows 的 `gmtime_s` 属于平台接口，签名不可混用。
- `clock` 的跨度可能受类型范围、实现精度和回绕影响，长时间测量需查阅平台文档。

### 常见问题

**问：为什么用 `clock()` 测量 `sleep` 前后的差值几乎不变？**

答：`clock` 统计处理器时间，不是单调的真实经过时间；程序睡眠时通常不消耗 CPU。需要等待时长或超时应选平台提供的单调时钟，并明确它不是 ISO C 可移植接口。

## E15.06 assert 运行时断言与 C11 静态断言

- **标签**：`assert` `调试` `测试` `错误处理`
- **难度**：入门
- **前置**：无
- **关联**：E16.02、E16.06、E18.05

### 概念解释

`<assert.h>` 的 `assert` 在运行时检查程序内部应当成立的条件，失败时输出诊断并异常终止；C11 的 `_Static_assert` 在翻译期检查整数常量表达式。断言表达的是开发者不变量，不应替代对用户输入、文件失败或内存分配失败的正常处理。

发布版本可定义 `NDEBUG` 禁用运行时 `assert`，所以断言语义必须是“条件恒真时无副作用”。

### 语法要点

- `assert(expression);` 在未定义 `NDEBUG` 且表达式结果为零时，向标准错误输出包含表达式、源文件和行号等信息的诊断，并调用 `abort`；具体文本由实现定义。
- 在包含 `<assert.h>` 前定义 `NDEBUG`，`assert` 会展开为不产生运行时检查的宏。每次包含该头文件时会根据当时状态处理。
- C11/C17 的 `_Static_assert(constant-expression, string-literal);` 在表达式为零时产生翻译期诊断；`<assert.h>` 还提供 `static_assert` 宏别名。
- 静态断言条件必须是整数常量表达式，不能读取运行时变量；运行时 `assert` 不能替代它检查类型布局等编译期条件。

### 使用场景

内部函数可断言调用方必须满足的私有不变量，测试可断言计算结果；文件打开失败、用户索引越界和内存不足必须使用正常返回码或错误处理。若即使禁用断言也必须执行检查，就把检查写在普通控制流中。

### 示例

```c
#include <assert.h>
#include <stddef.h>
#include <stdio.h>

static int get_item(const int *items, size_t count, size_t index, int *result)
{
    if (items == NULL || result == NULL || index >= count) {
        return -1;
    }

    assert(index < count); /* 已通过边界检查，此处记录内部不变量。 */
    *result = items[index];
    return 0;
}

int main(void)
{
    int items[] = {4, 8, 15};
    int result = 0;

    _Static_assert(sizeof(items[0]) >= 2, "int must hold sample values");

    if (get_item(items, sizeof items / sizeof items[0], 1, &result) != 0) {
        fputs("invalid item request\n", stderr);
        return 1;
    }
    printf("result=%d\n", result);
    return 0;
}
```

### 注意事项

- 禁止写 `assert(malloc(...) != NULL)` 之类带必要副作用的表达式；定义 `NDEBUG` 后调用会消失。应先调用并保存结果，再检查。
- `assert` 失败会终止程序，不适合服务器需要恢复的可预期错误；诊断也不能替代日志中的输入上下文。
- 编译期断言中的字符串只是诊断文本，不是格式化模板；不同实现的诊断布局可不同。

### 常见问题

**问：测试代码是否可以只使用 `assert` 判断结果？**

答：调试构建可以，但定义 `NDEBUG` 后这些测试会失去检查。测试框架应使用始终生效的显式比较与失败返回；`assert` 更适合补充内部不变量，而非唯一的测试判定机制。
