# M09 结构体与联合体

> 本模块说明如何用结构体组合相关数据、用指针引用聚合对象，以及对象布局为何包含对齐和填充。学完后应能定义并初始化 `struct`，区分嵌套对象与外部引用，安全使用带标签的 `union`，分配带柔性数组成员的变长对象，并判断位域何时不适合可移植数据格式。

## E09.01 struct 定义、typedef 与初始化

- **标签**：`结构体` `声明与定义` `初始化` `赋值` `类型系统`
- **难度**：入门
- **前置**：E02.01、E06.01
- **关联**：E09.02、E09.03、E10.01

### 概念解释

结构体把若干类型可不同的成员组合为一个对象，各成员拥有各自的名字和存储位置。`struct Name` 是标签类型，`typedef` 则可为类型另起便于使用的别名；两者属于不同的标识符命名空间，不能混为一谈。

结构体初始化按成员进行，指定初始化器能减少字段顺序变化带来的错误。结构体赋值会复制对象的值，包括数组成员的内容，但指成员指向的外部对象不会被深复制。

### 语法要点

- `struct Point { int x; int y; };` 声明标签，可用 `struct Point point;` 定义对象。
- `typedef struct { int x; int y; } Point;` 同时定义匿名结构体类型和别名 `Point`。
- `Point p = { .y = 4, .x = 2 };` 使用指定初始化器；未显式初始化的静态聚合成员按零初始化规则处理，自动对象的部分初始化也会把其余成员初始化为零值语义。
- 相同结构体类型可以赋值和按值传递；不同标签的两个结构体即使成员完全一致，也通常是不同类型。
- 结构体标签可只声明为不完整类型，用于声明指针；在定义完整成员布局前不能定义该对象或访问成员。

### 使用场景

适合表示记录、坐标、配置项和函数的多值结果。若对象很大或需要共享修改，传递结构体指针通常比按值复制更合适；不要仅为少写几个字符而过度使用匿名类型和嵌套 `typedef`。

### 示例

```c
#include <stdio.h>

typedef struct {
    unsigned int id;
    char name[16];
} User;

int main(void)
{
    User original = { .id = 7, .name = "Ada" };
    User copy = original;

    copy.id = 8;
    copy.name[0] = 'E';

    printf("original: id=%u, name=%s\n", original.id, original.name);
    printf("copy:     id=%u, name=%s\n", copy.id, copy.name);
    return 0;
}
```

### 注意事项

- 初始化字符数组成员仍受容量和 NUL 终止约束，过长初始化文本不能靠结构体自动扩容。
- 结构体按值传参会复制整个对象；只读大对象可使用 `const struct Type *`，需要修改时使用明确输出契约。
- 结构体包含指针成员时，赋值只复制地址，两个对象会共享指向的数据；详见 E09.02 和 E11.03。
- 不同翻译单元共用的结构体定义应放在头文件中，避免各写一份逐渐不一致的布局。

### 常见问题

**问：结构体变量可以直接用 `==` 判断相等吗？**

答：ISO C 不为结构体定义 `==` 运算符。应按业务语义逐成员比较；不要直接用 `memcmp` 比较整个结构体，因为填充字节的值不受可靠控制，见 E09.03。

## E09.02 嵌套结构体、结构体指针与浅复制

- **标签**：`结构体` `指针` `生命周期` `所有权` `别名`
- **难度**：进阶
- **前置**：E09.01、E08.01、E08.03
- **关联**：E09.05、E11.03、E11.07

### 概念解释

结构体成员既可以是另一个完整结构体，也可以是指向外部对象的指针。前者的存储直接嵌在外层对象中，生命周期与外层一致；后者只保存地址，外部对象的所有权和生命周期必须另行管理。

`.` 通过结构体对象访问成员，`->` 通过结构体指针访问成员，等价于先解引用再用 `.`。结构体复制是逐值的浅复制：嵌套值成员被复制，而指针成员复制后仍指向同一个外部对象。

### 语法要点

- 若 `Entity entity` 含 `Point location`，用 `entity.location.x` 访问嵌套值成员。
- 若 `Entity *entity` 指向有效对象，`entity->location.x` 等价于 `(*entity).location.x`。
- 函数接收 `Entity *` 时可原位修改；接收 `const Entity *` 时不能经该参数修改成员。
- 指针成员所指向对象必须至少在整个使用期间保持有效；外层结构体销毁不会自动释放或销毁该对象。
- 结构体对象可作为数组成员或嵌套成员，但包含不完整类型或自身值的无限递归定义不合法；自引用通常通过指针实现。

### 使用场景

适合表示实体与坐标、记录与可选扩展、节点与下一节点等组合关系。若两个对象应独立拥有同一资源，不应仅靠浅复制；需要明确深复制、共享所有权或禁止复制中的一种策略。

