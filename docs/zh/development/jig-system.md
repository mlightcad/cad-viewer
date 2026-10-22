---
title: "Jig（动态预览）系统"
---

# Jig（动态预览）系统

AutoCAD 依赖 AcEdJig 框架在获取用户输入时提供实时视觉反馈。该系统虽然强大，但将提示、预览渲染和输入采样分散在多个重写方法中——常常把逻辑分散到不同的函数和生命周期阶段。CAD-Viewer 面向 Web 重新构想了这一概念，引入了统一的、由 TypeScript 驱动的 jig 机制，并与提示输入无缝集成。开发者无需管理拖拽循环或采样器状态码，只需将 jig 直接附加到提示选项上，即可将动态预览逻辑、用户输入和最终实体创建保持在一个可读的工作流中。

## 概览

CAD-Viewer 中的 **Jig 系统**支持交互式预览和动态实体创建，提供与 AutoCAD 的 **AcEdJig**（ObjectARX）类似的工作流。*jig* 管理一个临时预览实体，该实体会根据光标移动或增量用户输入持续更新。

使用场景包括：

* 交互式几何创建（点、圆、多段线等）
* 实时距离或角度测量
* 现有实体的实时修改

不过，CAD-Viewer 引入了**更简单、更内聚、对 TypeScript 更友好**的设计，减少了 AutoCAD jig 中常见的结构复杂性。


## 关键架构差异

### Jig 被传入提示选项

在 AutoCAD 中，提示和 jig 是分离的机制。执行 jig 需要重写 `sampler()`、`worldDraw()` 并调用 `drag()`。

在 CAD-Viewer 中，提示可以直接**携带 jig 实例**：

```ts
const opts = new AcEdPromptDistanceOptions('Specify radius:')
opts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(opts)
```

这种设计：

* 自动将用户输入与实时预览关联起来
* 消除了手动管理拖拽循环的需要

➡️ 结果：**更少的样板代码，更高的一致性**。

---

### 完整的动态输入逻辑保持在一起

正如你在 [AutoCAD AcEdJig 示例代码](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)中所见，AutoCAD 将创建一个椭圆的输入逻辑分散到多个地方。

* `createEllipse()` — 获取椭圆中心点
* `sampler()` — 获取长轴端点以及从椭圆中心到短轴端点的距离

在 CAD-Viewer 中，整个动态输入工作流按顺序表达如下。

```ts
const center = await editor.getPoint(pointOpts)
radiusOpts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(radiusOpts)
```

➡️ 用户输入、jig 预览和最终几何体都在**同一段代码**中管理。


## 核心概念

### 通用 Jig（`AcEdPreviewJig<T>`）

`AcEdPreviewJig<T>` 是一个基于 TypeScript 的类，用于管理临时预览实体：

| AutoCAD AcEdJig | Web CAD Jig（`AcEdPreviewJig`）      |
| --------------- | ----------------------------------- |
| `sampler()`     | `update(value: T)`                  |
| `startJig()`    | `setEntity()`                       |
| `drag()`        | 通过 JS 事件在外部控制 |

**特性：**

-   使用泛型 `T` 处理多种输入类型（点、距离、角度等）
-   与 `AcEdBaseView` 集成以渲染临时实体
-   支持实现 `onJigUpdate(value: T)` 的预览实体，以便动态更新几何体
-   允许使用 `end()` 干净地终止 jig

* * *

### 核心方法

#### `update(value: T): void`

根据用户输入更新预览实体。这相当于 AutoCAD 的 `sampler()`。

#### `render(): void`

在关联的视图中渲染预览实体，类似于 AutoCAD 的 `worldDraw()`。

#### `end(): void`

清除临时实体并结束 jig 会话。

#### `entity: AcDbEntity | null`

当前预览实体的 getter。

## 使用 Jig

### 步骤 1：创建 Jig 类

你需要为特定实体创建一个继承 `AcEdPreviewJig<T>` 的类。例如，创建一个 **圆 jig**：

```ts
import { AcDbCircle, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcEdPreviewJig, AcEdBaseView } from '@mlightcad/cad-simple-viewer'

export class AcApCircleJig extends AcEdPreviewJig<number> {
  private _circle: AcDbCircle

  constructor(view: AcEdBaseView, center: AcGePoint3dLike) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
  }

  get entity(): AcDbCircle {
    return this._circle
  }

  update(radius: number) {
    this._circle.radius = radius
  }
}
```

**说明：**

-   jig 管理一个临时的 `AcDbCircle`。
-   `update` 方法根据用户输入动态更改半径。

* * *

### 步骤 2：在命令中使用 Jig

你可以在命令中集成 jig，以交互方式创建实体：

```ts
import { AcEdCommand, AcApDocManager, AcEdPromptPointOptions, AcEdPromptDistanceOptions } from '@mlightcad/cad-simple-viewer'
import { AcApCircleJig } from './AcApCircleJig'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context) {
    // Step 2a: Acquire center point
    const centerPrompt = new AcEdPromptPointOptions('Specify center of circle:')
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Step 2b: Acquire radius using Jig
    const radiusPrompt = new AcEdPromptDistanceOptions('Specify radius of circle:')
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Step 2c: Add circle to database
    const circle = new AcDbCircle(center, radius)
    context.doc.database.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

**工作流：**

1.  提示用户输入圆的**圆心**。
1.  创建一个附加到圆心的**圆 jig**。
1.  提示用户输入**半径**，并提供交互式预览。
1.  将最终确定的圆提交到数据库。

* * *

## 用户输入

关于 AcEditor 输入 API、提示选项、关键字规则和提示结果处理的完整且最新的指南，请参阅：

[用户输入](./user-input)

## 参考资料

-   [AutoCAD AcEdJig 文档](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-CF581B82-FF80-42C6-9E9C-2394B7A96076)
-   [AutoCAD AcEdJig 拖拽循环](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-E0A88178-CEE6-4983-950C-119CED7BA474)
-   [AutoCAD AcEdJig 示例代码](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)

