# M12 文件操作

> 本模块以 ISO C 流模型为中心，说明 `FILE` 生命周期、打开模式、格式化与块 I/O、文件定位和错误检测。学完后应能检查每一次关键读写，区分 EOF 与错误，理解文本/二进制差异，并在写入、关闭、重命名或清理失败时保持文件处理状态可解释、资源不泄漏。

## E12.01 FILE 流、fopen 模式与 fclose

- **标签**：`文件` `stdio` `生命周期` `资源释放` `错误处理`
- **难度**：入门
- **前置**：E05.01、E11.06
- **关联**：`<stdio.h>`、E12.05、E12.07

### 概念解释

`FILE *` 是标准库管理的流句柄，程序通过它访问外部文件或其他流。`fopen` 成功时返回一个有效流并移交关闭责任，`fclose` 刷新缓冲、结束流生命周期并释放关联资源；关闭后即使指针数值未变，也不能继续用于 I/O。

打开模式决定初始位置、是否创建、是否截断、是否允许读写，以及文本或二进制方式。模式正确不等于操作成功，打开、写入和关闭都必须检查。

### 语法要点

- `FILE *fopen(const char *filename, const char *mode);` 成功返回流，失败返回 `NULL`；`int fclose(FILE *stream);` 成功返回 `0`，失败返回 `EOF`。
- `"r"` 只读且文件须存在；`"w"` 写入，创建空文件或截断已有文件；`"a"` 追加，必要时创建文件。
- 在模式中加入 `+` 允许更新读写，如 `"r+"`、`"w+"`、`"a+"`；加入 `b` 表示二进制，如 `"rb"`、`"wb+"`。
- C11/C17 的 `"x"` 可与 `"w"` 类模式组合为 `"wx"`，要求排他创建，文件已存在时打开失败，适合避免覆盖临时文件。
- 更新流在写后读或读后写之间通常需要定位或刷新等同步操作；不能随意交错而不满足流规则，见 E12.04。

### 使用场景

适合配置文件、日志、导出数据和临时流。对不能承受数据丢失的目标，不要一开始就用 `"w"` 截断唯一副本；应先写临时文件并确认完整成功，见 E12.07。

### 示例

```c
#include <stdio.h>

int main(void)
{
    FILE *file = fopen("notes.txt", "w");
    if (file == NULL)
    {
        perror("fopen");
        return 1;
    }

    int status = 0;
    if (fputs("first line\n", file) == EOF)
    {
        perror("fputs");
        status = 1;
    }
    if (fclose(file) != 0)
    {
        perror("fclose");
        status = 1;
    }
    return status;
}
```

### 注意事项

- **危险：写入成功后忽略 `fclose` 返回值。** 缓冲数据可能直到关闭时才写入，关闭失败意味着输出未必完整。
- `"w"` 会截断已有文件，即使后续第一次写就失败，旧内容也可能已经丢失；重要数据使用临时文件策略。
- `fclose` 后不要再次关闭或使用同一 `FILE *`；需要重置所有权变量时可将其设为 `NULL`。
- 更新流中读写的交错有额外约束，最简单的单向处理通常比无定位的混合读写更可靠。

### 常见问题

**问：程序退出会自动关闭流，是否可以不调用 `fclose`？**

答：正常终止会处理标准流并关闭打开流，但长期运行程序可能耗尽句柄，也无法在退出前发现具体操作的关闭失败。显式 `fclose` 才能控制生命周期、及时释放资源并检查结果。

## E12.02 格式化输入输出与转换宽度

- **标签**：`文件` `stdio` `输入验证` `边界检查` `未定义行为`
- **难度**：进阶
- **前置**：E12.01、E07.02
- **关联**：E12.05、E07.05、E02.03

### 概念解释

`fprintf` 和 `fscanf` 按格式字符串在文本与 C 类型之间转换。格式说明符必须与实际参数类型严格匹配；输入转换还要检查成功转换的项数，输出则要检查是否发生写入错误。格式化函数不提供自动业务验证，也不会让未知输入自动符合程序预期。

