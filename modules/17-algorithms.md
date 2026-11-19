# M17 常见算法案例

> 本模块用可编译的 ISO C11/C17 示例分析常见查找、排序、链表、栈、队列和递归。每个算法都明确时间/空间复杂度、稳定性是否适用、输入前提以及空输入和容量边界，避免只给出能处理样例的代码。

## E17.01 时间复杂度、空间复杂度与输入规模

- **标签**：`复杂度` `性能` `循环` `边界检查`
- **难度**：入门
- **前置**：无
- **关联**：E17.02、E17.03、E17.07

### 概念解释

复杂度描述算法资源消耗随输入规模 `n` 增长的渐近趋势，而不是某台机器上的固定秒数。大 O 记号常用于上界分析，必须同时说明分析的是最坏、平均还是均摊情形，以及是否把比较、分配等操作视为常数时间。

时间复杂度不等于实际性能，空间复杂度也要区分输入本身占用与额外辅助空间。小输入下常数、缓存和内存分配可能比渐近阶更显著，最终仍需测量。

### 语法要点

- 单循环扫描 `n` 个元素通常为 `O(n)`；两重独立遍历仍为 `O(n)`，嵌套且内层每次执行 `O(n)` 才通常为 `O(n²)`。
- 每轮把候选区间减半的算法通常为 `O(log n)`，前提是减半操作本身成本有界。
- 原地算法强调只使用少量随输入变化不大的辅助空间，常写作额外空间 `O(1)`；递归调用栈必须计入空间。
- 查找、遍历等不重排元素的算法通常不讨论排序稳定性；本条最大值查找不改变数组，稳定性不适用。
- 边界分析必须包括 `n == 0`、最小/最大值和分配失败；不能只分析渐近式而忽略无法表示的索引或容量。

### 使用场景

选择线性扫描还是二分查找前，先估计数据量、是否有序和查询频率。若数据很少或只查询一次，为排序付出的 `O(n log n)` 成本未必值得；复杂度用于比较方案，不是盲目选择高阶结构的依据。

### 示例

查找最大值，前提是 `values` 指向至少 `count` 个有效 `int`，且 `count > 0`：

```c
#include <stddef.h>
#include <stdio.h>

static int find_max(const int *values, size_t count, int *result)
{
    size_t index;
    int maximum;

    if (values == NULL || result == NULL || count == 0) {
        return -1;
    }
    maximum = values[0];
    for (index = 1; index < count; ++index) {
        if (values[index] > maximum) {
            maximum = values[index];
        }
    }
    *result = maximum;
    return 0;
}

int main(void)
{
    int values[] = {7, 2, 9, 4};
    int maximum;

    if (find_max(values, sizeof values / sizeof values[0], &maximum) != 0) {
        fputs("invalid input\n", stderr);
        return 1;
    }
    printf("maximum=%d\n", maximum);
    return 0;
}
```

该算法最坏和最好时间均为 `O(n)`，额外空间 `O(1)`；空数组返回 `-1`，不会读取 `values[0]`。

### 注意事项

- 不要把“循环次数少”直接等同于低复杂度；若每轮处理的数据规模不同，应按实际总操作数求和。
- 递归算法若只写辅助数组大小而忽略调用栈，会低估空间使用。
- 对整数索引和字节数的运算可能先溢出，理论上的大数组未必能在当前实现中创建。

### 常见问题

**问：两个连续的 `O(n)` 循环是否等于 `O(n²)`？**

答：不是。连续执行的总操作量约为 `2n`，忽略常数后仍是 `O(n)`；只有嵌套且内层工作量随 `n` 增长时才可能达到 `O(n²)`。

## E17.02 线性查找与二分查找

- **标签**：`查找` `复杂度` `数组` `边界检查`
- **难度**：入门
- **前置**：E17.01
- **关联**：E18.02、E18.04

### 概念解释

线性查找逐项比较，适用于无序数据；二分查找每轮排除一半候选区间，但要求数据按与比较规则一致的顺序排列。二者都返回值的位置或“未找到”，不会改变数据，因此排序稳定性不适用。

