# 专有 DWG/DXF 解析器 — 商业授权说明

[English](./PROPRIETARY-PARSER.md)

本文档介绍 [cad-viewer](https://github.com/mlightcad/cad-viewer) 提供的**专有 DWG/DXF 解析器**。它是开源方案 `dxf-json` / `dxf-json-converter` 与 `libredwg-web` / `libredwg-converter` 的商业替代选项。

若您正在构建**闭源商业产品**、**白标部署**，或 **SaaS / 本地部署 CAD 查看器**，且无法向客户分发 GPL-3.0 代码，本解析器适用于您的场景。

购买与咨询请联系 [mlight.lee@outlook.com](mailto:mlight.lee@outlook.com)。

---

## 支持范围

| 格式 | 是否支持 |
|------|----------|
| **DWG** | 是 |
| **DXF** | 是 |

专有解析器**同时支持 DWG 与 DXF**，可作为默认开源解析器的直接替换，并提供：

- 相比基于 LibreDWG 的方案，**内存占用更低**
- **支持更大的 DWG 文件**（不受 `libredwg-web` WASM 堆内存限制）
- 针对生产图纸的**更高解析准确度**

---

## 授权条款

### 您将获得什么

- **预编译的 npm 包**（已打包分发）。**不包含源代码。**
- **永久使用权**，可在您的产品与部署环境中使用。

### 允许的使用方式

您可以：

- 将解析器**嵌入自有闭源应用**，并作为产品的一部分**再次分发**（桌面、移动或 Web）。
- 用于 **SaaS**（多租户云端）与 **本地部署**，包括向客户提供的**白标部署**。
- **无限制**处理用户、租户、项目或文件数量。**无按席位、按服务器、按租户或按文件计费。**

### 限制

您**不得**：

- **将解析器作为独立的 DWG/DXF 解析库或 SDK 二次分发或单独售卖。** 授权范围是在您自己的应用或服务中使用，而非对外提供 competing 的解析器产品。此限制用于避免与解析器本身的商业冲突。

若您的场景不符合上述说明（例如计划向第三方提供解析器 SDK），请联系我们单独协商。

### 价格

通过**一次性捐赠**方式购买：

| 项目 | 金额（美元） |
|------|--------------|
| **永久授权**（一次性捐赠） | **$3,000** |
| **升级包 — 首年** | 免费包含 |
| **升级包 — 首年之后** | **$1,500 / 年**（捐赠） |

- **$3,000 捐赠**获得**永久使用权**，可长期在生产环境使用购买时交付的版本。
- 购买后**一年内**，免费提供**升级包**（缺陷修复、解析改进、兼容性更新）。
- **首年之后**，若需获取**新升级包**，需每年 **$1,500 捐赠**。您可继续使用已有版本而无需为升级付费；年度捐赠仅针对希望获取新升级包的情况。

**无版税、无按席位费用、无使用量上限。**

---

## 与现有数据模型的集成

专有解析器以**可注册的 converter** 形式提供，与开源解析器接入同一套流程。

- 输出符合 MIT 授权的 **`@mlightcad/data-model`**：`AcDbDatabase`、`AcDb*` 实体、图层表、块等结构。
- 通过 **`AcDbDatabaseConverterManager`** 注册，与当前的 `AcDbDxfConverter`、`AcDbLibreDwgConverter` 机制相同。
- 解析完成后，现有 **MIT 渲染、图层、选择与交互管线**（`cad-simple-viewer`、`cad-viewer`、各插件等）**无需改动**。

典型集成方式（示意）：

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
// 从授权包中导入专有 converter（购买后提供具体包名）
import { AcDbProprietaryConverter } from '@mlightcad/proprietary-converter'

const converter = new AcDbProprietaryConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DXF, converter)
```

若使用专有解析器以满足合规要求，请**不要**再注册基于 GPL 的 `dxf-json-converter` 或 `libredwg-converter`。

---

## GPL 合规

cad-viewer 默认文件加载路径使用 GPL-3.0 包：

| 包 | 许可证 | 作用 |
|----|--------|------|
| `dxf-json` / `@mlightcad/dxf-json-converter` | GPL-3.0 | DXF 解析 |
| `libredwg-web` / `@mlightcad/libredwg-converter` | GPL-3.0 | DWG 解析 |

若您**用专有解析器替换上述 converter**，并从构建中**移除 GPL 依赖**，应用可仅依赖 **MIT 授权**的 cad-viewer 技术栈（`data-model`、`cad-simple-viewer`、渲染器、插件等）。

**您可以从依赖图中完全移除 GPL 包** — 包括 `dxf-json`、`dxf-json-converter` 及 LibreDWG 相关包 — 从而**不向客户分发任何 GPL 代码**，前提是所有 DWG/DXF 摄入均通过专有解析器完成。

---

## 支持与维护

cad-viewer 目前为**个人开源项目**（非公司运营），作者**全职**维护。

| 项目 | 说明 |
|------|------|
| **缺陷修复** | 包含 — 报告的问题会尽快处理 |
| **解析器更新 / 升级包** | 首年包含；之后需年度捐赠 |
| **新 DWG/DXF 版本兼容** | 通过升级包提供 |
| **集成技术支持** | 合理的邮件支持，协助接入 converter |
| **响应时间** | 一般**一个工作日内**响应已报告的缺陷 |

暂无正式 SLA 或 7×24 值班服务。若有企业级支持需求，请联系我们协商。

---

## 常见问题

### 能否用于白标产品？

**可以。** 可嵌入闭源、白标商业应用，并以 SaaS 或本地部署形式交付给客户。

### 是否需要开源我们的应用？

**不需要。** 专有解析器授权允许在闭源产品中使用。您选用的 cad-viewer 开源组件仍遵循各自许可证（核心栈为 MIT）。

### 能否随桌面安装包分发？

**可以**，作为应用捆绑的一部分，但不得将解析器作为独立解析产品单独售卖。

### 停止年度捐赠会怎样？

您**保留已有版本的永久使用权**。只是不再收到**新**升级包，直至恢复年度捐赠。

### 如何购买？

请发送邮件至 [mlight.lee@outlook.com](mailto:mlight.lee@outlook.com)，简要说明产品与部署模式。我们将安排捐赠并交付 npm 包及集成说明。

---

## 相关文档

- [cad-viewer README](./README.zh-CN.md) — 项目概览、开源技术栈及默认解析器的已知限制
- [API 文档](https://mlightcad.github.io/cad-viewer/docs/) — `@mlightcad/data-model` 与查看器 API