`scanf` 家族的 `%s` 会跳过前导空白并读取一个非空白词，不是读取整行。没有字段宽度的 `%s` 可能写越界，有宽度也只能防止溢出，不能代替完整语法验证。

### 语法要点

- `int fprintf(FILE *stream, const char *format, ...);` 成功返回输出字符数，失败返回负值。
- `int fscanf(FILE *stream, const char *format, ...);` 返回成功赋值的输入项数；在首次转换前到 EOF 可返回 `EOF`，匹配失败可能返回零或部分项数。
- `%15s` 最多写 15 个内容字符并追加 NUL，因此目标至少 16 字节；宽度包含内容字符但不包含终止符。
- `%ld` 需要 `long *` 输入参数或对应的 `long` 输出参数，`%zu` 对应 `size_t`，不要以“平台类型大小相同”为理由混用。
- 格式字符串与可变参数类型不匹配会产生未定义行为；不可信文本应作为 `%s` 数据参数传递，而不是直接作为格式字符串。

### 使用场景

适合结构化日志、简单数字表格和固定格式的文本协议。输入字段可能包含空白、需要精确错误位置或存在长行时，优先用 `fgets` 读完整行，再按业务规则解析。

### 示例

```c
#include <stdio.h>

int main(void)
{
    char name[16];
    long count;

    puts("请输入一个不超过 15 字节的名称和一个整数：");
    int converted = fscanf(stdin, "%15s %ld", name, &count);
    if (converted != 2)
    {
        fputs("输入格式无效或输入已结束。\n", stderr);
        return 1;
    }
    if (fprintf(stdout, "name=%s, count=%ld\n", name, count) < 0)
    {
        fputs("输出失败。\n", stderr);
        return 1;
    }
    return 0;
}
```

### 注意事项

- 示例避免缓冲区溢出，但没有验证整行是否还有多余文本；严格记录格式应采用行读取加完整解析。
- **危险：`scanf("%s", name)` 或 `printf(user_text)`。** 前者可能越界，后者会把用户数据中的 `%` 当作格式指令；分别使用宽度和 `fputs`/`printf("%s", user_text)`。
- `fscanf` 返回部分项数时，某些输出变量可能尚未赋值，不应读取这些未初始化对象。
- 数值转换成功仍不代表范围符合业务要求，例如年龄或计数还需检查上下界。

### 常见问题

**问：`fscanf` 返回非零是否表示全部输入都成功？**

答：不是。它可能只是成功转换了前几个字段。必须与预期项数比较，并进一步验证字段值和剩余文本；读取错误与 EOF 的精确区分还可结合 `ferror`、`feof`。

## E12.03 fread、fwrite 与短读写

- **标签**：`文件` `二进制IO` `stdio` `边界检查` `错误处理`
- **难度**：进阶
- **前置**：E12.01、E08.02
- **关联**：E12.05、E12.06、E09.03

### 概念解释

`fread` 和 `fwrite` 以“每个项目 `size` 字节，共 `nmemb` 项”搬运原始字节，不添加 NUL、不解释换行。返回值是成功处理的完整项目数，而不是总是字节数；返回值小于请求可能表示 EOF、错误或部分项目，必须结合数量和流状态判断。

块 I/O 只保证字节搬运，不了解元素初始化、对象生命周期或可移植格式。缓冲区必须有相应的可读/可写大小，文件位置也要处于预期位置。

### 语法要点

- `size_t fread(void *ptr, size_t size, size_t nmemb, FILE *stream);` 将数据写入 `ptr`，返回完整读取项目数。
- `size_t fwrite(const void *ptr, size_t size, size_t nmemb, FILE *stream);` 返回完整写出项目数，小于 `nmemb` 即不能假定全部成功。
- 若 `size` 或 `nmemb` 为零，返回零且不读写内容；不要把这个零误判为所有场景中的 I/O 失败。
- 用 `size == 1` 时返回值就是字节数，适合通用复制；用 `size == sizeof item` 时要留意短项目计数和缓冲区剩余内容。
- 调用后可用 `ferror` 区分错误、用 `feof` 确认文件结束；输出侧短写必须视为失败，不应无依据地继续使用文件。

