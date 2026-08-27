import {
  type AcApLocale,
  AcEdOpenMode,
  type AcEdUiTheme,
  isMarkupVisible,
  isMeasurementVisible
} from '@mlightcad/cad-simple-viewer'
import {
  ICON_ANNOTATION,
  ICON_ANNOTATION_HIDE,
  ICON_ANNOTATION_SHOW,
  ICON_CLEAR_MARKUPS,
  ICON_CLEAR_MEASUREMENTS,
  ICON_EXPORT,
  ICON_EXPORT_HTML,
  ICON_EXPORT_PDF,
  ICON_EXPORT_SVG,
  ICON_LANGUAGE,
  ICON_LAYER,
  ICON_MARKUP_ARROW,
  ICON_MARKUP_CALLOUT,
  ICON_MARKUP_EXPORT,
  ICON_MARKUP_IMPORT,
  ICON_MARKUP_PANEL,
  ICON_MARKUP_STAMP,
  ICON_MARKUP_TEXT,
  ICON_MEASURE,
  ICON_MEASURE_ANGLE,
  ICON_MEASURE_ARC,
  ICON_MEASURE_AREA,
  ICON_MEASURE_DISTANCE,
  ICON_MEASURE_POINT,
  ICON_PAN,
  ICON_PLACEMENT_BOTTOM,
  ICON_PLACEMENT_LEFT,
  ICON_PLACEMENT_RIGHT,
  ICON_PLACEMENT_TOP,
  ICON_REV_CIRCLE,
  ICON_REV_CLOUD,
  ICON_REV_RECT,
  ICON_SELECT,
  ICON_SETTINGS,
  ICON_SWITCH_BG,
  ICON_THEME_DARK,
  ICON_THEME_LIGHT,
  ICON_TOOLBAR_PLACEMENT,
  ICON_ZOOM_EXTENT,
  ICON_ZOOM_ORIGINAL,
  ICON_ZOOM_WINDOW
} from '@mlightcad/cad-simple-viewer/icons'

import { acuiCreateLayoutToolbarItem } from './createLayoutToolbarItem'
import type {
  AcUiDefaultToolbarContext,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarPlacement
} from './types'

const TOOLBAR_PLACEMENTS: AcUiToolbarPlacement[] = [
  'top',
  'bottom',
  'left',
  'right'
]

const PLACEMENT_ICONS: Record<AcUiToolbarPlacement, string> = {
  top: ICON_PLACEMENT_TOP,
  bottom: ICON_PLACEMENT_BOTTOM,
  left: ICON_PLACEMENT_LEFT,
  right: ICON_PLACEMENT_RIGHT
}

const PLACEMENT_LABELS: Record<AcUiToolbarPlacement, string> = {
  top: 'toolbar.placementTop',
  bottom: 'toolbar.placementBottom',
  left: 'toolbar.placementLeft',
  right: 'toolbar.placementRight'
}

