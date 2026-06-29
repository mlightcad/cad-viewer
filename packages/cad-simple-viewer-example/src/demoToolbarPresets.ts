import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import type {
  AcApSimpleUiPlugin,
  AcExToolbarItemsInput,
  AcExToolbarLayoutPreset
} from '@mlightcad/cad-simple-ui-plugin'
import {
  createToolbarLayoutSwitcher,
  createToolbarSeparator,
  toolbarPreset
} from '@mlightcad/cad-simple-ui-plugin'

const ICON_DEMO_INFO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="currentColor" d="M9 9h2v5H9zm0-3h2v2H9z"/></svg>'

const ICON_DEMO_ZOOM =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M13 13l4 4"/></svg>'

let demoCustomToolsVisible = true

/** Selectable demo toolbar layouts (full `items` definitions, not appendItems). */
export const DEMO_TOOLBAR_LAYOUTS: AcExToolbarLayoutPreset[] = [
  { id: 'default', label: 'Built-in default' },
  { id: 'minimal', label: 'Minimal view tools' },
  { id: 'draw', label: 'Draw tools' },
  { id: 'custom', label: 'Custom actions demo' }
]

/** Full toolbar `items` for each demo layout preset. */
export const DEMO_TOOLBAR_PRESET_ITEMS: Record<string, AcExToolbarItemsInput> = {
  default: 'default',
  minimal: [
    toolbarPreset('select'),
    toolbarPreset('pan'),
    toolbarPreset('zoomExtent'),
    toolbarPreset('layer')
  ],
  draw: [
    toolbarPreset('select'),
    { id: 'draw-line', label: 'Line', command: 'line', requiresDocument: true },
    {
      id: 'draw-circle',
      label: 'Circle',
      command: 'circle',
      requiresDocument: true
    },
    toolbarPreset('layer'),
    createToolbarSeparator('draw-separator'),
    toolbarPreset('zoomWindow')
  ],
  custom: [
    toolbarPreset('select'),
    toolbarPreset('pan'),
    {
      id: 'demo-info',
      label: 'Demo Info',
      icon: ICON_DEMO_INFO,
      requiresDocument: false,
      action: () => {
        window.alert(
          'Custom toolbar action works.\nThis layout fully replaces toolbar items.'
        )
      }
    },
    {
      id: 'demo-zoom-menu',
      label: 'Demo Zoom',
      icon: ICON_DEMO_ZOOM,
      requiresDocument: true,
      children: [
        { id: 'demo-zoom-all', label: 'Zoom All', command: 'zoom\nall' },
        { id: 'demo-zoom-window', label: 'Zoom Window', command: 'zoom\nw' }
      ]
    },
    {
      id: 'demo-toggle-tools',
      label: 'Demo Tools',
      icon: ICON_DEMO_INFO,
      requiresDocument: false,
      toggle: {
        getValue: () => demoCustomToolsVisible,
        on: {
          label: 'Hide Demo Tools',
          action: () => {
            demoCustomToolsVisible = false
          }
        },
        off: {
          label: 'Show Demo Tools',
          action: () => {
            demoCustomToolsVisible = true
          }
        }
      }
    },
    {
      id: 'demo-layer-count',
      label: 'Layer Count',
      icon: ICON_DEMO_INFO,
      requiresDocument: true,
      disabled: () => !AcApDocManager.instance.curDocument,
      action: () => {
        const doc = AcApDocManager.instance.curDocument
        const count = doc?.layerStore.getLayers().length ?? 0
        window.alert(`Layer count: ${count}`)
      }
    },
    toolbarPreset('layer')
  ]
}

let currentDemoToolbarLayoutId = 'default'

/**
 * Applies a demo toolbar layout (full `items` replacement on the viewer toolbar).
 *
 * @param plugin - Loaded simple UI plugin instance.
 * @param presetId - Layout preset id from {@link DEMO_TOOLBAR_LAYOUTS}.
 */
export function applyDemoToolbarLayout(
  plugin: AcApSimpleUiPlugin,
  presetId: string
) {
  const items = DEMO_TOOLBAR_PRESET_ITEMS[presetId]
  if (!items) return

  currentDemoToolbarLayoutId = presetId
  if (presetId === 'default') {
    plugin.setToolbarItems(items)
    return
  }

  const layoutSwitcher = createToolbarLayoutSwitcher({
    presets: DEMO_TOOLBAR_LAYOUTS,
    currentId: presetId,
    onSelect: id => applyDemoToolbarLayout(plugin, id)
  })
  plugin.setToolbarItems(items, layoutSwitcher)
}

/** Returns the active demo toolbar layout id. */
export function getCurrentDemoToolbarLayoutId() {
  return currentDemoToolbarLayoutId
}