### 使用场景

适合二进制记录、图像字节、文件复制和固定长度数据块。含指针、结构体填充或平台相关表示的对象不能直接当成跨平台格式，见 E12.06。

### 示例

```c
#include <stdio.h>

int main(void)
{
    const unsigned char input[] = { 0x00, 0x41, 0xff, 0x0a };
    unsigned char output[sizeof input] = { 0 };
    FILE *file = tmpfile();
    if (file == NULL)
    {
        perror("tmpfile");
        return 1;
    }

    int status = 0;
    if (fwrite(input, 1, sizeof input, file) != sizeof input)
    {
        status = 1;
    }
    if (status == 0 && fseek(file, 0L, SEEK_SET) != 0)
    {
        status = 1;
    }
    if (status == 0 &&
        fread(output, 1, sizeof output, file) != sizeof output)
    {
        status = 1;
    }
    if (ferror(file))
    {
        status = 1;
    }
    if (fclose(file) != 0)
    {
        status = 1;
    }

    if (status == 0 && output[1] == 0x41)
    {
        puts("二进制字节已完整往返");
    }
    return status;
}
```

### 注意事项

- `tmpfile` 创建自动删除的临时二进制更新流，也可能因权限或资源限制失败，必须检查返回值。
- **危险：把 `fread` 返回的项目数直接当作字节数。** 只有 `size == 1` 时二者相同；其他情况要乘以项目大小并考虑完整项目语义。
- 读取数据到字符缓冲区后，如果还要当 C 字符串使用，必须另行确认容量并添加 NUL。
- 示例只验证一个字段作为基本往返检查；工程协议应验证全部长度、魔数、版本和字段范围。

### 常见问题

**问：`fread` 返回零是否一定就是正常 EOF？**

答：不是。它可能遇到 EOF、读取错误，或者请求的项目数/项目大小为零。应先确认请求非零，再通过 `feof` 和 `ferror` 判断原因，不能仅凭返回值下结论。

## E12.04 fseek、ftell 与更新流定位

- **标签**：`文件` `stdio` `二进制IO` `可移植性` `错误处理`
- **难度**：进阶
- **前置**：E12.01、E12.03
- **关联**：E12.05、E12.06

### 概念解释

文件定位把流的当前位置移动到后续读写所需位置。`fseek` 按基准点和偏移定位，`ftell` 返回当前位置的不透明 `long` 表示，`rewind` 回到起点并清除错误指示。定位不仅用于随机访问，也用于满足更新流在读写方向切换时的同步要求。

文本流中的位置不一定是简单字节偏移，二进制流也不一定支持所有基准点。标准函数使用 `long`，因此超大文件需要平台专门接口和额外边界策略。

### 语法要点

- `int fseek(FILE *stream, long offset, int whence);` 成功返回 `0`，失败返回非零；`whence` 为 `SEEK_SET`、`SEEK_CUR` 或 `SEEK_END`。
- `long ftell(FILE *stream);` 成功返回位置，失败返回 `-1L`；位置值应先保存并检查，不能盲目转成无符号数。
- `void rewind(FILE *stream);` 等价于回到起点并清除错误指示，但没有可直接检查的错误返回；需要错误信息时使用 `fseek(..., 0L, SEEK_SET)`。
- 文本流可移植定位通常限于 `SEEK_SET`，偏移为零或同一流先前成功 `ftell` 的值；不要任意对文本位置做加减。
- 二进制流也不必支持 `SEEK_END`；大文件位置超出 `long` 可表示范围时，标准接口无法提供通用解决方案。

### 使用场景

适合固定位置记录、重新读取临时文件和读写方向切换。对管道、终端和某些设备流，定位可能失败；应检查返回值，而不是假设所有 `FILE` 都可随机访问。

### 示例

