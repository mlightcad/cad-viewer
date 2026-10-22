---
title: "安装和使用私有 DWG 转换器"
---

# 安装和使用私有 DWG 转换器

本指南说明如何**安装**私有 DWG 解析包 **`@mlightcad/dwg-converter`**，并将其**注册**到 cad-viewer 数据模型。

关于许可、试用访问、定价和 GPL 合规性，请参阅主仓库中的 [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md)。

> **前提条件：** 你的 GitHub 账户必须已经拥有该私有包的**读取权限**（在试用或购买审批通过后授予）。

## 概览

- `@mlightcad/dwg-converter` 发布到 **GitHub Packages**。
- 其他 `@mlightcad/*` 包（例如 `@mlightcad/data-model`、`@mlightcad/cad-viewer`）发布到公共 **npm registry**。
- npm 和 pnpm 仅支持**作用域级别**的 registry 映射——同一作用域内**没有官方的包级别** registry 映射。

这意味着你**不能**使用：

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

来只获取 `@mlightcad/dwg-converter`。这样做会把**所有** `@mlightcad/*` 包路由到 GitHub Packages，从而破坏公共包的安装。

**版本说明：** 请将下面示例中的 `1.2.3`（以及任何 tarball 哈希）替换为**实际交付给你的确切版本**。

## 创建具有 `read:packages` 权限的 `GITHUB_TOKEN`

GitHub Packages 目前使用**个人访问令牌（classic）**进行身份验证；npm registry 不支持细粒度令牌。

