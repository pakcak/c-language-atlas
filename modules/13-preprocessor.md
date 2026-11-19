# M13 预处理

> 本模块解释编译前如何组织头文件、进行宏替换和选择条件代码。学完后应能编写不重复暴露定义的头文件、控制宏的求值与展开，并利用标准预定义信息生成可诊断、可移植的 C11/C17 源码。

## E13.01 #include 与头文件保护

- **标签**：`预处理` `头文件` `声明与定义`
- **难度**：入门
- **前置**：无
- **关联**：E13.04、E14.02、E14.04

### 概念解释

`#include` 将指定头文件的内容交给预处理器包含到当前位置；头文件保护则确保同一个头文件在一次预处理中即使被间接包含多次，其正文也只参与一次编译。前者解决“共享声明”，后者解决“重复包含”，两者都不能代替链接器对跨翻译单元定义的管理。

头文件保护通常由 `#ifndef`、`#define`、`#endif` 组成。保护宏只需在单个程序的头文件集合中唯一，不应使用保留标识符。

### 语法要点

- `#include <stdio.h>` 用于标准头文件或实现提供的头文件；`#include "project.h"` 通常先按实现规定的当前文件路径搜索，再按其他路径搜索。具体搜索顺序由实现定义，可用编译器的包含路径选项补充。
- 典型保护结构为：`#ifndef PROJECT_CONFIG_H`、紧随其后的 `#define PROJECT_CONFIG_H`，文件末尾写对应 `#endif`。
- 保护宏是预处理器的普通宏，最好包含项目、路径和文件名信息以降低碰撞概率。不要以紧跟大写字母的 `_` 开头，也不要使用双下划线名称；这些标识符在相应作用域保留给实现。
- 保护只作用于一个翻译单元。若在头文件中定义具有外部链接的变量或普通函数，多个翻译单元仍可能产生重复定义。
- `#pragma once` 很常见但不是 ISO C11/C17 标准机制；要求严格可移植时使用 include guard。

### 使用场景

多个 `.c` 文件需要共享函数原型、类型定义和常量声明时，应把这些接口放入头文件；当 `a.h` 包含 `b.h`，而 `main.c` 又同时包含二者时，保护宏可避免重复类型定义。不需要共享的实现细节不应放进公共头文件。

### 示例

`project_config.h`：

```c
#ifndef PROJECT_CONFIG_H
#define PROJECT_CONFIG_H

#define PROJECT_NAME "atlas"

void print_project_name(void);

#endif
```

`project_config.c`：

```c
#include "project_config.h"

#include <stdio.h>

void print_project_name(void)
{
    puts(PROJECT_NAME);
}
```

`main.c`：

```c
#include "project_config.h"
#include "project_config.h" /* 重复包含被保护宏抑制。 */

int main(void)
{
    print_project_name();
    return 0;
}
```

### 注意事项

- 头文件应自包含：使用 `size_t` 就自己包含 `<stddef.h>`，不要依赖包含者碰巧先包含其他头文件。
- 不要在公共头文件中放入仅当前 `.c` 文件使用的静态变量或私有函数；这会扩大接口并增加名称冲突。
- 条件包含发生在预处理阶段，运行时的 `if` 不能阻止 `#include` 被处理。

### 常见问题

**问：有头文件保护后，能否直接在头文件中定义 `int counter = 0;`？**

答：不能把它当作跨文件共享变量的正确方法。保护只能防止同一翻译单元内重复包含；多个 `.c` 文件包含该头时仍各自产生外部定义。头文件应写 `extern int counter;`，并只在一个 `.c` 文件中写 `int counter = 0;`，详见 E14.03。

## E13.02 对象宏与函数宏

- **标签**：`宏` `预处理` `表达式` `未定义行为`
- **难度**：进阶
- **前置**：E13.01
- **关联**：E13.03、E18.05

### 概念解释

对象式宏把名称替换为一段预处理标记，函数式宏则按参数替换调用文本。它们不做普通函数的参数类型检查，也不天然建立局部作用域；参数表达式可能在展开后被求值零次、一次或多次，因此宏的简洁性不能替代函数语义。