二分查找的关键不是写法简短，而是维护“目标若存在，必在当前闭区间内”的不变量，并用不溢出的中点计算。

### 语法要点

- 线性查找：最好 `O(1)`，最坏与平均均为 `O(n)`，额外空间 `O(1)`；无排序前提，适用于数组和可顺序遍历结构。
- 二分查找：最好 `O(1)`，最坏 `O(log n)`，迭代实现额外空间 `O(1)`；前提是按升序或明确比较器排序的随机访问区间。
- 中点写 `low + (high - low) / 2`，避免 `low + high` 超出 `size_t`；区间缩小时确保 `low` 或 `high` 严格变化，防止死循环。
- 空区间返回未找到。若存在重复元素，本实现只保证返回任一匹配位置，不保证第一个或最后一个。
- 用 `SIZE_MAX` 作为“未找到”哨兵时，真实数组不可能有可寻址的该索引，但仍需文档化；需要同时表达输入错误与未找到时，可改用状态码加输出参数。

### 使用场景

小型无序配置列表用线性查找；大型已排序整数表且查询频繁时用二分查找。链表即使有序也不适合标准二分查找，因为按索引到达中点本身是 `O(n)`。

### 示例

```c
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

static size_t linear_search(const int *values, size_t count, int key)
{
    size_t index;

    if (values == NULL) {
        return SIZE_MAX;
    }
    for (index = 0; index < count; ++index) {
        if (values[index] == key) {
            return index;
        }
    }
    return SIZE_MAX;
}

static size_t binary_search(const int *values, size_t count, int key)
{
    size_t low = 0;
    size_t high = count;

    if (values == NULL) {
        return SIZE_MAX;
    }
    while (low < high) {
        size_t middle = low + (high - low) / 2;

        if (values[middle] < key) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    if (low < count && values[low] == key) {
        return low;
    }
    return SIZE_MAX;
}

int main(void)
{
    int sorted[] = {1, 3, 5, 7, 9};
    size_t count = sizeof sorted / sizeof sorted[0];
    size_t found = binary_search(sorted, count, 7);

    if (found == SIZE_MAX) {
        fputs("not found\n", stderr);
        return 1;
    }
    printf("binary index=%zu, linear index=%zu\n",
           found, linear_search(sorted, count, 7));
    return 0;
}
```

该二分实现使用半开区间 `[low, high)`，在重复元素中返回最左匹配位置；这是此实现的额外保证，不是所有二分查找自动具备的性质。

### 注意事项

- 数据未排序或排序比较规则与查找规则不一致时，二分结果没有保证；先验证前提。
- 用索引 `count` 作为“未找到”也可行，但调用方必须区分它与有效索引；不能未检查就用返回值访问数组。
- 二分查找不会验证数组是否真有序，该检查若每轮执行会额外花费 `O(n)`。

### 常见问题

**问：为什么中点不推荐写成 `(low + high) / 2`？**

答：当索引接近 `size_t` 上限时，加法可能回绕，随后得到错误中点并导致越界。`low + (high - low) / 2` 在 `low <= high` 时可避免这次加法溢出。

## E17.03 经典排序与标准库 qsort

- **标签**：`排序` `复杂度` `函数指针` `stdlib`
- **难度**：进阶
- **前置**：E17.01
- **关联**：E17.02、E18.03、E18.04

### 概念解释

排序把元素按严格一致的比较关系重排。冒泡、插入和选择排序适合教学与小规模数据；`qsort` 是 `<stdlib.h>` 提供的通用数组排序接口，通过元素大小和函数指针适配不同类型。

稳定性指相等元素的相对次序是否保持不变。对只含整数且相等值不可区分的数组，稳定性不易观察；对含键和其他字段的记录，它直接影响结果。

### 语法要点

| 算法 | 最好时间 | 最坏时间 | 额外空间 | 稳定性 |
|---|---:|---:|---:|---|
| 冒泡排序（严格大于才交换） | `O(n)`（带提前退出） | `O(n²)` | `O(1)` | 稳定 |
| 插入排序 | `O(n)` | `O(n²)` | `O(1)` | 稳定 |
| 选择排序（常规交换实现） | `O(n²)` | `O(n²)` | `O(1)` | 通常不稳定 |
| `qsort` | ISO C 未规定 | ISO C 未规定 | 实现决定 | 不保证稳定 |