### 示例

```c
#include <stdio.h>

typedef struct {
    int x;
    int y;
} Point;

typedef struct {
    unsigned int id;
    Point location;
} Entity;

static void set_location(Entity *entity, Point location)
{
    if (entity != NULL)
    {
        entity->location = location;
    }
}

int main(void)
{
    Entity entity = { .id = 1, .location = { 0, 0 } };
    Entity copy = entity;

    set_location(&entity, (Point){ .x = 5, .y = 8 });
    printf("entity=(%d,%d), copy=(%d,%d)\n",
           entity.location.x, entity.location.y,
           copy.location.x, copy.location.y);
    return 0;
}
```

### 注意事项

- 示例的 `Point` 是值成员，所以修改 `entity.location` 不影响 `copy`；若成员是 `Point *`，两个结构体复制后会共享同一个点对象。
- 使用 `->` 前指针必须指向有效且完整的结构体对象；空指针和悬空指针都会使成员访问成为未定义行为。
- 不要返回指向局部嵌套成员的指针供函数返回后使用，其生命周期随外层局部对象结束。
- 含动态资源指针的结构体应有配套初始化和销毁函数，并明确是否允许赋值复制，见 E11.03。

### 常见问题

**问：把含指针的结构体赋值给另一个变量，是否已经得到完全独立的副本？**

答：没有。指针值被复制，但目标对象没有复制，两个结构体形成别名。如果需要独立副本，应分配新目标并逐项复制；如果共享是设计目标，则必须明确释放者和使用期限。

## E09.03 结构体内存布局、对齐与填充

- **标签**：`结构体` `数组` `可移植性` `序列化` `实现定义`
- **难度**：进阶
- **前置**：E09.01、E08.06
- **关联**：`<stddef.h>`、E09.04、E12.03、E12.06

### 概念解释

实现为满足成员对齐要求，可以在结构体成员之间和末尾插入填充字节。成员声明顺序固定，但相邻成员的地址不必紧密相连；结构体大小通常还包含尾填充，使结构体数组中的每个元素都保持正确对齐。

填充内容和大小不是可移植的数据内容。结构体布局受 ABI、类型大小和对齐规则影响，不能凭某一平台的 `sizeof` 推导所有平台布局。

### 语法要点

- `sizeof (struct Type)` 返回整个对象大小，单位为字节，包含填充；`_Alignof(struct Type)` 在 C11/C17 中查询对齐要求。
- `offsetof(struct Type, member)` 来自 `<stddef.h>`，得到成员相对结构体起点的字节偏移。
- 成员按声明顺序排列，前面成员偏移小于后面成员偏移；联合体规则不同。
- 填充字节不参与成员语义，对结构体赋值或写入成员后，不应假设所有填充字节具有已知值。
- 直接把结构体内存写入文件再跨平台读取，会暴露填充、字节序、类型宽度和表示差异，不是可移植序列化。

### 使用场景

适合理解内存占用、ABI 边界、底层对象表示和柔性数组分配。若只是保存数据，应逐字段编码为规定宽度与字节序的格式；不要为了“节省几个字节”随意重排对性能或 ABI 已稳定的结构体。

### 示例

```c
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

typedef struct {
    unsigned char tag;
    uint32_t value;
} Record;

int main(void)
{
    printf("sizeof(Record)=%zu\n", sizeof(Record));
    printf("_Alignof(Record)=%zu\n", _Alignof(Record));
    printf("offsetof(tag)=%zu\n", offsetof(Record, tag));
    printf("offsetof(value)=%zu\n", offsetof(Record, value));
    puts("具体大小和偏移由实现的对齐规则决定。");
    return 0;
}
```

### 注意事项

- 不要编写依赖示例在某台机器上必然输出特定大小的程序；这些值是实现和 ABI 相关的。
- **危险：用 `fwrite(&record, sizeof record, 1, file)` 作为跨平台格式。** 同机同 ABI 的短期调试尚可，通用持久化必须逐字段编码。
- `memcmp` 会把填充也纳入比较，因此两个逻辑成员相同的结构体可能比较不等。
- 重排成员有时减少填充，但可能改变外部 ABI；涉及二进制接口时应依据平台文档和测试，而非盲目优化。

### 常见问题

**问：把结构体成员按从大到小排列，能否保证没有填充？**

答：不能保证。对齐、类型表示和 ABI 仍由实现决定，某些排列可能减少填充而非消除它。可移植代码应把布局当作实现属性，只依赖标准提供的成员访问和 `offsetof` 等规则。

## E09.04 union 与显式标签变体

- **标签**：`联合体` `结构体` `枚举` `类型系统` `未定义行为`
- **难度**：进阶
- **前置**：E09.01、E08.06
- **关联**：E09.03、E10.01、E10.03

