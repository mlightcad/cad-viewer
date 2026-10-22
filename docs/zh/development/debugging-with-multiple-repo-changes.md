---
title: "多仓库联合调试"
---

# 多仓库联合调试

`cad-viewer` 仓库依赖其他 MLight 仓库中的包，例如：

- 仓库 **`cad-viewer`**
  - 包：`@mlightcad/cad-simple-viewer`
- 仓库 **`realdwg-web`**
  - 包：`@mlightcad/data-model`、`@mlightcad/libredwg-converter`
- 仓库 **`mtext-renderer`**
  - 包：`@mlightcad/mtext-renderer`、`@mlightcad/mtext-input-box`、`@mlightcad/mtext-parser`

依赖链示例：

```
@mlightcad/cad-simple-viewer  --->  @mlightcad/data-model
                                   @mlightcad/libredwg-converter
                                   @mlightcad/mtext-renderer
```

在开发过程中，`realdwg-web` 或 `mtext-renderer` 中可能存在必须立即在 `cad-viewer` 内修复并测试的缺陷。

## `pnpm link` 的问题

跨多个 monorepo 使用 `pnpm link` 会带来若干问题：

- 设置和拆除过程复杂
- 容易忘记解除链接的步骤
- `node_modules` 状态变得难以推断
- 破坏 CI / 可复现性
- 新开发者难以跟进

为了简化本地调试，我们采用结合 pnpm overrides 的**本地目录依赖**方案。

## 解决方案：使用 pnpm overrides 的本地目录依赖

我们不在发布或链接包，而是临时修改 `pnpm-workspace.yaml` 中的 `overrides`，直接引用其他仓库中包的本地文件系统路径。

集中式版本管理位于 `pnpm-workspace.yaml`：

- 已发布的 semver 范围（例如 `^1.8.3`）是发布的事实来源
- `pnpm sync:versions` 会将这些值传播到每个 `packages/*/package.json`
- CI 和发布脚本会运行 `pnpm sync:versions:check`，确保所有内容保持一致

短期调试时，将某个 semver overrides 替换为 `file:` 路径。这种方式：

✅ 与 `pnpm` 自然配合  
✅ 无需全局链接  
✅ 明确且易于回滚  
✅ 适合短期调试  
✅ 保持依赖解析可预测  
✅ 适用于 monorepo 中的所有包

## 目录结构（推荐）

将各仓库并排放置：

```
workspace/
├── cad-viewer/
│   ├── packages/
│   │   └── cad-simple-viewer/
│   ├── package.json
│   └── pnpm-workspace.yaml
│
├── realdwg-web/
│   ├── packages/
│   │   ├── data-model/
│   │   └── libredwg-converter/
│   └── pnpm-workspace.yaml
│
└── mtext-renderer/
    ├── packages/
    │   ├── mtext-renderer/
    │   └── mtext-input-box/
    └── pnpm-workspace.yaml
```

> ⚠️ 此布局**不是必须的**，但相对路径会更容易管理。

## 分步指南

### 1. 在 `pnpm-workspace.yaml` 中添加本地 `file:` overrides

在 `cad-viewer/pnpm-workspace.yaml` 中，将你想调试的 semver 条目临时替换为本地路径。

正常的（已发布的）overrides 如下所示：

```yaml
packages:
  - 'packages/*'

overrides:
  '@mlightcad/data-model': '^1.8.3'
  '@mlightcad/libredwg-converter': '^3.6.3'
  '@mlightcad/mtext-input-box': '^0.2.16'
  '@mlightcad/mtext-renderer': '^0.11.2'
  # ... other shared dependency pins
```

本地调试时，只修改你需要测试的包：

```yaml
overrides:
  '@mlightcad/data-model': 'file:../realdwg-web/packages/data-model'
  '@mlightcad/libredwg-converter': 'file:../realdwg-web/packages/libredwg-converter'
  '@mlightcad/mtext-renderer': 'file:../mtext-renderer/packages/mtext-renderer'
  # Keep other overrides unchanged, or comment out entries you are not debugging
```