- 常见 `qsort` 实现平均为 `O(n log n)`，但最坏时间和辅助空间取决于实现，不能把教材中某一种快速排序复杂度当成标准保证。
- 签名为 `void qsort(void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *));`；比较器按第一参数小于、等于、大于第二参数分别返回负、零、正值。
- 比较器必须对同一轮排序保持一致并满足传递性，不能读取随机数或修改排序元素。通用 `int` 比较器不能用可能溢出的相减法，应使用两次大小比较。
- 插入排序在已排序、空或单元素数组上正确处理；`qsort` 没有标准错误返回值，调用前必须自行保证数组区域和元素大小有效。

### 使用场景

教学、小型几乎有序数组可用插入排序；通用库接口和二进制数据排序可用 `qsort`。若必须保持相等记录原次序，应选稳定算法或在比较键中加入原始索引，不能假设 `qsort` 稳定。

### 示例

```c
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

static void insertion_sort(int *values, size_t count)
{
    size_t index;

    for (index = 1; index < count; ++index) {
        int current = values[index];
        size_t position = index;

        while (position > 0 && values[position - 1] > current) {
            values[position] = values[position - 1];
            --position;
        }
        values[position] = current;
    }
}

static int compare_ints(const void *left, const void *right)
{
    int a = *(const int *)left;
    int b = *(const int *)right;

    return (a > b) - (a < b);
}

int main(void)
{
    int first[] = {4, 1, 3, 1, 2};
    int second[] = {4, 1, 3, 1, 2};
    size_t count = sizeof first / sizeof first[0];
    size_t index;

    insertion_sort(first, count);
    qsort(second, count, sizeof second[0], compare_ints);
    for (index = 0; index < count; ++index) {
        if (first[index] != second[index]) {
            fputs("sort mismatch\n", stderr);
            return 1;
        }
        printf("%d%c", first[index], index + 1 == count ? '\n' : ' ');
    }
    return 0;
}
```

### 注意事项

- 比较器中的指针必须能转换为实际元素类型；错误元素大小或不对齐区域会破坏访问前提。
- 插入排序移动元素时只用 `>` 而不在相等时移动，才保持稳定性；改成 `>=` 会改变性质。
- 排序包含指针的目标时，是对指针值排序还是对其指向对象排序必须由比较器明确，不能混淆地址次序与内容次序。

### 常见问题

**问：`qsort` 是否总是比插入排序快？**

答：不是。大输入下其常见渐近复杂度更有利，但函数指针调用、常数因子和实现策略都有开销；小规模或几乎有序数据中，插入排序可能更快。应依据数据特征和基准测试选择。

## E17.04 单链表的插入、查找与销毁

- **标签**：`链表` `指针` `动态内存` `资源释放`
- **难度**：进阶
- **前置**：E17.01
- **关联**：M11 内存管理、E18.03

### 概念解释

单链表节点通过 `next` 指针串联，头指针表示整个序列。插入头节点只需改少量指针，但任意位置查找必须顺序前进；节点独立分配使所有权和释放成为算法正确性的一部分。

本例约定链表拥有节点，创建成功转移一个节点的所有权给链表，`list_free` 释放所有节点；节点的 `int` 值本身不拥有其他资源。

### 语法要点

- 头插：最坏时间 `O(1)`，额外空间 `O(1)`（不计新节点本身）；查找、按值删除和尾插（无尾指针）最坏 `O(n)`。
- 整表空间 `O(n)`，销毁时间 `O(n)`。链表不是排序算法，稳定性不适用；插入次序由具体操作决定。
- `push_front(struct node **head, int value)` 要求 `head` 指向有效头指针。分配失败返回 `-1`，原链表保持不变。
- 遍历时在释放当前节点前保存 `next`；释放后不能再读取 `current->next`。
- 空表用 `*head == NULL` 表示，查找空表返回空指针；销毁空表是无操作，销毁后把头指针置空以避免悬挂头引用。

