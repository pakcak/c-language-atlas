# C 语言资料库 · 全量条目索引

> 本文件由 `tools/build_index.py` 从 `modules/*.md` 自动生成，请勿手工修改条目表。

- 模块：**18**
- 条目：**107**
- 标签：**85**
- 生成时间：2026-11-19 12:26:11

按编号点击可在离线查阅页中打开对应条目；也可直接在 `modules/` 中搜索稳定编号。

## 模块与条目

### M01 基础语法（5 条）

本模块从第一个可运行程序出发，说明 C 源文件的基本组织方式、`main` 的入口约定、声明与语句的区别，以及最基础的标准输入输出。学完后应能编写、读懂并检查一个小型控制台程序，而不是只记住若干语法符号。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E01.01](index.html?entry=E01.01) | 第一个 C 程序与基本结构 | 入门 | `程序结构` `编译` `链接` `stdio` | [01-program-basics.md](modules/01-program-basics.md) |
| [E01.02](index.html?entry=E01.02) | main 函数与程序入口 | 入门 | `程序结构` `返回值` `参数传递` | [01-program-basics.md](modules/01-program-basics.md) |
| [E01.03](index.html?entry=E01.03) | 声明、定义、语句与代码块 | 入门 | `声明与定义` `作用域` `初始化` `未初始化` | [01-program-basics.md](modules/01-program-basics.md) |
| [E01.04](index.html?entry=E01.04) | 使用 printf 进行格式化输出 | 入门 | `stdio` `表达式` `类型转换` `未定义行为` | [01-program-basics.md](modules/01-program-basics.md) |
| [E01.05](index.html?entry=E01.05) | 使用 scanf 读取基本输入 | 入门 | `stdio` `输入验证` `类型转换` `未定义行为` | [01-program-basics.md](modules/01-program-basics.md) |

### M02 数据类型（6 条）

本模块解释 C 如何表示整数、浮点数、字符和布尔值，以及对象初始化、大小查询、范围检查和类型转换的规则。学完后应能选择合适类型、编写可移植的格式化代码，并识别溢出、精度损失和未定义行为。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E02.01](index.html?entry=E02.01) | 整数类型、范围与溢出 | 入门 | `整数` `类型系统` `溢出` `整数溢出` `可移植性` | [02-data-types.md](modules/02-data-types.md) |
| [E02.02](index.html?entry=E02.02) | 浮点类型、精度与特殊值 | 入门 | `浮点数` `类型系统` `比较` `可移植性` | [02-data-types.md](modules/02-data-types.md) |
| [E02.03](index.html?entry=E02.03) | 字符类型与布尔值 | 入门 | `字符` `类型系统` `比较` `实现定义` | [02-data-types.md](modules/02-data-types.md) |
| [E02.04](index.html?entry=E02.04) | 字面常量、const 对象与初始化 | 入门 | `初始化` `类型系统` `声明与定义` `未初始化` | [02-data-types.md](modules/02-data-types.md) |
| [E02.05](index.html?entry=E02.05) | sizeof、limits 与类型能力查询 | 入门 | `类型系统` `可移植性` `整数` `浮点数` | [02-data-types.md](modules/02-data-types.md) |
| [E02.06](index.html?entry=E02.06) | 类型转换、通常算术转换与定宽整数 | 进阶 | `类型转换` `整数` `可移植性` `实现定义` `未定义行为` | [02-data-types.md](modules/02-data-types.md) |

### M03 运算符（5 条）

本模块说明运算符如何组成表达式、何时产生副作用，以及类型转换、求值顺序和优先级如何共同决定结果。学完后应能安全使用算术、逻辑、自增和位运算，并主动识别溢出、非法移位与未排序副作用。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E03.01](index.html?entry=E03.01) | 算术运算符与赋值运算符 | 入门 | `表达式` `赋值` `整数溢出` `未定义行为` | [03-operators.md](modules/03-operators.md) |
| [E03.02](index.html?entry=E03.02) | 关系、相等与逻辑运算符 | 入门 | `表达式` `比较` `分支` `浮点数` | [03-operators.md](modules/03-operators.md) |
| [E03.03](index.html?entry=E03.03) | 自增、自减与副作用排序 | 进阶 | `表达式` `赋值` `未定义行为` `循环` | [03-operators.md](modules/03-operators.md) |
| [E03.04](index.html?entry=E03.04) | 位运算、掩码与移位 | 进阶 | `位运算` `整数` `实现定义` `未定义行为` | [03-operators.md](modules/03-operators.md) |
| [E03.05](index.html?entry=E03.05) | 优先级、结合性与条件运算符 | 进阶 | `表达式` `优先级` `分支` `未定义行为` | [03-operators.md](modules/03-operators.md) |

