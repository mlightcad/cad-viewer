# @mlightcad/cad-simple-ui-plugin

Framework-agnostic toolbar and layer manager UI for [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer).

This plugin provides ready-to-use CAD viewer chrome without Vue, React, or Element Plus. All UI uses plain DOM and respects the cad-simple-viewer `--ml-ui-*` theme tokens.

## Features

- Configurable toolbar with predefined CAD commands, separators, and preset references
- Nested toolbar menus with submenu arrows
- Toolbar placement: `top`, `bottom`, `left`, `right`
- Default toolbar includes view/review tools, export submenu, toolbar placement, theme and locale toggles
- UI theme follows `COLORTHEME` sysvar and `--ml-ui-*` tokens on `host` automatically
- Locale follows `AcApI18n.currentLocale` automatically
- Layer list in a dock panel tab (name, visibility, color), opened from the toolbar layer button
- Chrome DevTools-style **dock panel** with tabs, open/close, dock side (bottom/left/right), and resize handle
- ACI color picker for layer colors
- Layer UI opens from the toolbar button or the `layer` command (opens dock when closed, switches to layers tab when open)
- Dock panel closes via the close button or `close-layer-manager` event
- Optional collapsible toolbar (like HTML export viewer): hide tool buttons and show only a chevron toggle

## Install

```bash
pnpm add @mlightcad/cad-simple-ui-plugin @mlightcad/cad-simple-viewer @mlightcad/data-model
```

## Quick start

Load the plugin after creating the document manager. Apply the initial UI theme on `host` first so theme/locale/placement buttons work even before a drawing is opened:

```typescript
import { AcApDocManager, applyUiTheme } from '@mlightcad/cad-simple-viewer'
import { createSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'

const host = document.getElementById('viewer-host')!

applyUiTheme('dark', host)

AcApDocManager.createInstance({ container: host })

await AcApDocManager.instance.pluginManager.loadPlugin(
  createSimpleUiPlugin({
    host,
    toolbar: {
      placement: 'right',
      items: 'default'
    }
  })
)
```

### Lazy registration (smaller initial bundle)

Import from `@mlightcad/cad-simple-ui-plugin/register` so the main plugin bundle is loaded only when you register it:

```typescript
import { registerSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin/register'

await registerSimpleUiPlugin(AcApDocManager.instance.pluginManager, {
  host,
  toolbar: { placement: 'right', items: 'default' }
})
```

### Example app pattern (`cad-simple-viewer-example`)

The [vanilla example](../cad-simple-viewer-example) **defers viewer and plugin initialization until the user opens a file** (local upload or predefined sample). That keeps the first paint lightweight:

1. Page load — only file picker UI; no `AcApDocManager` yet.
2. First open — `applyUiTheme`, `AcApDocManager.createInstance`, lazy export plugins, then `registerSimpleUiPlugin`.
3. Subsequent opens — reuse the same viewer instance.

You can adopt the same pattern or load the plugin at startup (see Quick start above). Both are supported.

The default toolbar does not include every command the old inline demo had (for example pickbox and line-weight toggles). Add them with `appendItems` when needed:

```typescript
toolbar: {
  items: 'default',
  appendItems: [
    {
      id: 'pickbox',
      label: 'Set Pickbox',
      requiresDocument: true,
      action: () => {
        const valueText = window.prompt('Set pick box size (integer):', '10')
        if (valueText == null) return
        const pickboxValue = Number.parseInt(valueText, 10)
        if (!Number.isFinite(pickboxValue) || pickboxValue <= 0) return
        AcApDocManager.instance.sendStringToExecute(`PICKBOX\n${pickboxValue}`)
      }
    }
  ]
}
```

By default `appendItems` are added at the end of the toolbar. Use `appendItemsAfter` or `appendItemsBefore` to insert next to an existing root item id (for example after `layer`). When both are set, `appendItemsBefore` takes precedence.

```typescript
toolbar: {
  items: 'default',
  appendItems: [{ id: 'agent', label: 'Agent', command: 'agent' }],
  appendItemsAfter: 'layer'
}
```

The built-in theme toggle button updates `COLORTHEME` when a document is open, or applies `applyUiTheme` on `host` when no document is loaded.

### Layer manager (dock panel)

