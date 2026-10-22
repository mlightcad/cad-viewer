---
title: "系统变量"
---

# 系统变量

本页介绍系统变量在 CAD-Viewer 中的工作方式、用户如何通过命令行修改它们，以及它们如何通过 `AcDbSystemVariables` 和 `AcDbSysVarManager` 实现。

## 什么是系统变量

`system variable`（系统变量）是控制 CAD 系统各部分行为的全局设置。

命令通常用于启动一个动作、创建几何图形或打开对话框。系统变量则有所不同：它们控制命令行为、默认值、图纸状态或用户界面行为。

典型的例子包括：

- 新建实体应创建在哪个图层上
- 应使用什么默认颜色、线宽或线型比例
- 是否启用某种显示模式
- 编辑器或查看器应如何以视觉方式响应

这是有意与 AutoCAD 保持一致的。在 CAD-Viewer 中，你可以直接在命令行输入变量名，然后输入新的值，从而设置系统变量。

例如：

```text
Command: PICKBOX
New value for PICKBOX <3>: 5
```

这意味着命令行把系统变量名本身当作更新该设置的命令。

CAD-Viewer 采用这一模型，使运行时设置可以通过统一机制被读取、修改和观察，而不必在命令逻辑中硬编码。

## 从命令行设置系统变量

命令行的工作流程很简单：

1. 输入系统变量名。
2. 按回车。
3. 输入新的值。
4. 再次按回车以应用。

这与许多 CAD 用户已在 AutoCAD 中熟悉的交互方式相同。

例如，要修改当前图层：

```text
Command: CLAYER
New value for CLAYER <0>: Walls
```

要修改拾取框大小：

```text
Command: PICKBOX
New value for PICKBOX <3>: 10
```

换句话说，为系统变量赋值不需要单独的 `SETVAR` 式流程。你可以直接在命令行输入系统变量名，并为其赋予新值。

## 系统变量如何注册为命令

在 CAD-Viewer 中，系统变量之所以能在命令行使用，是因为它们在应用初始化时被注册为普通命令。

注册发生在 `AcApDocManager` 中。它从 `AcDbSysVarManager` 加载所有系统变量描述符，并将每个变量名注册为命令：

```ts
const sysVars = AcDbSysVarManager.instance().getAllDescriptors()
sysVars.forEach(sysVar => {
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    sysVar.name,
    sysVar.name,
    new AcApSysVarCmd()
  )
})
```

这意味着：

- 每个已注册的系统变量都会自动成为命令
- 命令名就是系统变量名本身，例如 `CLAYER` 或 `PICKBOX`
- 所有这些命令共享同一个命令实现：`AcApSysVarCmd`

`AcApSysVarCmd` 并不硬编码某个特定变量。相反，它在运行时使用当前的命令名（`this.globalName`）查找匹配的系统变量描述符，提示用户输入新值，然后调用 `setVar(...)`。

它的流程大致为：

`输入系统变量名` -> `AcApSysVarCmd.execute()` -> 提示输入值 -> `AcDbSysVarManager.setVar(...)`

因此涉及两层：

- `AcDbSysVarManager` 决定运行时存在哪些系统变量
- `AcApDocManager` 将这些运行时变量暴露为命令行命令

这也是为什么新增一个系统变量的支持通常从在 `AcDbSysVarManager` 中注册其描述符开始。一旦它被纳入 `getAllDescriptors()`，就可以同时注册到命令栈中，并直接在命令行使用。

## CAD-Viewer 中的设计方式

当前实现集中在两个文件中：

