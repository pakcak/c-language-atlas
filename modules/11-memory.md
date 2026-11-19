# M11 内存管理

> 本模块从存储期和对象生命周期出发，说明动态分配、所有权转移与失败清理。学完后应能正确使用 `malloc`、`calloc`、`realloc` 和 `free`，实现带溢出检查的动态数组，在多资源错误路径上完成清理，并识别内存泄漏、悬空指针和双重释放。

## E11.01 存储期、作用域与对象生命周期

- **标签**：`生命周期` `作用域` `动态内存` `悬空指针` `未定义行为`
- **难度**：进阶
- **前置**：E05.02、E08.01
- **关联**：E11.02、E11.03、E08.07

### 概念解释

作用域决定标识符在源码哪里可见，存储期决定对象在程序执行期间何时存在，两者不是同一个概念。C11/C17 包括自动、静态、线程和分配存储期：局部普通变量通常具有自动存储期，静态对象贯穿程序执行，线程局部对象属于线程，动态分配对象从分配成功存活到释放。

生命周期是对象可被有效访问的时间区间。名字仍可见不代表对象一定有效，地址仍保存也不代表对象仍存活；返回局部变量地址就是典型错误。

### 语法要点

- 块内普通 `int value;` 具有自动存储期，在每次进入其块时获得存储，离开块后生命周期结束。
- 文件作用域对象具有静态存储期；块内 `static int count;` 也只初始化一次并保留到程序结束。
- C11 的 `_Thread_local` 表示线程存储期，可单独或与 `static`/`extern` 的相应规则组合使用。
- `malloc` 成功返回的对象具有分配存储期，直到 `free` 或程序终止；它不因离开块而自动释放。
- 对象生命周期结束后，任何指向其原存储的指针都不能再用于访问该对象，即使地址数值未改变。

### 使用场景

适合判断配置单例、递归局部变量、缓存和动态资源的生命周期。静态存储适合真正需要全程序存在的状态，但会增加共享和测试成本；不要把局部变量改成 `static` 只为绕过返回地址问题。

### 示例

```c
#include <stdio.h>

static unsigned int next_identifier(void)
{
    static unsigned int next = 1;
    return next++;
}

static unsigned int automatic_value(void)
{
    unsigned int value = 10;
    return value;
}

int main(void)
{
    printf("标识：%u, %u\n", next_identifier(), next_identifier());
    printf("自动对象按值返回：%u\n", automatic_value());
    return 0;
}
```

### 注意事项

- **错误：返回局部对象地址。** `int *f(void) { int x = 1; return &x; }` 让调用者获得悬空指针；可按值返回、由调用者提供输出存储，或明确转移动态所有权。
- 静态局部对象虽然长期存在，但示例中的自增不是原子操作，多线程并发调用可能产生数据竞争。
- 自动对象未被显式初始化时通常具有不确定值，读取前必须初始化；静态对象则按零初始化规则处理。
- 动态对象没有编译器自动插入的析构机制，必须在每条结束所有权的执行路径上释放或移交。

### 常见问题

**问：把局部变量声明为 `static` 后返回地址是否就总是合理？**

答：生命周期问题确实消失，但该对象被所有调用共享，重入、递归和线程安全语义都会改变，而且后续调用可能覆盖先前结果。若接口需要独立结果，应由调用者提供存储或返回独立分配对象。

## E11.02 malloc、calloc 与分配大小计算

- **标签**：`动态内存` `初始化` `边界检查` `整数溢出` `stdlib`
- **难度**：进阶
- **前置**：E11.01、E08.06
- **关联**：`<stdlib.h>`、E11.03、E09.05

### 概念解释

`malloc` 按字节数分配未初始化存储，`calloc` 按“元素数 × 元素大小”分配并把所有位初始化为零。成功返回的指针具有分配存储期，调用者获得所有权；失败返回 `NULL`，不能解引用。大小计算必须防止溢出，否则分配过小后的正常下标写入也会越界。

分配接口不记录调用者语义上的元素数，也不提供自动扩容或释放。大小、初始化状态、有效元素数和释放责任都需要程序另行维护。

