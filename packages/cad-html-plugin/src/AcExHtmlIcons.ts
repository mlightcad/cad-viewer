/** Inline SVG icons (from cad-viewer) for the offline HTML shell. */

const ICON_ZOOM_EXTENT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9.3333 14.125 5.875 10.6667V14.125H9.3333Zm4.7917-3.4583-3.4583 3.4583H14.125V10.6667ZM10.6667 5.875 14.125 9.3333V5.875H10.6667ZM5.875 9.3333 9.3333 5.875H5.875V9.3333Zm9.2083 5.475c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917S.9417 7.275 4.1083 4.1083C7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Z"/></svg>'

const ICON_MEASURE_DISTANCE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M3.75 9.25h12.5v1.5H3.75v-1.5ZM2.25 6.5h1.5v7h-1.5v-7ZM16.25 6.5h1.5v7h-1.5v-7Z"/></svg>'

const ICON_MEASURE_ANGLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><polygon fill="currentColor" points="5.74 7.13 7 9.5 4.15 7.72 3.2 7.12 3 7 7 4.5 6.17 6.05 5.67 7 5.74 7.13"/><polygon fill="currentColor" points="16 12.5 13.5 16.5 12.66 15.15 11.92 13.97 11 12.5 12 13.03 12.98 13.55 13.5 13.83 16 12.5"/><rect fill="currentColor" x="2" y="2.5" width="1" height="15"/><rect fill="currentColor" x="3" y="16.5" width="15" height="1"/><path fill="currentColor" d="M14,13c0,.18,0,.37,0,.55v0a6.82,6.82,0,0,1-.32,1.57l-.74-1.18L13,13.5c0-.14,0-.31,0-.47v0a6,6,0,0,0-6-6,6.74,6.74,0,0,0-1.26.13l-.29.07a5.61,5.61,0,0,0-1.3.52l-1-.6a7.07,7.07,0,0,1,2-.88,6.78,6.78,0,0,1,1-.19A7.7,7.7,0,0,1,7,6a7,7,0,0,1,7,7Z"/></svg>'

const ICON_MEASURE_ARC =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><rect fill="currentColor" x="2" y="16" width="2" height="2"/><rect fill="currentColor" x="16" y="2" width="2" height="2"/><rect fill="currentColor" x="6.1" y="6.11" width="2" height="2"/><path fill="currentColor" d="M4.99,9.11c-1.15,1.74-1.94,3.74-2.24,5.89h.81c.32-2.18,1.16-4.18,2.39-5.89h-.96Z"/><path fill="currentColor" d="M9.1,5v.96c1.71-1.23,3.72-2.07,5.9-2.4v-.81c-2.16,.3-4.16,1.09-5.9,2.24Z"/></svg>'

const ICON_MEASURE_AREA =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M4 4h12v12H4V4Zm1.5 1.5v9h9v-9h-9Z"/><circle fill="currentColor" cx="4" cy="4" r="1.5"/><circle fill="currentColor" cx="16" cy="4" r="1.5"/><circle fill="currentColor" cx="4" cy="16" r="1.5"/><circle fill="currentColor" cx="16" cy="16" r="1.5"/></svg>'

const ICON_MEASURE_COORDINATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9.25 2h1.5v5.25H16v1.5h-5.25V16h-1.5v-7.25H4v-1.5h5.25V2Z"/><circle fill="currentColor" cx="10" cy="10" r="1.75"/></svg>'

const ICON_CLEAR_MEASUREMENTS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>'

const ICON_LAYER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m434.8 137.65-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09M160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m160 204.48-82.8 37.16c-17.6 8-17.6 21.1 0 29.1l148 67.49c16.89 7.7 44.69 7.7 61.58 0l148-67.49c17.7-8 17.7-21.1.1-29.1L352 204.48"/></svg>'

const ICON_ZOOM_BOX =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M15.0833 14.8083c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917C.8417 12.3667.9417 7.275 4.1083 4.1083 7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Zm-3.55-2.6083V7.2083H7.2083v5.5833h5.5833ZM5.875 5.875h8.25v8.25H5.875V5.875Z"/></svg>'

const ICON_LAYER_ON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10.09 3.53 16.09 6.97 10.09 10.29 4.18 7 10.09 3.56M10.09 2.4 2.17 7 3.31 7.65 10.09 11.45 17 7.62 18.17 7 10.08 2.37 10.09 2.4Z"/><path fill="currentColor" d="M10.25 14.83 18.17 10.22 17 9.57 10.22 13.57 3.32 9.59 2.17 10.22 10.25 14.83Z"/><path fill="currentColor" d="M10.25 17.63 18.17 13 17 12.37 10.22 16.37 3.32 12.38 2.17 13 10.25 17.63Z"/></svg>'

const ICON_LAYER_OFF =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10.09 5.15 16.09 8.59 10.09 11.91 4.18 8.59 10.09 5.15ZM10.09 4 2.17 8.61 3.31 9.25 10.09 13.06 17 9.24 18.16 8.61 10.08 4 10.09 4Z"/><path fill="currentColor" d="M10.25 16.46 18.17 11.85 17 11.2 10.22 15.2 3.32 11.21 2.17 11.85 10.25 16.46Z"/><path fill="currentColor" d="M3.5 3.5 16.5 16.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>'

const ICON_LANGUAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m18.5 10 4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16.5 10h2zM10 2v2h6v2h-1.968a18.222 18.222 0 0 1-3.62 6.301 14.864 14.864 0 0 0 2.336 1.707l-.751 1.878A17.015 17.015 0 0 1 9 13.725 16.676 16.676 0 0 1 3.524 17.273l-.536-1.929a14.7 14.7 0 0 0 5.327-3.042A18.078 18.078 0 0 1 4.767 8h2.24A16.032 16.032 0 0 0 9 10.877 16.165 16.165 0 0 0 11.91 6.001L2 6V4h6V2h2zm7.5 10.885L16.253 16h2.492L17.5 12.885z"/></svg>'

/**
 * Inline SVG markup keyed by toolbar / layer UI usage.
 * Each value is a complete `<svg>…</svg>` string using `currentColor`.
 */
export const acExHtmlIcons = {
  /** Zoom-to-extents toolbar icon. */
  zoomExtent: ICON_ZOOM_EXTENT,
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
  /** Per-layer zoom-to-box button icon. */
  zoomBox: ICON_ZOOM_BOX,
  /** “Show all layers” action icon. */
  layerOn: ICON_LAYER_ON,
  /** “Hide all layers” action icon. */
  layerOff: ICON_LAYER_OFF,
  /** Language switch toolbar icon. */
  language: ICON_LANGUAGE
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

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}
