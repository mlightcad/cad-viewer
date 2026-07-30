# 专有 DWG 解析器 — 商业授权说明

[English](./PROPRIETARY-PARSER.md)

本文档介绍 [cad-viewer](https://github.com/mlightcad/cad-viewer) 提供的**专有 DWG 解析器**。它是开源方案 `libredwg-web` / `libredwg-converter` 的商业替代选项。

若您正在构建**闭源商业产品**、**白标部署**，或 **SaaS / 本地部署 CAD 查看器**，且无法向客户分发 GPL-3.0 代码，本解析器适用于您的场景。

购买与咨询请联系 [mlight.lee@outlook.com](mailto:mlight.lee@outlook.com)。

---

## 支持范围

| 格式 | 是否支持 |
|------|----------|
| **DWG** | 是 |

专有解析器支持 **DWG**，可作为默认开源 DWG 解析器的直接替换，并提供：

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

- **将解析器作为独立的 DWG 解析库或 SDK 二次分发或单独售卖。** 授权范围是在您自己的应用或服务中使用，而非对外提供 competing 的解析器产品。此限制用于避免与解析器本身的商业冲突。

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

## 试用授权（Trial License）

若您希望在购买前评估专有解析器，可申请 **试用授权**。

### 如何申请

1. 发送邮件至 [mlight.lee@outlook.com](mailto:mlight.lee@outlook.com)，说明**公司基本信息**与**预期用途**。
2. **暂不接受个人申请** — 试用授权目前仅面向**公司与组织**。
3. 邮件中**必须提供 GitHub 用户名**。我们将通过 GitHub 组织 [**mlight-cad**](https://github.com/mlight-cad) 为该账户授予私有 npm 包 **`@mlight-cad/dwg-converter`** 的访问权限。

### 邮件模板

```
主题：试用授权申请 — [公司名称] — 专有 DWG 解析器

您好，

我们希望申请专有 DWG 解析器的试用授权，以便评估其是否适合我们的产品。

公司信息：
- 公司 / 组织名称：[公司名称]
- 网站（可选）：[URL]
- 国家 / 地区：[国家或地区]
- 联系人姓名：[您的姓名]
- 联系邮箱：[工作邮箱]
- GitHub 用户名（必填）：[your-github-username]

预期用途：
- 产品 / 项目名称：[简要名称]
- 部署模式：[如 SaaS、本地部署、桌面、白标等]
- 使用场景简述：[1–3 句话说明计划如何使用解析器]

我们已知悉试用授权目前仅面向公司与组织，暂不接受个人开发者申请。

此致
[您的姓名]
[公司名称]
```

### 审批通过后

若申请获批：

1. 我们将向申请邮件中提供的 GitHub 账户发送加入 **mlight-cad** 组织的**邀请**。
2. 请在 GitHub 中**接受邀请**（通过邮件通知，或在 **Settings → Organizations** 中操作）。
3. 加入 **mlight-cad** 组织后，即可使用该 GitHub 账户安装并使用 **`@mlight-cad/dwg-converter`** 包（需按随附集成说明配置 npm/pnpm/yarn 对 GitHub Packages 的认证）。

试用结束后如需用于商业生产环境，请参阅上文 [授权条款](#授权条款) 并联系我们购买永久授权。

---

## 与现有数据模型的集成

专有解析器以**可注册的 converter** 形式提供，与开源解析器接入同一套流程。

- 输出符合 MIT 授权的 **`@mlightcad/data-model`**：`AcDbDatabase`、`AcDb*` 实体、图层表、块等结构。
- 通过 **`AcDbDatabaseConverterManager`** 注册，与当前的 `AcDbLibreDwgConverter` 机制相同。
- 解析完成后，现有 **MIT 渲染、图层、选择与交互管线**（`cad-simple-viewer`、`cad-viewer`、各插件等）**无需改动**。

典型集成方式（示意）：

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlight-cad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

完整可运行示例（认证、Worker 资源、注册与数据库浏览）见 [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example)。

若使用专有解析器以满足合规要求，请**不要**再注册基于 GPL 的 `libredwg-converter`。

---

## GPL 合规

cad-viewer 默认 DWG 加载路径使用 GPL-3.0 包：

| 包 | 许可证 | 作用 |
|----|--------|------|
| `libredwg-web` / `@mlightcad/libredwg-converter` | GPL-3.0 | DWG 解析 |

DXF 加载使用 `@mlightcad/data-model` 中内置的 MIT 解析器，无需专有解析器。

若您**用专有解析器替换 LibreDWG converter**，并从构建中**移除 GPL 依赖**，应用可仅依赖 **MIT 授权**的 cad-viewer 技术栈（`data-model`、`cad-simple-viewer`、渲染器、插件等）。

**您可以从依赖图中完全移除 GPL 包** — 包括 LibreDWG 相关包 — 从而**不向客户分发任何 GPL 代码**，前提是所有 DWG 摄入均通过专有解析器完成。

---

## 支持与维护

cad-viewer 目前为**个人开源项目**（非公司运营），作者**全职**维护。

| 项目 | 说明 |
|------|------|
| **缺陷修复** | 包含 — 报告的问题会尽快处理 |
| **解析器更新 / 升级包** | 首年包含；之后需年度捐赠 |
| **新 DWG 版本兼容** | 通过升级包提供 |
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

### 如何申请试用授权？

请参阅上文 [试用授权（Trial License）](#试用授权trial-license) 一节。发送申请邮件时需提供公司信息、预期用途及 **GitHub 用户名**。审批通过后，您将被邀请加入 **mlight-cad** GitHub 组织，以访问 **`@mlight-cad/dwg-converter`** 包。

### 是否支持 DWG 中的三维实体（3D Entity）？

**部分支持。** 专有解析器可从 DWG 中提取 **3DSOLID** 实体，并部分解码其中的 **ACIS SAB** 数据。完整 B-rep 细分（tessellation）尚不支持；在存在 SAB/SAT 数据时，数据模型会尽量生成线框预览，否则回退为基于包围盒的线框。

详情请参阅：

- [`AcDb3dSolid` API 文档](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDb3dSolid.html)
- [realdwg-web](https://github.com/mlightcad/realdwg-web) 仓库中的 ACIS 相关实现：[`packages/data-model/src/acis`](https://github.com/mlightcad/realdwg-web/tree/main/packages/data-model/src/acis)

### 在未获得试用授权的情况下，能否体验专有 DWG 解析器？

**可以。** 公开示例项目 [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example) 展示了专有 DWG 解析器的能力，包括安装认证、Worker 资源部署、converter 注册，以及解析后浏览数据库内容。

如需更长时间评估或生产试点，请申请正式 [试用授权](#试用授权trial-license)。

### 如何使用专有 DWG 解析器？

专有解析器**不提供独立的“直接解析 DWG”API**。其接入方式与开源的 [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter) 相同：实现 **`AcDbDatabaseConverter`** 接口，并通过 **`AcDbDatabaseConverterManager`** 注册。解析完成后，您通过 MIT 授权的 **`@mlightcad/data-model`**（`AcDbDatabase`、各类实体、符号表等）访问 DWG 内容——与上文 [与现有数据模型的集成](#与现有数据模型的集成) 描述的路径一致。

---

## 相关文档

- [cad-viewer README](./README.zh-CN.md) — 项目概览、开源技术栈及默认解析器的已知限制
- [API 文档](https://mlightcad.github.io/cad-viewer/docs/) — `@mlightcad/data-model` 与查看器 API