### 语法要点

- `void *malloc(size_t size);` 成功返回适合基础对齐对象的存储，失败返回 `NULL`；C 中通常直接把结果赋给具体对象指针，无需强制转换。
- `void *calloc(size_t nmemb, size_t size);` 分配 `nmemb` 个、每个 `size` 字节的对象表示并清零所有位。
- 用 `count * sizeof *pointer` 计算数组大小前先检查 `count <= SIZE_MAX / sizeof *pointer`；`calloc` 的分离参数可避免调用者先做溢出乘法。
- `malloc(0)` 或 `calloc(0, size)` 可返回 `NULL`，也可返回必须释放但不能用于访问零长度对象的指针；代码不要依赖某一种结果。
- 全位零不保证是所有类型上的空指针或浮点正零可移植表示；需要语义初始化时仍应按成员或元素赋值。

### 使用场景

适合运行期才确定数量的数组、可变对象和输出缓冲区。已知固定小容量可优先自动数组；超大型局部数组也不应简单改为静态数组，而应根据生命周期和所有权选择动态存储。

### 示例

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    const size_t count = 6;
    if (count > SIZE_MAX / sizeof(int))
    {
        fputs("分配大小溢出。\n", stderr);
        return 1;
    }

    int *values = malloc(count * sizeof *values);
    if (values == NULL)
    {
        fputs("分配失败。\n", stderr);
        return 1;
    }

    for (size_t i = 0; i < count; ++i)
    {
        values[i] = (int)i * 2;
    }
    printf("末元素：%d\n", values[count - 1]);
    free(values);
    return 0;
}
```

### 注意事项

- 分配成功后、初始化完成前不要读取普通 `malloc` 数组元素；零长度请求则不要解引用返回值。
- **危险：`sizeof(pointer)` 代替 `sizeof(*pointer)`。** 前者是指针大小，可能让数组分配不足；元素数还要与字节数区分。
- `calloc` 的零位初始化不是所有高级语义初始化的替代品，例如含指针或特殊浮点语义的可移植结构仍应显式初始化。
- 对超对齐类型的分配要求可能超出普通 `malloc` 保证，应使用符合目标版本和平台要求的接口，而不是假设任何地址都足够对齐。

### 常见问题

**问：`malloc` 是否一定因为物理内存不足才返回 `NULL`？**

答：不是。地址空间碎片、实现限制、大小无法表示或资源策略都可能导致失败。无论原因是什么，调用者都应检查 `NULL`，并保持原有资源处于可清理状态。

## E11.03 free 与线性所有权契约

- **标签**：`动态内存` `所有权` `资源释放` `双重释放` `悬空指针`
- **难度**：进阶
- **前置**：E11.02、E08.07
- **关联**：E11.06、E11.07、E09.02

### 概念解释

所有权回答“谁负责最终释放资源”。最简单的线性所有权模型规定每次成功分配恰好有一个所有者，所有者可以显式转移给另一个对象，但整个生命周期内只执行一次 `free`。借用的非 owning 指针只能观察资源，不能释放。

`free` 结束动态对象生命周期并回收其存储，不负责清理其中指向的其他动态对象，也不会把所有别名指针置空。资源型结构体需要配套销毁函数，按成员所有权逐项清理。

### 语法要点

- `void free(void *ptr);` 接受 `NULL`，此时不执行操作；非空参数必须来自未释放的匹配动态分配管理函数。
- 不能释放栈数组、字符串字面量、静态对象、指向分配内部的偏移指针或已经释放过的指针。
- 成功 `free` 后原指针及其别名全部不能再访问旧对象；释放本身不是读取旧内容的机会。
- 返回动态对象的函数应命名和注释清楚“调用者取得所有权”；借用接口则应注明资源至少存活到何时。
- 对含动态成员的结构体，先释放仍有效的成员，再释放外层对象；若外层按值浅复制，必须防止两个所有者分别释放同一成员。

### 使用场景

适合构造/销毁函数、工厂接口、容器和错误处理。共享但难以确定唯一释放者的资源需要更明确的引用计数或区域生命周期设计，不能靠“最后一个使用者也许会释放”维持正确性。

### 示例

```c
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char *text;
} TextOwner;

