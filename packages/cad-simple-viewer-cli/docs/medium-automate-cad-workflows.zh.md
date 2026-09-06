# 用 `cad-simple-viewer-cli` 自动化 CAD 工作流：批量将 DWG/DXF 转为 PNG，用于 AI 训练

如果你需要大规模处理 CAD 图纸——质检流水线、文档转换，或机器学习数据集——每张图都打开 AutoCAD 并不现实。你需要的是可脚本化、无界面（headless）、且能轻松接入 Node.js 或 CI 的工具。

这就是 **[`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli)** 的用途：来自 [MLight CAD](https://mlightcad.com/) 的 AcCoreConsole 风格 CLI。它可打开 DXF/DWG（或从空白图纸开始），运行类似 AutoCAD 的 `.scr` 命令脚本，并将导出结果写到磁盘——无需桌面版 CAD 许可证。

相关在线查看能力可在浏览器体验：[MLight CAD 应用](https://mlightcad.netlify.app/)。

## 你可以自动化什么

用一段简短的命令脚本即可：

- 将图纸导出为 **PNG**、**PDF**、**SVG**、离线 **HTML** 或 **DXF**
- 缩放到范围、开关图层，再导出干净视图
- 从空白图纸开始，通过脚本创建几何
- 用 Node.js 或 shell 批量处理整文件夹的 DWG/DXF

本文聚焦一个常见的机器学习场景：**把一个文件夹里的 CAD 文件批量转成 PNG**，用于训练识别图元、符号或图纸布局区域的模型。

## 为什么 AI 需要从 CAD 导出 PNG

CAD 本身是结构化数据（图层、图元类型、坐标）。但许多视觉模型仍依赖栅格图：

- 检测门、窗、图签、尺寸文字等目标
- 分类图纸类型（平面 / 立面 / 原理图）
- 理解布局，并对渲染后的文字做 OCR

手工导出几百张图又慢又不统一。无界面 CLI 能提供**可重复的分辨率、缩放与命名**——这正是数据集流水线需要的。

## 安装

需要 **Node.js 20+**。CLI 通过 Playwright 使用无头 Chromium。

```bash
npm install -g @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

或作为项目依赖：

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

## 单文件快速上手：DWG → PNG

创建 `export-png.scr`（也可直接使用包内自带示例）：

```
; 缩放到范围，再导出 PNG（长边 2048px）
zoom
e
pngout

2048
quit
```

脚本规则很简单：命令名独占一行，后续行回答提示；空行表示回车/默认值；`;` 为注释；用 `quit` 结束。

运行：

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out
```

或使用 `npx`：

```bash
npx cad-simple-viewer-cli -i ./drawing.dxf -s ./export-png.scr -o ./out
```

也支持远程文件：

```bash
cad-simple-viewer-cli \
  -i https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg \
  -s ./export-png.scr \
  -o ./out
```

常用参数：

| 选项 | 含义 |
|------|------|
| `-i` | 本地 `.dxf` / `.dwg` 或 `http(s)` URL（省略则从空白图纸开始） |
| `-s` | `.scr` 脚本（**必填**） |
| `-o` | 导出文件输出目录 |
| `--mode read\|write` | 打开模式（改图层需要 `write`） |
| `--locale` | 提示/关键字语言（`en`、`zh` 等） |
| `--logfile` | 追加运行日志 |

如果你用过 AutoCAD 的 AcCoreConsole：

`accoreconsole /i drawing.dwg /s script.scr`  
≈ `cad-simple-viewer-cli -i drawing.dwg -s script.scr`

## 批量示例：整文件夹 DWG/DXF → PNG 数据集

这是 AI 训练中最常用的流程。

### 方案 A — 使用包内批量脚本

安装后，示例位于：

`node_modules/@mlightcad/cad-simple-viewer-cli/examples/`

```bash
node node_modules/@mlightcad/cad-simple-viewer-cli/examples/batch-export-png.mjs ./drawings ./out-png
```

该脚本会：

1. 递归查找 `./drawings` 下的 `.dwg` / `.dxf`
2. 对每个文件运行 CLI + `export-png.scr`
3. 将 PNG 写入 `./out-png`
4. 输出成功 / 失败数量

典型目录结构：

```text
drawings/
  floor-01.dwg
  floor-02.dxf
  archive/
    detail-a.dwg
out-png/
  floor-01.png
  floor-02.png
  detail-a.png
```

### 方案 B — shell 循环（适合简单 CI）

```bash
mkdir -p out-png
for f in drawings/*.{dwg,dxf}; do
  [ -e "$f" ] || continue
  cad-simple-viewer-cli -i "$f" -s ./export-png.scr -o ./out-png
done
```

### 方案 C — 编程 API

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const inputDir = './drawings'
const outputDir = './out-png'
const scriptPath = './export-png.scr'

for (const name of await readdir(inputDir)) {
  const ext = path.extname(name).toLowerCase()
  if (ext !== '.dwg' && ext !== '.dxf') continue

  const { savedFiles } = await runHeadless({
    inputPath: path.join(inputDir, name),
    scriptPath,
    outputDir,
    mode: 'read'
  })
  console.log(name, '→', savedFiles)
}
```

需要重试、并发池、旁路元数据，或对接标注工具时，用这种方式更合适。

## 更干净的 ML 数据集小技巧

**1. 固定长边分辨率**  
`pngout` + `2048` 可让不同图纸尺度一致。若模型偏好其他尺寸，改这个数字即可。

**2. 导出前先 zoom extents**  
始终先 `zoom` → `e` 再导出，让画面由内容决定范围，而不是残留视口噪声。

**3. 导出前关闭干扰图层**  
做符号检测时，可能希望关掉尺寸或填充。使用 `--mode write` 和图层脚本：

```
; freeze-layer-png.scr — 将 LAYER_NAME 换成真实图层名
-layer
Off
LAYER_NAME

zoom
e
pngout

2048
quit
```

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./freeze-layer-png.scr \
  -o ./out \
  --mode write
```

**4. 保留源文件名**  
批量脚本会保留图纸基名，便于标注映射：`floor-01.png` ↔ `floor-01.dwg`。

**5. 记录失败**  
在 CI 中加上 `--logfile ./cli.log`，避免坏文件静默失败。

## 不止 PNG：更多自动化脚本

同一套 CLI，换不同 `.scr` 即可（包内自带示例）：

| 脚本 | 用途 |
|------|------|
| `export-png.scr` | 缩放到范围 → PNG |
| `export-html.scr` | 离线 HTML（`-chtml`） |
| `export-html-multi.scr` | 多文件 ACEX 包 zip（`-chtml` Multi） |
| `export-dxf.scr` | 下载 DXF |
| `create-drawing-dxf.scr` | 空白图 + LINE → DXF |
| `create-shapes-dxf.scr` | LINE + CIRCLE → DXF |
| `batch-export-html.mjs` | 文件夹 → HTML |

常用命令包括：`zoom`、`pngout`、`cdxf`、`-chtml`、`chtml`、`cpdf`、`csvg`、`-layer`、`qnew`、`line`、`circle` 等。

示例——不提供输入文件，直接生成图纸：

```bash
cad-simple-viewer-cli -s ./create-drawing-dxf.scr -o ./out --mode write
```

这个模式很适合合成训练数据或冒烟测试。

## 放进你的技术栈

一条实用流水线可以是：

1. 把 DWG/DXF 收集到 `drawings/`
2. 用 `cad-simple-viewer-cli` 批量导出 PNG
3. 标注图像（或在可行时从 CAD 元数据派生标签）
4. 训练 / 评估视觉模型
5. 图纸更新后重新导出——同一脚本、同一参数

由于同时提供 CLI 与 Node API，它可以直接接入 GitHub Actions、本地数据集构建工具，或内部转换服务，而无需在每台机器安装 AutoCAD。

## 开始试用

- **npm 上的 CLI：** [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli)
- **在线查看器：** [https://mlightcad.netlify.app/](https://mlightcad.netlify.app/)
- **产品主页：** [https://mlightcad.com/](https://mlightcad.com/)
- **源码：** [github.com/mlightcad/cad-viewer](https://github.com/mlightcad/cad-viewer)（`packages/cad-simple-viewer-cli`）

如果你的瓶颈是「有上千张图纸，需要稳定、一致的渲染结果」，先用 `export-png.scr` 跑通一张图，再切到 `batch-export-png.mjs` 处理整个文件夹。仅这一步，就往往足以从真实 CAD 数据启动一套 AI 训练集。