### M04 控制结构（5 条）

本模块介绍选择、循环和跳转语句，重点说明条件语义、循环边界、`break`/`continue` 的作用范围及结构化设计。学完后应能把明确的状态转换写成可读控制流，并避免空悬 `else`、意外贯穿和无限循环。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E04.01](index.html?entry=E04.01) | if 与 else 条件分支 | 入门 | `分支` `比较` `作用域` | [04-control-flow.md](modules/04-control-flow.md) |
| [E04.02](index.html?entry=E04.02) | switch、case 与贯穿 | 入门 | `分支` `比较` `整数` | [04-control-flow.md](modules/04-control-flow.md) |
| [E04.03](index.html?entry=E04.03) | while 与 for 循环 | 入门 | `循环` `比较` `初始化` | [04-control-flow.md](modules/04-control-flow.md) |
| [E04.04](index.html?entry=E04.04) | do while、break 与 continue | 入门 | `循环` `分支` `输入验证` | [04-control-flow.md](modules/04-control-flow.md) |
| [E04.05](index.html?entry=E04.05) | goto、return 与结构化流程 | 进阶 | `程序结构` `分支` `循环` `错误处理` | [04-control-flow.md](modules/04-control-flow.md) |

### M05 函数（5 条）

本模块说明如何用函数声明和定义建立清晰接口，理解值传递、作用域与存储期，并设计递归、参数和返回值。学完后应能把问题拆成可测试的小函数，明确输入、输出、错误契约及对象生命周期。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E05.01](index.html?entry=E05.01) | 函数声明、原型与定义 | 入门 | `声明与定义` `程序结构` `参数传递` `返回值` | [05-functions.md](modules/05-functions.md) |
| [E05.02](index.html?entry=E05.02) | 值传递与参数求值 | 入门 | `参数传递` `返回值` `表达式` `未定义行为` | [05-functions.md](modules/05-functions.md) |
| [E05.03](index.html?entry=E05.03) | 作用域、链接与存储期 | 进阶 | `作用域` `生命周期` `声明与定义` `初始化` | [05-functions.md](modules/05-functions.md) |
| [E05.04](index.html?entry=E05.04) | 递归、终止条件与调用成本 | 进阶 | `递归` `返回值` `性能` | [05-functions.md](modules/05-functions.md) |
| [E05.05](index.html?entry=E05.05) | 参数、返回值与错误契约设计 | 进阶 | `参数传递` `返回值` `错误处理` `边界检查` | [05-functions.md](modules/05-functions.md) |

### M06 数组（5 条）

本模块介绍数组的连续存储、初始化和边界规则，说明数组参数为何退变为指针，并扩展到多维数组与变长数组。学完后应能安全传递数组及长度、遍历每一维，并避免越界、错误长度计算和不受控的 VLA。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E06.01](index.html?entry=E06.01) | 一维数组、元素布局与初始化 | 入门 | `数组` `初始化` `生命周期` `未初始化` | [06-arrays.md](modules/06-arrays.md) |
| [E06.02](index.html?entry=E06.02) | 数组遍历、长度计算与边界检查 | 入门 | `数组` `边界检查` `越界` `未定义行为` | [06-arrays.md](modules/06-arrays.md) |
| [E06.03](index.html?entry=E06.03) | 数组参数退变与显式长度传递 | 进阶 | `数组` `指针` `参数传递` `边界检查` | [06-arrays.md](modules/06-arrays.md) |
| [E06.04](index.html?entry=E06.04) | 多维数组与按行遍历 | 进阶 | `多维数组` `数组` `边界检查` `性能` | [06-arrays.md](modules/06-arrays.md) |
| [E06.05](index.html?entry=E06.05) | 变长数组 VLA 与初始化限制 | 进阶 | `数组` `生命周期` `实现定义` `未定义行为` `C11` | [06-arrays.md](modules/06-arrays.md) |