static bool text_init(TextOwner *owner, const char *source)
{
    size_t length = strlen(source);
    if (length == SIZE_MAX)
    {
        return false;
    }

    char *copy = malloc(length + 1);
    if (copy == NULL)
    {
        return false;
    }
    memcpy(copy, source, length + 1);
    owner->text = copy;
    return true;
}

static void text_destroy(TextOwner *owner)
{
    free(owner->text);
    owner->text = NULL;
}

int main(void)
{
    TextOwner owner = { NULL };
    if (!text_init(&owner, "owned text"))
    {
        fputs("分配失败。\n", stderr);
        return 1;
    }

    puts(owner.text);
    text_destroy(&owner);
    return 0;
}
```

### 注意事项

- 示例中 `length == SIZE_MAX` 是防御 `length + 1` 回绕的通用检查；实际对象不可能在可寻址空间中达到该长度，但接口契约仍应明确大小边界。
- 调用 `text_init` 前应确保 `owner` 有效；若它已拥有资源，重复初始化会覆盖旧指针并泄漏，真实接口可要求先销毁或先初始化空对象。
- **危险：复制 `TextOwner` 后分别销毁。** 两个副本持有同一地址，会双重释放；应禁止复制或实现深复制。
- 销毁函数中的置空只更新该所有者，不会让其他别名变安全；见 E11.07。

### 常见问题

**问：为什么 `free(owner->text)` 后还要把成员设为 `NULL`？**

答：置空让这个所有者对象处于可再次销毁的明确空状态，可防止经同一成员重复释放。它不是标准强制要求，也不能修复其他副本或别名，但作为类型内部不变量很有用。

## E11.04 realloc 的失败保留与地址失效

- **标签**：`动态内存` `所有权` `错误处理` `悬空指针` `整数溢出`
- **难度**：进阶
- **前置**：E11.02、E11.03
- **关联**：E11.05、E08.04、E09.05

### 概念解释

`realloc` 尝试把已有动态对象调整为新大小，保留新旧大小中较小者对应的前缀内容。成功时可能移动对象，旧指针及其派生指针都不再可用；失败时返回 `NULL`，原分配仍有效且仍由原所有者负责释放。

因此“先保存临时指针，成功后再提交”是扩容的核心模式。直接写 `p = realloc(p, size)` 会在失败时丢失唯一旧地址，既无法继续使用也无法释放。

### 语法要点

- `void *realloc(void *ptr, size_t new_size);` 的 `ptr` 必须是 `NULL` 或有效的既有动态分配地址。
- `realloc(NULL, n)` 等价于相应 `malloc(n)`；对非空旧指针传入零大小的行为存在实现定义分支，C11/C17 可移植代码应避免用零大小 `realloc` 代替明确的 `free`。
- 新字节数计算仍需检查 `new_count <= SIZE_MAX / element_size`，`realloc` 不会修复已经回绕的参数。
- 成功扩容后新增区域未初始化，扩展后的容量与已初始化长度应分别记录。
- 成功返回即使地址数值与旧地址相同，也应按新生命周期结果更新所有内部指针，不继续使用旧指针表达式访问。

### 使用场景

适合动态数组、输入缓冲区和柔性数组成员扩容。若其他对象保存了指向旧分配内部的指针，移动式扩容可能不适合，需改用稳定节点、分段存储或重新建立索引。

### 示例

```c
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

static bool resize_values(int **values, size_t new_count)
{
    if (new_count == 0 || new_count > SIZE_MAX / sizeof **values)
    {
        return false;
    }

    int *resized = realloc(*values, new_count * sizeof **values);
    if (resized == NULL)
    {
        return false;
    }
    *values = resized;
    return true;
}

