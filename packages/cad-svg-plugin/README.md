# @mlightcad/cad-svg-plugin

SVG **export** plugin and rendering engine for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer). Registers one system command:

| Command | Description |
|---------|-------------|
| `csvg` | Export the current drawing to SVG |

The plugin is designed for **lazy loading** so the SVG renderer bundle is only downloaded when a user runs `csvg`.

## Key features

- **Vector SVG export** — renders model-space entities to SVG via `AcSvgRenderer`
- **Plugin API** — implements `AcApPlugin`; register once with `registerLazySvgPlugin`
- **Reusable renderer** — `AcSvgRenderer` is also used by `@mlightcad/cad-pdf-plugin` for PDF export
- **Framework-agnostic** — no Vue/React dependency; works anywhere `cad-simple-viewer` runs

## Installation

```bash
pnpm add @mlightcad/cad-svg-plugin
```

Peer dependencies:

- `@mlightcad/cad-simple-viewer`
- `@mlightcad/data-model`
- `@mlightcad/mtext-parser`

## Build

Produces `dist/index.js` (main library) and `dist/register.js` (lazy-registration entry).

```bash
pnpm --filter @mlightcad/cad-svg-plugin build
```

## Usage

### Lazy registration (recommended)

Register the plugin with the document manager's plugin manager. Import from the `/register` subpath so only the registration stub enters your initial bundle; the main plugin chunk loads on first use of `csvg`:

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazySvgPlugin } from '@mlightcad/cad-svg-plugin/register'

registerLazySvgPlugin(AcApDocManager.instance.pluginManager)
```

Do **not** import `registerLazySvgPlugin` from the package root in application code — that resolves to the full library build and defeats lazy loading.

Equivalent manual registration:

```typescript
import {
  createSvgPlugin,
  SVG_PLUGIN_NAME,
  SVG_PLUGIN_TRIGGERS
} from '@mlightcad/cad-svg-plugin'

AcApDocManager.instance.pluginManager.registerLazyPlugin({
  name: SVG_PLUGIN_NAME,
  triggers: [...SVG_PLUGIN_TRIGGERS],
  loader: createSvgPlugin
})
```

### Eager loading

```typescript
import { AcApSvgPlugin } from '@mlightcad/cad-svg-plugin'

await AcApDocManager.instance.pluginManager.loadPlugin(new AcApSvgPlugin())
```

### Using the renderer directly

```typescript
import { AcSvgRenderer } from '@mlightcad/cad-svg-plugin'

AcSvgRenderer.prepareExport()
const renderer = new AcSvgRenderer()
// ... configure and draw entities ...
const svg = await renderer.exportAsync()
```

## Public API

| Export | Description |
|--------|-------------|
| `createSvgPlugin` | Async factory used by lazy loader |
| `SVG_PLUGIN_NAME`, `SVG_PLUGIN_TRIGGERS` | Plugin metadata constants |
| `@mlightcad/cad-svg-plugin/register` | `registerLazySvgPlugin` and registration constants |
| `AcApSvgPlugin` | `AcApPlugin` implementation |
| `AcApConvertToSvgCmd` | `csvg` command class |
| `AcApSvgConvertor` | SVG export workflow |
| `AcSvgRenderer` | Core SVG rendering engine |

## Package layout

| Path | Role |
|------|------|
| `src/register.ts` | Lazy plugin registration (`/register` entry) and `createSvgPlugin` |
| `src/AcApSvgPlugin.ts` | Plugin lifecycle (`onLoad` / `onUnload`) |
| `src/AcApConvertToSvgCmd.ts` | `csvg` command |
| `src/AcApSvgConvertor.ts` | Export orchestration |
| `src/AcSvgRenderer.ts` | Main SVG renderer implementation |
| `src/AcSvg*.ts` | Entity-specific SVG renderers |

## Role in MLightCAD

This package extends `cad-simple-viewer` with optional SVG export. It keeps the SVG renderer out of the core viewer bundle through lazy loading, while still exposing `AcSvgRenderer` for other packages such as `cad-pdf-plugin`.
