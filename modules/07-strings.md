# M07 字符串

> 本模块把 C 字符串作为“以 NUL 结尾的字节序列”来处理，而不是把它当作会自动管理容量的高级类型。学完后应能检查字符串边界，安全读取一行输入，使用 `<string.h>` 完成查找与比较，计算复制和拼接所需容量，并以可验证的方式解析数值、拆分记录和遍历字符。

## E07.01 NUL 终止、字符串长度与对象边界

- **标签**：`字符串` `数组` `生命周期` `越界` `未定义行为`
- **难度**：入门
- **前置**：E06.01
- **关联**：`<string.h>`、E07.03、E07.04、E08.02

### 概念解释

C 字符串不是独立内建类型，而是约定：从首字符开始，直到值为 `'\0'` 的第一个字节为止，这段字符序列才是字符串内容。保存字符串的数组必须额外容纳这个 NUL 终止符，因此文本长度与数组容量不是同一个概念；`strlen` 计算内容长度，`sizeof` 计算整个对象的字节数。

NUL 终止只规定字符串逻辑终点，不赋予数组额外空间。数组的生命周期由存储期决定；字符串字面量具有静态存储期且在程序运行期间存在，但通过指向字面量的指针修改其内容是未定义行为。

### 语法要点

- 声明 `char word[] = "hello";` 会建立含 `h e l l o \0` 的可修改数组，`sizeof word == 6`，`strlen(word) == 5`。
- `const char *text = "hello";` 让指针指向字面量；指针本身仍可改指别处，但不能经它修改字面量。
- `size_t strlen(const char *s);` 要求 `s` 指向有效的 NUL 终止字符串，返回 NUL 之前的字节数，不计 NUL。
- 字符数组中即使没有剩余文本，也必须有 `capacity >= length + 1`。`sizeof` 用在已衰减为函数参数的指针上时得到指针大小，不是原数组容量。
- 对无 NUL 终止的缓冲区调用 `strlen` 会持续越界读取，属于未定义行为；嵌入的 `'\0'` 则会让字符串函数提前停止。

### 使用场景

适合处理配置键、短文本字段、命令参数和标准库接口所需的 NUL 终止文本。若数据可能包含 NUL 字节，或长度不由终止符表示，应使用“缓冲区地址 + 显式长度”的字节序列接口，而不是普通字符串函数。

### 示例

```c
#include <stdio.h>
#include <string.h>

int main(void)
{
    char word[] = "hello";
    const char *literal = "hello";

    word[0] = 'H';
    printf("word=%s, length=%zu, array bytes=%zu\n",
           word, strlen(word), sizeof word);
    printf("literal=%s, pointer bytes=%zu\n",
           literal, sizeof literal);
    return 0;
}
```

### 注意事项

- **错误：修改字面量。** `char *p = "abc"; p[0] = 'A';` 产生未定义行为；需要可修改副本时定义 `char p[] = "abc";`。
- 声明固定容量数组时预留终止符，例如保存最多 15 个内容字节需要 `char text[16];`。
- 不要把字符串长度当作缓冲区容量，也不要把 UTF-8 文本的“字节长度”当作“用户感知字符数”。
- 在对象生命周期结束后，指向它的字符指针不能再用于读写；见 E08.07。

### 常见问题

**问：为什么 `char text[5] = "hello";` 虽然某些编译器接受，却不能安全交给 `printf("%s", text)`？**

答：这个初始化在 C 中允许恰好省略终止符，数组只有五个内容字节，没有 `'\0'`。`%s` 和 `strlen` 都要求 NUL 终止，会越过数组边界读取，行为未定义；应写 `char text[6] = "hello";` 或让数组长度由初始化器推导。

## E07.02 使用 fgets 安全读取一行并处理截断

- **标签**：`字符串` `stdio` `输入验证` `边界检查` `错误处理`
- **难度**：进阶
- **前置**：E07.01
- **关联**：`<stdio.h>`、E12.02、E12.05

### 概念解释

安全输入不仅要求“不写越界”，还要求明确处理输入过长、空行、EOF 和读取错误。`fgets` 能限制写入字符数并保留终止空间，是读取文本行的可靠基础；调用者仍需检查返回值，并决定保留换行、丢弃余下输入还是报告截断。

输入行可能恰好占满缓冲区，也可能在文件末尾没有换行。可靠接口应区分这些状态，避免把半行数据当成完整记录继续处理。