### M07 字符串（6 条）

本模块把 C 字符串作为“以 NUL 结尾的字节序列”来处理，而不是把它当作会自动管理容量的高级类型。学完后应能检查字符串边界，安全读取一行输入，使用 `<string.h>` 完成查找与比较，计算复制和拼接所需容量，并以可验证的方式解析数值、拆分记录和遍历字符。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E07.01](index.html?entry=E07.01) | NUL 终止、字符串长度与对象边界 | 入门 | `字符串` `数组` `生命周期` `越界` `未定义行为` | [07-strings.md](modules/07-strings.md) |
| [E07.02](index.html?entry=E07.02) | 使用 fgets 安全读取一行并处理截断 | 进阶 | `字符串` `stdio` `输入验证` `边界检查` `错误处理` | [07-strings.md](modules/07-strings.md) |
| [E07.03](index.html?entry=E07.03) | string.h 的比较、查找与内存函数 | 入门 | `字符串` `string` `比较` `查找` `未定义行为` | [07-strings.md](modules/07-strings.md) |
| [E07.04](index.html?entry=E07.04) | 按容量复制与拼接字符串 | 进阶 | `字符串` `string` `边界检查` `缓冲区溢出` `输入验证` | [07-strings.md](modules/07-strings.md) |
| [E07.05](index.html?entry=E07.05) | 使用 strtol 做完整数值解析 | 进阶 | `字符串` `stdlib` `类型转换` `输入验证` `溢出` | [07-strings.md](modules/07-strings.md) |
| [E07.06](index.html?entry=E07.06) | 原地拆分、遍历与显式解析状态 | 进阶 | `字符串` `string` `输入验证` `可重入` `生命周期` | [07-strings.md](modules/07-strings.md) |

### M08 指针（7 条）

本模块解释指针如何表示对象地址、如何通过间接访问读写对象，以及这些操作何时有效。学完后应能区分指针与数组，正确表达 `const` 契约，使用多级指针和函数指针设计接口，用 `void *` 传递通用对象地址，并识别空指针、悬空指针和越界指针造成的未定义行为。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E08.01](index.html?entry=E08.01) | 取地址、解引用与指针有效性 | 入门 | `指针` `生命周期` `未初始化` `未定义行为` | [08-pointers.md](modules/08-pointers.md) |
| [E08.02](index.html?entry=E08.02) | 指针与数组的转换、下标和指针运算 | 进阶 | `指针` `数组` `边界检查` `越界` `未定义行为` | [08-pointers.md](modules/08-pointers.md) |
| [E08.03](index.html?entry=E08.03) | const 指针与只读接口契约 | 进阶 | `指针` `类型系统` `声明与定义` `可移植性` | [08-pointers.md](modules/08-pointers.md) |
| [E08.04](index.html?entry=E08.04) | 多级指针与输出参数 | 进阶 | `指针` `参数传递` `返回值` `生命周期` `未定义行为` | [08-pointers.md](modules/08-pointers.md) |
| [E08.05](index.html?entry=E08.05) | 函数指针与回调 | 进阶 | `指针` `函数指针` `参数传递` `类型系统` `未定义行为` | [08-pointers.md](modules/08-pointers.md) |
| [E08.06](index.html?entry=E08.06) | void 泛型指针与对象表示访问 | 进阶 | `指针` `类型系统` `类型转换` `可移植性` `别名` | [08-pointers.md](modules/08-pointers.md) |
| [E08.07](index.html?entry=E08.07) | 空指针、悬空指针、越界与别名风险 | 工程 | `指针` `悬空指针` `越界` `未初始化` `别名` `未定义行为` | [08-pointers.md](modules/08-pointers.md) |

### M09 结构体与联合体（6 条）

