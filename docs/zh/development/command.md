---
title: "命令"
---

# 在 CAD-Viewer 中创建自定义命令

本页说明如何在 **CAD-Viewer** 中创建自定义命令并注册它，以便用户能够触发。

## 概览

命令是用户与 CAD-Viewer 交互的主要方式。每个命令代表一个具体操作，例如绘制直线、创建圆、缩放或选择对象。

系统提供**命令栈**（`AcEdCommandStack`），用于按组管理命令、按名称查找命令，并通过编辑器处理其生命周期事件。

## 命令生命周期

每个命令都遵循由 `AcEdCommand` 管理的明确生命周期：

1.  通过 `trigger()` **触发**命令
1.  触发 `commandWillStart` 事件
1.  使用当前上下文调用 `execute()` 方法
1.  触发 `commandEnded` 事件（始终触发，即使发生错误）

在内部，该生命周期的实现如下：

```
async trigger(context: AcApContext) {
  try {
    this.onCommandWillStart(context)
    context.view.editor.events.commandWillStart.dispatch({ command: this })
    await this.execute(context)
  } finally {
    context.view.editor.events.commandEnded.dispatch({ command: this })
    this.onCommandEnded(context)
  }
}
```

### 关键保证

-   `commandWillStart` 始终在 `execute()` **之前**触发

-   `commandEnded` 始终在执行**之后**触发，即使命令抛出异常或被取消

-   命令可以通过重写以下方法接入生命周期逻辑：

    -   `onCommandWillStart(context)`
    -   `onCommandEnded(context)`

## 创建命令

所有命令都应继承抽象类 `AcEdCommand`：

```
import {
  AcEdCommand,
  AcApContext,
  AcApDocManager,
  AcEdPromptPointOptions,
  AcEdPromptDistanceOptions
} from '@mlightcad/cad-simple-viewer'

import { AcDbCircle } from '@mlightcad/data-model'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    // Prompt for center point
    const centerPrompt = new AcEdPromptPointOptions(
      'Specify center point of circle:'
    )
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Prompt for radius
    const radiusPrompt = new AcEdPromptDistanceOptions(
      'Specify radius of circle:'
    )
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Create circle entity and add it to model space
    const db = context.doc.database
    const circle = new AcDbCircle(center, radius)
    db.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

### 说明

-   `execute()` 接收当前 `AcApContext`，其中包含：

    -   `context.view`
    -   `context.doc`

-   如果你已经在某个命令内部，**始终优先**使用：

    ```
    context.view.editor
    ```

    而不是访问全局编辑器实例。

## 使用状态机处理复杂（多分支）命令

对于具有**连续输入 + 多分支 + 实时预览**的命令（例如 `PLINE`），
避免将所有命令逻辑塞进单个 Jig。那样很快就会变得难以维护。

推荐做法：

-   **命令逻辑**由**状态机**（分支控制）处理
-   **Jig** 仅负责**当前状态的预览**

这种分离使命令保持可读，并让你可以在其他复杂命令中复用状态机模式。

### 为什么使用状态机

-   复杂命令需要对多个关键字分支做出反应
-   每个分支有各自的提示规则和预览行为
-   状态机将这些关注点限制在每个状态内部

### 推荐架构

```
Command Controller
│
├── State Machine
│    ├── LineState
│    ├── ArcState
│    ├── CloseState
│    ├── UndoState
│    └── ...
│
└── Jig (preview only)
```

### 状态机基类

项目为提示驱动的命令提供了一个可复用的状态机辅助类：

```
export interface AcEdPromptState<TPromptOptions, TResult> {
  buildPrompt(): TPromptOptions
  handleResult(result: TResult): Promise<'continue' | 'finish'> | 'continue' | 'finish'
}

export class AcEdPromptStateMachine<TPromptOptions, TResult> {
  setState(state: AcEdPromptState<TPromptOptions, TResult>): void
  run(getResult: (prompt: TPromptOptions) => Promise<TResult>): Promise<void>
}
```

### 状态与 Jig 之间的交互

-   每个状态构建自己的提示选项
-   提示附加一个 Jig，**仅用于预览**
-   Jig **不**了解关键字或分支

换句话说：

-   **状态**决定询问什么以及如何转换
-   **Jig** 只为该状态绘制当前预览

### 示例：多分支多段线（简化版）

```
class LineState implements AcEdPromptState<AcEdPromptPointOptions, AcEdPromptPointResult> {
  buildPrompt() {
    const prompt = new AcEdPromptPointOptions('Specify next point or')
    prompt.keywords.add('Arc(A)', 'Arc', 'Arc')
    prompt.keywords.add('Undo(U)', 'Undo', 'Undo')
    prompt.keywords.add('Close(C)', 'Close', 'Close')
    prompt.jig = new AcApPolylineJig(view, points, bulges)
    return prompt
  }