### 语法要点

- `char *fgets(char *s, int n, FILE *stream);` 最多读取 `n-1` 个字符，随后写入 `'\0'`；遇到换行会保留它，成功返回 `s`，读取前遇 EOF 或出错返回 `NULL`。
- `n` 必须大于零且目标至少有 `n` 字节容量。将 `sizeof buffer` 转换为 `int` 时，只有数组大小不超过 `INT_MAX` 才是可移植的；小型行缓冲区通常可直接转换。
- 返回值必须在使用缓冲区前检查。返回非空不代表一定读到换行，也不代表整行都已读入。
- 若缓冲区中没有换行且尚未到 EOF，应循环调用 `fgetc` 消耗当前行余下部分，防止下一行读取从半行中间开始。
- 文本输入若包含嵌入 NUL，`fgets` 仍会读取它，但 `strlen`、`strchr` 会把它视为终点；二进制数据应使用 `fread`。

### 使用场景

适合交互式命令、逐行配置解析和文本记录读取。若协议规定精确记录长度或允许任意字节，应改用长度明确的二进制读取；不要把行读取失败静默转换成空字符串。

### 示例

```c
#include <stdio.h>
#include <string.h>

enum line_result {
    LINE_OK,
    LINE_EOF,
    LINE_TOO_LONG,
    LINE_ERROR
};

static enum line_result read_line(char *buffer, int capacity)
{
    int ch;

    if (fgets(buffer, capacity, stdin) == NULL)
    {
        return ferror(stdin) ? LINE_ERROR : LINE_EOF;
    }

    char *newline = strchr(buffer, '\n');
    if (newline != NULL)
    {
        *newline = '\0';
        return LINE_OK;
    }

    if (feof(stdin))
    {
        return LINE_OK;
    }

    do
    {
        ch = fgetc(stdin);
    } while (ch != '\n' && ch != EOF);

    if (ch == EOF && ferror(stdin))
    {
        return LINE_ERROR;
    }
    return LINE_TOO_LONG;
}

int main(void)
{
    char name[16];

    puts("请输入姓名（最多 14 个内容字节）：");
    enum line_result result = read_line(name, (int)sizeof name);
    if (result == LINE_OK)
    {
        printf("你好，%s\n", name);
        return 0;
    }
    if (result == LINE_TOO_LONG)
    {
        fputs("输入过长，已丢弃该行剩余内容。\n", stderr);
    }
    else if (result == LINE_ERROR)
    {
        fputs("读取失败。\n", stderr);
    }
    return result == LINE_EOF ? 0 : 1;
}
```

### 注意事项

- 示例为换行预留空间，所以 16 字节缓冲区最多接受 14 个内容字节加换行和 NUL；无换行的文件末行可含 15 个内容字节。
- **危险：使用 `gets`。** 它无法限制写入量，已从 C11 标准中移除；任何历史代码都应替换并重新设计边界处理。
- 不要用无字段宽度的 `scanf("%s", buffer)` 代替安全行读取，它同样可能溢出目标缓冲区。
- 读取过长行后必须同步输入流，否则下一次读取可能把同一行的后半段误认为新命令。

### 常见问题

**问：读到了一段文本，是否只要没有换行就一定是输入过长？**

答：不是。文件最后一行可以没有换行，此时 `feof(stream)` 能帮助区分正常末行与缓冲区不足。若后续操作要求完整行，还应像示例一样返回明确状态，而不是继续解析截断内容。

## E07.03 string.h 的比较、查找与内存函数

- **标签**：`字符串` `string` `比较` `查找` `未定义行为`
- **难度**：入门
- **前置**：E07.01
- **关联**：`<string.h>`、E07.04、E08.06

### 概念解释

`<string.h>` 的字符串函数依靠 NUL 找终点，内存函数则依靠显式字节数工作。`strcmp` 比较两个字符串的字节序列，`strchr` 查找单个字节，`strstr` 查找子串；它们返回结果或位置，但不会验证目标容量，也不会修复缺失的终止符。

比较函数返回值的正负表示排序关系，不保证恰好为 `-1` 或 `1`。查找函数返回指向原字符串内部的指针，其有效性取决于原字符串对象的生命周期。

### 语法要点