```c
#include <stdio.h>

int main(void)
{
    FILE *file = tmpfile();
    if (file == NULL)
    {
        return 1;
    }

    int status = 0;
    if (fwrite("abcdef", 1, 6, file) != 6 ||
        fseek(file, 2L, SEEK_SET) != 0)
    {
        status = 1;
    }

    int ch = EOF;
    if (status == 0)
    {
        ch = fgetc(file);
        if (ch == EOF || ftell(file) != 3L)
        {
            status = 1;
        }
    }
    if (fclose(file) != 0)
    {
        status = 1;
    }

    if (status == 0)
    {
        printf("位置 2 的字符是 %c，下一位置为 3\n", ch);
    }
    return status;
}
```

### 注意事项

- 示例在写后读之前成功调用 `fseek`，满足更新流方向切换要求；直接紧跟着读可能产生未定义行为。
- **危险：忽略 `fseek` 失败后继续读写。** 流可能仍在原位置，后续操作会处理错误数据。
- 不要把文本文件的 `ftell` 值当成可任意计算的字符数；换行转换和编码由实现处理。
- 需要超过 `LONG_MAX` 的文件偏移时，应查阅目标平台的 64 位文件接口并明确非 ISO 可移植性。

### 常见问题

**问：二进制模式下 `fseek(file, 0, SEEK_END)` 加 `ftell` 是否总能得到文件大小？**

答：不总能。标准不要求所有二进制流支持 `SEEK_END`，流也可能是不可定位设备，而且 `long` 有范围限制。必须检查调用结果，并根据目标文件类型和平台选择合适方案。

## E12.05 ferror、feof、EOF 与 clearerr

- **标签**：`文件` `stdio` `错误处理` `循环` `输入验证`
- **难度**：进阶
- **前置**：E12.01、E12.03
- **关联**：E12.04、E07.02、E16.01

### 概念解释

EOF 是输入操作试图越过文件末尾后报告的状态，不是文件中预先存在的一个普通字符。`feof` 检查文件结束指示，`ferror` 检查错误指示；两者回答不同问题，必须在读写返回值表明异常后使用。

错误和 EOF 指示会保留，直到 `clearerr` 或某些定位操作清除。`fgetc` 返回 `int`，以容纳所有 `unsigned char` 值以及额外的 `EOF`；若先存进 `char`，可能无法可靠区分数据字节和 EOF。

### 语法要点

- `int fgetc(FILE *stream);` 成功返回转换为 `int` 的 `unsigned char`，失败或文件结束返回 `EOF`。
- `int feof(FILE *stream);` 仅在已设置 EOF 指示时返回非零，不能预测下一次读取是否成功。
- `int ferror(FILE *stream);` 检查读写错误指示；EOF 本身不是错误。
- `void clearerr(FILE *stream);` 清除 EOF 和错误指示；它不能修复设备、权限或数据错误。
- 正确读取循环由实际读取函数的返回值控制，而不是由 `while (!feof(stream))` 控制。

### 使用场景

适合逐字节处理、读完整个文件和诊断短读。需要重试或复用同一流时，可在确认状态后清除指示；不要盲目清除后继续，导致真实错误被吞掉。

### 示例

```c
#include <stdio.h>

int main(void)
{
    FILE *file = tmpfile();
    if (file == NULL)
    {
        return 1;
    }

    int status = 0;
    if (fwrite("AZ", 1, 2, file) != 2 ||
        fseek(file, 0L, SEEK_SET) != 0)
    {
        status = 1;
    }

    int ch;
    while (status == 0 && (ch = fgetc(file)) != EOF)
    {
        if (putchar(ch) == EOF)
        {
            status = 1;
        }
    }
    if (status == 0 && ferror(file))
    {
        status = 1;
    }
    if (status == 0 && feof(file))
    {
        putchar('\n');
        puts("已确认读到文件末尾");
        clearerr(file);
    }
    if (fclose(file) != 0)
    {
        status = 1;
    }
    return status;
}
```

### 注意事项