  async handleResult(result: AcEdPromptPointResult) {
    if (result.status === AcEdPromptStatus.Keyword) {
      if (result.stringResult === 'Arc') machine.setState(new ArcState(machine))
      if (result.stringResult === 'Undo') undo()
      if (result.stringResult === 'Close') return 'finish'
      return 'continue'
    }

    if (result.status === AcEdPromptStatus.OK) {
      appendPoint(result.value!)
      return 'continue'
    }

    return 'finish'
  }
}
```

### 实践建议

-   将**数据模型**（点、凸度、预览状态）保留在命令控制器中
-   每个状态应**小而专注**
-   对于共享的工作流模式，优先使用 `AcEdPromptStateMachine`
-   命令控制器负责**最终实体的创建**

完整示例请参阅[多段线命令的实现](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApPolylineCmd.ts)。

## 监听命令生命周期事件

命令生命周期事件由**编辑器**暴露，而不是由命令本身暴露。

### 可用的编辑器事件

```
public readonly events = {
  sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
  /** Fired just before the command starts executing */
  commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
  /** Fired after the command finishes executing */
  commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
}
```

### 获取 `AcEditor` 实例

取决于你在应用中的位置：

#### 从任意位置（全局访问）

```
const editor =
  AcApDocManager.instance.curView.editor
```

#### 在命令执行内部

```
const editor = context.view.editor
```

### 示例：监听命令事件

```
const editor = AcApDocManager.instance.curView.editor

editor.events.commandWillStart.addEventListener(({ command }) => {
  console.log('Command will start:', command.globalName)
})

editor.events.commandEnded.addEventListener(({ command }) => {
  console.log('Command ended:', command.globalName)
})
```

### 典型用例

-   跟踪命令历史
-   更新 UI 状态（工具栏、面板）
-   锁定或解锁交互
-   实现分析或遥测
-   模拟 ObjectARX `commandWillStart` / `commandEnded` 行为

## 命令访问模式

`AcEdCommand` 现在支持**最低访问模式要求**，允许命令声明所需的文档访问级别。

### 打开模式

CAD-Viewer 支持三种文档打开模式：

```
export enum AcEdOpenMode {
  /** Read-only mode */
  Read = 0,
  /** Review mode (compatible with Read) */
  Review = 4,
  /** Write mode (compatible with Review and Read) */
  Write = 8
}
```

较高值的模式兼容较低值的模式：

-   `Write` ≥ `Review` ≥ `Read`

你可以通过以下方式访问当前文档的打开模式：

```
context.doc.openMode
```

或

```
AcApDocument.openMode
```

### 设置命令模式

每个命令可以声明**最低所需访问模式**：

```
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

export class AcApCircleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    // write operations
  }
}
```

#### 模式属性

```
get mode(): AcEdOpenMode
set mode(value: AcEdOpenMode)
```

### 行为

-   命令**只有在以下条件满足时才能执行**：

    ```
    document.openMode >= command.mode
    ```

-   示例：

    -   `Write` 命令**不能**在 `Read` 模式下运行
    -   `Review` 命令**可以**在 `Write` 模式下运行
    -   `Read` 命令在所有模式下均可运行

这实现了：

-   安全的只读查看器
-   仅审阅的工作流
-   对编辑命令的严格写保护

## 注册命令

命令通过 `AcApDocManager.instance.commandManager` 注册。

```
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcApCircleCmd } from './AcApCircleCmd'

const register = AcApDocManager.instance.commandManager

const circleCommand = new AcApCircleCmd()
circleCommand.globalName = 'CIRCLE'
circleCommand.localName = 'CIRCLE'

register.addCommand(
  'USER',
  circleCommand.globalName,
  circleCommand.localName,
  circleCommand
)
```

### 说明

-   `globalName` 在命令组内必须唯一

-   `localName` 面向用户，可以被本地化

-   命令组：

    -   `ACAD` – 系统命令
    -   `USER` – 自定义命令

## 命令别名

CAD-Viewer 支持 AutoCAD 风格的命令别名（类似于 `acad.pgp` 的行为）。

### 通过 `addCommand` 注册别名

你可以在 `addCommand` 的第 5 个参数中提供别名：

```
register.addCommand(
  'USER',
  'MYCMD',
  'MyCmd',
  myCommand,
  ['MC', 'MY']
)
```

别名规则：

-   别名匹配不区分大小写（内部会规范化为大写）
-   别名在同一命令组内必须唯一
-   别名不能与同一组内已有的全局/本地命令名冲突

### 在 `AcApDocManager` 中配置别名

`AcApDocManagerOptions` 提供 `commandAliases`，以便在初始化时覆盖别名映射：

```
AcApDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'CI',
    ZOOM: ['Z']
  }
})
```

行为：

-   如果某个命令配置了用户别名，这些别名会替换该命令的内置默认别名
-   如果某个命令未配置，则使用内置默认别名

### 查找和 UI 行为

-   `lookupGlobalCmd()` 和 `lookupLocalCmd()` 都支持别名查找
-   `searchCommandsByPrefix()` 支持别名前缀匹配
-   命令行自动补全会在列表中显示别名，例如：
    `LINE（L, LN） - description`

## 触发命令

注册后，可以通过编程方式执行命令：

```
AcApDocManager.instance.sendStringToExecute('CIRCLE')
```

## 完整工作流

1.  通过继承 `AcEdCommand` 创建命令
1.  （可选）设置命令所需的访问 `mode`
1.  使用 `commandManager` 注册它
1.   （可选）如有需要，通过 `AcEditor` 监听生命周期事件
1.  按名称或通过编程方式触发命令


## 本地化自定义命令

在 <https://github.com/mlightcad/cad-simple-viewer-example> 中，你可以找到一个展示支持本地化的自定义命令的完整示例。

