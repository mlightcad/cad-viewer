---
title: "Self-Hosted Fonts and Templates"
---

# Self-Hosted Fonts and Templates

This guide explains how to deploy fonts and DWG/DXF templates on your own server.

## Overview

The **cad viewer** expects a specific directory structure to load fonts and templates. By following this structure, you can host your own fonts and templates instead of using [the default server in Github](https://github.com/mlightcad/cad-data/) .

For a working Next.js example that serves fonts and templates from a local copy of [cad-data](https://github.com/mlightcad/cad-data) (git submodule) and sets `baseUrl` on both the live viewer and the headless CLI, see [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo).

## Directory Structure

Your server should follow the same structure as the [mlightcad/cad-data repository](https://github.com/mlightcad/cad-data):

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

## Configuration

### Setting the Base URL

Configure the `baseUrl` property in your application to point to your server:

#### In Vue Component
```vue
<template>
  <MlCadViewer 
    locale="en" 
    :base-url="'https://your-server.com/cad-data/'"
  />
</template>
```

#### In TypeScript/JavaScript
```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Set the base URL for resource loading
AcApDocManager.instance.baseUrl = 'https://your-server.com/cad-data/'
```

#### In cad-simple-viewer-cli (headless CLI)

> **Available from `@mlightcad/cad-simple-viewer` / `@mlightcad/cad-simple-viewer-cli` 1.7.2.**

When you run the headless CLI against a self-hosted font/template server, you must pass your base URL. Otherwise the CLI keeps using the default CDN `cad-data` URL and will not load fonts or templates from your server.

**Command line** (`--base-url`):

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out \
  --base-url https://your-server.com/cad-data/
```

**Programmatic API** (`runHeadless`):

```typescript
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

await runHeadless({
  inputPath: './drawing.dwg',
  scriptPath: './export-png.scr',
  outputDir: './out',
  baseUrl: 'https://your-server.com/cad-data/'
})
```

Fonts are loaded from `<base-url>/fonts/` (for example `https://your-server.com/cad-data/fonts/`). The URL must be `http` or `https`.

### Default Behavior

If no `baseUrl` is provided, the viewer uses the default URL: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

## Font Management

### Fonts Directory

Place all font files in the `fonts/` directory. Supported font formats include:
- **TTF** (TrueType Font) - `.ttf` files
- **SHX** (AutoCAD Shape Font) - `.shx` files
- **OTF** (OpenType Font) - `.otf` files

### Fonts.json Configuration

The `fonts.json` file is a JSON array that contains metadata for each available font. This file must be located at the root of your base URL.

#### File Structure

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

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string array | Yes | The font name used in DWG/DXF files. One font can have multiple names. |
| `file` | string | Yes | The filename of the font file located in the `fonts/` directory. Must match exactly. |
| `type` | string | Yes | The font type/format. Common values: `"mesh"` and `"shx"`. `"mesh"` means `"ttf"`, `"otf"`, and `"woff"` fonts. |
| `description` | string | No | Optional description of the font's purpose or characteristics. |
| `encoding` | string | No | Optional description of the font's encoding which can be one of values avaialbe in [TextDecoder: encoding property](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding). This property is need only if the font is [shx big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-CDAF6EAF-85D1-48FC-9A78-43514E0132D5) or [shx extended big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-00ED0CC6-A4BE-4591-93FA-598CC40AA43D). |

### Adding New Fonts

To add a new font to your server:

1. **Upload the font file** to the `fonts/` directory
2. **Update `fonts.json`** by adding a new entry:

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

3. **Test the font loading** in your application:

```typescript
// Load the new font
await AcApDocManager.instance.loadFonts(['My Custom Font'])

// Or load default fonts (includes your new font if it's in the list)
await AcApDocManager.instance.loadDefaultFonts()
```

## Template Management

### Templates Directory

Place DWG and DXF template files in the `templates/` directory. These templates are used when creating new documents.

### Default Template

The library expects a default template named `acadiso.dxf` in the `templates/` directory. This template is used by the "Quick New" command (`AcApQNewCmd`).

### Adding Custom Templates

1. **Upload template files** to the `templates/` directory
2. **Reference templates** in your application:

```typescript
// Open a custom template
const templateUrl = AcApDocManager.instance.baseUrl + 'templates/my-custom-template.dxf'
await AcApDocManager.instance.openUrl(templateUrl)
```

## Server Requirements

### CORS Configuration

Ensure your server allows cross-origin requests for the CAD Viewer to load resources:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### MIME Types

Configure your server to serve font files with correct MIME types:

- `.ttf` → `font/ttf`
- `.otf` → `font/otf` 
- `.shx` → `application/octet-stream`
- `.dwg` → `application/dwg`
- `.dxf` → `application/dxf`

### Example Nginx Configuration

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

## Error Handling

The library provides event handlers for font loading issues:

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

## Best Practices

1. **Version Control**: Keep your `fonts.json` file in version control to track font additions and changes
2. **Font Optimization**: Use compressed font formats (`woff`) when possible to reduce loading times
3. **Testing**: Test font loading with different CAD files to ensure compatibility
4. **Documentation**: Document your custom fonts and templates for team members

## Troubleshooting

### Common Issues

1. **Fonts not loading**: Check that `fonts.json` is accessible at `{baseUrl}/fonts.json`
2. **CORS errors**: Ensure your server allows cross-origin requests
3. **404 errors**: Verify file paths in `fonts.json` match actual filenames
4. **MIME type issues**: Configure your server to serve fonts with correct MIME types

### Debugging

Enable browser developer tools to monitor network requests and check for:
- Successful loading of `fonts.json`
- Font file downloads
- CORS headers
- HTTP status codes

## Example Implementation

Here's a complete example of setting up a custom font and template server:

```typescript
// Initialize the CAD viewer with custom base URL
const docManager = AcApDocManager.createInstance(canvas)
docManager.baseUrl = 'https://my-cdn.com/cad-resources/'

// Load custom fonts
await docManager.loadDefaultFonts(['Arial', 'My Custom Font'])

// Open a document from a custom template
await docManager.openUrl(docManager.baseUrl + 'templates/custom-template.dxf')
```

This setup allows you to fully customize the fonts and templates available to your application while maintaining compatibility with the expected structure.


