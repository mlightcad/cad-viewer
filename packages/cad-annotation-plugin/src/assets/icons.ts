export function createIconElement(svg: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'ml-ann-icon'
  span.innerHTML = svg
  return span
}

export const ICON_TEXT =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><text x="3" y="14" fill="currentColor" font-size="12">T</text></svg>'
export const ICON_LINE =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><path d="M3 17L17 3" stroke="currentColor" stroke-width="2"/></svg>'
export const ICON_RECT =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><rect x="4" y="5" width="12" height="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
export const ICON_CLOUD =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><path d="M4 12h11a3 3 0 0 0-1-5.5A4 4 0 0 0 6 6a3 3 0 0 0-2 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
export const ICON_SKETCH =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><path d="M4 14c2-4 4-6 8-8" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
export const ICON_IMAGE =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><rect x="3" y="5" width="14" height="10" fill="none" stroke="currentColor"/><circle cx="7" cy="9" r="1.5" fill="currentColor"/></svg>'
export const ICON_VIDEO =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><polygon points="8,6 14,10 8,14" fill="currentColor"/></svg>'
export const ICON_AUDIO =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><path d="M8 8h2v6H8zm4 2h2v4h-2z" fill="currentColor"/></svg>'
export const ICON_PANEL =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor"/></svg>'
export const ICON_EXPORT =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 16h12" stroke="currentColor" fill="none" stroke-width="2"/></svg>'
export const ICON_IMPORT =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><path d="M10 13V4m0 0L7 7m3-3l3 3M4 16h12" stroke="currentColor" fill="none" stroke-width="2"/></svg>'
export const ICON_VIS =
  '<svg viewBox="0 0 20 20" width="1em" height="1em"><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" fill="none" stroke="currentColor"/></svg>'