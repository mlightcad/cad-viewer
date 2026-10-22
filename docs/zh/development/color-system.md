---
title: "颜色系统"
---

# 颜色系统

`cad-viewer` 的颜色系统遵循 AutoCAD ObjectARX 的行为，同时确保在浏览器环境中具有可预测的渲染效果。

它同时支持 **AutoCAD 颜色索引（ACI）** 和 **真彩色（True Color）**，并通过 `AcCmColor` 抽象进行统一。

## 概览

在 AutoCAD 兼容系统中，颜色主要有两种表示方式：

### ACI（AutoCAD Color Index）

- 基于整数的颜色系统（`0–256`）
- 使用预定义调色板
- 包含**逻辑颜色**，这些颜色取决于上下文，而不是固定的 RGB 值

### 真彩色（True Color）

- 24 位 RGB 颜色（`R, G, B`）
- 每个通道的范围为 `0–255`
- 独立于 ACI 提供完整的颜色灵活性

## `AcCmColor`

`cad-viewer` 中的所有颜色都使用 `AcCmColor` 类表示。

它支持：

- ACI 索引
- 真彩色（RGB）
- 逻辑颜色模式（ByLayer / ByBlock）

参考实现：  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/common/src/AcCmColor.ts>

该抽象与 ObjectARX 一致，在 ObjectARX 中，一个颜色对象既可以表示索引颜色，也可以表示显式的 RGB 值。

## 特殊 ACI 值

与标准 ACI 值（`1–255`）不同，以下值表示**逻辑颜色**：

### ACI = 0 → ByBlock

- 颜色由块参照决定
- 行为：
  - 插入前：使用默认前景色
  - 插入后：从块的上下文继承

这不是固定颜色，而是动态引用。

### ACI = 256 → ByLayer

- 颜色从实体所在的图层继承
- CAD 工作流中最常用的模式

行为：

- 更改图层颜色会更新所有使用 ByLayer 的实体
- 支持集中化的颜色管理

### ACI = 7 → 自适应前景色

- 表示**默认前景色**
- 显示为：
  - **深色背景上为白色**
  - **浅色背景上为黑色**

这使它成为一种**依赖上下文的颜色**，而不是固定的 RGB 值。

在 AutoCAD 工作流中：

- 创建新图层时，其默认颜色通常是 **ACI 7**
- 这确保新创建的几何体无论背景主题如何都始终可见

## `AcDbEntity` 中的颜色解析

每个实体通过 `resolvedColor` 属性解析其最终显示颜色。

参考实现：  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/entity/AcDbEntity.ts>


`resolvedColor` 属性决定用于渲染的最终 RGB 颜色。解析遵循基于优先级的流程：

- 真彩色（最高优先级）：如果实体显式定义了真彩色，则直接使用
- ByLayer 解析：如果颜色为 ByLayer（ACI = 256），则委托给图层解析后的颜色
- ByBlock 解析：如果颜色为 ByBlock（ACI = 0），则取决于块的插入上下文，如果没有上下文则回退到默认颜色
- ACI 颜色解析：对于标准 ACI 值（`1–255`），使用预定义的查找表


## `cad-viewer` 中对 ACI 7 的处理

`cad-viewer` 将 ACI 7 视为语义颜色，而不是固定的 RGB 值。当背景变化时，它会自动翻转以保持对比度。其工作原理大致如下：

- **背景变化触发前景更新**：当视图的背景颜色变化时，渲染器会被明确指示更新 "foreground" 渲染颜色。规则很简单：

  - 如果背景为黑色，则 ACI 7 使用白色。
  - 如果背景为白色，则 ACI 7 使用黑色。

- **材质会记住自己是否为 "foreground"**：创建材质时，会为其打上元数据标记，指示它是否表示前景（ACI 7）实体。这使得系统能够找到*所有缓存材质*，在前景变化时进行翻转。

- **集中式前景更新**：渲染器的样式管理器会将单个 "change foreground" 请求路由到所有材质管理器（线、点、填充）。每个管理器遍历其缓存材质，仅更新标记为前景的材质。

## 汇总

| 类型        | 表示 | 解析策略 |
| ----------- | -------------- | ------------------- |
| 真彩色  | RGB            | 直接使用              |
| ACI（1–255） | 索引          | 调色板查找      |
| ByLayer     | 256            | 委托给图层    |
| ByBlock     | 0              | 依赖上下文   |
| ACI 7       | 7              | 自适应对比度   |

## 设计目标

`cad-viewer` 颜色系统的设计目标是：

- 与 ObjectARX 语义保持一致
- 保留逻辑颜色行为（ByLayer / ByBlock）
- 确保在浏览器中的渲染一致性
- 正确处理自适应前景色（ACI 7）