本模块说明如何用结构体组合相关数据、用指针引用聚合对象，以及对象布局为何包含对齐和填充。学完后应能定义并初始化 `struct`，区分嵌套对象与外部引用，安全使用带标签的 `union`，分配带柔性数组成员的变长对象，并判断位域何时不适合可移植数据格式。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E09.01](index.html?entry=E09.01) | struct 定义、typedef 与初始化 | 入门 | `结构体` `声明与定义` `初始化` `赋值` `类型系统` | [09-structures-unions.md](modules/09-structures-unions.md) |
| [E09.02](index.html?entry=E09.02) | 嵌套结构体、结构体指针与浅复制 | 进阶 | `结构体` `指针` `生命周期` `所有权` `别名` | [09-structures-unions.md](modules/09-structures-unions.md) |
| [E09.03](index.html?entry=E09.03) | 结构体内存布局、对齐与填充 | 进阶 | `结构体` `数组` `可移植性` `序列化` `实现定义` | [09-structures-unions.md](modules/09-structures-unions.md) |
| [E09.04](index.html?entry=E09.04) | union 与显式标签变体 | 进阶 | `联合体` `结构体` `枚举` `类型系统` `未定义行为` | [09-structures-unions.md](modules/09-structures-unions.md) |
| [E09.05](index.html?entry=E09.05) | 柔性数组成员与变长结构体分配 | 工程 | `结构体` `数组` `动态内存` `所有权` `整数溢出` `越界` | [09-structures-unions.md](modules/09-structures-unions.md) |
| [E09.06](index.html?entry=E09.06) | 位域的存储边界与可移植替代方案 | 进阶 | `结构体` `位运算` `可移植性` `实现定义` `边界检查` | [09-structures-unions.md](modules/09-structures-unions.md) |

### M10 枚举（5 条）

本模块说明如何用枚举表达封闭集合、稳定编号、互斥状态和位标志。学完后应能定义枚举及显式值，理解 C11/C17 中枚举常量与枚举对象类型的区别，验证外部输入，构建可检查的状态机，并在需要组合选项时正确使用无符号位掩码。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E10.01](index.html?entry=E10.01) | 枚举常量与可读的分支逻辑 | 入门 | `枚举` `类型系统` `分支` `声明与定义` | [10-enums.md](modules/10-enums.md) |
| [E10.02](index.html?entry=E10.02) | 底层类型、显式值与数值边界 | 进阶 | `枚举` `整数` `类型转换` `可移植性` `实现定义` | [10-enums.md](modules/10-enums.md) |
| [E10.03](index.html?entry=E10.03) | 外部整数到枚举的白名单验证 | 进阶 | `枚举` `输入验证` `类型转换` `序列化` `错误处理` | [10-enums.md](modules/10-enums.md) |
| [E10.04](index.html?entry=E10.04) | 用枚举实现显式状态机 | 进阶 | `枚举` `状态机` `分支` `输入验证` `错误处理` | [10-enums.md](modules/10-enums.md) |
| [E10.05](index.html?entry=E10.05) | 枚举式位标志与组合选项 | 进阶 | `枚举` `位运算` `整数` `边界检查` `未定义行为` | [10-enums.md](modules/10-enums.md) |

### M11 内存管理（7 条）

本模块从存储期和对象生命周期出发，说明动态分配、所有权转移与失败清理。学完后应能正确使用 `malloc`、`calloc`、`realloc` 和 `free`，实现带溢出检查的动态数组，在多资源错误路径上完成清理，并识别内存泄漏、悬空指针和双重释放。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E11.01](index.html?entry=E11.01) | 存储期、作用域与对象生命周期 | 进阶 | `生命周期` `作用域` `动态内存` `悬空指针` `未定义行为` | [11-memory.md](modules/11-memory.md) |
| [E11.02](index.html?entry=E11.02) | malloc、calloc 与分配大小计算 | 进阶 | `动态内存` `初始化` `边界检查` `整数溢出` `stdlib` | [11-memory.md](modules/11-memory.md) |
| [E11.03](index.html?entry=E11.03) | free 与线性所有权契约 | 进阶 | `动态内存` `所有权` `资源释放` `双重释放` `悬空指针` | [11-memory.md](modules/11-memory.md) |
| [E11.04](index.html?entry=E11.04) | realloc 的失败保留与地址失效 | 进阶 | `动态内存` `所有权` `错误处理` `悬空指针` `整数溢出` | [11-memory.md](modules/11-memory.md) |
| [E11.05](index.html?entry=E11.05) | 动态数组的长度、容量与增长策略 | 工程 | `动态内存` `数组` `边界检查` `整数溢出` `所有权` | [11-memory.md](modules/11-memory.md) |
| [E11.06](index.html?entry=E11.06) | 多资源错误路径与集中清理 | 工程 | `动态内存` `资源释放` `错误处理` `所有权` `文件` | [11-memory.md](modules/11-memory.md) |
| [E11.07](index.html?entry=E11.07) | 泄漏、悬空指针与双重释放的防御 | 工程 | `动态内存` `内存泄漏` `悬空指针` `双重释放` `资源释放` `所有权` | [11-memory.md](modules/11-memory.md) |