int main(void)
{
    size_t count = 2;
    int *values = malloc(count * sizeof *values);
    if (values == NULL)
    {
        return 1;
    }
    values[0] = 10;
    values[1] = 20;

    if (!resize_values(&values, 4))
    {
        free(values);
        fputs("扩容失败，旧数据已清理。\n", stderr);
        return 1;
    }

    count = 4;
    values[2] = 30;
    values[3] = 40;
    printf("%d, %d\n", values[0], values[count - 1]);
    free(values);
    return 0;
}
```

### 注意事项

- 示例辅助函数要求 `values` 本身非空且 `*values` 为有效动态指针或 `NULL`；通用库接口应把这些前置条件写入文档。
- **危险：`values = realloc(values, bytes);`** 失败时旧地址被覆盖，正确做法是使用临时变量并仅在成功后提交。
- 扩容成功后旧元素前缀保留，但新元素必须初始化后才能读取；缩小后超出新大小的数据不可再访问。
- 所有指向旧数组元素、尾后位置和柔性尾部的指针都可能在成功后失效，不能只更新头指针而遗漏别名。

### 常见问题

**问：扩容失败后是否必须立即释放旧内存？**

答：不一定。旧分配仍有效，可以继续使用、稍后重试或按业务降级；关键是所有权没有丢失。示例选择结束程序，所以在失败路径释放旧内存，其他程序可以保留它继续工作。

## E11.05 动态数组的长度、容量与增长策略

- **标签**：`动态内存` `数组` `边界检查` `整数溢出` `所有权`
- **难度**：工程
- **前置**：E11.02、E11.04、E09.01
- **关联**：E11.06、E17.01、E07.04

### 概念解释

动态数组至少需要三个不变量：`items` 指向可容纳 `capacity` 个元素的分配或为空，`length <= capacity`，且只有 `[0, length)` 是有效元素。容量是可以使用多少空间，长度是已经放入多少元素；两者混淆会导致越界或读取未初始化数据。

增长策略通常按倍数增加容量以减少重复分配，但每次加倍和字节数换算都必须检查溢出。只有扩容成功后才更新指针和容量，追加操作失败时数组应保持原状。

### 语法要点

- 初始化把 `items` 置空、`length` 和 `capacity` 置零；销毁后恢复同一空状态。
- 追加前若 `length == capacity`，先计算至少 `length + 1` 的需求；若 `length == SIZE_MAX`，连加一都不能执行。
- 检查 `needed <= SIZE_MAX / sizeof *items`；倍增时还要防止 `capacity * 2` 自身回绕。
- `realloc` 成功后才提交 `items` 和 `capacity`，随后写入 `items[length]` 并增加 `length`。
- 平均情况下几何增长使尾部追加具有摊销常数时间，但单次扩容可能线性复制；缩容和排序等操作另有成本。

### 使用场景

适合运行期增长的输入列表、栈和缓冲区。若元素内部保存指向同一数组元素的指针，扩容会移动存储并导致这些指针失效；需要稳定地址时应使用节点容器或分块数组。

### 示例

```c
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *items;
    size_t length;
    size_t capacity;
} IntVector;

static void vector_destroy(IntVector *vector)
{
    free(vector->items);
    vector->items = NULL;
    vector->length = 0;
    vector->capacity = 0;
}

static bool vector_reserve(IntVector *vector, size_t needed)
{
    if (needed <= vector->capacity)
    {
        return true;
    }
    if (needed > SIZE_MAX / sizeof *vector->items)
    {
        return false;
    }

    size_t new_capacity = vector->capacity == 0 ? 4 : vector->capacity;
    while (new_capacity < needed)
    {
        if (new_capacity > SIZE_MAX / 2)
        {
            new_capacity = needed;
            break;
        }
        new_capacity *= 2;
    }
    if (new_capacity > SIZE_MAX / sizeof *vector->items)
    {
        new_capacity = needed;
    }

    int *new_items =
        realloc(vector->items, new_capacity * sizeof *new_items);
    if (new_items == NULL)
    {
        return false;
    }
    vector->items = new_items;
    vector->capacity = new_capacity;
    return true;
}