- **危险：`while (!feof(file)) { fgetc(file); ... }`。** EOF 只在读取失败后才设置，这种循环常把最后一次失败当作额外一轮有效数据处理。
- 字符接收变量必须是 `int`，比较 EOF 后再转换为字符类型；不要用 `char ch = fgetc(file)`。
- `clearerr` 只清除标志，不会恢复丢失数据或消除底层故障；重试仍需业务策略。
- 示例最后的标准输出换行未构成文件正确性的核心，但工程程序仍应统一检查关键输出错误。

### 常见问题

**问：为什么不能在下一次读取前用 `feof` 判断是否还有数据？**

答：`feof` 只报告此前的读取是否已经触发 EOF 指示。即使当前正好位于最后一个字节之后，在下一次读取失败前它也可以仍为零，因此应让读取返回值驱动循环。

## E12.06 文本与二进制模式及可移植字节编码

- **标签**：`文件` `二进制IO` `序列化` `可移植性` `整数`
- **难度**：工程
- **前置**：E12.03、E09.03、E10.02
- **关联**：E12.07、E09.06、E08.06

### 概念解释

文本流与宿主文本约定交互，实现可以转换换行或处理其他文本表示；二进制流以字节序列方式处理数据，适合明确编码的格式。模式中的 `b` 不自动解决字节序、整数宽度、浮点表示或结构体填充，它只选择流的数据方式。

可移植文件格式需要逐字段规定编码，例如无符号 32 位整数按小端四字节保存。直接写结构体内存只适合受控的同 ABI 场景，不能当作通用持久化或通信协议。

### 语法要点

- 文本模式如 `"r"`、`"w"` 适合人类可读文本；二进制模式如 `"rb"`、`"wb"` 适合图像、压缩数据和明确协议。
- 文本中的 `\n` 在宿主外部表示中可能不是单个字节，文本位置和读取长度也不一定等于外部字节数。
- 显式小端编码可通过 `out[i] = (unsigned char)(value >> (8U * i))` 实现，解码用对应位移和按位或。
- 固定宽度类型如 `uint32_t` 只有在实现提供时才存在；使用它意味着目标平台支持该精确宽度类型。
- 指针值、位域布局、结构体填充和本机浮点对象表示都不应未经规范直接成为跨平台格式。

### 使用场景

适合设计配置快照、二进制记录和跨系统数据交换。仅供同一程序短期调试的内存转储可以使用更简单方式，但仍需处理版本、完整写入和错误，不能宣称可移植。

### 示例

```c
#include <stdint.h>
#include <stdio.h>

static void encode_u32_le(unsigned char output[4], uint32_t value)
{
    for (unsigned int i = 0; i < 4; ++i)
    {
        output[i] = (unsigned char)(value >> (8U * i));
    }
}

static uint32_t decode_u32_le(const unsigned char input[4])
{
    uint32_t value = 0;
    for (unsigned int i = 0; i < 4; ++i)
    {
        value |= (uint32_t)input[i] << (8U * i);
    }
    return value;
}

int main(void)
{
    const uint32_t original = UINT32_C(0x12345678);
    unsigned char encoded[4];
    unsigned char received[4];
    FILE *file = tmpfile();
    if (file == NULL)
    {
        return 1;
    }

    encode_u32_le(encoded, original);
    int status = 0;
    if (fwrite(encoded, 1, sizeof encoded, file) != sizeof encoded ||
        fseek(file, 0L, SEEK_SET) != 0 ||
        fread(received, 1, sizeof received, file) != sizeof received)
    {
        status = 1;
    }
    if (fclose(file) != 0)
    {
        status = 1;
    }

    if (status == 0 && decode_u32_le(received) == original)
    {
        puts("按明确的小端格式往返成功");
    }
    return status;
}
```

### 注意事项

- **危险：`fwrite(&value, sizeof value, 1, file)` 作为跨平台整数格式。** 它使用本机字节序和对象表示，接收端可能不同。
- 文本或二进制模式都不能替代格式版本、长度字段、合法值验证和短读写检查。
- 字符串编码仍需明确，例如 UTF-8；`b` 只处理字节，不会自动设置字符编码。
- 若格式使用有符号整数、浮点数或可变长度，需另外规定表示、范围、精度和异常值，不可只做字节反转。

