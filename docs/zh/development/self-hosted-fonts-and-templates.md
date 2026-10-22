---
title: "自托管字体和模板"
---

# 自托管字体和模板

本指南说明如何在你自己的服务器上部署字体和 DWG/DXF 模板。

## 概览

**cad viewer** 期望特定的目录结构来加载字体和模板。遵循该结构，你就可以托管自己的字体和模板，而不必使用 [Github 上的默认服务器](https://github.com/mlightcad/cad-data/)。

关于一个可运行的 Next.js 示例（从 [cad-data](https://github.com/mlightcad/cad-data) 的本地副本（git submodule）提供字体和模板，并为实时查看器和无头 CLI 都设置 `baseUrl`），请参阅 [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo)。

## 目录结构

你的服务器应遵循与 [mlightcad/cad-data 仓库](https://github.com/mlightcad/cad-data)相同的结构：

```
your-base-url/
├── fonts/                    # Font files directory
│   ├── arial.ttf
│   ├── simkai.ttf
│   ├── custom-font.shx
│   └── ...
├── templates/                # DWG/DXF template files directory
│   ├── acadiso.dxf
│   ├── custom-template.dwg
│   └── ...
└── fonts.json               # Font metadata configuration file
```

## 配置

### 设置基础 URL

在应用中配置 `baseUrl` 属性，使其指向你的服务器：

#### 在 Vue 组件中
```vue
<template>
  <MlCadViewer 
    locale="en" 
    :base-url="'https://your-server.com/cad-data/'"
  />
</template>
```

#### 在 TypeScript/JavaScript 中
```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Set the base URL for resource loading
AcApDocManager.instance.baseUrl = 'https://your-server.com/cad-data/'
```

#### 在 cad-simple-viewer-cli（无头 CLI）中

> **从 `@mlightcad/cad-simple-viewer` / `@mlightcad/cad-simple-viewer-cli` 1.7.2 起可用。**

当你针对自托管的字体/模板服务器运行无头 CLI 时，必须传入你的基础 URL。否则 CLI 会继续使用默认的 CDN `cad-data` URL，不会从你的服务器加载字体或模板。

**命令行**（`--base-url`）：

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out \
  --base-url https://your-server.com/cad-data/
```

**编程式 API**（`runHeadless`）：

```typescript
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

await runHeadless({
  inputPath: './drawing.dwg',
  scriptPath: './export-png.scr',
  outputDir: './out',
  baseUrl: 'https://your-server.com/cad-data/'
})
```

字体从 `<base-url>/fonts/` 加载（例如 `https://your-server.com/cad-data/fonts/`）。URL 必须是 `http` 或 `https`。

### 默认行为

如果未提供 `baseUrl`，查看器使用默认 URL：`https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

## 字体管理

### 字体目录

将所有字体文件放在 `fonts/` 目录中。支持的字体格式包括：
- **TTF**（TrueType Font）- `.ttf` 文件
- **SHX**（AutoCAD Shape Font）- `.shx` 文件
- **OTF**（OpenType Font）- `.otf` 文件

### Fonts.json 配置

`fonts.json` 文件是一个 JSON 数组，包含每个可用字体的元数据。该文件必须位于基础 URL 的根目录下。

#### 文件结构

```json
[
  {
    "name": ["Arial"],
    "file": "arial.ttf",
    "type": "mesh",
    "description": "Standard Arial font for text rendering"
  },
  {
    "name": ["SimKai"],
    "file": "simkai.ttf", 
    "type": "mesh",
    "description": "Chinese Kai font for CJK text support"
  },
  {
    "name": ["Custom SHX Font"],
    "file": "custom.shx",
    "type": "shx",
    "description": "Custom AutoCAD shape font",
    "encoding": "gbk"
  }
]
```

#### 字段说明

| 字段 | 类型 | 是否必需 | 描述 |
|-------|------|----------|-------------|
| `name` | string 数组 | 是 | DWG/DXF 文件中使用的字体名称。一个字体可以有多个名称。 |
| `file` | string | 是 | `fonts/` 目录中字体文件的文件名。必须完全匹配。 |
| `type` | string | 是 | 字体类型/格式。常见值：`"mesh"` 和 `"shx"`。`"mesh"` 指 `"ttf"`、`"otf"` 和 `"woff"` 字体。 |
| `description` | string | 否 | 可选的字体用途或特征描述。 |
| `encoding` | string | 否 | 可选的字体编码描述，可以是 [TextDecoder: encoding property](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding) 中的任一取值。仅当字体是 [shx 大字体](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-CDAF6EAF-85D1-48FC-9A78-43514E0132D5)或 [shx 扩展大字体](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-00ED0CC6-A4BE-4591-93FA-598CC40AA43D)时才需要此属性。 |

### 添加新字体

向服务器添加新字体：

1. **上传字体文件**到 `fonts/` 目录
2. **更新 `fonts.json`**，添加新条目：

```json
[
  // ... existing fonts ...
  {
    "name": "My Custom Font",
    "file": "my-custom-font.ttf",
    "type": "mesh",
    "description": "Custom font for specific project needs"
  }
]
```

3. 在你的应用中**测试字体加载**：

```typescript
// Load the new font
await AcApDocManager.instance.loadFonts(['My Custom Font'])

// Or load default fonts (includes your new font if it's in the list)
await AcApDocManager.instance.loadDefaultFonts()
```

## 模板管理

### 模板目录

将 DWG 和 DXF 模板文件放在 `templates/` 目录中。这些模板用于创建新文档。

### 默认模板

该库期望 `templates/` 目录中存在一个名为 `acadiso.dxf` 的默认模板。该模板供 "Quick New" 命令（`AcApQNewCmd`）使用。

### 添加自定义模板

1. **上传模板文件**到 `templates/` 目录
2. 在你的应用中**引用模板**：

```typescript
// Open a custom template
const templateUrl = AcApDocManager.instance.baseUrl + 'templates/my-custom-template.dxf'
await AcApDocManager.instance.openUrl(templateUrl)
```

## 服务器要求

### CORS 配置

确保你的服务器允许跨域请求，以便 CAD Viewer 加载资源：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### MIME 类型

配置服务器以正确的 MIME 类型提供字体文件：

- `.ttf` → `font/ttf`
- `.otf` → `font/otf` 
- `.shx` → `application/octet-stream`
- `.dwg` → `application/dwg`
- `.dxf` → `application/dxf`

### Nginx 配置示例

```nginx
location /cad-data/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
    
    location ~* \.(ttf|otf|shx)$ {
        add_header Content-Type font/ttf;
    }
    
    location ~* \.(dwg|dxf)$ {
        add_header Content-Type application/octet-stream;
    }
}
```

## 错误处理

该库为字体加载问题提供了事件处理器：

```typescript
import { eventBus } from '@mlightcad/cad-simple-viewer'

// Handle fonts that cannot be found
eventBus.on('fonts-not-found', (params) => {
  console.warn('Fonts not found:', params.fonts)
  // Implement fallback logic or user notification
})

// Handle fonts that fail to load
eventBus.on('fonts-not-loaded', (params) => {
  console.error('Fonts failed to load:', params.fonts)
  // Implement error handling or user notification
})
```

## 最佳实践

1. **版本控制**：将 `fonts.json` 文件纳入版本控制，以跟踪字体添加和变更
2. **字体优化**：尽可能使用压缩字体格式（`woff`）以减少加载时间
3. **测试**：使用不同的 CAD 文件测试字体加载，以确保兼容性
4. **文档**：为团队成员记录你的自定义字体和模板

## 故障排查

### 常见问题

1. **字体未加载**：检查 `fonts.json` 是否可在 `{baseUrl}/fonts.json` 访问
2. **CORS 错误**：确保你的服务器允许跨域请求
3. **404 错误**：验证 `fonts.json` 中的文件路径与实际文件名匹配
4. **MIME 类型问题**：配置服务器以正确的 MIME 类型提供字体

### 调试

启用浏览器开发者工具来监控网络请求，并检查：
- `fonts.json` 是否成功加载
- 字体文件下载
- CORS 响应头
- HTTP 状态码

## 实现示例

以下是设置自定义字体和模板服务器的完整示例：

```typescript
// Initialize the CAD viewer with custom base URL
const docManager = AcApDocManager.createInstance(canvas)
docManager.baseUrl = 'https://my-cdn.com/cad-resources/'

// Load custom fonts
await docManager.loadDefaultFonts(['Arial', 'My Custom Font'])

// Open a document from a custom template
await docManager.openUrl(docManager.baseUrl + 'templates/custom-template.dxf')
```

此设置允许你完全自定义应用可用的字体和模板，同时保持与预期结构的兼容性。

