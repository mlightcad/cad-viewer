/**
 * Builds {@link AcExToolbarItem} lists for the offline HTML export viewer.
 *
 * Commands use the `html:` prefix and are handled by the viewer runtime —
 * they never go through {@link AcApDocManager.sendStringToExecute}.
 */

import type {
  AcExToolbarI18n,
  AcExToolbarItem} from '@mlightcad/cad-simple-ui-plugin/toolbar'

import {
  ACEX_HTML_LOCALE_BADGES,
  ACEX_HTML_LOCALES,
  type AcExHtmlLocale
} from './AcExHtmlI18n'
import { acExHtmlIcons } from './AcExHtmlIcons'
import type { AcExMarkupMode } from './AcExMarkup'
import type { AcExMeasureMode } from './AcExMeasurement'
import type { AcExViewerMode } from './AcExSnapshotTypes'

/** Layout row used by the layout submenu. */
export interface AcExHtmlToolbarLayoutInfo {
  btrId: string
  name: string
}

/** Live callbacks needed while building / refreshing HTML toolbar items. */
export interface AcExHtmlToolbarItemContext {
  viewerMode: AcExViewerMode
  exportLayouts: boolean
  getLayouts: () => AcExHtmlToolbarLayoutInfo[]
  getActiveLayoutBtrId: () => string
  getLocale: () => AcExHtmlLocale
  getOrtho: () => boolean
  /** True when polar tracking is on or the polar-angle panel is open. */
  getPolar: () => boolean
  isMeasureVisible: () => boolean
  isMarkupVisible: () => boolean
}

function localeBadgeIcon(locale: AcExHtmlLocale): () => HTMLElement {
  return () => {
    const badge = document.createElement('span')
    badge.className = 'mlcad-locale-option-badge'
    badge.textContent = ACEX_HTML_LOCALE_BADGES[locale]
    return badge
  }
}

function measureChildren(
  ctx: AcExHtmlToolbarItemContext
): AcExToolbarItem[] {
  const modes: Array<{ id: string; mode: AcExMeasureMode; label: string; icon: string }> =
    [
      {
        id: 'measure-distance',
        mode: 'distance',
        label: 'toolbar.measureDistance',
        icon: acExHtmlIcons.measureDistance
      },
      {
        id: 'measure-angle',
        mode: 'angle',
        label: 'toolbar.measureAngle',
        icon: acExHtmlIcons.measureAngle
      },
      {
        id: 'measure-arc',
        mode: 'arc',
        label: 'toolbar.measureArc',
        icon: acExHtmlIcons.measureArc
      },
      {
        id: 'measure-area',
        mode: 'area',
        label: 'toolbar.measureArea',
        icon: acExHtmlIcons.measureArea
      },
      {
        id: 'measure-coordinate',
        mode: 'coordinate',
        label: 'toolbar.measureCoordinate',
        icon: acExHtmlIcons.measureCoordinate
      }
    ]

  return [
    ...modes.map(entry => ({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      requiresDocument: false,
      command: `html:measure:${entry.mode}`
    })),
    {
      id: 'measure-visibility',
      requiresDocument: false,
      toggle: {
        getValue: () => ctx.isMeasureVisible(),
        on: {
          label: 'toolbar.measureHide',
          icon: acExHtmlIcons.markupShow,
          command: 'html:measure-visibility'
        },
        off: {
          label: 'toolbar.measureShow',
          icon: acExHtmlIcons.markupHide,
          command: 'html:measure-visibility'
        }
      }
    },
    {
      id: 'clear-measurements',
      label: 'toolbar.clearMeasurements',
      icon: acExHtmlIcons.clearMeasurements,
      requiresDocument: false,
      command: 'html:clear-measurements'
    },
    { type: 'separator', id: 'sep-measure-io' },
    {
      id: 'measure-import',
      label: 'toolbar.measureImport',
      icon: acExHtmlIcons.markupImport,
      requiresDocument: false,
      command: 'html:measure-import'
    },
    {
      id: 'measure-export',
      label: 'toolbar.measureExport',
      icon: acExHtmlIcons.markupExport,
      requiresDocument: false,
      command: 'html:measure-export'
    }
  ]
}

