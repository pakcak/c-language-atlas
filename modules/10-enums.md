# M10 枚举

> 本模块说明如何用枚举表达封闭集合、稳定编号、互斥状态和位标志。学完后应能定义枚举及显式值，理解 C11/C17 中枚举常量与枚举对象类型的区别，验证外部输入，构建可检查的状态机，并在需要组合选项时正确使用无符号位掩码。

## E10.01 枚举常量与可读的分支逻辑

- **标签**：`枚举` `类型系统` `分支` `声明与定义`
- **难度**：入门
- **前置**：E04.02、E09.01
- **关联**：E10.02、E10.04、E09.04

### 概念解释

枚举为一组相关整数常量提供语义名称，使代码用“状态是什么”而不是“数字是多少”表达逻辑。它适合有限且互斥的类别，例如方向、消息种类和连接状态；与普通宏数字相比，枚举常量能进入调试器和类型上下文，并让 `switch` 结构更清楚。

枚举并不会自动把任意整数限制为已列出的常量。调用者仍可把其他整数值转换或存入枚举对象，因此公共接口仍需验证输入和防御未知状态。

### 语法要点

- `enum TrafficLight { TRAFFIC_RED, TRAFFIC_GREEN, TRAFFIC_YELLOW };` 默认从 `0` 开始依次增加。
- 使用 `typedef enum { ... } Type;` 可建立不带标签的枚举别名；需要前向声明或递归引用时通常保留 `enum Tag`。
- 枚举常量可用在 `case` 标签中，因为它们是整数常量表达式。
- `switch` 应覆盖所有正常状态，并用 `default` 处理损坏值、外部输入或未来新增值；不要因为当前只有几个常量就假设值永远合法。
- 枚举常量在同一作用域内必须名称唯一，通常使用模块或类型前缀避免冲突。

### 使用场景

适合状态机、配置模式、错误类别和带标签联合体的判别字段。若选项可以同时存在，应使用位标志而不是互斥枚举；若集合会由用户无限扩展，应使用字符串或标识符注册机制。

### 示例

```c
#include <stdio.h>

typedef enum {
    TRAFFIC_RED,
    TRAFFIC_GREEN,
    TRAFFIC_YELLOW
} TrafficLight;

static const char *light_name(TrafficLight light)
{
    switch (light)
    {
        case TRAFFIC_RED:
            return "红灯";
        case TRAFFIC_GREEN:
            return "绿灯";
        case TRAFFIC_YELLOW:
            return "黄灯";
        default:
            return "未知状态";
    }
}

int main(void)
{
    TrafficLight light = TRAFFIC_GREEN;
    printf("当前：%s\n", light_name(light));

    light = TRAFFIC_YELLOW;
    printf("下一状态：%s\n", light_name(light));
    return 0;
}
```

### 注意事项

- `default` 能防御未知值，但不应掩盖程序内部不变量被破坏；工程代码可记录错误或返回失败。
- 枚举名称只是源码标识，不会自动成为可打印字符串；需要显式映射表或转换函数。
- 不要为了少写 `default` 而让非法值进入正常分支；文件和网络输入必须先验证，见 E10.03。
- 枚举常量默认可被其他模块看到，命名应带稳定前缀，避免通用名称如 `OPEN` 与平台宏冲突。

### 常见问题

**问：用了枚举后，变量是否只能保存列表中的值？**

答：不是。枚举提高可读性并提供整数类型语义，但不是运行时封闭容器。特别是从外部读取整数或经历内存损坏后，仍要通过白名单或范围检查确认其有效性。

## E10.02 底层类型、显式值与数值边界

- **标签**：`枚举` `整数` `类型转换` `可移植性` `实现定义`
- **难度**：进阶
- **前置**：E10.01、E02.02
- **关联**：E10.03、E10.05、E12.06

### 概念解释

在 C11/C17 中，枚举常量标识符的类型是 `int`，其值必须能用 `int` 表示；一个完整枚举对象类型则与某种能够表示所有枚举值的整数类型兼容，具体选择由实现决定。因此不能把“枚举常量是 `int`”误读成“所有枚举变量都必然与 `int` 大小相同”。

显式值适合稳定协议编号，但自动递增和强制转换仍受整数边界约束。可移植代码不应假设 `sizeof(enum Type) == sizeof(int)`，也不应把任意整数强转后当成合法枚举。

### 语法要点

