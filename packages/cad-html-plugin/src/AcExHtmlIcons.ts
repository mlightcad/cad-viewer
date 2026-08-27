/**
 * Toolbar icon lookup and HTML button helpers for the offline HTML shell.
 *
 * SVG glyphs live in `@mlightcad/cad-simple-viewer/icons`.
 */

import {
  ICON_ANNOTATION,
  ICON_CHEVRON_DOWN,
  ICON_CHEVRON_UP,
  ICON_CLEAR_MARKUPS,
  ICON_CLEAR_MEASUREMENTS,
  ICON_COLOR,
  ICON_LANGUAGE,
  ICON_LAYER,
  ICON_LAYER_OFF,
  ICON_LAYER_ON,
  ICON_LAYOUT,
  ICON_MARKUP_ARROW,
  ICON_MARKUP_CALLOUT,
  ICON_MARKUP_CIRCLE,
  ICON_MARKUP_CLOUD,
  ICON_MARKUP_EXPORT,
  ICON_MARKUP_HIDE,
  ICON_MARKUP_IMPORT,
  ICON_MARKUP_PANEL,
  ICON_MARKUP_RECT,
  ICON_MARKUP_SHOW,
  ICON_MARKUP_STAMP,
  ICON_MARKUP_TEXT,
  ICON_MEASURE,
  ICON_MEASURE_ANGLE,
  ICON_MEASURE_ARC,
  ICON_MEASURE_AREA,
  ICON_MEASURE_COORDINATE,
  ICON_MEASURE_DISTANCE,
  ICON_ORTHO_MODE,
  ICON_OSNAP,
  ICON_PAN,
  ICON_POLAR_TRACKING,
  ICON_SELECT,
  ICON_SETTINGS,
  ICON_ZOOM_BOX,
  ICON_ZOOM_EXTENT,
  ICON_ZOOM_ORIGINAL,
  ICON_ZOOM_WINDOW
} from '@mlightcad/cad-simple-viewer/icons'

/**
 * Inline SVG markup keyed by toolbar / layer UI usage.
 * Each value is a complete `<svg>…</svg>` string using `currentColor`.
 */
export const acExHtmlIcons = {
  /** Select tool toolbar icon. */
  select: ICON_SELECT,
  /** Pan tool toolbar icon. */
  pan: ICON_PAN,
  /** Settings / gear parent toolbar icon. */
  settings: ICON_SETTINGS,
  /** Zoom-to-extents toolbar icon. */
  zoomExtent: ICON_ZOOM_EXTENT,
  /** Zoom-window / per-layer zoom-to-box toolbar icon. */
  zoomBox: ICON_ZOOM_BOX,
  /** Measure-distance toolbar icon. */
  measureDistance: ICON_MEASURE_DISTANCE,
  /** Measure-angle toolbar icon. */
  measureAngle: ICON_MEASURE_ANGLE,
  /** Measure-arc-length toolbar icon. */
  measureArc: ICON_MEASURE_ARC,
  /** Measure-area toolbar icon. */
  measureArea: ICON_MEASURE_AREA,
  /** Measure-coordinate toolbar icon. */
  measureCoordinate: ICON_MEASURE_COORDINATE,
  /** Clear-measurements toolbar icon. */
  clearMeasurements: ICON_CLEAR_MEASUREMENTS,
  /** Open layer drawer toolbar icon. */
  layer: ICON_LAYER,
  /** Drawing layout switcher toolbar icon. */
  layout: ICON_LAYOUT,
  /** Per-layer zoom-to-box button icon (same glyph as zoom window). */
  zoomWindow: ICON_ZOOM_WINDOW,
  /** Restore the viewport captured when the HTML first opened. */
  zoomOriginal: ICON_ZOOM_ORIGINAL,
  /** “Show all layers” action icon. */
  layerOn: ICON_LAYER_ON,
  /** “Hide all layers” action icon. */
  layerOff: ICON_LAYER_OFF,
  /** Language picker toolbar icon. */
  language: ICON_LANGUAGE,
  /** Object-snap parent toolbar icon. */
  osnap: ICON_OSNAP,
  /** Orthogonal mode toggle icon. */
  orthoMode: ICON_ORTHO_MODE,
  /** Polar tracking toggle icon. */
  polarTracking: ICON_POLAR_TRACKING,
  /** Measure color picker icon. */
  color: ICON_COLOR,
  /** Collapse toolbar (chevron up). */
  chevronUp: ICON_CHEVRON_UP,
  /** Expand toolbar (chevron down). */
  chevronDown: ICON_CHEVRON_DOWN,
  /** Measure tools parent menu icon. */
  measure: ICON_MEASURE,
  /** Review / annotation tools parent menu icon. */
  annotation: ICON_ANNOTATION,
  /** Markup revision cloud. */
  markupCloud: ICON_MARKUP_CLOUD,
  /** Markup callout. */
  markupCallout: ICON_MARKUP_CALLOUT,
  /** Markup text. */
  markupText: ICON_MARKUP_TEXT,
  /** Markup rectangle. */
  markupRect: ICON_MARKUP_RECT,
  /** Markup circle. */
  markupCircle: ICON_MARKUP_CIRCLE,
  /** Markup arrow. */
  markupArrow: ICON_MARKUP_ARROW,
  /** Markup stamp. */
  markupStamp: ICON_MARKUP_STAMP,
  /** Review list / markup panel. */
  markupPanel: ICON_MARKUP_PANEL,
  /** Import markup sidecar JSON. */
  markupImport: ICON_MARKUP_IMPORT,
  /** Export markup sidecar JSON. */
  markupExport: ICON_MARKUP_EXPORT,
  /** Show markups (open eye). */
  markupShow: ICON_MARKUP_SHOW,
  /** Hide markups (slashed eye). */
  markupHide: ICON_MARKUP_HIDE,
  /** @deprecated Prefer {@link markupHide} / {@link markupShow}. */
  markupVisibility: ICON_MARKUP_HIDE,
  /** Clear all markups. */
  clearMarkups: ICON_CLEAR_MARKUPS
} as const

/**
 * Builds an HTML toolbar `<button>` with an inline icon and extra attributes.
 *
 * @param icon - SVG markup from {@link acExHtmlIcons}.
 * @param title - Default `title` and `aria-label` before i18n overrides.
 * @param attrs - Additional attributes (e.g. `data-action`, `data-i18n-key`).
 * @returns HTML string for one toolbar button.
 */
export function acExToolbarButton(
  icon: string,
  title: string,
  attrs: Record<string, string>
): string {
  const attrStr = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ')
  return `<button type="button" class="mlcad-tool-btn" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}" ${attrStr}>${icon}</button>`
}

/**
 * Builds a flyout menu item with icon + label (cad-simple-ui-plugin style).
 *
 * @param icon - SVG markup from {@link acExHtmlIcons}.
 * @param label - Default visible label before i18n overrides.
 * @param attrs - Additional attributes (e.g. `data-action`, `data-i18n-key`).
 */
export function acExDropdownItem(
  icon: string,
  label: string,
  attrs: Record<string, string>
): string {
  const attrStr = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ')
  const i18nKey = attrs['data-i18n-key']
  const labelAttrs = i18nKey
    ? ` data-i18n-key="${escapeAttr(i18nKey)}" data-i18n-text`
    : ''
  return `<button type="button" class="mlcad-dropdown-item" role="menuitem" title="${escapeAttr(label)}" ${attrStr}><span class="mlcad-dropdown-icon" aria-hidden="true">${icon}</span><span class="mlcad-dropdown-label"${labelAttrs}>${escapeAttr(label)}</span></button>`
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}