### 概念解释

联合体的成员共享同一存储区域，任一时刻通常只按最后写入的成员解释其值；其大小足以容纳最大成员并满足所有成员的对齐要求。联合体本身不记录当前成员，因此常与枚举标签组成“带标签联合体”，由标签说明哪个分支有效。

标签与数据的一致性由程序维护。写错标签或在访问前未同步更新，会让代码读取不对应的分支，产生错误结果或未定义行为。

### 语法要点

- `union Value { long integer; double real; };` 定义两个重叠成员；写入一个后，通常只能读取该活动成员。
- 将联合体嵌入 `struct`，再增加 `kind` 字段，可构造可判别变体；应先检查 `kind` 再访问对应成员。
- 读取非活动成员不是通用的类型转换手段；除标准明确允许的情形（如特定公共初始序列、用字符类型查看对象表示）外，不应依赖其可移植性。
- 对联合体赋值会复制其对象值，但不会自动验证或转换当前分支。
- 联合体大小和偏移由实现对齐规则决定，所有成员的地址起点相同，但对象语义并不因此允许任意重解释。

### 使用场景

适合解析结果只可能是一种类型、消息负载互斥和节省变体存储的场景。若多个字段需要同时有效，应使用结构体；若只是想做整数与浮点数的位级转换，应使用明确的对象表示规则而非随意读取非活动成员。

### 示例

```c
#include <stdio.h>

typedef enum {
    VALUE_INTEGER,
    VALUE_REAL
} ValueKind;

typedef struct {
    ValueKind kind;
    union {
        long integer;
        double real;
    } data;
} Value;

static void print_value(const Value *value)
{
    if (value->kind == VALUE_INTEGER)
    {
        printf("整数：%ld\n", value->data.integer);
    }
    else
    {
        printf("实数：%.2f\n", value->data.real);
    }
}

int main(void)
{
    Value first = { .kind = VALUE_INTEGER, .data.integer = 42 };
    Value second = { .kind = VALUE_REAL, .data.real = 3.5 };

    print_value(&first);
    print_value(&second);
    return 0;
}
```

### 注意事项

- 切换分支时同时更新 `kind` 和对应 `data` 成员，最好通过构造函数或设置函数集中维护不变量。
- 示例的 `print_value` 假定 `kind` 只有两个合法值；处理外部输入时必须先验证枚举值，避免未知标签落入错误分支。
- 不要把 `double` 写入后直接用 `long` 成员读取来模拟位转换；这不具有通用可移植语义。
- 带资源所有权的分支还需要与标签匹配的清理逻辑，不能统一 `free` 所有可能成员。

### 常见问题

**问：为什么联合体已经节省空间，还要额外保存一个枚举标签？**

答：因为存储区域本身不包含“当前类型”的信息。标签占用少量空间，却能让访问和清理有据可依；没有标签，调用者只能靠隐含上下文猜测分支，接口更容易误用。

## E09.05 柔性数组成员与变长结构体分配

- **标签**：`结构体` `数组` `动态内存` `所有权` `整数溢出` `越界`
- **难度**：工程
- **前置**：E09.01、E11.02
- **关联**：E09.03、E11.04、E11.05

### 概念解释

柔性数组成员是 C99 起提供的结构体末尾成员，声明为不指定长度的数组，让一次分配同时容纳固定头部和可变数量元素。`sizeof` 结构体不包含柔性数组的实际元素存储，调用者必须按元素数额外分配并记录长度。

这种对象通常由单个指针拥有并整体释放。普通结构体赋值只复制固定部分，不会按长度复制柔性数组内容，因此不能直接把它当作可随意值复制的对象。

### 语法要点

- `struct Buffer { size_t length; double samples[]; };` 中柔性数组必须位于末尾，结构体还应至少有一个其他具名成员。
- 分配大小常用 `sizeof *buffer + count * sizeof buffer->samples[0]`，并在计算前检查乘法及加法是否溢出 `SIZE_MAX`。
- 柔性数组不能出现在普通数组元素结构中，也不应期望嵌套在其他对象后还能获得独立可变尾部。
- 成功分配后至少初始化固定头部和将被读取的元素；只读已初始化范围，不能把分配容量当作有效元素数。
- 使用一次 `free(buffer)` 释放整个分配，不能单独释放柔性数组成员；扩容需按 `realloc` 规则处理。

### 使用场景

适合带长度前缀的数据包、变长样本缓冲区和减少头部分配的容器。若固定头部与数据需要独立生命周期、频繁分离或按值复制，普通“结构体 + 指针 + 容量”可能更合适。

### 示例

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    size_t length;
    double samples[];
} SampleBuffer;