- `int strcmp(const char *s1, const char *s2);`：相等返回 `0`，否则按 `unsigned char` 值比较并返回正数或负数。
- `char *strchr(const char *s, int c);`：查找 `c` 转换为 `char` 后的值，也包括终止 NUL；找不到返回 `NULL`。
- `char *strstr(const char *s1, const char *s2);`：查找子串；空子串匹配 `s1`。
- `void *memcpy(void *dest, const void *src, size_t n);` 要求两个存储区间不重叠；可能重叠时使用 `memmove`。
- 对未初始化、无 NUL、生命周期已结束或不指向足够对象的指针调用这些函数，会产生未定义行为。两个返回指针只有指向同一数组对象时才能做有意义的相减或关系比较。

### 使用场景

适合比较配置项、定位键值分隔符、查找协议字段，以及复制已知长度的原始字节。密码比较不能简单把 `strcmp` 当作恒定时间算法；需要抗计时侧信道时应采用专门的安全接口。

### 示例

```c
#include <stdio.h>
#include <string.h>

int main(void)
{
    const char record[] = "id=42;name=Ada";
    const char *separator = strchr(record, '=');
    const char *name = strstr(record, "name=");

    if (separator != NULL)
    {
        printf("键长度：%td\n", separator - record);
    }
    if (name != NULL)
    {
        printf("找到字段：%s\n", name + 5);
    }
    if (strcmp("42", "42") == 0)
    {
        puts("两个数值字符串完全相同");
    }
    return 0;
}
```

### 注意事项

- 使用 `strchr` 或 `strstr` 的结果前先检查 `NULL`；对空指针做解引用或指针加法是错误的。
- **错误：只判断 `strcmp(a, b) == 1`。** 标准不保证差值幅度，应判断 `< 0`、`== 0` 或 `> 0`。
- 字符串复制不能只按源长度调用 `memcpy`，还需包含 NUL 并确认目标容量；见 E07.04。
- 查找结果指向原对象内部，原数组失效后该结果也悬空；不要将其长期缓存而不管理生命周期。

### 常见问题

**问：`strncmp(a, b, n)` 是否总能替代 `strcmp` 并自动更安全？**

答：不能。它最多比较 `n` 个字符，适合比较定长前缀或可能未终止的定长字段，但“前 `n` 字节相同”不等于两个完整字符串相同。若语义是比较完整文本，应确认两者有 NUL 终止后使用 `strcmp`。

## E07.04 按容量复制与拼接字符串

- **标签**：`字符串` `string` `边界检查` `缓冲区溢出` `输入验证`
- **难度**：进阶
- **前置**：E07.01、E07.03
- **关联**：`<string.h>`、E07.02、E11.05

### 概念解释

复制和拼接的核心约束是“内容长度加 NUL 不得超过目标对象容量”。目标指针本身不知道容量，因此容量必须由调用者另行传递并保证真实。安全接口应在写入前验证目标已有终止符和新增文本能否容纳，失败时保持目标不变或清楚报告截断策略。

`strcat`、`strcpy` 不接收容量，正确性完全依赖调用者；`strncat` 的第三个参数是可追加的最大内容字节数，而不是目标总容量，误用仍会溢出。

### 语法要点

- 若目标已有 `used` 个内容字节、容量为 `capacity`，可追加内容长度必须满足 `source_len < capacity - used`，等价为 `used + source_len + 1 <= capacity`。
- 用 `capacity - used - 1` 等减法表达检查前，先确认 `used < capacity`，避免无符号下溢。
- 可先用 `memchr(dest, '\0', capacity)` 做有界终止检查，再计算长度，避免对不可信缓冲区直接 `strlen`。
- `memcpy` 复制 `source_len + 1` 字节可同时写入内容和 NUL，但源与目标重叠时行为未定义；需要支持重叠时使用 `memmove`。
- 若动态容量不足，先检查新长度是否溢出 `size_t`，再扩容；不能先写入再补救。

### 使用场景

适合构造日志片段、路径文本和协议字段，尤其适合作为项目内统一的字符串构建辅助函数。若目标来源或生命周期不明确，应先修复接口契约，而不是靠“限制得很保守”掩盖问题。

### 示例