### 使用场景

频繁在头部插入、元素数量不可预知且不要求随机访问时可用单链表。需要频繁按索引访问、良好缓存局部性或稳定迭代性能时，动态数组往往更合适。

### 示例

```c
#include <stdio.h>
#include <stdlib.h>

struct node {
    int value;
    struct node *next;
};

static int push_front(struct node **head, int value)
{
    struct node *created;

    if (head == NULL) {
        return -1;
    }
    created = malloc(sizeof *created);
    if (created == NULL) {
        return -1;
    }
    created->value = value;
    created->next = *head;
    *head = created;
    return 0;
}

static const struct node *find_node(const struct node *head, int value)
{
    const struct node *current = head;

    while (current != NULL) {
        if (current->value == value) {
            return current;
        }
        current = current->next;
    }
    return NULL;
}

static void list_free(struct node **head)
{
    struct node *current;

    if (head == NULL) {
        return;
    }
    current = *head;
    while (current != NULL) {
        struct node *next = current->next;

        free(current);
        current = next;
    }
    *head = NULL;
}

int main(void)
{
    struct node *head = NULL;

    if (push_front(&head, 3) != 0 ||
        push_front(&head, 2) != 0 ||
        push_front(&head, 1) != 0) {
        fputs("allocation failed\n", stderr);
        list_free(&head);
        return 1;
    }
    if (find_node(head, 2) == NULL) {
        fputs("node not found\n", stderr);
        list_free(&head);
        return 1;
    }
    printf("head=%d\n", head->value);
    list_free(&head);
    return 0;
}
```

### 注意事项

- 多步头插失败时必须释放已建立的部分链表；不能把局部头指针直接丢弃。
- `find_node` 返回的指针由链表拥有，调用方不得单独 `free`；链表销毁后该结果也失效。
- 若节点含动态字符串等拥有型成员，销毁函数还需逐层释放，不能只释放节点外壳。

### 常见问题

**问：为什么销毁循环要先保存 `next`？**

答：`free(current)` 后，`current` 指向的对象生命周期结束，再读取 `current->next` 就是使用已释放内存。先保存后继地址可在释放当前节点后继续遍历。

## E17.05 固定容量数组栈

- **标签**：`栈` `数组` `边界检查` `复杂度`
- **难度**：入门
- **前置**：E17.01
- **关联**：E17.06、E18.02

### 概念解释

栈是后进先出（LIFO）结构，只在栈顶插入和删除。用连续数组加元素计数实现时，`push` 和 `pop` 都可在常数时间完成，且不需要逐节点分配。

容量在编译期固定使内存契约简单，但满栈是必须处理的正常边界，不能用越界写入扩展容量。

### 语法要点

- `push`：时间与额外空间均为 `O(1)`；满时返回失败且不修改栈。`pop`/`top`：`O(1)`；空时返回失败且不写输出。
- 整个栈存储为 `O(capacity)`，本例容量固定，空间不随当前元素数动态增长。
- 栈维护插入和取出次序，但不是排序算法，稳定性不适用；其可观察语义是 LIFO。
- `size` 必须始终满足 `size <= capacity`。入栈写 `items[size]` 后再递增，出栈先递减再读取。
- 固定数组无需 `free`，但含拥有型元素的通用栈在弹出或销毁时仍须管理元素资源。

### 使用场景

表达式求值、撤销记录和有限深度解析都适合栈。若容量不可预测或可能很深，应使用经过溢出检查的动态数组；不能通过加大局部数组无限解决，因为栈帧资源有限。

### 示例