### M12 文件操作（7 条）

本模块以 ISO C 流模型为中心，说明 `FILE` 生命周期、打开模式、格式化与块 I/O、文件定位和错误检测。学完后应能检查每一次关键读写，区分 EOF 与错误，理解文本/二进制差异，并在写入、关闭、重命名或清理失败时保持文件处理状态可解释、资源不泄漏。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E12.01](index.html?entry=E12.01) | FILE 流、fopen 模式与 fclose | 入门 | `文件` `stdio` `生命周期` `资源释放` `错误处理` | [12-files.md](modules/12-files.md) |
| [E12.02](index.html?entry=E12.02) | 格式化输入输出与转换宽度 | 进阶 | `文件` `stdio` `输入验证` `边界检查` `未定义行为` | [12-files.md](modules/12-files.md) |
| [E12.03](index.html?entry=E12.03) | fread、fwrite 与短读写 | 进阶 | `文件` `二进制IO` `stdio` `边界检查` `错误处理` | [12-files.md](modules/12-files.md) |
| [E12.04](index.html?entry=E12.04) | fseek、ftell 与更新流定位 | 进阶 | `文件` `stdio` `二进制IO` `可移植性` `错误处理` | [12-files.md](modules/12-files.md) |
| [E12.05](index.html?entry=E12.05) | ferror、feof、EOF 与 clearerr | 进阶 | `文件` `stdio` `错误处理` `循环` `输入验证` | [12-files.md](modules/12-files.md) |
| [E12.06](index.html?entry=E12.06) | 文本与二进制模式及可移植字节编码 | 工程 | `文件` `二进制IO` `序列化` `可移植性` `整数` | [12-files.md](modules/12-files.md) |
| [E12.07](index.html?entry=E12.07) | 临时文件、关闭检查与失败回滚 | 工程 | `文件` `资源释放` `错误处理` `可移植性` `所有权` | [12-files.md](modules/12-files.md) |

### M13 预处理（5 条）

本模块解释编译前如何组织头文件、进行宏替换和选择条件代码。学完后应能编写不重复暴露定义的头文件、控制宏的求值与展开，并利用标准预定义信息生成可诊断、可移植的 C11/C17 源码。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E13.01](index.html?entry=E13.01) | #include 与头文件保护 | 入门 | `预处理` `头文件` `声明与定义` | [13-preprocessor.md](modules/13-preprocessor.md) |
| [E13.02](index.html?entry=E13.02) | 对象宏与函数宏 | 进阶 | `宏` `预处理` `表达式` `未定义行为` | [13-preprocessor.md](modules/13-preprocessor.md) |
| [E13.03](index.html?entry=E13.03) | 宏字符串化 # 与标记连接 ## | 进阶 | `宏` `预处理` `字符串` | [13-preprocessor.md](modules/13-preprocessor.md) |
| [E13.04](index.html?entry=E13.04) | #if 与条件编译 | 进阶 | `条件编译` `预处理` `可移植性` | [13-preprocessor.md](modules/13-preprocessor.md) |
| [E13.05](index.html?entry=E13.05) | 标准预定义宏与 __func__ | 入门 | `预处理` `宏` `调试` `可移植性` | [13-preprocessor.md](modules/13-preprocessor.md) |