```c
#include <stdbool.h>
#include <stdio.h>
#include <string.h>

static bool append_text(char *dest, size_t capacity, const char *source)
{
    const char *terminator = memchr(dest, '\0', capacity);
    if (terminator == NULL)
    {
        return false;
    }

    size_t used = (size_t)(terminator - dest);
    size_t source_len = strlen(source);
    if (source_len >= capacity - used)
    {
        return false;
    }

    memmove(dest + used, source, source_len + 1);
    return true;
}

int main(void)
{
    char message[24] = "user=";

    if (!append_text(message, sizeof message, "Ada") ||
        !append_text(message, sizeof message, ";role=admin"))
    {
        fputs("目标容量不足或目标未终止。\n", stderr);
        return 1;
    }
    puts(message);

    if (!append_text(message, sizeof message, ";extra=too-long"))
    {
        printf("追加被拒绝，原内容仍为：%s\n", message);
    }
    return 0;
}
```

### 注意事项

- 示例要求 `source` 本身是有效 NUL 终止字符串；`dest` 的终止检查有界，但 `source` 的长度检查仍需调用者保证来源合法。
- `memmove` 允许区间重叠，但若源指针已悬空、目标容量虚假或源缺失 NUL，它不能提供任何保护。
- **危险：`strncat(dest, src, sizeof dest)`。** 第三个参数不是总容量；正确模式至少要从剩余空间中再扣除 NUL。
- 需要知道是否截断时，不要继续调用会“尽量复制”的接口而不检查结果；示例采用全部追加或保持不变的事务式策略。

### 常见问题

**问：为什么拼接前常先算长度，而不能逐字符写到数组末尾再停止？**

答：逐字符写入也可以安全实现，但必须同时跟踪剩余容量和终止位置，并明确部分写入后的处理。先验证总长度更容易提供“失败不改变原值”的契约，也能避免动态扩容时重复扫描和溢出计算。

## E07.05 使用 strtol 做完整数值解析

- **标签**：`字符串` `stdlib` `类型转换` `输入验证` `溢出`
- **难度**：进阶
- **前置**：E07.01、E02.03
- **关联**：`<stdlib.h>`、`<errno.h>`、E07.06

### 概念解释

`atoi` 只给出一个整数，无法可靠地区分“没有数字”和合法零值，也不能完整报告范围错误。`strtol` 通过转换结果、结束指针和 `errno` 三条信息，让调用者验证是否消费了数字、是否越过范围，以及数字后是否存在非法文本。

完整解析通常应消费除首尾空白外的整个字段。只检查返回值会漏掉 `"12abc"` 这类前缀可转换但整体无效的输入。

### 语法要点

- `long strtol(const char *nptr, char **endptr, int base);` 从 `nptr` 开始跳过前导空白，读取可选符号和数字；`base` 为 `0` 或 `2` 到 `36`。
- 若 `endptr` 非空，函数把结束位置写入 `*endptr`。`end == text` 表示没有执行转换，不能仅靠结果 `0` 判断失败。
- 调用前设 `errno = 0`；结果超出 `long` 范围时返回 `LONG_MIN` 或 `LONG_MAX`，并将 `errno` 设为 `ERANGE`。
- 转换成功后可通过 `end` 跳过尾随空白，再要求 `*end == '\0'`，从而拒绝多余字符。
- 对 `isspace` 等 `<ctype.h>` 函数传入字符时，应转换为 `unsigned char`；负的普通 `char` 值除 EOF 外不是有效参数。

### 使用场景

适合解析配置数值、命令行参数和文本协议中的整数字段。若后续要存入更窄类型，还必须另行检查目标类型上下界；`strtol` 只保证结果能放入 `long`。

### 示例

```c
#include <ctype.h>
#include <errno.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

static bool parse_long(const char *text, long *output)
{
    char *end;
    errno = 0;
    long value = strtol(text, &end, 10);

    if (end == text || errno != 0)
    {
        return false;
    }
    while (isspace((unsigned char)*end))
    {
        ++end;
    }
    if (*end != '\0')
    {
        return false;
    }

    *output = value;
    return true;
}

int main(void)
{
    const char *inputs[] = { " -123 ", "123x", "not-a-number" };

    for (size_t i = 0; i < sizeof inputs / sizeof inputs[0]; ++i)
    {
        long value;
        if (parse_long(inputs[i], &value))
        {
            printf("有效数值：%ld\n", value);
        }
        else
        {
            printf("无效数值字段：%s\n", inputs[i]);
        }
    }
    return 0;
}
```

### 注意事项