```c
#include <stddef.h>
#include <stdio.h>

#define STACK_CAPACITY 4

struct int_stack {
    int items[STACK_CAPACITY];
    size_t size;
};

static int stack_push(struct int_stack *stack, int value)
{
    if (stack == NULL || stack->size == STACK_CAPACITY) {
        return -1;
    }
    stack->items[stack->size] = value;
    ++stack->size;
    return 0;
}

static int stack_pop(struct int_stack *stack, int *value)
{
    if (stack == NULL || value == NULL || stack->size == 0) {
        return -1;
    }
    --stack->size;
    *value = stack->items[stack->size];
    return 0;
}

int main(void)
{
    struct int_stack stack = {{0}, 0};
    int value = 0;

    if (stack_push(&stack, 10) != 0 ||
        stack_push(&stack, 20) != 0 ||
        stack_push(&stack, 30) != 0) {
        fputs("push failed\n", stderr);
        return 1;
    }
    if (stack_pop(&stack, &value) != 0) {
        fputs("pop failed\n", stderr);
        return 1;
    }
    printf("popped=%d, remaining=%zu\n", value, stack.size);
    return 0;
}
```

### 注意事项

- 检查满栈应使用 `size >= STACK_CAPACITY` 可增强对损坏状态的防御；本例以不变量保证不超过，因此用相等判断。不要写入 `items[STACK_CAPACITY]`。
- 出栈失败时输出参数保持不变；调用方不能忽略状态后继续使用旧值。
- 固定容量对象若很大，不宜作为局部变量放在有限调用栈中；可选择静态存储或动态分配并明确生命周期。

### 常见问题

**问：栈满时能否直接覆盖最旧元素？**

答：那会改变栈语义并静默丢失数据，除非需求明确是有界覆盖缓冲区。普通栈应返回满状态或按受控策略扩容，让调用方决定如何处理。

## E17.06 环形缓冲区队列

- **标签**：`队列` `数组` `边界检查` `复杂度`
- **难度**：进阶
- **前置**：E17.05
- **关联**：E17.02、E18.04

### 概念解释

队列是先进先出（FIFO）结构。环形缓冲区把固定数组的末尾逻辑连接回开头，用 `head` 指向最旧元素、`count` 记录元素数，从而避免每次出队都移动剩余元素。

单独比较头尾索引常难以区分空和满；显式维护 `count` 可让两种状态清晰，并使空满检查都只涉及计数。

### 语法要点

- `enqueue` 与 `dequeue` 时间均为 `O(1)`，额外操作空间 `O(1)`，整个缓冲区空间 `O(capacity)`。
- 队尾位置为 `(head + count) % capacity`；因为 `count < capacity` 且索引有界，本例固定小容量下加法安全。通用大容量实现须证明 `head + count` 不溢出。
- 入队在满时失败且不改状态；出队在空时失败且不写输出。成功出队后执行 `head = (head + 1) % capacity` 并减少计数。
- 队列保持插入顺序，但“排序稳定性”不适用于队列操作；其顺序契约是 FIFO。
- `capacity` 必须大于零，否则取模为零属于未定义行为。本例由非零编译期常量保证。

### 使用场景

生产者与消费者之间有明确容量上限的事件队列、串口字节缓冲区和任务调度队列适合环形实现。若满队列不能丢数据，应由上层提供阻塞、背压或扩容策略，本例只返回失败。

### 示例

```c
#include <stddef.h>
#include <stdio.h>

#define QUEUE_CAPACITY 4

struct int_queue {
    int items[QUEUE_CAPACITY];
    size_t head;
    size_t count;
};

static int queue_enqueue(struct int_queue *queue, int value)
{
    size_t tail;

    if (queue == NULL || queue->count == QUEUE_CAPACITY) {
        return -1;
    }
    tail = (queue->head + queue->count) % QUEUE_CAPACITY;
    queue->items[tail] = value;
    ++queue->count;
    return 0;
}

static int queue_dequeue(struct int_queue *queue, int *value)
{
    if (queue == NULL || value == NULL || queue->count == 0) {
        return -1;
    }
    *value = queue->items[queue->head];
    queue->head = (queue->head + 1) % QUEUE_CAPACITY;
    --queue->count;
    return 0;
}

int main(void)
{
    struct int_queue queue = {{0}, 0, 0};
    int value = 0;

    queue_enqueue(&queue, 1);
    queue_enqueue(&queue, 2);
    queue_enqueue(&queue, 3);
    if (queue_dequeue(&queue, &value) != 0 || value != 1) {
        fputs("queue mismatch\n", stderr);
        return 1;
    }
    if (queue_enqueue(&queue, 4) != 0 || queue_enqueue(&queue, 5) != 0) {
        fputs("enqueue failed\n", stderr);
        return 1;
    }
    while (queue_dequeue(&queue, &value) == 0) {
        printf("%d\n", value);
    }
    return 0;
}
```