function createToolbarPlacementItem(
  context?: AcUiDefaultToolbarContext
): AcUiToolbarItem {
  return {
    id: 'toolbar-placement',
    label: 'toolbar.placement',
    icon: ICON_TOOLBAR_PLACEMENT,
    requiresDocument: false,
    childrenUi: 'toolbar',
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

const TOOLBAR_LOCALES: AcApLocale[] = ['en', 'zh', 'cs', 'tr', 'ar']

const LOCALE_BADGES: Record<AcApLocale, string> = {
  en: 'EN',
  zh: '中',
  cs: 'CS',
  tr: 'TR',
  ar: 'AR'
}

const LOCALE_LABELS: Record<AcApLocale, string> = {
  en: 'toolbar.localeEn',
  zh: 'toolbar.localeZh',
  cs: 'toolbar.localeCs',
  tr: 'toolbar.localeTr',
  ar: 'toolbar.localeAr'
}

function localeBadgeIcon(badge: string): string {
  return `<span style="font-size:10px;font-weight:700;line-height:1">${badge}</span>`
}

/**
 * Builds the language submenu button (icon strip of locale badges).
 *
 * @param context - Optional locale getters/setters.
 */
export function acuiCreateToolbarLocaleItem(
  context?: AcUiDefaultToolbarContext
): AcUiToolbarItem {
  const current = context?.getLocale() ?? 'en'
  return {
    id: 'locale',
    label: 'toolbar.locale',
    icon: ICON_LANGUAGE,
    requiresDocument: false,
    childrenUi: 'toolbar',
    childIcon: 'selected',
    selectedChildId: `locale-${current}`,
    children: TOOLBAR_LOCALES.map(locale => ({
      id: `locale-${locale}`,
      label: LOCALE_LABELS[locale],
      icon: localeBadgeIcon(LOCALE_BADGES[locale]),
      requiresDocument: false,
      action: () => context?.setLocale(locale)
    }))
  }
}

/**
 * Builds the theme toggle button.
 *
 * @param context - Optional theme getters/setters.
 */
export function acuiCreateToolbarThemeItem(
  context?: AcUiDefaultToolbarContext
): AcUiToolbarItem {
  const getTheme = (): AcEdUiTheme => context?.getTheme() ?? 'light'
  const toggleTheme = () => {
    const next: AcEdUiTheme = getTheme() === 'dark' ? 'light' : 'dark'
    context?.setTheme(next)
  }
  return {
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
  }
}

/**
 * Builds the zoom parent button with original / extents / window children.
 *
 * Used by the mobile default toolbar via `{ preset: 'zoom' }`.
 *
 * @param context - Optional restore-original-view callback.
 */
export function acuiCreateZoomToolbarItem(
  context?: AcUiDefaultToolbarContext
): AcUiToolbarItem {
  return {
    id: 'zoom',
    label: 'toolbar.zoom',
    icon: ICON_ZOOM_EXTENT,
    childrenUi: 'toolbar',
    childIcon: 'selected',
    selectedChildId: 'zoom-extent',
    children: [
      {
        id: 'zoom-original',
        label: 'toolbar.zoomOriginal',
        icon: ICON_ZOOM_ORIGINAL,
        action: () => context?.restoreOriginalView?.()
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
      }
    ]
  }
}

/**
 * Builds the settings parent button (theme, switch background, language).
 *
 * Used by the mobile default toolbar via `{ preset: 'settings' }`.
 *
 * @param context - Theme / locale context for nested items.
 */
export function acuiCreateSettingsToolbarItem(
  context?: AcUiDefaultToolbarContext
): AcUiToolbarItem {
  return {
    id: 'settings',
    label: 'toolbar.settings',
    icon: ICON_SETTINGS,
    requiresDocument: false,
    childrenUi: 'toolbar',
    children: [
      acuiCreateToolbarThemeItem(context),
      {
        id: 'switch-bg',
        label: 'toolbar.switchBg',
        icon: ICON_SWITCH_BG,
        command: 'switchbg'
      },
      acuiCreateToolbarLocaleItem(context)
    ]
  }
}

/**
 * Mobile-default toolbar item list (preset references).
 *
 * Order: zoom, measure, annotation, layer, layout, settings.
 */
export const MOBILE_DEFAULT_TOOLBAR_ITEMS: AcUiToolbarItemConfig[] = [
  { preset: 'zoom' },
  { preset: 'measure' },
  { preset: 'annotation' },
  { preset: 'layer' },
  { preset: 'layout' },
  { preset: 'settings' }
]

/**
 * Builds the built-in toolbar item list (view, layout, measure, review, export, theme, locale).
 *
 * @param context - Optional callbacks for theme, locale, and placement items.
 * @returns Default {@link AcUiToolbarItem} array.
 */
export function acuiCreateDefaultToolbarItems(
  context?: AcUiDefaultToolbarContext
): AcUiToolbarItem[] {
  const items: AcUiToolbarItem[] = [
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
    acuiCreateLayoutToolbarItem(),
    {
      id: 'switch-bg',
      label: 'toolbar.switchBg',
      icon: ICON_SWITCH_BG,
      command: 'switchbg'
    },
    {
      id: 'measure',
      label: 'toolbar.measure',
      icon: ICON_MEASURE,
      childrenUi: 'sticky-toolbar',
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
          id: 'measure-point',
          label: 'toolbar.measurePoint',
          icon: ICON_MEASURE_POINT,
          command: 'measurepoint'
        },
        {
          id: 'measurement-vis',
          toggle: {
            getValue: isMeasurementVisible,
            on: {
              label: 'toolbar.showMeasurements',
              icon: ICON_ANNOTATION_SHOW,
              command: 'measurementvis'
            },
            off: {
              label: 'toolbar.hideMeasurements',
              icon: ICON_ANNOTATION_HIDE,
              command: 'measurementvis'
            }
          }
        },
        {
          id: 'clear-measurements',
          label: 'toolbar.clearMeasurements',
          icon: ICON_CLEAR_MEASUREMENTS,
          command: 'clearmeasurements'
        },
        {
          type: 'separator',
          id: 'sep-measure-import-export'
        },
        {
          id: 'measurement-import',
          label: 'toolbar.measurementImport',
          icon: ICON_MARKUP_IMPORT,
          command: 'measurementimport'
        },
        {
          id: 'measurement-export',
          label: 'toolbar.measurementExport',
          icon: ICON_MARKUP_EXPORT,
          command: 'measurementexport'
        }
      ]
    },
    {
      id: 'annotation',
      label: 'toolbar.annotation',
      icon: ICON_ANNOTATION,
      minOpenMode: AcEdOpenMode.Review,
      childrenUi: 'sticky-toolbar',
      children: [
        {
          id: 'markup-cloud',
          label: 'toolbar.markupCloud',
          icon: ICON_REV_CLOUD,
          command: 'markupcloud'
        },
        {
          id: 'markup-callout',
          label: 'toolbar.markupCallout',
          icon: ICON_MARKUP_CALLOUT,
          command: 'markupcallout'
        },
        {
          id: 'markup-text',
          label: 'toolbar.markupText',
          icon: ICON_MARKUP_TEXT,
          command: 'markuptext'
        },
        {
          id: 'markup-rect',
          label: 'toolbar.markupRect',
          icon: ICON_REV_RECT,
          command: 'markuprect'
        },
        {
          id: 'markup-circle',
          label: 'toolbar.markupCircle',
          icon: ICON_REV_CIRCLE,
          command: 'markupcircle'
        },
        {
          id: 'markup-arrow',
          label: 'toolbar.markupArrow',
          icon: ICON_MARKUP_ARROW,
          command: 'markuparrow'
        },
        {
          id: 'markup-stamp',
          label: 'toolbar.markupStamp',
          icon: ICON_MARKUP_STAMP,
          command: 'markupstamp'
        },
        {
          id: 'markup-panel',
          label: 'toolbar.markupPanel',
          icon: ICON_MARKUP_PANEL,
          command: 'markuppanel'
        },
        {
          id: 'markup-vis',
          toggle: {
            getValue: isMarkupVisible,
            on: {
              label: 'toolbar.showMarkup',
              icon: ICON_ANNOTATION_SHOW,
              command: 'markupvis'
            },
            off: {
              label: 'toolbar.hideMarkup',
              icon: ICON_ANNOTATION_HIDE,
              command: 'markupvis'
            }
          }
        },
        {
          id: 'clear-markups',
          label: 'toolbar.clearMarkups',
          icon: ICON_CLEAR_MARKUPS,
          command: 'clearmarkups'
        },
        {
          type: 'separator',
          id: 'sep-markup-import-export'
        },
        {
          id: 'markup-import',
          label: 'toolbar.markupImport',
          icon: ICON_MARKUP_IMPORT,
          command: 'markupimport'
        },
        {
          id: 'markup-export',
          label: 'toolbar.markupExport',
          icon: ICON_MARKUP_EXPORT,
          command: 'markupexport'
        }
      ]
    },
    {
      id: 'export',
      label: 'toolbar.export',
      icon: ICON_EXPORT,
      childrenUi: 'toolbar',
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
      type: 'separator',
      id: 'sep-settings'
    },
    createToolbarPlacementItem(context),
    acuiCreateToolbarThemeItem(context),
    acuiCreateToolbarLocaleItem(context)
  ]

  return items
}