- [AcDbSystemVariables](https://mlightcad.github.io/realdwg-web/variables/_mlightcad_data-model.AcDbSystemVariables.html)
- [AcDbSysVarManager](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDbSysVarManager.html)

它们的作用各不相同。

### 1. `AcDbSystemVariables`

`AcDbSystemVariables` 是系统变量名常量的规范列表。

它的主要作用是：

- 为变量名提供单一事实来源
- 避免在整个代码库中硬编码字符串
- 为调用方提供类型安全的变量引用方式
- 支持派生类型，例如 `AcDbSystemVariableName`

最好把它理解为 CAD-Viewer 中的系统变量名注册表。

### 2. `AcDbSysVarManager`

`AcDbSysVarManager` 是系统变量的运行时管理器。它负责：

- 注册变量描述符
- 存储类型和默认值元数据
- 提供统一的 `getVar` 和 `setVar` 访问
- 缓存非数据库变量
- 分发变更事件

它实际上是系统变量的注册表、访问层和事件中心。

## 两类系统变量

在当前设计中，系统变量分为两类。

### 数据库驻留变量

这些变量存在于 `AcDbDatabase` 上。`AcDbSysVarManager` 通过将变量名映射到数据库字段来读写它们。

目前注册的示例包括：

- `CECOLOR`
- `CELTSCALE`
- `CELWEIGHT`
- `CLAYER`
- `LWDISPLAY`

它们更接近图纸状态和默认图纸属性。

### 非数据库变量

这些变量不直接存储在 `AcDbDatabase` 上。它们缓存在 `AcDbSysVarManager` 内部。

目前注册的示例包括：

- `COLORTHEME`
- `PICKBOX`
- `WHITEBKCOLOR`

它们更接近编辑器行为或 UI 状态。

## 为什么这种划分很重要

区分这两类变量有两个直接好处：

- 与图纸相关的设置可以继续依附于数据库模型
- 宿主应用或 UI 相关的设置不必被强行纳入数据库层

这样，系统变量就能同时干净地服务于数据模型和编辑器层。

## 当前实现的核心能力

### 统一访问

调用方不需要知道变量是存储在数据库中还是位于管理器自有的运行时缓存中。两种情况都可以使用相同的访问 API：

```ts
const sysVarManager = AcDbSysVarManager.instance()

const currentLayer = sysVarManager.getVar('CLAYER', db)
sysVarManager.setVar('CLAYER', 'Walls', db)
sysVarManager.setVar('PICKBOX', 12, db)
```

### 类型转换

`setVar` 会根据已注册的描述符类型执行基本转换。当前实现支持对以下值进行转换：

- `number`
- `boolean`
- `color`

当值来自命令行输入、表单或脚本，最初以字符串形式到达时，这非常有用。

### 变更通知

`AcDbSysVarManager` 暴露了 `sysVarChanged` 事件，使更高层模块可以对系统变量更新作出反应。

```ts
AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
  console.log(args.name, args.oldVal, args.newVal)
})
```

在当前实现中，此事件主要针对非数据库变量的变更进行分发，因此特别适合编辑器与 UI 的同步。

## 示例：`PICKBOX`

`PICKBOX` 表示拾取框半长（以像素为单位）。它是一个非数据库变量，但会直接影响用户交互行为。

在 `cad-viewer` 中，`AcEdCursorManager` 监听 `PICKBOX` 的变更。当值变化时，它会重建十字光标中的矩形部分，并立即重新应用当前光标。这表明系统变量不仅是存储的配置数据，还可以作为实时 UI 行为的驱动因素。

参考实现：

- [AcEdCursorManager.ts](https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-simple-viewer/src/editor/input/AcEdCursorManager.ts)

流程为：

`setVar('PICKBOX', ...)` -> `sysVarChanged` 事件 -> 光标管理器更新光标外观

这是说明该抽象为何有用的最清晰示例之一。

## 当前代码中的一个重要细节

`AcDbSystemVariables.ts` 定义了可识别变量名的规范集合，但 `AcDbSysVarManager` 目前在其构造函数中只注册了其中的一部分。

换句话说：

- `AcDbSystemVariables` 是名称目录
- `AcDbSysVarManager.registry` 决定运行时实际支持哪些变量

这是一条合理的演进路径：先定义名称，然后随着每个变量逐步得到支持，再逐步添加类型元数据、默认值、存储策略和行为。

## 推荐的扩展模式

将来添加更多系统变量时，推荐的工作流程是：

1. 在 `AcDbSystemVariables` 中添加变量名常量
2. 在 `AcDbSysVarManager` 中注册描述符
3. 决定它是数据库驻留还是仅运行时
4. 定义其类型、默认值和描述
5. 如果它应影响命令或 UI，优先采用事件驱动的集成方式，而不是在业务逻辑中硬编码检查

## 如何添加新的系统变量

添加新的系统变量通常涉及五个步骤。

### 1. 将变量名添加到 `AcDbSystemVariables`

首先，在 `AcDbSystemVariables` 中添加一个新的规范名称常量。

这样可以让变量名保持集中，避免在代码库中散布硬编码字符串。

例如：

```ts
export const MYNEWVAR = 'MYNEWVAR'
```

### 2. 在 `AcDbSysVarManager` 中注册描述符

接下来，在 `AcDbSysVarManager` 中注册该变量。正是这一步使变量在运行时真正得到支持。

注册时，需要定义：

- 它的名称
- 它的类型
- 它的默认值
- 它的值是存储在 `AcDbDatabase` 上还是仅存储在管理器缓存中
- 描述符模型所需的任何描述或元数据

这是最重要的一步。如果变量只存在于 `AcDbSystemVariables` 中而未在 `AcDbSysVarManager` 中注册，它只是一个名称常量，而不是可用的系统变量。

`AcApDocManager` 会在初始化期间自动将所有已注册的系统变量注册为命令。

这意味着新添加的变量通常无需编写专门的命令类即可从命令行使用。

命令行流程随后变为：

```text
Command: MYNEWVAR
New value for MYNEWVAR <default>: ...
```

### 3. 选择存储模型

然后应决定新变量属于：

- 数据库驻留，如果它属于图纸状态或图纸默认值
- 非数据库，如果它属于编辑器行为、UI 偏好或应用运行时状态

如果它是数据库驻留的，`AcDbSysVarManager` 必须能够将其映射到 `AcDbDatabase` 上的字段。

如果它是非数据库的，`AcDbSysVarManager` 可以将其保存在内部运行时缓存中。

经验法则是：

- 对当前图层或当前颜色之类的内容使用数据库驻留变量
- 对拾取框大小或颜色主题之类的内容使用非数据库变量

### 4. 按需连接行为

如果修改变量应立即影响 UI 或编辑器行为，请在消费方模块中添加相应逻辑。

首选模式是响应 `sysVarChanged`，而不是在许多地方手动检查变量。

`PICKBOX` 是该模式的一个很好的例子：

- 变量注册在 `AcDbSysVarManager` 中
- 命令系统将其暴露在命令行中
- `AcEdCursorManager` 监听变更并立即更新光标

因此在实践中，新变量的最小路径是：

1. 在 `AcDbSystemVariables` 中定义其名称
2. 在 `AcDbSysVarManager` 中注册其描述符
3. 决定其存储策略
4. 可选地连接响应其值的监听器或业务逻辑

之后，它就可以像内置系统变量一样参与统一的 `getVar` / `setVar` 工作流。

## 总结

在 CAD-Viewer 中，系统变量不仅仅是一组松散的设置。它们构成了应用状态的统一抽象：

- 向下，它们映射到与图纸相关的数据库状态
- 向上，它们驱动编辑器与 UI 行为
- 在中间，它们提供集中访问、类型约束和变更通知

如果命令回答的是「做什么」，那么系统变量回答的就是「在什么设置或模式下做」。