The layer list is enabled automatically when the resolved toolbar includes a layer button (`id: 'layer'` or `{ preset: 'layer' }`). Layers always render as a tab in the dock panel.

```typescript
createSimpleUiPlugin({
  host,
  dockPanel: {
    defaultSide: 'left', // 'top' | 'bottom' | 'left' | 'right' (default: 'left')
    defaultOpen: false,
    defaultHeight: 240,
    defaultWidth: 280
  }
})
```

Dock panel behavior:

- Click the layer toolbar button (runs the `layer` command) to open the dock panel when it is closed, or switch to the layers tab when it is already open
- Open or focus layers via the `layer` command or `AcApDocManager.sendStringToExecute('layer')`
- Close via the panel close button or `setDockPanelOpen(false)`
- `setDockPanelOpen(true)` opens the dock without changing the active tab
- Default dock side is **left**; override with `dockPanel.defaultSide`
- By default the dock mounts on the viewer canvas parent (inside `host`), so sibling header toolbars are not stretched
- Override mount element with `dockPanel.mountTarget` when needed
- Drag the resize handle on the panel edge to adjust height or width
- Multiple tabs supported (layers tab registered automatically)
- Canvas area shrinks when the panel is open (flex layout on `host`)

Runtime dock panel controls:

```typescript
const plugin = docManager.pluginManager.getPlugin(
  SIMPLE_UI_PLUGIN_NAME
) as AcApSimpleUiPlugin

plugin.isDockPanelOpen()
plugin.setDockPanelOpen(true)
plugin.getDockPanelSide() // 'left' | 'right' | 'top' | 'bottom'
plugin.getDockPanelSize()
plugin.setDockPanelSize(320)
```

You can enable an empty dock panel for future tabs without a layer button:

```typescript
createSimpleUiPlugin({
  host,
  dockPanel: { enabled: true }
})
```

The built-in `layerclose` command emits `close-layer-manager`, which the plugin listens for.

### Collapsible toolbar

Set `toolbar.collapsible: true` to append a chevron toggle at the end of the toolbar (same behavior as the HTML export viewer). When collapsed, only the toggle button is shown; the dock panel is closed automatically.

```typescript
toolbar: {
  placement: 'right',
  items: 'default',
  collapsible: true,
  defaultCollapsed: false // optional, default false
}
```

## Custom toolbar

Toolbar buttons are configured through `toolbar.items`. You can start from the built-in set, extend it, or replace it entirely.

### Replace the full toolbar at runtime

Use `appendItems` only when you want to keep the built-in default and add a few buttons. To **replace the entire toolbar**, call `setToolbarItems` on the loaded plugin:

```typescript
import {
  SIMPLE_UI_PLUGIN_NAME,
  type AcApSimpleUiPlugin,
  createToolbarLayoutSwitcher,
  toolbarPreset
} from '@mlightcad/cad-simple-ui-plugin'

const plugin = docManager.pluginManager.getPlugin(
  SIMPLE_UI_PLUGIN_NAME
) as AcApSimpleUiPlugin

plugin.setToolbarItems([
  toolbarPreset('select'),
  toolbarPreset('pan'),
  toolbarPreset('layer')
])

// Optional: prepend a submenu button that switches between full layouts
plugin.setToolbarItems(
  [
    toolbarPreset('select'),
    { id: 'line', label: 'Line', command: 'line', requiresDocument: true }
  ],
  createToolbarLayoutSwitcher({
    presets: [
      { id: 'view', label: 'View tools' },
      { id: 'draw', label: 'Draw tools' }
    ],
    currentId: 'draw',
    onSelect: presetId => applyLayout(presetId)
  })
)
```

See `cad-simple-viewer-example` (`demoToolbarPresets.ts`) for a working layout switcher prepended to the **viewer toolbar** (via `createToolbarLayoutSwitcher` + `setToolbarItems`). The example dev toolbar also includes a layout dropdown that calls the same preset helpers.

### `AcExToolbarItem` fields