### 注意事项

- 示例主函数的前三次入队在容量内且状态已初始化，因此省略逐项失败分支；公共接口仍始终返回状态，实际工程应统一检查。
- 多线程生产者/消费者不能仅靠 `head` 和 `count` 的无锁读写保证安全；ISO C 普通对象的数据竞争是未定义行为，需要同步或专门原子设计。
- 取模保持索引在容量内，但不会检查对象指针是否有效，也不会自动处理满队列策略。

### 常见问题

**问：为什么环形队列需要单独的 `count`？**

答：它直接区分空与满，并让长度查询为 `O(1)`。也可牺牲一个槽位用头尾关系区分，但那是另一种不变量；两种方案不能混用，否则边界判断会错误。

## E17.07 递归阶乘与边界控制

- **标签**：`递归` `复杂度` `整数` `边界检查`
- **难度**：入门
- **前置**：E17.01
- **关联**：E17.02、E18.04

### 概念解释

递归通过把问题分解为更小同类问题，并在基准情形直接返回来终止。阶乘满足 `0! = 1`、`n! = n × (n-1)!`，适合展示递归结构；同时它也揭示递归深度和整数范围是两个独立边界。

代码能递归表达不代表适合任意深度。ISO C 不保证尾调用优化，深层递归会消耗调用栈并可能导致程序失败。

### 语法要点

- 每次递归必须让输入严格接近基准情形，并确保基准分支不再递归；否则无法按预期终止。
- 本例递归阶乘时间 `O(n)`，额外调用栈空间 `O(n)`；迭代实现可把辅助空间降为 `O(1)`。
- 阶乘不是排序或查找，稳定性不适用。输入前提由公开包装限定为 `0 <= n <= 12`。
- `unsigned long` 在 ISO C 中至少可表示到 `4294967295`，因此 `12! = 479001600` 可表示；更大的 `n` 被保守拒绝，避免无符号回绕。
- 基准边界 `0!` 和 `1!` 都返回 `1`；负数不是阶乘输入，输出指针为空也返回失败。

### 使用场景

递归适合树、分治和自然嵌套结构；阶乘更适合作为教学案例，生产代码可用迭代。若递归深度由外部输入决定，应设置明确上限、改迭代或使用显式栈，并处理内存失败。

### 示例

```c
#include <stdio.h>

static unsigned long factorial_recursive(unsigned int value)
{
    if (value <= 1) {
        return 1;
    }
    return (unsigned long)value * factorial_recursive(value - 1);
}

static int checked_factorial(int input, unsigned long *result)
{
    if (result == NULL || input < 0 || input > 12) {
        return -1;
    }
    *result = factorial_recursive((unsigned int)input);
    return 0;
}

int main(void)
{
    unsigned long result = 0;

    if (checked_factorial(10, &result) != 0) {
        fputs("factorial input must be in 0..12\n", stderr);
        return 1;
    }
    printf("10!=%lu\n", result);
    return 0;
}
```

### 注意事项

- 本例限制 `12` 是可移植的保守接口选择，不表示每个平台都只能算到 `12!`；若扩展范围，应依据实际类型上限做乘前检查。
- 无符号溢出会回绕而非自动报错，不能靠结果变小可靠检测；必须在运算前验证。
- 把递归改为迭代并不自动解决整数范围问题，两类边界都要分别处理。

### 常见问题

**问：递归函数最终返回了正确样例，是否就证明它会终止？**

答：不能。需要论证每层都缩小问题、覆盖所有基准情形，并限制资源消耗。一个样例不会覆盖负输入、极端深度或错误的中间状态，应该配合边界测试和不变量分析。