宏适合编译期常量、轻量代码生成和必须利用调用点信息的封装。对普通计算，类型明确的函数通常更安全，编译器也能内联它。

### 语法要点

- 对象宏形式为 `#define NAME replacement-list`；函数宏形式为 `#define NAME(parameters) replacement-list`，名称与左括号之间不能有空格。
- 宏定义中的每个参数以及整个替换表达式通常要分别加括号，例如 `#define MUL(a, b) ((a) * (b))`，避免调用处运算符优先级改变含义。
- 多条语句组成的宏可包装为 `do { ... } while (0)`，调用时仍写分号，使其在 `if/else` 中表现为一条语句。
- `#undef NAME` 可取消宏定义；重复定义若不相同，应先取消或调整设计，不能依赖实现的诊断后继续行为。
- C99 起支持可变参数宏，使用 `...` 与 `__VA_ARGS__`。若参数有副作用，宏多次求值可能造成未定义行为或逻辑错误。

### 使用场景

用对象宏表达数组容量、协议版本等编译期常量；用函数宏统一记录日志或生成重复声明。若操作需要独立类型检查、局部变量、返回值或只要求值一次，优先使用 `static inline` 函数，而不是复制计算表达式。

### 示例

```c
#include <stdio.h>

#define BUFFER_SIZE 32
#define ARRAY_LENGTH(array) (sizeof(array) / sizeof((array)[0]))
#define REPORT(value) do { printf("value = %d\n", (value)); } while (0)

static inline int int_min(int left, int right)
{
    return left < right ? left : right;
}

int main(void)
{
    char buffer[BUFFER_SIZE] = {0};
    int values[] = {8, 3, 5};
    int result = int_min(values[0], values[1]);

    REPORT(result);
    printf("buffer=%zu, values=%zu\n",
           sizeof buffer, ARRAY_LENGTH(values));
    return 0;
}
```

以下对照片段是危险写法，不应采用：

```c
/* 错误：参数会被求值两次，SQUARE(i++) 产生未定义行为。 */
#define SQUARE(x) ((x) * (x))
```

### 注意事项

- `ARRAY_LENGTH` 只适用于真正的数组；数组退化为指针后，`sizeof` 不再给出元素总数，宏可能静默得到错误结果。
- 不要给对象宏末尾随意加分号，例如 `#define N 10;` 会在 `int a[N]` 中造成语法错误。
- `static inline` 不是“必然内联”的命令，是否内联由实现决定；它提供的是函数语义和内部链接，而非性能保证。

### 常见问题

**问：宏参数和整个表达式都加括号后，`SQUARE(i++)` 就安全了吗？**

答：仍然不安全。括号只修复优先级，展开后仍包含两次 `i++`，同一标量对象在一次完整表达式内被无次序地修改两次，属于未定义行为。应改用函数并先保存需要的值，或把参数递增移出调用。

## E13.03 宏字符串化 # 与标记连接 ##

- **标签**：`宏` `预处理` `字符串`
- **难度**：进阶
- **前置**：E13.02
- **关联**：E13.05、E16.06

### 概念解释

在函数式宏替换列表中，`#` 把对应实参转换为字符串字面量，`##` 把左右预处理标记连接成一个标记。二者用于生成诊断文本、名称和重复结构，但它们工作在词法层，不理解变量值，也不会自动创建合法的 C 声明。

宏实参若直接用于 `#` 或 `##`，通常不会先按普通规则展开；需要“先展开再处理”时，要增加一层间接宏。

### 语法要点

- `#parameter` 只对函数式宏的形参有效。实参中的字符串引号和反斜杠会按字符串字面量需要转义，标记间的空白会规范化。
- `left##right` 的结果必须能形成一个合法预处理标记；例如把标识符与数字连接成标识符可行，随意拼接出半个运算符或非法数字则不可移植。
- 两层模式为 `#define STR_IMPL(x) #x` 与 `#define STR(x) STR_IMPL(x)`；外层宏先展开参数，内层再字符串化。
- 对应的两层连接模式为 `CAT_IMPL(a, b) a##b` 和 `CAT(a, b) CAT_IMPL(a, b)`。
- `#` 和 `##` 的结果不是运行时函数，不能在程序运行中动态拼接名称。