### 常见问题

**问：同一台机器上直接读写结构体很方便，为什么文档仍不推荐用于通用格式？**

答：方便来自同 ABI 的偶然一致性。编译选项、编译器、体系结构或结构体定义变化后，填充、对齐和字节序都可能不同；显式字段编码让文件格式成为独立、可测试的契约。

## E12.07 临时文件、关闭检查与失败回滚

- **标签**：`文件` `资源释放` `错误处理` `可移植性` `所有权`
- **难度**：工程
- **前置**：E12.01、E12.05、E11.06
- **关联**：E12.03、E12.06、E16.01

### 概念解释

健壮更新重要文件时，通常先把完整内容写入同目录临时文件，确认所有写入和关闭成功，再用 `rename` 提交。这样避免一开始就截断目标，并在中途失败时删除临时文件、保留原目标；但 ISO C 不保证重命名原子性，也不保证目标已存在时各实现行为一致。

失败回滚必须覆盖每个阶段：打开失败无需关闭，写入失败仍需关闭并删除临时文件，关闭失败不能继续提交，重命名失败要清理临时文件。清理失败本身也应被记录，而不是伪装成完整成功。

### 语法要点

- 用 `"wx"` 排他创建临时文件，避免覆盖已经存在的同名文件；临时名生成还应考虑并发和可预测性。
- `fputs`、`fwrite` 等写入成功后仍需检查 `fclose`，因为错误可能在刷新缓冲时暴露。
- `int rename(const char *oldname, const char *newname);` 成功返回 `0`，失败返回非零；目标已存在时行为由实现规定。
- `int remove(const char *filename);` 删除文件，成功返回 `0`，失败返回非零；删除失败应报告残留风险。
- ISO C 的 `fflush`、`fclose` 和 `rename` 不等于物理介质持久化或崩溃一致性保证，关键系统需要平台专门接口和事务设计。

### 使用场景

适合配置更新、导出报告和替换小型数据文件。多进程并发写入、超大文件、权限继承和断电恢复需要更完整的平台方案；不要只凭这段 ISO C 示例宣称原子或持久。

### 示例

```c
#include <stdio.h>

static int replace_text_file(const char *target, const char *temporary,
                             const char *text)
{
    FILE *file = fopen(temporary, "wx");
    if (file == NULL)
    {
        perror("fopen temporary");
        return 1;
    }

    int status = 0;
    if (fputs(text, file) == EOF)
    {
        perror("write temporary");
        status = 1;
    }
    if (fclose(file) != 0)
    {
        perror("fclose temporary");
        status = 1;
    }

    if (status == 0 && rename(temporary, target) != 0)
    {
        perror("rename");
        status = 1;
    }
    if (status != 0 && remove(temporary) != 0)
    {
        perror("remove temporary");
    }
    return status;
}

int main(void)
{
    if (replace_text_file("settings.txt", "settings.tmp",
                          "mode=safe\n") != 0)
    {
        fputs("更新失败。\n", stderr);
        return 1;
    }
    puts("更新成功");
    return 0;
}
```

### 注意事项

- 示例成功路径是否替换已存在的 `settings.txt` 依实现而定；若协议要求绝不覆盖，应先定义并执行相应的平台策略。
- 临时文件应与目标位于合适的位置，以降低跨文件系统重命名失败的可能；ISO C 不保证任何目录或原子语义。
- **危险：忽略 `fclose` 后直接 `rename`。** 缓冲写失败可能被漏掉，最终把不完整文件当作成功结果提交。
- 若删除临时文件也失败，应保留错误信息供运维清理；示例仍返回原始失败状态，没有将清理失败隐藏为成功。

### 常见问题

**问：写完临时文件再 `rename`，是否就能保证断电后一定是新文件或旧文件？**

答：不能。ISO C 没有规定原子替换、目录项持久化或设备刷新顺序。需要崩溃一致性时，必须使用目标平台的原子替换、同步和备份机制，并针对实际故障模型测试。