static bool vector_push(IntVector *vector, int value)
{
    if (vector->length == SIZE_MAX ||
        !vector_reserve(vector, vector->length + 1))
    {
        return false;
    }
    vector->items[vector->length++] = value;
    return true;
}

int main(void)
{
    IntVector vector = { NULL, 0, 0 };

    for (int value = 1; value <= 10; ++value)
    {
        if (!vector_push(&vector, value))
        {
            vector_destroy(&vector);
            fputs("追加失败，数组已清理。\n", stderr);
            return 1;
        }
    }

    printf("长度=%zu，容量=%zu，末元素=%d\n",
           vector.length, vector.capacity,
           vector.items[vector.length - 1]);
    vector_destroy(&vector);
    return 0;
}
```

### 注意事项

- 追加成功之前不改变 `length`，所以分配失败不会留下一个看似有效却未初始化的元素。
- 扩容可能移动整个数组，函数返回后旧 `items` 地址和所有元素指针都不能继续使用；用索引保存位置通常更容易恢复。
- **危险：只检查字节乘法，不检查容量倍增。** 两者都可能回绕，示例分别处理。
- 示例针对 `int`；泛型动态数组还需对齐、元素复制和析构契约，不能只复制指针就声称深复制。

### 常见问题

**问：为什么不让 `capacity` 永远等于 `length`，每次追加只扩一个元素？**

答：那样每次都可能移动并复制整个数组，连续 `n` 次追加会产生平方级总复制量。几何增长用额外容量换取摊销效率，但必须维护溢出检查，并接受单次扩容的延迟和内存开销。

## E11.06 多资源错误路径与集中清理

- **标签**：`动态内存` `资源释放` `错误处理` `所有权` `文件`
- **难度**：工程
- **前置**：E11.03、E05.03
- **关联**：E11.07、E12.01、E12.07

### 概念解释

函数同时获取内存、文件流或其他资源时，每个后续步骤都可能失败。可靠清理要求按“已经实际获得的资源”回收，而不是假定所有初始化都成功；常用模式是统一出口、按获取逆序释放，或把资源封装成各自负责清理的对象。

集中清理不是简单地在末尾写几个 `free`。指针必须先初始化为空，文件句柄必须可区分是否打开，清理函数还要处理部分初始化状态，并防止成功后资源被误释放两次。

### 语法要点

- 将资源变量初始化为 `NULL`，成功获取后更新；`free(NULL)` 安全，`fclose` 则必须先判断非空。
- 使用 `goto cleanup` 跳到函数内唯一清理区适合 C 的多分支资源管理，标签只服务于同一资源所有权，不应用于纠缠普通控制流。
- 按获取逆序释放，例如先释放依赖文件内容构造的对象，再关闭文件；具体依赖顺序以资源契约为准。
- 清理操作也可能失败，特别是 `fclose` 刷新输出；若主操作已成功但关闭失败，返回状态必须反映这一事实。
- 成功路径若要把资源所有权交给调用者，应在提交后把本地所有者置空，避免统一清理误释放已经移交的资源。

### 使用场景

适合文件加载、多阶段解析、构造含多个动态成员的对象和事务式初始化。资源很多且可独立封装时，拆成小型构造/销毁函数通常比无限增长的清理标签更易维护。

### 示例

```c
#include <stdio.h>
#include <stdlib.h>

static int print_first_line(const char *path)
{
    FILE *file = NULL;
    char *line = NULL;
    int status = 1;

    file = fopen(path, "r");
    if (file == NULL)
    {
        goto cleanup;
    }

    line = malloc(256);
    if (line == NULL)
    {
        goto cleanup;
    }
    if (fgets(line, 256, file) == NULL)
    {
        goto cleanup;
    }

    fputs("首行：", stdout);
    fputs(line, stdout);
    status = 0;

cleanup:
    free(line);
    if (file != NULL && fclose(file) != 0)
    {
        status = 1;
    }
    return status;
}

