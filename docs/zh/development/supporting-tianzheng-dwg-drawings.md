---
title: "支持天正 DWG 图纸"
---

# 支持天正 DWG 图纸

本页介绍为什么由**天正**软件（天正建筑、TArch 以及其他天正垂直产品）创建的 DWG 图纸无法被通用 DWG 解析器完整解析，并介绍行业标准的解决方案：在解析和渲染之前，将此类图纸转换为 **T3 格式 DWG**。

## 背景：为什么天正实体无法被直接解析

与普通 DWG 实体不同，天正实体（墙、门、窗、柱、尺寸标注以及其他智能建筑对象）使用**天正软件私有定义的数据格式**。它们**不**属于原生 AutoCAD DWG 标准格式。

在 DWG 文件中，这些天正特有的对象以[自定义实体](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-4E5C1B56-95C3-4D4F-8F1C-A9D34B1E1408)（代理实体）的形式存储。它们的内部数据只对天正自己的 ObjectARX 运行时有意义。因此：

- 没有任何通用商业 DWG 解析器能够直接解析这些专有的天正实体。
- 通用解析器（包括 MLightCAD）只能渲染此类图纸中的标准 AutoCAD 实体，而天正自定义实体则会被跳过或显示为代理图形。

## 行业通用方案：转换为 T3 格式

行业中的 CAD 查看软件厂商以类似方式处理该问题。典型的流程如下：

```text
DWG with Tianzheng entities
        |
        |  (1) Run Tianzheng runtime / conversion tool on the server
        v
T3 format DWG
        |
        |  (2) Parse with a standard DWG parser
        v
Rendered drawing in the viewer
```

1. **在服务器端运行天正环境或转换工具。** 包含天正专有实体的图纸由能够理解天正数据格式的软件处理。
2. **将 DWG 转换为 T3 格式。** T3（天正 3）是一种为兼容性而设计的导出格式。转换过程中，所有天正特有对象都会被分解（「炸开」）为普通 DWG 实体——例如墙变成直线/多段线，门窗变成块参照，天正标注变成标准尺寸/文字实体。
3. **使用标准 DWG 解析器解析转换后的文件。** 由于天正专有对象已经消失，只剩下标准 DWG 实体，任何通用 DWG 解析器现在都能正确读取并显示图纸。

换句话说，转换为 T3 格式后，图纸中的天正特有对象会变成普通 DWG 实体，因此通用 DWG 解析器可以直接使用。

## 开源 T3 转换工具参考

作为参考，以下是一个可自动化此转换的开源命令行工具：

- [t3-conv](https://github.com/housyty/t3-conv) — 一个 Windows 命令行工具，可通过无 UI 的批处理工作流将天正 DWG 文件转换为 T3 DWG 文件。

请注意，该工具在后台驱动真实的天正运行时，因此转换机器仍需安装天正 TArch 和 AutoCAD。详细要求、配置和使用方法请参阅该项目的 README。

## 建议：增加预处理步骤

如果你的业务场景涉及大量天正图纸，我们建议在图纸进入查看流程之前增加一个**预处理步骤**：

```text
Upload / Import
      |
      v
Detect Tianzheng entities  ->  If present, convert to T3 DWG
      |
      v
Store converted DWG
      |
      v
MLightCAD parsing & rendering
```

- 检测传入的 DWG 是否包含天正自定义实体（例如检查天正特有的代理实体类名或应用签名）。
- 如果存在，则运行 T3 转换（例如在 Windows 服务器上通过 `t3-conv`），并存储转换后的文件。
- 将转换后的 T3 DWG 交给 MLightCAD。所有此前不可见的天正对象现在都会作为标准实体渲染。

这样既保持查看器本身轻量且与解析器无关，又能确保最终用户完整查看天正图纸。