- `enum Code { CODE_MIN = -2, CODE_NEXT, CODE_MAX = 10 };` 中 `CODE_NEXT` 自动为 `-1`。
- 显式值可以重复，例如 `MODE_OFF = 0, MODE_DISABLED = 0`；这表示别名而非两个可区分状态。
- 自动递增若无法在 C11/C17 的 `int` 中表示，就不符合枚举常量约束，不应依赖编译器扩展接受它。
- 枚举对象大小、对齐和兼容整数类型由实现选择；跨文件或跨 ABI 保存时应使用明确的固定宽度整数和合法值映射。
- 把整数转换为枚举对象并不自动完成白名单验证；无法表示或不在业务集合内的值不能依靠枚举类型本身修复。

### 使用场景

适合定义稳定 API 编号、紧凑错误码和自动序列。需要超过 `int` 的超大枚举值或固定底层类型时，C11/C17 不提供相应标准语法，应改用固定宽度整数常量或升级并明确目标语言版本。

### 示例

```c
#include <stdio.h>

enum ResultCode {
    RESULT_FAILURE = -1,
    RESULT_OK = 0,
    RESULT_RETRY = 2,
    RESULT_RETRY_LATER
};

int main(void)
{
    enum ResultCode code = RESULT_RETRY_LATER;

    printf("RESULT_FAILURE=%d\n", RESULT_FAILURE);
    printf("RESULT_RETRY=%d\n", RESULT_RETRY);
    printf("RESULT_RETRY_LATER=%d\n", RESULT_RETRY_LATER);
    printf("枚举对象大小（由实现决定）：%zu\n", sizeof code);
    return 0;
}
```

### 注意事项

- **危险：假设枚举总是一字节或总是四字节。** 这种假设会破坏结构体布局、二进制格式和不同 ABI 之间的接口。
- 显式值一旦用于持久化或通信，就属于外部契约；插入自动递增常量可能意外改变后续值。
- 即使转换后的数值可表示，也可能没有任何对应枚举常量；对外部值仍应逐项验证。
- 标志位值不断左移时尤其容易超过 `int` 范围，应按 E10.05 使用无符号整数集合。

### 常见问题

**问：C11/C17 能否像某些其他语言一样写 `enum X : uint8_t` 固定底层类型？**

答：不能，这不是 ISO C11/C17 语法。若格式要求明确宽度，应把传输字段定义成 `uint8_t` 等合适整数类型，再通过转换函数验证并映射到枚举。

## E10.03 外部整数到枚举的白名单验证

- **标签**：`枚举` `输入验证` `类型转换` `序列化` `错误处理`
- **难度**：进阶
- **前置**：E10.01、E10.02、E07.05
- **关联**：E12.03、E12.06、E09.04

### 概念解释

枚举值跨越程序边界时就变成不可信整数：文件可能损坏，旧版本可能不认识新编号，调用方也可能传入任意值。安全做法是先以明确的整数类型接收，再通过白名单映射到内部枚举，而不是先强制转换再假设它合法。

白名单映射把“数值可表示”和“业务上有效”分开，也让协议编号与内部枚举顺序解耦。解析失败时应保留输出不变或返回明确错误。

### 语法要点

- 转换函数可采用 `bool mode_from_long(long input, Mode *out)`，成功时写入 `*out`，失败返回 `false`。
- 在 `switch (input)` 中逐项接受协议值，避免对尚未验证的 `input` 先写 `(Mode)input`。
- 输出参数为空时返回失败；失败路径不写入 `*out`，使调用者可以保留默认模式。
- 反向映射函数对未知内部枚举也应有 `default`，返回错误码或 `"unknown"`，不能读越界名称表。
- 若使用“最大值 + 数量”哨兵做范围验证，还要确认显式值连续且无别名；不连续枚举必须逐项白名单检查。

### 使用场景

适合读取配置模式、消息类型和持久化状态。内部已建立不变量且没有外部输入的路径可共享同一验证函数；不要为了性能省掉边界处的验证。

### 示例

