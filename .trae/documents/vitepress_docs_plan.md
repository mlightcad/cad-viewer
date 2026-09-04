# VitePress 帮助文档站实施计划（GitHub Pages + 多语言 + RTD API 保持）

## 一、现状

| 项目 | 现状 |
|---|---|
| GitHub Pages | ✅ demo 部署到根路径，链路：`pre-serve` → `copyDist.js` → `public/` → deploy-pages |
| **copyDist.js** | 第 20-21 行已预留 docs 拷贝：`docsSource = ../../docs` → `public/docs/` |
| **ReadTheDocs** | ✅ `.readthedocs.yaml` 跑 TypeDoc，`cp docs/ → RTD html output`，纯 API 文档站，需保持工作 |
| typedoc.json | `"out": "docs"` |
| `.gitignore` | `docs` 整体忽略 |
| 项目语言 | `en`, `zh`, `ar`, `cs`, `tr`（五种） |
| VitePress | 尚未安装 |

---

## 二、目标

1. **VitePress** 帮助文档站（五种语言）+ **TypeDoc** API 文档，部署到 GitHub Pages `/docs/`
2. **ReadTheDocs 保持原样**——继续跑纯 TypeDoc API 文档（改造 copy 路径即可）
3. GitHub Pages 根路径 demo 保持不变

---

## 三、两边部署结构

### GitHub Pages（demo + 帮助文档 + API）
```
https://mlightcad.github.io/cad-viewer/
├── index.html                    ← demo（不变）
├── cad-viewer/                   ← demo dist（不变）
├── cad-simple-viewer/            ← demo dist（不变）
├── cad-diff-viewer/              ← demo dist（不变）
├── robots.txt / sitemap.xml / llms.txt
└── docs/                         ← 新增！
    ├── index.html                ← EN 首页
    ├── guide/
    ├── api/                      ← TypeDoc 产物（英文）
    ├── zh/
    ├── ar/
    ├── cs/
    ├── tr/
    └── assets/
```

### ReadTheDocs（纯 API 文档，保持原样）
```
https://cad-viewer.readthedocs.io/
├── latest/
│   ├── classes/                  ← TypeDoc 标准输出
│   ├── functions/
│   ├── ...
│   └── index.html
├── stable/
├── v1.6.3/
└── ...
```

RTD 继续只跑 TypeDoc，**不部署 VitePress 帮助文档**（版本管理后续再考虑）。

---

## 四、实施步骤

### 1. 安装 VitePress + 调整 `.gitignore`

- `pnpm add -D vitepress`
- `.gitignore`：移除 `docs`，新增：
  ```
  docs/api/
  docs/.vitepress/dist/
  docs/.vitepress/cache/
  ```

### 2. 改 `typedoc.json`

- `"out": "docs/api"`

> TypeDoc 输出到 `docs/api/`，RTD 和 GitHub Pages 都从这里取。

### 3. 创建 VitePress 配置和页面

**`docs/.vitepress/config.ts`**：
```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MLightCAD Viewer',
  description: 'Web-based CAD Viewer',
  base: process.env.DOCS_BASE || '/cad-viewer/docs/',
  locales: {
    root: {
      lang: 'en-US', label: 'English',
      nav: [
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'API', link: '/api/' },
        { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' },
      ],
      sidebar: { '/guide/': [{ text: 'Guide', items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Architecture', link: '/guide/architecture' },
      ]}]},
    },
    zh: {
      lang: 'zh-CN', label: '中文',
      nav: [
        { text: '指南', link: '/zh/guide/getting-started' },
        { text: 'API', link: '/api/' },
        { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' },
      ],
      sidebar: { '/zh/guide/': [{ text: '指南', items: [
        { text: '快速开始', link: '/zh/guide/getting-started' },
        { text: '架构介绍', link: '/zh/guide/architecture' },
      ]}]},
    },
    ar: { lang: 'ar-SA', label: 'العربية', dir: 'rtl', /* nav/sidebar */ },
    cs: { lang: 'cs-CZ', label: 'Čeština', /* nav/sidebar */ },
    tr: { lang: 'tr-TR', label: 'Türkçe', /* nav/sidebar */ },
  },
})
```