### 使用场景

测试框架可用 `#expression` 同时输出失败表达式；协议或寄存器包装可用 `##` 生成一族固定名称。若生成代码降低可读性、掩盖类型错误或可用简单函数代替，就不应使用标记连接。

### 示例

```c
#include <stdio.h>

#define VERSION 3
#define STR_IMPL(value) #value
#define STR(value) STR_IMPL(value)
#define CAT_IMPL(left, right) left##right
#define CAT(left, right) CAT_IMPL(left, right)

int main(void)
{
    int CAT(value_, VERSION) = 30;

    printf("version=%s\n", STR(VERSION));
    printf("name=%s, value=%d\n",
           STR(CAT(value_, VERSION)), value_3);
    return 0;
}
```

`CAT(value_, VERSION)` 经外层展开后连接成 `value_3`；`STR(VERSION)` 则先展开为 `3`，再生成字符串 `"3"`。

### 注意事项

- `STR(x)` 生成的是描述宏展开标记的文本，不是变量 `x` 的运行时内容；输出数值仍需合适的格式转换。
- 连接生成的新名称仍受作用域、保留标识符和重复定义规则约束，`##` 不会绕过语言检查。
- 不要连接出以保留模式命名的内部符号，也不要用标记拼接隐藏大范围重复代码。

### 常见问题

**问：为什么只写 `#define STR(x) #x` 时，`STR(VERSION)` 得到 `"VERSION"` 而不是 `"3"`？**

答：因为该参数在替换列表中直接跟在 `#` 后，标准规定其实参不按普通方式先展开，而是直接字符串化。通过外层 `STR` 调用内层 `STR_IMPL`，可让展开发生在字符串化之前。

## E13.04 #if 与条件编译

- **标签**：`条件编译` `预处理` `可移植性`
- **难度**：进阶
- **前置**：E13.01
- **关联**：E13.05、E14.06、E18.07

### 概念解释

条件编译根据预处理常量表达式决定哪些源码组交给后续编译阶段。它适合处理可选功能、平台适配和编译期配置，让不满足条件的代码不进入当前翻译单元；它与运行时 `if` 的根本区别是分支选择在编译前完成。

条件分支应表达明确的配置契约。大量零散的平台宏会让代码路径难以测试，因此最好把差异集中在少量接口中。

### 语法要点

- `#if constant-expression` 后可跟 `#elif`、`#else`，最终以 `#endif` 结束；`#ifdef MACRO` 等价于 `#if defined(MACRO)`，`#ifndef` 判断未定义。
- 条件表达式在预处理阶段求值，不能读取普通变量的运行时值，也不能用 `sizeof`、普通字符串字面量或强制类型转换等运行时 C 表达式替代预处理规则。
- 宏替换后，剩余未定义标识符在 `#if` 表达式中按 `0` 处理，所以拼错配置名可能静默关闭代码。GCC/Clang 的 `-Wundef` 可在其支持环境中辅助诊断，但它不是 ISO C 要求。
- `#ifdef FEATURE` 只判断是否存在；即使 `#define FEATURE 0`，该条件仍为真。需要按值控制时写 `#if FEATURE`。
- 被跳过的组仍须保持条件指令结构完整；条件编译不是任意删除文本的工具。

### 使用场景

依据日志等级剔除调试输出，或依据标准版本选择 `_Static_assert` 等特性。业务规则若在运行时变化，应使用普通分支；把所有正常用户路径做成互斥宏会导致未编译分支失去检查。

### 示例

```c
#include <stdio.h>

#ifndef LOG_LEVEL
#define LOG_LEVEL 1
#endif

#if LOG_LEVEL >= 2
#define LOG_DETAIL(message) \
    do { fprintf(stderr, "detail: %s\n", (message)); } while (0)
#elif LOG_LEVEL >= 1
#define LOG_DETAIL(message) \
    do { fprintf(stderr, "info: %s\n", (message)); } while (0)
#else
#define LOG_DETAIL(message) do { } while (0)
#endif

int main(void)
{
    LOG_DETAIL("program started");
    puts("work completed");
    return 0;
}
```