```c
#include <stdbool.h>
#include <stdio.h>

typedef enum {
    MODE_ECHO = 1,
    MODE_REVERSE = 2
} Mode;

static bool mode_from_long(long input, Mode *output)
{
    if (output == NULL)
    {
        return false;
    }

    switch (input)
    {
        case 1:
            *output = MODE_ECHO;
            return true;
        case 2:
            *output = MODE_REVERSE;
            return true;
        default:
            return false;
    }
}

static const char *mode_name(Mode mode)
{
    switch (mode)
    {
        case MODE_ECHO:
            return "echo";
        case MODE_REVERSE:
            return "reverse";
        default:
            return "unknown";
    }
}

int main(void)
{
    const long inputs[] = { 1, 3 };

    for (size_t i = 0; i < sizeof inputs / sizeof inputs[0]; ++i)
    {
        Mode mode;
        if (mode_from_long(inputs[i], &mode))
        {
            printf("%ld -> %s\n", inputs[i], mode_name(mode));
        }
        else
        {
            printf("%ld -> 拒绝\n", inputs[i]);
        }
    }
    return 0;
}
```

### 注意事项

- 协议中的 `1`、`2` 与内部枚举当前值相同是示例的简化；需要独立演进时，应分别定义协议编号和内部枚举并显式映射。
- **危险：`*output = (Mode)input;` 后再使用。** 转换不等于验证，非法值可能已经进入后续状态机或联合体分支。
- 不要用 `mode_name` 的名称数组直接以未经检查的枚举值索引，否则可能越界读取。
- 失败时是否重置输出属于接口契约，示例选择保持不变，调用者必须检查布尔返回值。

### 常见问题

**问：如果枚举值从 0 连续到 3，是否只做 `value >= 0 && value <= 3` 就够了？**

答：在连续、无别名且范围契约稳定时可以作为范围检查，但仍建议集中在一个映射函数中。显式值一旦变得不连续，纯范围检查会接受空洞编号，逐项白名单更不容易被后续修改破坏。

## E10.04 用枚举实现显式状态机

- **标签**：`枚举` `状态机` `分支` `输入验证` `错误处理`
- **难度**：进阶
- **前置**：E10.01、E05.02
- **关联**：E08.05、E10.03、E17.05

### 概念解释

状态机把系统当前状态、外部事件和允许转移写成明确规则。枚举适合表示有限状态与事件，转移函数集中决定“在某状态收到某事件后是否改变”，避免分散的条件语句产生不可能组合。

可靠状态机不仅定义正常路径，还要处理非法事件、重复事件和损坏状态。转移失败时应保持原状态，并返回可检查的错误，而不是悄悄跳到任意分支。

### 语法要点

- 分别定义 `State` 和 `Event` 枚举，再用 `bool advance(State *state, Event event)` 接收当前状态地址和事件。
- 在写入 `*state` 前完成参数和转移合法性检查，使失败具有“不改变状态”的事务语义。
- `switch` 可嵌套表达每个状态接受的事件，也可使用二维转移表；表驱动方式必须验证索引边界。
- `default` 处理未知状态或事件，返回 `false`；不要把未知输入当作某个正常事件。
- 若转移伴随资源操作，资源失败与状态更新应有一致顺序：要么成功后提交状态，要么失败并清理，不能只更新一半。

### 使用场景

适合连接管理、解析器阶段、设备控制和工作流审批。状态数量很大、层次复杂或需要并发转移时，可能需要表驱动或专门框架，但枚举和明确转移仍是基础。

### 示例

```c
#include <stdbool.h>
#include <stdio.h>

typedef enum {
    STATE_DISCONNECTED,
    STATE_CONNECTING,
    STATE_CONNECTED
} State;

typedef enum {
    EVENT_START,
    EVENT_SUCCESS,
    EVENT_FAILURE,
    EVENT_DISCONNECT
} Event;

static bool advance(State *state, Event event)
{
    if (state == NULL)
    {
        return false;
    }

    switch (*state)
    {
        case STATE_DISCONNECTED:
            if (event == EVENT_START)
            {
                *state = STATE_CONNECTING;
                return true;
            }
            break;
        case STATE_CONNECTING:
            if (event == EVENT_SUCCESS)
            {
                *state = STATE_CONNECTED;
                return true;
            }
            if (event == EVENT_FAILURE)
            {
                *state = STATE_DISCONNECTED;
                return true;
            }
            break;
        case STATE_CONNECTED:
            if (event == EVENT_DISCONNECT)
            {
                *state = STATE_DISCONNECTED;
                return true;
            }
            break;
        default:
            break;
    }
    return false;
}

int main(void)
{
    State state = STATE_DISCONNECTED;
    const Event events[] = {
        EVENT_START, EVENT_SUCCESS, EVENT_DISCONNECT, EVENT_SUCCESS
    };

    for (size_t i = 0; i < sizeof events / sizeof events[0]; ++i)
    {
        bool changed = advance(&state, events[i]);
        printf("事件 %d：%s，当前状态 %d\n",
               (int)events[i], changed ? "已转移" : "拒绝", (int)state);
    }
    return 0;
}
```