int main(void)
{
    if (print_first_line("example.txt") != 0)
    {
        fputs("无法完整读取 example.txt。\n", stderr);
        return 1;
    }
    return 0;
}
```

### 注意事项

- 示例只申请一个动态缓冲区和一条文件流，但模式可扩展到更多资源；每个变量在 `goto` 前已经初始化，清理区不会读取未初始化值。
- **危险：在 `fopen` 失败时仍调用 `fclose(file)`。** 只有成功打开的非空流才能关闭。
- 清理后继续通过 `line` 或 `file` 访问会产生悬空访问；函数返回前不要再使用它们。
- 对输出文件，关闭失败可能意味着缓冲数据未写入；不能把它当成无关紧要的清理噪声，见 E12.07。

### 常见问题

**问：在 C 中使用 `goto cleanup` 是否一定是不良风格？**

答：不是。若它把多个失败分支汇入单一、短而清晰的清理区，往往比重复释放代码更可靠。应避免跨越复杂业务逻辑随意跳转，并确保所有资源变量都已定义且处于可清理状态。

## E11.07 泄漏、悬空指针与双重释放的防御

- **标签**：`动态内存` `内存泄漏` `悬空指针` `双重释放` `资源释放` `所有权`
- **难度**：工程
- **前置**：E11.01、E11.03、E11.06
- **关联**：E08.07、E18.01、E16.01

### 概念解释

内存泄漏是失去可释放路径的动态资源仍未回收；悬空指针指向生命周期已结束的对象；双重释放则对同一未重新分配的存储重复释放。三者互有关联：提前 `free` 会制造悬空指针，覆盖唯一所有者会泄漏，而浅复制所有者可能导致双重释放。

这些问题都不能靠“地址是否非空”检测。防御重点是所有权唯一、失败出口完整、释放后状态明确，以及复制和别名受到约束。

### 语法要点

- 每次成功分配应有唯一的所有权承接点，每条返回路径要么保留有效所有者，要么释放或移交。
- 销毁函数可把成员置空，使同一销毁函数对空状态可重复调用；这只能保护该所有者对象，不能修复外部别名。
- 不要把资源指针随意复制到多个普通变量后都当作所有者；借用者应标注为不拥有，且使用期限不得超过所有者。
- `free` 后继续使用旧指针、再次 `free` 旧指针，或把指针值与仍有效的新分配混淆，均没有可靠的标准行为保证。
- 程序退出会由运行环境回收进程资源，但不能据此省略库函数和长期运行程序的清理，也不能替代文件关闭等具有数据语义的步骤。

### 使用场景

适合设计可重复销毁的资源对象、审查错误分支和排查浅复制问题。调试工具可以辅助发现具体路径，但不能代替类型级所有权契约和边界测试。

### 示例

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
} IntOwner;

static void owner_destroy(IntOwner *owner)
{
    if (owner != NULL)
    {
        free(owner->data);
        owner->data = NULL;
    }
}

int main(void)
{
    IntOwner owner = { NULL };
    owner.data = malloc(sizeof *owner.data);
    if (owner.data == NULL)
    {
        fputs("分配失败。\n", stderr);
        return 1;
    }

    *owner.data = 42;
    printf("值：%d\n", *owner.data);

    owner_destroy(&owner);
    owner_destroy(&owner);
    return 0;
}
```

### 注意事项

- 示例第二次销毁安全，是因为第一次将同一所有者的成员置空，`free(NULL)` 不执行操作；对普通局部指针重复 `free` 并不因此变安全。
- **危险：`IntOwner copy = owner; owner_destroy(&owner); owner_destroy(&copy);`** 两个所有者持有同一地址，第二个销毁会双重释放。
- 在返回、异常式跳转或循环提前退出前检查是否覆盖唯一指针；集中清理模式见 E11.06。
- 释放后不要把指针值用于“看看旧数据还在不在”，这本身已经是错误的生命周期访问。

### 常见问题

**问：把每个指针 `free` 后都设为 `NULL`，是否能彻底避免悬空和双重释放？**

答：不能。它只更新当前变量，其他别名仍保存旧地址；也可能有偏移指针和结构体副本。置空是局部防御措施，真正解决问题还需唯一所有权、复制限制和明确的生命周期边界。