static SampleBuffer *make_samples(size_t count)
{
    if (count > (SIZE_MAX - sizeof(SampleBuffer)) / sizeof(double))
    {
        return NULL;
    }

    SampleBuffer *buffer =
        malloc(sizeof *buffer + count * sizeof buffer->samples[0]);
    if (buffer == NULL)
    {
        return NULL;
    }

    buffer->length = count;
    for (size_t i = 0; i < count; ++i)
    {
        buffer->samples[i] = (double)i * 0.5;
    }
    return buffer;
}

int main(void)
{
    SampleBuffer *buffer = make_samples(4);
    if (buffer == NULL)
    {
        fputs("分配失败或大小溢出。\n", stderr);
        return 1;
    }

    for (size_t i = 0; i < buffer->length; ++i)
    {
        printf("%.1f%c", buffer->samples[i],
               i + 1 == buffer->length ? '\n' : ' ');
    }
    free(buffer);
    return 0;
}
```

### 注意事项

- 长度和分配容量必须一致地维护；不要只增加 `length` 而没有实际分配相应元素，否则访问会越界。
- 分配成功不代表所有元素已经初始化，读取未初始化的非无符号字符对象可能产生未定义行为或不确定值。
- **错误：`SampleBuffer copy = *buffer;`** 不会复制柔性数组元素，且这种对象模型不适合按值复制；应提供显式克隆函数。
- 含柔性数组的结构体在 `realloc` 后旧地址可能失效，所有内部或外部别名都必须重新评估。

### 常见问题

**问：为什么不直接用 `struct { size_t length; double samples[1]; }` 然后多分配空间？**

答：柔性数组成员是标准专门为此提供的语法，能更清楚表达变长尾部并避免固定一个伪元素造成的边界和语义问题。旧的“单元素数组技巧”不应替代现代 ISO C 中的柔性数组成员。

## E09.06 位域的存储边界与可移植替代方案

- **标签**：`结构体` `位运算` `可移植性` `实现定义` `边界检查`
- **难度**：进阶
- **前置**：E09.01、E03.04
- **关联**：E09.03、E10.05、E12.06

### 概念解释

位域允许以位为单位声明结构体成员，使实现把多个小字段打包进存储单元。它适合表达实现内部的紧凑控制信息，但位域的分配顺序、存储单元、跨单元规则和是否可跨 ABI 共享都高度依赖实现。

位域不是可移植的线协议或寄存器格式描述语言。若字段位置必须逐位固定，应使用明确宽度的无符号整数、掩码和移位运算。

### 语法要点

- `unsigned int ready : 1;` 声明宽度为 1 的无符号位域；冒号后的宽度必须是常量表达式且不能超过允许范围。
- 宽度为零的匿名位域可要求下一个位域从新存储单元开始，其具体效果仍依实现布局。
- 不能对位域取地址，因此 `&object.flag` 不合法；也不能像普通对象那样直接获得指向位域的指针。
- 对窄有符号位域要留意表示和溢出；状态或掩码通常优先使用 `unsigned int` 位域。
- 位域的读写仍应保持在对象生命周期内，结构体整体大小和对齐由实现决定。

### 使用场景

适合只在同一实现、同一 ABI 内使用的紧凑状态对象，例如驱动内部控制块。跨编译器共享内存、网络报文、持久化文件或精确硬件寄存器布局应查阅平台规则，并优先采用显式掩码。

### 示例

```c
#include <stdio.h>

typedef struct {
    unsigned int read : 1;
    unsigned int write : 1;
    unsigned int execute : 1;
} Permissions;

int main(void)
{
    Permissions permissions = { 0 };

    permissions.read = 1U;
    permissions.execute = 1U;

    printf("read=%u, write=%u, execute=%u\n",
           (unsigned int)permissions.read,
           (unsigned int)permissions.write,
           (unsigned int)permissions.execute);
    printf("本实现中的对象大小：%zu\n", sizeof permissions);
    return 0;
}
```

### 注意事项

- **危险：把位域结构体直接写入文件或网络。** 位序、填充和字节序不具跨实现可移植性，接收方可能解释出完全不同的字段。
- 不要假设三个 1 位位域恰好形成某个固定字节，或假设 `sizeof` 等于字段位数之和除以八。
- 位域不能取地址，需要通用输出参数或指针接口时，可先读写普通无符号变量再赋回位域。
- 若协议规定“第 0 位表示读权限”，使用 `flags & (1U << 0)` 等显式操作更清楚，见 E10.05。

### 常见问题

**问：位域是否一定比显式掩码更快或更省空间？**

答：不一定。编译器通常仍要生成掩码和移位操作，实际大小与性能由实现和访问模式决定。位域的主要价值是声明简洁；若需要精确布局，可移植性比表面紧凑更重要。