**页面结构**：
```
docs/
├── index.md
├── guide/getting-started.md
├── guide/architecture.md
├── zh/index.md
├── zh/guide/getting-started.md
├── zh/guide/architecture.md
├── ar/index.md
├── ar/guide/getting-started.md
├── cs/index.md
├── cs/guide/getting-started.md
├── tr/index.md
├── tr/guide/getting-started.md
└── api/README.md
```

### 4. 更新 `package.json` 脚本

替换旧的：
```json
"docs:api": "typedoc --skipErrorChecking",
"docs:site": "vitepress dev docs",
"docs:build": "vitepress build docs",
"docs:preview": "vitepress preview docs"
```

**删除**：`"docs:site:prepare"` + 删除 `tools/prepare-docs-site.mjs`

### 5. 新建 `tools/copy-api-to-dist.mjs`

将 `docs/api/`（TypeDoc）拷贝到 `docs/.vitepress/dist/api/`（VitePress 产物内）。GitHub Pages 用。

### 6. 改 `packages/examples/copyDist.js`

```javascript
// 第 20-21 行：
const docsSource = path.resolve(rootDir, '../../docs/.vitepress/dist')

// copyDist() 函数里加保护：
if (await fs.pathExists(docsSource)) {
  await fs.copy(docsSource, docsTarget, { overwrite: true })
}
```

### 7. 改 `.github/workflows/ci.yml`

只改 build job 的 Build docs 步骤：

```yaml
- name: Build docs
  run: |
    pnpm docs:api
    DOCS_BASE=/cad-viewer/docs/ pnpm docs:build
    node tools/copy-api-to-dist.mjs
```

其他 job 全部不动。

### 8. 改 `.readthedocs.yaml`（保持 API 文档继续工作）

原来：
```yaml
- corepack pnpm docs:build       # 旧的 TypeDoc 命令
- corepack pnpm docs:site:prepare
- cp -R docs/. "$READTHEDOCS_OUTPUT/html/"
```

改后：
```yaml
- corepack pnpm docs:api                        # TypeDoc → docs/api/
- mkdir -p "$READTHEDOCS_OUTPUT/html"
- cp -R docs/api/. "$READTHEDOCS_OUTPUT/html/"   # 只拷贝 API 产物
```

RTD 现在跑的是纯 TypeDoc 产物（和之前一样），只是 TypeDoc 输出路径变了（`docs/api/`），cp 的源目录跟着变。

---

## 五、文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `package.json` | +vitepress；替换 docs 脚本 |
| 修改 | `.gitignore` | 拆分 docs 忽略规则 |
| 修改 | `typedoc.json` | `"out"` → `"docs/api"` |
| **修改** | `packages/examples/copyDist.js` | docsSource → `.vitepress/dist`；加 pathExists |
| 修改 | `.github/workflows/ci.yml` | 改 Build docs 步骤 |
| **修改** | `.readthedocs.yaml` | docs:api + cp docs/api/ → 保持 API 文档站 |
| 删除 | `tools/prepare-docs-site.mjs` | RTD 不再需要 |
| 新增 | `docs/.vitepress/config.ts` | VitePress 配置 |
| 新增 | `docs/index.md` + 各语言页面 | EN 原文 + 多语言 stub |
| 新增 | `docs/api/README.md` | API 入口 |
| 新增 | `tools/copy-api-to-dist.mjs` | 合并 TypeDoc → VitePress dist |

---

## 六、执行顺序

1. 安装 VitePress + 改 `.gitignore` + 改 `typedoc.json` + 改 `package.json`
2. 创建 VitePress config + 页面 + copy-api 脚本
3. 修改 `copyDist.js` + 修改 `ci.yml` + 修改 `.readthedocs.yaml` + 删除旧文件
4. 本地验证：
   - `docs:api` → 验证 TypeDoc 输出到 `docs/api/`
   - `docs:build` → 验证 VitePress 构建多语言正常
   - copy-api → 验证 API 合并到 dist
   - `pre-serve` → 验证 copyDist.js 正确拷贝
5. 本地模拟 RTD：cp docs/api/ → 验证纯 API 拷贝正常
6. 提交 push，验证双部署

---

**核心简化：TypeDoc 输出到 `docs/api/`，RTD 继续 `cp docs/api/`（纯 API），GitHub Pages 通过 VitePress + copyDist.js 附加到 `/docs/`。两边独立，互不干扰。请确认后执行。**
