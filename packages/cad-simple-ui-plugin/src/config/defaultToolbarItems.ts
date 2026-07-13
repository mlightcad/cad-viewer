import {
  AcApAnnotation,
  AcApDocManager,
  AcEdOpenMode,
  type AcEdUiTheme
} from '@mlightcad/cad-simple-viewer'

import {
  ICON_ANNOTATION,
  ICON_ANNOTATION_HIDE,
  ICON_ANNOTATION_SHOW,
  ICON_CLEAR_MEASUREMENTS,
  ICON_EXPORT,
  ICON_EXPORT_HTML,
  ICON_EXPORT_PDF,
  ICON_EXPORT_SVG,
  ICON_LAYER,
  ICON_MEASURE,
  ICON_MEASURE_ANGLE,
  ICON_MEASURE_ARC,
  ICON_MEASURE_AREA,
  ICON_MEASURE_DISTANCE,
  ICON_PAN,
  ICON_PLACEMENT_BOTTOM,
  ICON_PLACEMENT_LEFT,
  ICON_PLACEMENT_RIGHT,
  ICON_PLACEMENT_TOP,
  ICON_REV_CIRCLE,
  ICON_REV_CLOUD,
  ICON_REV_FREEDRAW,
  ICON_REV_RECT,
  ICON_SELECT,
  ICON_SWITCH_BG,
  ICON_THEME_DARK,
  ICON_THEME_LIGHT,
  ICON_TOOLBAR_PLACEMENT,
  ICON_ZOOM_EXTENT,
  ICON_ZOOM_WINDOW
} from '../assets/icons'
import type {
  AcExDefaultToolbarContext,
  AcExToolbarItem,
  AcExToolbarPlacement
} from './types'

const TOOLBAR_PLACEMENTS: AcExToolbarPlacement[] = [
  'top',
  'bottom',
  'left',
  'right'
]

const PLACEMENT_ICONS: Record<AcExToolbarPlacement, string> = {
  top: ICON_PLACEMENT_TOP,
  bottom: ICON_PLACEMENT_BOTTOM,
  left: ICON_PLACEMENT_LEFT,
  right: ICON_PLACEMENT_RIGHT
}

const PLACEMENT_LABELS: Record<AcExToolbarPlacement, string> = {
  top: 'toolbar.placementTop',
  bottom: 'toolbar.placementBottom',
  left: 'toolbar.placementLeft',
  right: 'toolbar.placementRight'
}

function createToolbarPlacementItem(
  context?: AcExDefaultToolbarContext
): AcExToolbarItem {
  return {
    id: 'toolbar-placement',
    label: 'toolbar.placement',
    icon: ICON_TOOLBAR_PLACEMENT,
    requiresDocument: false,
    childIcon: 'selected',
    selectedChildId: `placement-${context?.getPlacement() ?? 'right'}`,
    children: TOOLBAR_PLACEMENTS.map(placement => ({
      id: `placement-${placement}`,
      label: PLACEMENT_LABELS[placement],
      icon: PLACEMENT_ICONS[placement],
      requiresDocument: false,
      action: () => context?.setPlacement(placement)
    }))
  }
}

/**
 * Returns whether the annotation layer is currently visible in the active document.
 *
 * @returns `true` when the annotation layer is on or no document is open.
 */
function isAnnotationVisible(): boolean {
  const db = AcApDocManager.instance.curDocument?.database
  if (!db) return true
  const annotation = new AcApAnnotation(db)
  const layerName = annotation.getAnnotationLayer()
  const layer = db.tables.layerTable.getAt(layerName)
  return layer ? !layer.isOff : true
}

/**
 * Builds the built-in toolbar item list (view, measure, export, review, theme, locale).
 *
 * @param context - Optional callbacks for theme and locale toggle items.
 * @returns Default {@link AcExToolbarItem} array.
 */