| Field | Description |
|-------|-------------|
| `id` | Unique button id |
| `label` | Tooltip / aria-label (i18n key or plain text if using custom items only) |
| `icon` | Inline SVG string, DOM element, or factory `() => HTMLElement` |
| `command` | Passed to `AcApDocManager.sendStringToExecute` (supports `\n`, e.g. `'zoom\nall'`) |
| `action` | Custom click handler (e.g. open a dialog). Used when no `command` is set |
| `anchorAction` | Popover-style handler that receives the anchor button element. Takes precedence over `command` and `action` |
| `requiresDocument` | When `false`, button stays enabled before a drawing is opened |
| `minOpenMode` | Hide below Review/Write (`AcEdOpenMode.Review`) |
| `children` | Submenu items (parent shows a flyout arrow) |
| `childIcon` | `'fixed'` (default): parent keeps its own icon; `'selected'`: parent icon follows the active submenu item |
| `selectedChildId` | Initial submenu selection when `childIcon` is `'selected'` |
| `toggle` | Two-state button with `getValue`, `on`, and `off` branches |
| `type` | `'separator'` renders a divider; omit for buttons |
| `preset` | Reference a built-in button by id (custom layouts only; use `{ preset: 'pan' }`) |
| `disabled` | `boolean` or `() => boolean` |

Built-in preset ids include: `select`, `pan`, `zoom-extent`, `layer`, `measure`, `export`, `toolbar-placement`, `switch-bg`, `theme`, `locale`, and nested ids such as `placement-top`, `measure-distance`, `export-html`, etc.

### 1. Default toolbar + extra buttons

Keep all predefined buttons and append your own at the end:

```typescript
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { createSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'

createSimpleUiPlugin({
  toolbar: {
    placement: 'right',
    items: 'default',
    appendItems: [
      {
        id: 'my-redline',
        label: 'Redline',
        command: 'sketch',
        minOpenMode: AcEdOpenMode.Review
      }
    ]
  }
})
```

### 2. Custom layout with built-in presets and separators

Pick built-in buttons by id and group them with separators — no need to duplicate icons, labels, or submenu definitions:

```typescript
import {
  createSimpleUiPlugin,
  createToolbarSeparator,
  toolbarPreset
} from '@mlightcad/cad-simple-ui-plugin'

createSimpleUiPlugin({
  toolbar: {
    placement: 'right',
    items: [
      toolbarPreset('select'),
      toolbarPreset('pan'),
      toolbarPreset('zoom-extent'),
      createToolbarSeparator('sep-tools'),
      toolbarPreset('layer'),
      toolbarPreset('measure'),
      createToolbarSeparator('sep-settings'),
      toolbarPreset('switch-bg'),
      toolbarPreset('theme'),
      toolbarPreset('locale')
    ]
  }
})
```

Equivalent object form:

```typescript
items: [
  { preset: 'select' },
  { preset: 'pan' },
  { type: 'separator', id: 'sep-tools' },
  { preset: 'measure' }
]
```

### 3. Fully custom toolbar

Replace the default set with your own list:

```typescript
createSimpleUiPlugin({
  toolbar: {
    placement: 'top',
    items: [
      {
        id: 'select',
        label: 'Select',
        icon: '<svg ...>...</svg>',
        command: 'select'
      },
      {
        id: 'pan',
        label: 'Pan',
        command: 'pan'
      },
      {
        id: 'zoom',
        label: 'Zoom',
        children: [
          { id: 'zoom-all', label: 'Zoom Extents', command: 'zoom\nall' },
          { id: 'zoom-window', label: 'Zoom Window', command: 'zoom\nwindow' }
        ]
      }
    ]
  }
})
```

### 4. Button with icon and command

```typescript
{
  id: 'line',
  label: 'Draw Line',
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M4 16 L16 4"/></svg>',
  command: 'line'
}
```

`currentColor` in SVG inherits the toolbar text color and follows light/dark theme.

### 5. Text-only button (no icon)

```typescript
{
  id: 'save',
  label: 'Save',
  command: 'qsave'
}
```

### 6. Submenu (nested commands)

```typescript
{
  id: 'draw',
  label: 'Draw',
  icon: drawIconSvg,
  childIcon: 'fixed', // default — parent icon stays the same
  children: [
    { id: 'line', label: 'Line', command: 'line' },
    { id: 'circle', label: 'Circle', command: 'circle' }
  ]
}
```

When the parent icon should reflect the active submenu item:

