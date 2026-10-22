---
title: "对象捕捉（OSNAP）"
---

# 对象捕捉（OSNAP）

本页介绍 OSNAP 如何在 **cad-viewer** 中使用来自 **realdwg-web** 的数据工作。

## 背景

在 AutoCAD/ObjectARX 中，每个实体都可以重写 `getOsnapPoints(...)`，以返回特定捕捉模式的候选捕捉点。

在 `realdwg-web` 中，我们在每个实体类上使用类似的模式 `subGetOsnapPoints(...)`。  
`cad-viewer` 消费这些返回的点，在 UI 中执行捕捉。

参考：
- AutoCAD ObjectARX `getOsnapPoints`: https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-__OVERLOADED_getOsnapPoints_AcDbEntity

## realdwg-web 中的核心 API

基础定义：
- `AcDbEntity.subGetOsnapPoints(osnapMode, pickPoint, lastPoint, snapPoints, gsMark?)`

参数：

- `osnapMode`：每次调用一个模式
- `pickPoint`：当前光标的世界坐标点
- `lastPoint`：命令流程中上一个已确定的点
- `snapPoints`：用于追加候选点的输出数组
- `gsMark`（可选）：子实体 id，目前对 `INSERT`（`AcDbBlockReference`）的子实体捕捉很重要

## 支持的 OSNAP 模式

定义于 `AcDbOsnapMode`：
- `EndPoint = 1`
- `MidPoint = 2`
- `Center = 3`
- `Node = 4`
- `Quadrant = 5`
- `Insertion = 7`
- `Perpendicular = 8`
- `Tangent = 9`
- `Nearest = 10`
- `Centroid = 11`

重要提示：

- 这些值是序号 id，不是位标志。
- 使用 `acdbOsnapModesToMask(...)` 和 `acdbMaskToOsnapModes(...)` 进行掩码转换。

## 当前 cad-viewer 的 UI 暴露情况

状态栏（`MlOsnapButton.vue`）目前暴露：

- EndPoint
- MidPoint
- Center
- Node
- Quadrant
- Insertion

尚未在 UI 中暴露（已注释掉）：

- Perpendicular
- Tangent
- Nearest
- Centroid

设置中的默认启用掩码（`AcApSettingManager`）：

- EndPoint + MidPoint + Center

## cad-simple-viewer 中的运行流程

1. `AcEdFloatingInput.getPosition()` 调用 `getOsnapPoint()`。
2. `getOsnapPoint()` 调用 `getOsnapPoints()`。
3. `getOsnapPoints()` 运行 `view.pick(point, hitRadius)`。
4. 对每个拾取到的项：
- 通过 `item.id` 解析模型空间实体
- 如果存在 `item.children`，则以 `gsMark = child.id` 调用实体的 osnap
- 否则在不带 `gsMark` 的情况下调用实体的 osnap
5. 对当前掩码中的每个活动模式，调用 `entity.subGetOsnapPoints(...)`。
6. 选择返回到光标最近的点。
7. 应用由屏幕 `hitRadius`（默认 20 px）换算出的世界距离阈值。
8. 如果接受，则捕捉光标并显示标记。

## 实体实现快照（来自 realdwg-web 代码）

- `AcDbLine`：EndPoint、MidPoint、Nearest、Perpendicular（存在 `Tangent` 分支但没有点）
- `AcDbArc`：EndPoint、MidPoint、Nearest、Tangent（存在 `Perpendicular` 分支但没有点）
- `AcDbCircle`：Center、Centroid、Quadrant、Nearest、Tangent
- `AcDbEllipse`：EndPoint（仅开放弧）、MidPoint（仅开放弧）、Quadrant（仅闭合椭圆）
- `AcDbPolyline`：EndPoint
- `AcDb2dPolyline`：EndPoint
- `AcDb3dPolyline`：EndPoint
- `AcDbPoint`：Node
- `AcDbText`：Insertion
- `AcDbMText`：Insertion
- `AcDbBlockReference`（`INSERT`）：Insertion + 通过 `gsMark` 委托的子实体捕捉
- 其他支持有限的实体：
- `AcDbRay`：EndPoint（基点）
- `AcDbFace`：EndPoint（顶点）
- `AcDbTrace`：EndPoint（顶点）
- `AcDbSpline`：EndPoint

## INSERT（`AcDbBlockReference`）的 OSNAP 逻辑

`subGetOsnapPoints` 有两条路径：

1. `Insertion` 模式：
- 直接推入块参照插入点（`this._position`）

2. 其他模式：
- 仅在提供 `gsMark` 时有效
- 委托给 `subEntityGetOsnapPoints(...)`

委托流程（`subEntityGetOsnapPoints`）：

1. 防护：如果 `gsMark === this.objectId`，则返回（避免递归）
2. 通过 `blockTable.getEntityById(gsMark)` 解析实体
3. 调用该子实体的 `subGetOsnapPoints(...)`
4. 使用此块参照的 `blockTransform` 变换返回的点
5. 将变换后的点推入输出

## 为什么 INSERT 捕捉可能失败（当前行为）

1. 没有 `gsMark`：
- 对于非 `Insertion` 模式，如果缺少 `gsMark`，`AcDbBlockReference` 不返回任何内容。

2. `gsMark` 模型被简化：
- 当前的 `gsMark` 是来自空间子级命中的子实体对象 id，而不是完整的 AutoCAD GS marker 语义。

3. INSERT 按图层分组的渲染：
- 渲染可能将一个 INSERT 拆分为多个基于图层的渲染组，且具有相同的父对象 id。
- 拾取依赖层级子包围盒来还原子实体 id。

4. 复杂/嵌套/边缘变换：
- 委托会应用当前 INSERT 的 `blockTransform`。
- 边缘情况（例如嵌套块场景或非默认法向/拉伸情况）仍可能产生错误或缺失的捕捉点。

这与 `README.md` 中已知的路线图说明一致：
- INSERT 的端点捕捉目前尚不完全可靠。

## 已知限制 / TODO

- OSNAP 覆盖范围取决于实体；许多模式/实体组合目前有意未实现。
- INSERT 的非插入点捕捉依赖于正确的子级命中 -> `gsMark` 传递。
- 当前的标记机制基于对象 id，并非完整的 AutoCAD GS marker 行为。
- 需要针对 INSERT 的更多回归测试，尤其是嵌套块和经过变换的块。

## 推荐的贡献方向

- 改进 INSERT 中子级命中到 `gsMark` 映射的健壮性。
- 为 EndPoint/MidPoint/Center/Nearest/Tangent 情况添加嵌套块回归测试。
- 逐步扩大每个实体的模式覆盖范围。
- 在可行时，使标记模型更接近 AutoCAD GS marker 语义。