### M14 编译与链接（6 条）

本模块把 ISO C 的翻译单元、声明、定义和链接属性与实际构建流程连接起来。学完后应能拆分多文件程序、解释常见链接诊断，并在明确的工具链环境下使用 GCC/Clang、MSVC、Make 或 CMake 构建 C11/C17 程序。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E14.01](index.html?entry=E14.01) | 预处理、编译、汇编与链接流水线 | 入门 | `编译` `链接` `构建` `GCC` `Clang` `MSVC` | [14-compilation-linking.md](modules/14-compilation-linking.md) |
| [E14.02](index.html?entry=E14.02) | 翻译单元与外部符号可见性 | 进阶 | `编译` `链接` `作用域` `声明与定义` | [14-compilation-linking.md](modules/14-compilation-linking.md) |
| [E14.03](index.html?entry=E14.03) | 声明、定义、extern 与 static | 进阶 | `声明与定义` `生命周期` `链接` `作用域` | [14-compilation-linking.md](modules/14-compilation-linking.md) |
| [E14.04](index.html?entry=E14.04) | 多文件项目的头文件组织 | 工程 | `头文件` `声明与定义` `构建` `可移植性` | [14-compilation-linking.md](modules/14-compilation-linking.md) |
| [E14.05](index.html?entry=E14.05) | 未定义引用、重复定义与库链接顺序 | 工程 | `链接` `构建` `错误处理` `GCC` `Clang` | [14-compilation-linking.md](modules/14-compilation-linking.md) |
| [E14.06](index.html?entry=E14.06) | 使用 Make 或 CMake 管理构建 | 工程 | `构建` `编译` `链接` `Make` `CMake` | [14-compilation-linking.md](modules/14-compilation-linking.md) |

### M15 标准库常用功能（6 条）

本模块按 ISO C11/C17 梳理常用标准库的接口契约，而不只罗列函数名。学完后应能正确检查格式化 I/O、数值转换、动态内存、字符串与字符处理、数学与时间接口的返回值，并区分运行时断言、编译期断言和可移植整数类型。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E15.01](index.html?entry=E15.01) | stdio 格式化输出与行输入 | 入门 | `stdio` `文件` `输入验证` `错误处理` | [15-standard-library.md](modules/15-standard-library.md) |
| [E15.02](index.html?entry=E15.02) | stdlib 数值转换与动态内存 | 进阶 | `stdlib` `动态内存` `输入验证` `资源释放` `错误处理` | [15-standard-library.md](modules/15-standard-library.md) |
| [E15.03](index.html?entry=E15.03) | string 与 ctype 的字符串和字符契约 | 进阶 | `string` `ctype` `字符串` `边界检查` `未定义行为` | [15-standard-library.md](modules/15-standard-library.md) |
| [E15.04](index.html?entry=E15.04) | math 数学函数与 stdint 整数类型 | 进阶 | `math` `整数` `浮点数` `可移植性` `实现定义` | [15-standard-library.md](modules/15-standard-library.md) |
| [E15.05](index.html?entry=E15.05) | time 日历时间与处理器时间 | 进阶 | `time` `性能` `可移植性` `可重入` | [15-standard-library.md](modules/15-standard-library.md) |
| [E15.06](index.html?entry=E15.06) | assert 运行时断言与 C11 静态断言 | 入门 | `assert` `调试` `测试` `错误处理` | [15-standard-library.md](modules/15-standard-library.md) |

### M16 调试与错误处理（6 条）