```typescript
{
  id: 'my-export',
  label: 'Export',
  icon: exportIconSvg,
  childIcon: 'selected',
  selectedChildId: 'export-pdf',
  children: [
    { id: 'export-html', label: 'HTML', icon: htmlIcon, command: 'chtml' }, // dialog in cad-viewer; command-line in cad-simple-viewer-only hosts
    { id: 'export-pdf', label: 'PDF', icon: pdfIcon, command: 'cpdf' }
  ]
}
```

Built-in buttons using `childIcon: 'selected'`: `toolbar-placement` only. `export`, `annotation`, and `measure` use fixed parent icons.

Submenu flyout direction follows toolbar placement (e.g. arrow points left when the toolbar is on the right).

### 7. Custom action (no CAD command)

```typescript
{
  id: 'help',
  label: 'Help',
  requiresDocument: false,
  action: () => window.open('/help', '_blank')
}
```

### 8. Toggle button

```typescript
{
  id: 'grid',
  toggle: {
    getValue: () => gridVisible,
    on: { label: 'Hide Grid', icon: gridOnIcon, action: () => setGridVisible(false) },
    off: { label: 'Show Grid', icon: gridOffIcon, action: () => setGridVisible(true) }
  }
}
```

### 9. Disable toolbar

```typescript
createSimpleUiPlugin({
  toolbar: { enabled: false }
})
```

Disabling the toolbar also disables the layer dock UI, because the layer list is tied to the layer toolbar button.

### Complete example

```typescript
import { AcApDocManager, AcEdOpenMode, applyUiTheme } from '@mlightcad/cad-simple-viewer'
import { createSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'

const viewerPane = document.getElementById('viewerPane')!

applyUiTheme('dark', viewerPane)

AcApDocManager.createInstance({ container: document.getElementById('cad-container')! })

await AcApDocManager.instance.pluginManager.loadPlugin(
  createSimpleUiPlugin({
    host: viewerPane,
    toolbar: {
      placement: 'right',
      items: 'default',
      appendItems: [
        {
          id: 'open-url',
          label: 'Open URL',
          requiresDocument: false,
          action: () => {
            const url = window.prompt('Drawing URL:')
            if (url) void AcApDocManager.instance.openUrl(url)
          }
        },
        {
          id: 'draw-tools',
          label: 'Draw',
          children: [
            { id: 'line', label: 'Line', command: 'line' },
            { id: 'circle', label: 'Circle', command: 'circle' }
          ]
        }
      ]
    }
  })
)
```

## Layer manager

When the toolbar includes a layer button, the plugin registers a `layer` command. The button opens the dock when closed, or activates the layers tab when the dock is already open.

Supported columns in v1:

- Name (current layer marked with `*`)
- On (visibility checkbox)
- Color (ACI picker)

Double-click a layer row to zoom to that layer.

To use the layer UI in a custom toolbar, include the built-in preset or a button with `id: 'layer'`:

```typescript
items: [
  toolbarPreset('select'),
  toolbarPreset('layer')
]
```

Omit the layer button from `items` if you do not want the layer dock UI or `layer` command.

## API

| Export | Description |
|--------|-------------|
| `createSimpleUiPlugin(options)` | Returns an `AcApPlugin` instance |
| `registerSimpleUiPlugin(pluginManager, options)` | Eager-load helper |
| `AcApLayerStore` | Document-scoped layer observer and UI mutations |
| `AcExSimpleUiPluginOptions` | Plugin configuration type |
| `AcExToolbarItem` | Single toolbar button definition |
| `AcExToolbarItemConfig` | Button, separator, or preset reference in toolbar config |
| `createToolbarSeparator(id?)` | Helper that creates a separator entry |
| `toolbarPreset(id)` | Helper that references a built-in button |
| `createDefaultToolbarPresetMap()` | Built-in items keyed by id (advanced use) |
| `AcExToolbarPlacement` | `'top' \| 'bottom' \| 'left' \| 'right'` |

## See also

- [cad-simple-viewer-example](../cad-simple-viewer-example) — vanilla TypeScript demo (lazy init on first file open; uses `registerSimpleUiPlugin`)
- [cad-viewer](../cad-viewer) — full Vue + Element Plus application shell