可在支持 GCC/Clang 命令行选项的环境中用 `-DLOG_LEVEL=2` 覆盖默认配置；该选项属于编译器命令行功能，不是 C 语言语法。

### 注意事项

- 为每个受支持配置至少做一次完整编译和测试；未被选择的代码不会因其他配置通过而自动正确。
- 条件范围宜覆盖完整声明或完整语句，避免产生只在某配置下才配对的大括号。
- 功能开关应集中定义并校验合法范围，防止不同头文件对同一宏给出不一致替换。

### 常见问题

**问：`#if FEATURE_ENABLED` 中宏名拼错了，为什么编译器可能不报错？**

答：预处理条件中未定义的标识符会替换为 `0`，所以条件只是恒假。应集中配置、使用一致的名称，在 GCC/Clang 等支持该诊断的工具链中启用 `-Wundef`，并测试开启和关闭两条路径。

## E13.05 标准预定义宏与 __func__

- **标签**：`预处理` `宏` `调试` `可移植性`
- **难度**：入门
- **前置**：E13.02
- **关联**：E13.03、E16.06、E18.07

### 概念解释

标准预定义宏由实现自动提供，描述源位置、编译时间或标准符合性；`__func__` 则提供当前函数名。它们能让日志自动携带源码上下文，但不同宏的展开类型、可用位置与可复现性各不相同。

特别要注意，`__func__` 是函数内的预定义标识符，不是宏，不能用 `#ifdef __func__` 检测。

### 语法要点

- `__FILE__` 展开为表示源文件名的字符串字面量，具体路径形式由实现决定；`__LINE__` 展开为当前源行号的十进制常量。
- `__DATE__` 和 `__TIME__` 分别表示处理源文件时的编译日期与时间字符串。使用它们会让相同源码的构建产物随时间变化。
- `__STDC__` 在符合标准的 hosted/freestanding 相应实现中用于表示 ISO C 符合性；`__STDC_VERSION__` 表示所采用标准版本，例如 C11 通常为 `201112L`，C17 通常为 `201710L`。不要据此猜测编译器所有扩展行为。
- `__STDC_HOSTED__` 为 `1` 表示宿主环境，为 `0` 表示独立环境；独立环境可用的标准库集合不同。
- 函数作用域内可把 `__func__` 当作函数名字符串使用；它不能脱离函数使用，也不能被 `#define` 当作可靠的通用日志变量替代。

### 使用场景

错误日志可记录文件、行号与函数名，版本诊断可核对编译所用的 C 标准。发布构建若要求逐字节可复现，不应把 `__DATE__`、`__TIME__` 编入版本标识。

### 示例

```c
#include <stdio.h>

#define LOG_ERROR(message)                                                    \
    do {                                                                      \
        fprintf(stderr, "%s:%d:%s: %s\n",                                  \
                __FILE__, __LINE__, __func__, (message));                     \
    } while (0)

static int divide_positive(int value, int divisor, int *result)
{
    if (divisor <= 0 || result == NULL) {
        LOG_ERROR("invalid division arguments");
        return -1;
    }
    *result = value / divisor;
    return 0;
}

int main(void)
{
    int result = 0;

    printf("C standard revision: %ld\n", (long)__STDC_VERSION__);
    if (divide_positive(12, 3, &result) != 0) {
        return 1;
    }
    printf("result=%d\n", result);
    return 0;
}
```

### 注意事项

- `__FILE__` 可能暴露构建机绝对路径；若产物面向公开分发，应评估路径与隐私要求，并使用工具链支持的映射选项，而不是修改标准宏语义。
- 不要重新定义或取消标准预定义宏；这样做会破坏诊断信息，并可能触发实现保留行为。
- 日志中的源行号反映编译时位置，运行时增加代码后需重新编译，旧二进制不会自动更新行号。

### 常见问题

**问：`#ifdef __func__` 为什么没有按预期检测当前是否在函数内？**

答：`__func__` 不是预处理宏，而是每个函数定义中可用的预定义标识符。它只在函数作用域内提供函数名；判断函数上下文应由代码结构保证，不能用条件编译检测。