本模块建立从错误契约到故障定位的工程闭环。学完后应能设计返回值与 `errno` 的使用方式，区分断言和可恢复错误，在明确的平台环境中使用 GDB/LLDB、ASan/UBSan、Valgrind，并用日志、测试和防御式编程保留有效证据。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E16.01](index.html?entry=E16.01) | 错误返回值、输出参数与 errno | 进阶 | `错误处理` `返回值` `输入验证` `stdlib` | [16-debugging-errors.md](modules/16-debugging-errors.md) |
| [E16.02](index.html?entry=E16.02) | 用 assert 检查不变量而非处理输入 | 入门 | `assert` `调试` `测试` `错误处理` | [16-debugging-errors.md](modules/16-debugging-errors.md) |
| [E16.03](index.html?entry=E16.03) | GDB 与 LLDB 的断点、单步和调用栈 | 工程 | `调试` `GDB` `LLDB` `GCC` `Clang` | [16-debugging-errors.md](modules/16-debugging-errors.md) |
| [E16.04](index.html?entry=E16.04) | ASan 与 UBSan 动态插桩检查 | 工程 | `调试` `ASan` `UBSan` `未定义行为` `越界` `GCC` | [16-debugging-errors.md](modules/16-debugging-errors.md) |
| [E16.05](index.html?entry=E16.05) | Valgrind Memcheck 内存与泄漏检查 | 工程 | `调试` `Valgrind` `动态内存` `内存泄漏` `未初始化` | [16-debugging-errors.md](modules/16-debugging-errors.md) |
| [E16.06](index.html?entry=E16.06) | 日志、回归测试与防御式编程 | 工程 | `调试` `测试` `错误处理` `输入验证` `边界检查` | [16-debugging-errors.md](modules/16-debugging-errors.md) |

### M17 常见算法案例（7 条）

本模块用可编译的 ISO C11/C17 示例分析常见查找、排序、链表、栈、队列和递归。每个算法都明确时间/空间复杂度、稳定性是否适用、输入前提以及空输入和容量边界，避免只给出能处理样例的代码。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E17.01](index.html?entry=E17.01) | 时间复杂度、空间复杂度与输入规模 | 入门 | `复杂度` `性能` `循环` `边界检查` | [17-algorithms.md](modules/17-algorithms.md) |
| [E17.02](index.html?entry=E17.02) | 线性查找与二分查找 | 入门 | `查找` `复杂度` `数组` `边界检查` | [17-algorithms.md](modules/17-algorithms.md) |
| [E17.03](index.html?entry=E17.03) | 经典排序与标准库 qsort | 进阶 | `排序` `复杂度` `函数指针` `stdlib` | [17-algorithms.md](modules/17-algorithms.md) |
| [E17.04](index.html?entry=E17.04) | 单链表的插入、查找与销毁 | 进阶 | `链表` `指针` `动态内存` `资源释放` | [17-algorithms.md](modules/17-algorithms.md) |
| [E17.05](index.html?entry=E17.05) | 固定容量数组栈 | 入门 | `栈` `数组` `边界检查` `复杂度` | [17-algorithms.md](modules/17-algorithms.md) |
| [E17.06](index.html?entry=E17.06) | 环形缓冲区队列 | 进阶 | `队列` `数组` `边界检查` `复杂度` | [17-algorithms.md](modules/17-algorithms.md) |
| [E17.07](index.html?entry=E17.07) | 递归阶乘与边界控制 | 入门 | `递归` `复杂度` `整数` `边界检查` | [17-algorithms.md](modules/17-algorithms.md) |

### M18 易错点（8 条）

本模块把常见 C 故障按未定义行为、数组字符串、指针内存、数值、控制流、I/O 和可移植性分类，并给出严谨编译与审查清单。学完后应能识别“碰巧能跑”的危险代码，用符合 ISO C11/C17 的替代写法消除风险，并借助明确标注环境的工具验证。