> 如果你的目录结构不同，请调整相对路径。  
> **不要**将 overrides 放在根 `package.json` 中；它们属于 `pnpm-workspace.yaml`。

### 2. 安装依赖

在 **`cad-viewer` 根目录**执行：

```
pnpm install
```

pnpm 将会：

- 从本地目录解析被覆盖的包
- 在 `node_modules` 内创建符号链接
- 将它们作为基于文件的依赖进行跟踪

### 3. 构建依赖（如有需要）

如果上游包需要构建步骤（TypeScript、打包等）：

```
cd ../realdwg-web
pnpm install
pnpm build
```

对于活跃开发，你还可以运行：

```
pnpm dev
```

或在支持的情况下使用监听模式。调试 `mtext-renderer` 仓库中的包时，请在该仓库中重复相同的步骤。

### 4. 正常调试

现在你可以：

- 修改上游仓库中的代码（例如 `realdwg-web/packages/data-model`）
- 重新构建（或让监听模式自动重新构建）
- 在 `cad-viewer` 中即时测试改动

无需链接、无需发布、无需重新安装。

## 恢复为已发布的包

调试完成后：

1. 恢复 `cad-viewer/pnpm-workspace.yaml` 中的 semver overrides（移除所有 `file:` 路径）。
2. 将依赖版本同步到工作区包：

```
pnpm sync:versions
```

3. 重新安装依赖：

```
pnpm install
```

4. 将 `pnpm sync:versions` 产生的所有 `package.json` 修改与恢复后的 `pnpm-workspace.yaml` 一起提交。

这确保了：

- CI 一致性
- 干净的依赖图
- 不会意外提交本地路径

## 发布或提交 PR 前的版本同步

在创建 PR 或运行发布之前，请确保依赖版本已对齐：

```
pnpm sync:versions
```

该命令会读取 `pnpm-workspace.yaml` 中的 `overrides`，并更新每个 `packages/*/package.json` 中匹配的条目。

要在不写入文件的情况下验证：

```
pnpm sync:versions:check
```

发布脚本（`pnpm release`）和 CI 都会自动运行该检查。如果版本不同步，请使用 `pnpm sync:versions` 修复，提交后重试。

升级外部依赖时的典型工作流：

1. 更新 `pnpm-workspace.yaml` `overrides` 中的 semver
2. 运行 `pnpm sync:versions`
3. 运行 `pnpm install`
4. 测试、提交并创建 PR

## ⚠️ 重要提示

### 不要提交本地路径

本地 `file:` overrides 仅限**开发者本人使用**。

提交之前：

- 确保 `pnpm-workspace.yaml` **不**包含 `file:` 路径
- 运行 `pnpm sync:versions`，使每个 `package.json` 与已发布的 semver overrides 匹配
- PR 和发布使用已发布的版本

### 何时使用这种方式

✅ 跨仓库修复缺陷  
✅ 调试集成问题  
✅ 无需发布即可快速迭代  
❌ 长期依赖管理  
❌ CI / 生产构建

## 对比：`pnpm link` 与 pnpm overrides 本地路径

| 方面             | pnpm link | 使用 pnpm overrides 的本地路径 |
| ---------------- | --------- | ------------------------------- |
| 设置复杂度       | 高        | 低                              |
| 明确性           | 隐式      | 显式                            |
| 易于回滚         | ❌         | ✅                               |
| CI 安全          | ❌         | ❌（仅开发用）                   |
| 对团队友好       | ❌         | ✅                               |

## 总结

对于横跨 **`cad-viewer`** 与 **`realdwg-web`** 或 **`mtext-renderer`** 等上游仓库的问题调试，请临时使用 **`pnpm-workspace.yaml` 中的 `file:` overrides**。

它：

- 简单
- 透明
- 易于传授
- 易于撤销
- 适用于 monorepo 中的所有包

调试完成后——或在任何发布之前——恢复 semver overrides，运行 **`pnpm sync:versions`**，并提交同步后的 `package.json` 文件。