function markupChildren(ctx: AcExHtmlToolbarItemContext): AcExToolbarItem[] {
  const modes: Array<{ id: string; mode: AcExMarkupMode; label: string; icon: string }> =
    [
      {
        id: 'markup-cloud',
        mode: 'cloud',
        label: 'toolbar.markupCloud',
        icon: acExHtmlIcons.markupCloud
      },
      {
        id: 'markup-rect',
        mode: 'rect',
        label: 'toolbar.markupRect',
        icon: acExHtmlIcons.markupRect
      },
      {
        id: 'markup-circle',
        mode: 'circle',
        label: 'toolbar.markupCircle',
        icon: acExHtmlIcons.markupCircle
      },
      {
        id: 'markup-callout',
        mode: 'callout',
        label: 'toolbar.markupCallout',
        icon: acExHtmlIcons.markupCallout
      },
      {
        id: 'markup-arrow',
        mode: 'arrow',
        label: 'toolbar.markupArrow',
        icon: acExHtmlIcons.markupArrow
      },
      {
        id: 'markup-text',
        mode: 'text',
        label: 'toolbar.markupText',
        icon: acExHtmlIcons.markupText
      },
      {
        id: 'markup-stamp',
        mode: 'stamp',
        label: 'toolbar.markupStamp',
        icon: acExHtmlIcons.markupStamp
      }
    ]

  return [
    ...modes.map(entry => ({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      requiresDocument: false,
      command: `html:markup:${entry.mode}`
    })),
    {
      id: 'markup-panel',
      label: 'toolbar.markupPanel',
      icon: acExHtmlIcons.markupPanel,
      requiresDocument: false,
      command: 'html:markup-panel'
    },
    {
      id: 'markup-visibility',
      requiresDocument: false,
      toggle: {
        getValue: () => ctx.isMarkupVisible(),
        on: {
          label: 'toolbar.markupHide',
          icon: acExHtmlIcons.markupShow,
          command: 'html:markup-visibility'
        },
        off: {
          label: 'toolbar.markupShow',
          icon: acExHtmlIcons.markupHide,
          command: 'html:markup-visibility'
        }
      }
    },
    {
      id: 'clear-markups',
      label: 'toolbar.clearMarkups',
      icon: acExHtmlIcons.clearMarkups,
      requiresDocument: false,
      command: 'html:clear-markups'
    },
    { type: 'separator', id: 'sep-markup-io' },
    {
      id: 'markup-import',
      label: 'toolbar.markupImport',
      icon: acExHtmlIcons.markupImport,
      requiresDocument: false,
      command: 'html:markup-import'
    },
    {
      id: 'markup-export',
      label: 'toolbar.markupExport',
      icon: acExHtmlIcons.markupExport,
      requiresDocument: false,
      command: 'html:markup-export'
    }
  ]
}

/**
 * Builds the HTML export viewer toolbar item list.
 *
 * @param ctx - Live getters for toggles and dynamic layout/locale children.
 */