### 注意事项

- 示例只保存状态，不执行真实网络操作；有副作用的状态机必须设计操作失败后的回滚或补偿，不能让状态与资源脱节。
- 非法事件返回 `false` 后原状态不变，调用者不能用状态值是否变化猜测接口是否执行成功。
- **危险：用事件枚举直接索引固定表而不检查范围。** 外部事件可能超出数组边界，必须先验证或使用安全分支。
- 多线程共享状态时，单次函数内的检查并不自动提供线程安全，需要同步或消息串行化设计。

### 常见问题

**问：状态机中是否应该总是忽略不支持的事件？**

答：不应一概忽略。忽略可能适合某些容错协议，但安全控制和工作流通常需要报告非法转移。关键是策略明确且状态一致；示例选择返回 `false` 并保留状态，让调用者决定如何记录或重试。

## E10.05 枚举式位标志与组合选项

- **标签**：`枚举` `位运算` `整数` `边界检查` `未定义行为`
- **难度**：进阶
- **前置**：E10.02、E03.04
- **关联**：E09.06、E12.01

### 概念解释

互斥枚举表示“只能是其中一个”，位标志表示“可以同时有多个”。每个标志占一个独立位，集合用无符号整数保存，通过按位或添加、按位与检测、按位与加取反清除。

虽然常用枚举常量命名这些掩码，保存组合的变量不应被当作互斥枚举值处理。位运算的操作数类型、符号和移位宽度直接影响正确性，因此通常使用 `unsigned int` 或明确宽度的无符号类型。

### 语法要点

- 定义 `PERM_READ = 1U << 0`、`PERM_WRITE = 1U << 1`，每个标志只含一个置位。
- `set |= flag` 添加标志，`set &= ~flag` 清除标志，`set ^= flag` 切换标志。
- 检测“至少一个”用 `(set & flags) != 0`；检测“全部具备”用 `(set & flags) == flags`。
- 移位计数必须非负且小于左操作数类型的位宽；`1U << 32` 在 32 位 `unsigned int` 上是未定义行为。
- 组合值通常不是任何已命名枚举常量，因此不要写只接受单个标志的 `switch`，应使用位检测。

### 使用场景

适合文件访问选项、权限集合、功能开关和解析器选项。若选项有复杂互斥或依赖关系，位掩码只能保存集合，仍需额外验证其组合是否合法。

### 示例

```c
#include <stdbool.h>
#include <stdio.h>

enum Permission {
    PERMISSION_READ = 1U << 0,
    PERMISSION_WRITE = 1U << 1,
    PERMISSION_EXECUTE = 1U << 2
};

typedef unsigned int PermissionSet;

static bool has_all(PermissionSet actual, PermissionSet required)
{
    return (actual & required) == required;
}

int main(void)
{
    PermissionSet permissions = PERMISSION_READ | PERMISSION_WRITE;

    printf("可读写：%s\n",
           has_all(permissions, PERMISSION_READ | PERMISSION_WRITE)
               ? "是" : "否");

    permissions &= ~(PermissionSet)PERMISSION_WRITE;
    permissions |= PERMISSION_EXECUTE;
    printf("当前掩码：%u\n", permissions);
    return 0;
}
```

### 注意事项

- 取反会产生高位掩码，但按位与只清除目标位；保持集合变量为无符号类型可避免有符号位移的额外问题。
- **危险：用等号判断某个标志。** `set == PERMISSION_READ` 会在同时含其他标志时失败，应使用 `(set & PERMISSION_READ) != 0`。
- 标志值必须是二次幂；普通连续枚举 `0, 1, 2, 3` 不能直接当独立位掩码。
- 接收外部掩码时可用 `set & ~KNOWN_FLAGS` 检查未知位，但要先明确整数宽度和版本兼容策略。

### 常见问题

**问：为什么位标志常从 `1U << 0` 开始，而不是从 0、1、2 开始赋值？**

答：掩码的实际数值应是 1、2、4、8 等二次幂，才能各占一位。枚举常量 0、1、2 只是序号；如果直接把 2 当作掩码，它会与第二个位重叠，而 3 已包含两个位，不能作为独立标志。