1. 使用拥有包访问权限的账户登录 GitHub。
2. 打开 **Settings → Developer settings → Personal access tokens → Tokens (classic)**  
   （直接链接：[https://github.com/settings/tokens](https://github.com/settings/tokens)）。
3. 点击 **Generate new token → Generate new token (classic)**。
4. 为令牌命名（例如 `dwg-converter-install`），并设置符合你安全策略的有效期。
5. 在 **Select scopes** 下启用 **`read:packages`**。仅用于安装时，你不需要 `write:packages` 或 `delete:packages`。
6. 点击 **Generate token**，然后立即复制（它只显示一次）。
7. 将其暴露为 `GITHUB_TOKEN`：

   ```bash
   # macOS / Linux
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Windows PowerShell
   $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Windows CMD
   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

8. 当**客户端**直接与 GitHub Packages 通信时（即下面的方案 2），在 `.npmrc` 中添加**主机级别**的认证条目：

   ```ini
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

   这只会为 `npm.pkg.github.com` 附加凭据。它**不会**重新映射 `@mlightcad` 作用域。**不要**添加 `@mlightcad:registry=https://npm.pkg.github.com`。

   `pnpm install` 会读取此文件。当你在工作区包中运行 `npm view` 时，它不会读取该文件：自 npm 8.5 起，CLI 会忽略该包的 `.npmrc`（`ignoring workspace config`），并且请求会在没有令牌的情况下发送（`401 Unauthorized - authentication token not provided`），即使设置了 `GITHUB_TOKEN` 也是如此。请在 `npm view` 命令本身传入令牌——参见方案 2。

   在 monorepo 中，请将此文件放在**工作区根目录**。仅位于成员包内的 `.npmrc` 正是 npm 会跳过的文件。

   如果你使用方案 1（私有 registry 代理），客户端通常**不**需要这一行——而是将令牌放在代理上。

**安全注意事项**

- 将令牌视为密码。**不要**将其提交到 git 或粘贴到公开 issue 中。
- 优先使用环境变量（或你的 CI 密钥存储），而不是在 `.npmrc` 中硬编码令牌。
- 在 GitHub Actions 中，将仓库密钥（例如 `GH_PACKAGES_TOKEN`）映射到安装任务的 `GITHUB_TOKEN` / `NODE_AUTH_TOKEN`。

## 安装方案

从以下方案中选择**一种**。

### 方案 1：统一代理 npm 和 GitHub Packages 的私有 registry

如果你运营（或已经在使用）私有 npm registry——Verdaccio、JFrog Artifactory、Sonatype Nexus 或云厂商的 npm registry——请将客户端指向该 registry，并让它按包决定上游：

```text
                ┌── npmjs.org          (@mlightcad/data-model, …)
client ──→ private registry
                └── GitHub Packages    (@mlightcad/dwg-converter)
```

客户端 `.npmrc`：

```ini
registry=https://npm.example.com/
```

配置私有 registry，使其满足：

| 包 | 上游 |
|---------|----------|
| `@mlightcad/foo`（公共包） | `https://registry.npmjs.org` |
| `@mlightcad/dwg-converter` | `https://npm.pkg.github.com` |

然后正常安装：

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

如果你已经维护了私有 registry，这是最干净的长期方案。对于只需要一两个 GitHub Packages 的小项目，方案 2 通常更轻量。

### 方案 2：将 `@mlightcad/dwg-converter` 固定到 GitHub Packages tarball URL

在 `package.json` 中将该包固定到其 **tarball URL**，这样包管理器会直接下载该 URL，而不是通过 `@mlightcad` 作用域 registry 解析。

1. 向 GitHub Packages 进行身份验证（tarball URL **不能**绕过认证）：

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. 解析你所需版本的 tarball URL。

   不要依赖项目 `.npmrc` 来运行此命令。`npm view` 会忽略工作区包的 `.npmrc`，因此该文件中的 `${GITHUB_TOKEN}` 永远不会生效。请在命令行上传入令牌：

   ```bash
   # macOS / Linux
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball \
     --registry=https://npm.pkg.github.com \
     --//npm.pkg.github.com/:_authToken="${GITHUB_TOKEN}"
   ```

   ```powershell
   # Windows PowerShell
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball `
     --registry=https://npm.pkg.github.com `
     --//npm.pkg.github.com/:_authToken="$env:GITHUB_TOKEN"
   ```

   ```bat
   REM Windows CMD
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=%GITHUB_TOKEN%
   ```

   步骤 1 中的 `.npmrc` 条目仍然是必需的：`pnpm install` 在下载 tarball 时会使用它。

   输出示例：

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. 将该 URL 放入 `package.json`（使用**你自己的**版本和 tarball URL）：

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. 安装：

   ```bash
   pnpm install
   ```

**注意事项**

- 升级时需要获取新的 tarball URL，并更新 `package.json` / lockfile。
- CI 和本地安装仍然需要具有读取权限的有效 GitHub 令牌。
- 请保留 `.npmrc` 中的 GitHub Packages 认证条目。

方案 2 适用于评估和小型团队。如果你预计会频繁升级或使用许多私有包，请优先选择方案 1（或将单独的私有作用域如 `@mlightcad-private/*` 映射到 GitHub Packages）。

## 注册转换器

私有解析器是一个**可注册的转换器**，可接入与开源栈相同的流水线。

- 输出符合 MIT 许可的 **`@mlightcad/data-model`**：`AcDbDatabase`、`AcDb*` 实体、图层表、块及相关结构。
- 通过 **`AcDbDatabaseConverterManager`** 注册它，这与 `AcDbLibreDwgConverter` 使用的是同一机制。
- 解析完成后，现有的 MIT 渲染、图层、选择和交互流水线（`cad-simple-viewer`、`cad-viewer`、插件等）无需更改即可工作。

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

该包**不**提供独立的 "parse DWG" API。与开源 [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter) 一样，它实现的是 **`AcDbDatabaseConverter`**。转换完成后，通过 `@mlightcad/data-model` 操作生成的图纸。

如果你依赖私有解析器来满足合规要求，请**不要**同时注册基于 GPL 的 `libredwg-converter`。

完整的可运行示例（认证、worker 资源、注册和数据库浏览），请参阅 [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example)。

## 相关页面

- [配置 Worker URL](./configure-worker-urls) — DWG/DXF 解析器的 worker URL 设置
- [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) — 商业许可、试用和 GPL 说明
- [开发指南](./) — 开发者主题索引