| 编号 | 条目 | 难度 | 标签 | 源文件 |
|---|---|---|---|---|
| [E18.01](index.html?entry=E18.01) | 未定义行为、未指定行为与实现定义行为 | 进阶 | `未定义行为` `未初始化` `整数溢出` `可移植性` | [18-pitfalls.md](modules/18-pitfalls.md) |
| [E18.02](index.html?entry=E18.02) | 数组边界、NUL 终止与字符串容量 | 入门 | `数组` `字符串` `越界` `缓冲区溢出` `边界检查` | [18-pitfalls.md](modules/18-pitfalls.md) |
| [E18.03](index.html?entry=E18.03) | 空指针、悬空指针与动态内存所有权 | 进阶 | `指针` `动态内存` `悬空指针` `双重释放` `资源释放` | [18-pitfalls.md](modules/18-pitfalls.md) |
| [E18.04](index.html?entry=E18.04) | 整数溢出、移位与浮点比较 | 进阶 | `整数` `浮点数` `溢出` `整数溢出` `比较` | [18-pitfalls.md](modules/18-pitfalls.md) |
| [E18.05](index.html?entry=E18.05) | 表达式求值、短路和控制流边界 | 入门 | `表达式` `优先级` `分支` `循环` `未定义行为` | [18-pitfalls.md](modules/18-pitfalls.md) |
| [E18.06](index.html?entry=E18.06) | 输入宽度、返回值与文本/二进制流 | 进阶 | `文件` `二进制IO` `stdio` `输入验证` `缓冲区溢出` | [18-pitfalls.md](modules/18-pitfalls.md) |
| [E18.07](index.html?entry=E18.07) | 类型宽度、字节序与平台可移植性 | 工程 | `可移植性` `实现定义` `类型系统` `二进制IO` | [18-pitfalls.md](modules/18-pitfalls.md) |
| [E18.08](index.html?entry=E18.08) | 严格编译警告与代码审查清单 | 工程 | `编译` `测试` `调试` `GCC` `Clang` `MSVC` | [18-pitfalls.md](modules/18-pitfalls.md) |

## 标签频次

| 标签 | 条目数 |
|---|---:|
| `未定义行为` | 26 |
| `边界检查` | 21 |
| `可移植性` | 19 |
| `错误处理` | 19 |
| `输入验证` | 15 |
| `数组` | 14 |
| `动态内存` | 12 |
| `类型系统` | 12 |
| `stdio` | 11 |
| `声明与定义` | 11 |
| `指针` | 11 |
| `整数` | 11 |
| `生命周期` | 11 |
| `文件` | 10 |
| `分支` | 9 |
| `字符串` | 9 |
| `实现定义` | 9 |
| `所有权` | 8 |
| `整数溢出` | 8 |
| `比较` | 8 |
| `表达式` | 8 |
| `调试` | 8 |
| `资源释放` | 8 |
| `初始化` | 7 |
| `参数传递` | 7 |
| `循环` | 7 |
| `未初始化` | 7 |
| `类型转换` | 7 |
| `越界` | 7 |
| `返回值` | 7 |
| `作用域` | 6 |
| `复杂度` | 6 |
| `悬空指针` | 6 |
| `枚举` | 6 |
| `结构体` | 6 |
| `链接` | 6 |
| `GCC` | 5 |
| `stdlib` | 5 |
| `二进制IO` | 5 |
| `浮点数` | 5 |
| `编译` | 5 |
| `预处理` | 5 |
| `Clang` | 4 |
| `string` | 4 |
| `性能` | 4 |
| `构建` | 4 |
| `测试` | 4 |
| `程序结构` | 4 |
| `位运算` | 3 |
| `别名` | 3 |
| `双重释放` | 3 |
| `宏` | 3 |
| `序列化` | 3 |
| `溢出` | 3 |
| `缓冲区溢出` | 3 |
| `赋值` | 3 |
| `MSVC` | 2 |
| `assert` | 2 |
| `优先级` | 2 |
| `内存泄漏` | 2 |
| `函数指针` | 2 |
| `可重入` | 2 |
| `头文件` | 2 |
| `查找` | 2 |
| `递归` | 2 |
| `ASan` | 1 |
| `C11` | 1 |
| `CMake` | 1 |
| `GDB` | 1 |
| `LLDB` | 1 |
| `Make` | 1 |
| `UBSan` | 1 |
| `Valgrind` | 1 |
| `ctype` | 1 |
| `math` | 1 |
| `time` | 1 |
| `多维数组` | 1 |
| `字符` | 1 |
| `排序` | 1 |
| `条件编译` | 1 |
| `栈` | 1 |
| `状态机` | 1 |
| `联合体` | 1 |
| `链表` | 1 |
| `队列` | 1 |

## 维护命令

```sh
python tools/build_index.py
python tools/validate_examples.py --compile
```

第一条重新生成 `INDEX.md` 和 `data/library.js`；第二条在检测到 C 编译器时检查可独立编译的示例。