- 解析成功后只在成功分支写入 `*output`，可避免失败时破坏调用者原有值；示例仍要求非空 `text` 和 `output`。
- `strtol` 接受前导空白和符号；若协议禁止这些形式，应在转换前按协议额外验证。
- 溢出时不能继续使用钳位返回值冒充用户输入；应报告范围错误。
- 需要无符号或固定宽度整数时选择对应转换函数，并检查 `LONG_MAX` 之外的目标范围，不要只做强制类型转换。

### 常见问题

**问：`strtol("0", ...)` 返回零，怎样与 `"abc"` 的失败返回零区分？**

答：查看结束指针。合法 `"0"` 会让 `end` 越过数字，而 `"abc"` 没有转换，`end == text`。范围错误再通过事先清零的 `errno` 检测，这三个信息应一起使用。

## E07.06 原地拆分、遍历与显式解析状态

- **标签**：`字符串` `string` `输入验证` `可重入` `生命周期`
- **难度**：进阶
- **前置**：E07.01、E07.03
- **关联**：E07.05、E08.04、E08.07

### 概念解释

原地拆分把分隔符改写为 NUL，并返回指向原缓冲区内部各段的指针，无需为每个字段分配内存。代价是原记录被修改、所有字段依赖原缓冲区生命周期；解析状态必须由明确的游标保存，才能在嵌套解析或多段流程中互不干扰。

字符串遍历本质上是字节遍历。标准字符分类函数可以处理当前 locale 中的单字节字符，但不能把 UTF-8 的多个字节自动组合为 Unicode 字符。

### 语法要点

- 一个拆分游标可用 `char **cursor` 表示：每次从 `*cursor` 开始找分隔符，找到就写入 `'\0'` 并把游标移到下一字节。
- 用 `NULL` 游标表示没有后续字段，可保留连续分隔符产生的空字段以及末尾空字段。
- `strtok` 会修改输入并保存内部静态状态，嵌套或交错解析会互相破坏，也不是可重入接口；新代码可优先使用显式游标。
- 对字符使用 `toupper`、`isspace` 等函数时传 `(unsigned char)ch`，返回的 int 再按需要转换。
- 分隔符指针和字段指针只能在其原数组有效且仍可访问时使用；数组越界或函数返回局部数组都会导致未定义行为。

### 使用场景

适合解析可修改的 CSV 简单变体、键值记录和命令行缓冲区。它不处理带引号、转义分隔符的完整 CSV 规范，也不应直接修改字符串字面量或调用者要求保持不变的输入。

### 示例

```c
#include <ctype.h>
#include <stdio.h>
#include <string.h>

static char *next_field(char **cursor, char delimiter)
{
    if (*cursor == NULL)
    {
        return NULL;
    }

    char *field = *cursor;
    char *separator = strchr(field, delimiter);
    if (separator == NULL)
    {
        *cursor = NULL;
    }
    else
    {
        *separator = '\0';
        *cursor = separator + 1;
    }
    return field;
}

int main(void)
{
    char record[] = "alpha,,gamma,";
    char *cursor = record;
    char *field;

    while ((field = next_field(&cursor, ',')) != NULL)
    {
        printf("字段：%s；大写字节：", field);
        for (const unsigned char *p = (const unsigned char *)field;
             *p != '\0'; ++p)
        {
            putchar(toupper(*p));
        }
        putchar('\n');
    }
    return 0;
}
```

### 注意事项

- **错误：对字面量原地拆分。** `char *s = "a,b";` 后把逗号写成 NUL 是未定义行为；使用 `char s[] = "a,b";`。
- 所有字段都是原缓冲区的别名。若原缓冲区被释放、移动或离开作用域，必须先将仍需的字段复制到独立存储。
- 空字段是数据还是错误由格式规范决定，不能静默跳过；示例明确保留它们。
- 多字节编码文本按 ASCII 分隔符拆字节通常可行，但大小写转换、列宽和字符计数需要相应编码处理，不能仅靠 `<ctype.h>` 完成 Unicode 语义。

### 常见问题

**问：为什么不推荐在新代码里直接嵌套使用 `strtok`？**

答：它用内部静态状态记住“下一次从哪里继续”。内层对另一个字符串调用 `strtok` 会覆盖外层的解析位置，导致逻辑错误；显式游标把状态放进调用者对象，各次解析互不干扰，也更容易测试。