export function createAcExHtmlToolbarItems(
  ctx: AcExHtmlToolbarItemContext
): AcExToolbarItem[] {
  const items: AcExToolbarItem[] = [
    {
      id: 'select',
      label: 'toolbar.select',
      icon: acExHtmlIcons.select,
      requiresDocument: false,
      command: 'html:select'
    },
    {
      id: 'pan',
      label: 'toolbar.pan',
      icon: acExHtmlIcons.pan,
      requiresDocument: false,
      command: 'html:pan'
    },
    {
      id: 'zoom',
      label: 'toolbar.zoom',
      icon: acExHtmlIcons.zoomExtent,
      requiresDocument: false,
      childrenUi: 'toolbar',
      childIcon: 'selected',
      selectedChildId: 'zoom-fit',
      children: [
        {
          id: 'zoom-fit',
          label: 'toolbar.zoomExtents',
          icon: acExHtmlIcons.zoomExtent,
          requiresDocument: false,
          command: 'html:zoom-fit'
        },
        {
          id: 'zoom-window',
          label: 'toolbar.zoomWindow',
          icon: acExHtmlIcons.zoomWindow,
          requiresDocument: false,
          command: 'html:zoom-window'
        },
        {
          id: 'zoom-original',
          label: 'toolbar.zoomOriginal',
          icon: acExHtmlIcons.zoomOriginal,
          requiresDocument: false,
          command: 'html:zoom-original'
        }
      ]
    }
  ]

  if (ctx.viewerMode === 'measure') {
    items.push(
      { type: 'separator', id: 'sep-nav-tools' },
      {
        id: 'measure',
        label: 'toolbar.measure',
        icon: acExHtmlIcons.measure,
        requiresDocument: false,
        childrenUi: 'sticky-toolbar',
        children: measureChildren(ctx)
      },
      {
        id: 'markup',
        label: 'toolbar.annotation',
        icon: acExHtmlIcons.annotation,
        requiresDocument: false,
        childrenUi: 'sticky-toolbar',
        children: markupChildren(ctx)
      },
      { type: 'separator', id: 'sep-tools-panels' }
    )
  }

  items.push({
    id: 'layer',
    label: 'toolbar.layers',
    icon: acExHtmlIcons.layer,
    requiresDocument: false,
    command: 'html:layers'
  })

  if (ctx.exportLayouts) {
    const layoutItem: AcExToolbarItem = {
      id: 'layout',
      label: 'toolbar.layout',
      icon: acExHtmlIcons.layout,
      requiresDocument: false,
      childrenUi: 'menu',
      children: []
    }
    Object.defineProperty(layoutItem, 'children', {
      configurable: true,
      enumerable: true,
      get: () =>
        ctx.getLayouts().map(layout => ({
          id: `layout-${layout.btrId}`,
          label: layout.name,
          requiresDocument: false,
          command: `html:layout:${layout.btrId}`,
          toggle: {
            getValue: () => ctx.getActiveLayoutBtrId() === layout.btrId,
            on: {},
            off: {}
          }
        }))
    })
    items.push(layoutItem)
  }

  if (ctx.viewerMode === 'measure') {
    items.push({
      id: 'snap',
      label: 'toolbar.snap',
      icon: acExHtmlIcons.osnap,
      requiresDocument: false,
      childrenUi: 'sticky-toolbar',
      children: [
        {
          id: 'snap-ortho',
          requiresDocument: false,
          toggle: {
            getValue: () => ctx.getOrtho(),
            on: {
              label: 'settings.ortho',
              icon: acExHtmlIcons.orthoMode,
              command: 'html:snap-ortho'
            },
            off: {
              label: 'settings.ortho',
              icon: acExHtmlIcons.orthoMode,
              command: 'html:snap-ortho'
            }
          }
        },
        {
          id: 'snap-polar',
          requiresDocument: false,
          toggle: {
            getValue: () => ctx.getPolar(),
            on: {
              label: 'settings.polar',
              icon: acExHtmlIcons.polarTracking,
              command: 'html:snap-polar'
            },
            off: {
              label: 'settings.polar',
              icon: acExHtmlIcons.polarTracking,
              command: 'html:snap-polar'
            }
          }
        }
      ]
    })
  }

  const locale = ctx.getLocale()
  items.push({
    id: 'locale',
    label: 'toolbar.language',
    icon: localeBadgeIcon(locale),
    requiresDocument: false,
    childrenUi: 'toolbar',
    childIcon: 'selected',
    selectedChildId: `locale-${locale}`,
    children: ACEX_HTML_LOCALES.map(code => ({
      id: `locale-${code}`,
      label: `toolbar.locale${code.charAt(0).toUpperCase()}${code.slice(1)}`,
      icon: localeBadgeIcon(code),
      requiresDocument: false,
      command: `html:locale:${code}`
    }))
  })

  return items
}

/**
 * Adapts {@link AcExHtmlI18n}-like hosts to the toolbar i18n contract.
 *
 * @param i18n - HTML i18n instance (`t` may be typed to a message-key union).
 */
export function adaptAcExHtmlToolbarI18n(i18n: {
  t: (key: string, params?: Record<string, string | number>) => string
}): AcExToolbarI18n {
  return {
    t: (key: string, params?: Record<string, string>) => {
      let text = i18n.t(key)
      if (!params) return text
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, String(value))
      }
      return text
    }
  }
}