export function createDefaultToolbarItems(
  context?: AcExDefaultToolbarContext
): AcExToolbarItem[] {
  const getTheme = (): AcEdUiTheme => context?.getTheme() ?? 'light'
  const toggleTheme = () => {
    const next: AcEdUiTheme = getTheme() === 'dark' ? 'light' : 'dark'
    context?.setTheme(next)
  }

  const items: AcExToolbarItem[] = [
    {
      id: 'select',
      label: 'toolbar.select',
      icon: ICON_SELECT,
      command: 'select'
    },
    {
      id: 'pan',
      label: 'toolbar.pan',
      icon: ICON_PAN,
      command: 'pan'
    },
    {
      id: 'zoom-extent',
      label: 'toolbar.zoomExtent',
      icon: ICON_ZOOM_EXTENT,
      command: 'zoom\nall'
    },
    {
      id: 'zoom-window',
      label: 'toolbar.zoomWindow',
      icon: ICON_ZOOM_WINDOW,
      command: 'zoom\nwindow'
    },
    {
      id: 'layer',
      label: 'toolbar.layer',
      icon: ICON_LAYER,
      command: 'layer'
    },
    {
      id: 'measure',
      label: 'toolbar.measure',
      icon: ICON_MEASURE,
      children: [
        {
          id: 'measure-distance',
          label: 'toolbar.measureDistance',
          icon: ICON_MEASURE_DISTANCE,
          command: 'measuredistance'
        },
        {
          id: 'measure-angle',
          label: 'toolbar.measureAngle',
          icon: ICON_MEASURE_ANGLE,
          command: 'measureangle'
        },
        {
          id: 'measure-area',
          label: 'toolbar.measureArea',
          icon: ICON_MEASURE_AREA,
          command: 'measurearea'
        },
        {
          id: 'measure-arc',
          label: 'toolbar.measureArc',
          icon: ICON_MEASURE_ARC,
          command: 'measurearc'
        },
        {
          id: 'clear-measurements',
          label: 'toolbar.clearMeasurements',
          icon: ICON_CLEAR_MEASUREMENTS,
          command: 'clearmeasurements'
        }
      ]
    },
    {
      id: 'export',
      label: 'toolbar.export',
      icon: ICON_EXPORT,
      children: [
        {
          id: 'export-html',
          label: 'toolbar.exportHtml',
          icon: ICON_EXPORT_HTML,
          command: 'chtml'
        },
        {
          id: 'export-pdf',
          label: 'toolbar.exportPdf',
          icon: ICON_EXPORT_PDF,
          command: 'cpdf'
        },
        {
          id: 'export-svg',
          label: 'toolbar.exportSvg',
          icon: ICON_EXPORT_SVG,
          command: 'csvg'
        }
      ]
    },
    {
      id: 'annotation',
      label: 'toolbar.annotation',
      icon: ICON_ANNOTATION,
      minOpenMode: AcEdOpenMode.Review,
      children: [
        {
          id: 'rev-freedraw',
          label: 'toolbar.revFreehand',
          icon: ICON_REV_FREEDRAW,
          command: 'sketch'
        },
        {
          id: 'rev-rect',
          label: 'toolbar.revRect',
          icon: ICON_REV_RECT,
          command: 'revrect'
        },
        {
          id: 'rev-cloud',
          label: 'toolbar.revCloud',
          icon: ICON_REV_CLOUD,
          command: 'revcloud'
        },
        {
          id: 'rev-circle',
          label: 'toolbar.revCircle',
          icon: ICON_REV_CIRCLE,
          command: 'revcircle'
        }
      ]
    },
    {
      id: 'rev-vis',
      minOpenMode: AcEdOpenMode.Review,
      toggle: {
        getValue: isAnnotationVisible,
        on: {
          label: 'toolbar.showAnnotation',
          icon: ICON_ANNOTATION_SHOW,
          command: 'revvis'
        },
        off: {
          label: 'toolbar.hideAnnotation',
          icon: ICON_ANNOTATION_HIDE,
          command: 'revvis'
        }
      }
    },
    {
      type: 'separator',
      id: 'sep-settings'
    },
    {
      id: 'switch-bg',
      label: 'toolbar.switchBg',
      icon: ICON_SWITCH_BG,
      command: 'switchbg',
      minOpenMode: AcEdOpenMode.Review
    },
    createToolbarPlacementItem(context),
    {
      id: 'theme',
      requiresDocument: false,
      toggle: {
        getValue: () => getTheme() === 'light',
        on: {
          label: 'toolbar.themeLight',
          icon: ICON_THEME_LIGHT,
          action: toggleTheme
        },
        off: {
          label: 'toolbar.themeDark',
          icon: ICON_THEME_DARK,
          action: toggleTheme
        }
      }
    },
    {
      id: 'locale',
      requiresDocument: false,
      toggle: {
        getValue: () => (context?.getLocale() ?? 'en') === 'en',
        on: {
          label: 'toolbar.localeEn',
          icon: '<span style="font-size:10px;font-weight:700;line-height:1">EN</span>',
          action: () => context?.toggleLocale()
        },
        off: {
          label: 'toolbar.localeZh',
          icon: '<span style="font-size:10px;font-weight:700;line-height:1">中</span>',
          action: () => context?.toggleLocale()
        }
      }
    }
  ]

  return items
}
