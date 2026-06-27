/**
 * Inline SVG icon strings and helpers for toolbar and menu buttons.
 *
 * Each `ICON_*` constant is an SVG snippet using `currentColor` for theming.
 */

/** Select tool icon. */
export const ICON_SELECT = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10.4379 15.2979h.002l4.86-4.86-9.722-4.86 4.86 9.72Zm7.562-5.298-3.434 3.434 3.2 3.2-1.132 1.132-3.2-3.2-3.434 3.434-7.6-15.6 15.6 7.6Z"/></svg>'

/** Pan tool icon. */
export const ICON_PAN = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M15.08 12.8537l.002-.002V5.5897c0-.422-.652-.414-.652 0v3.466c0 .938-1.482.95-1.482 0v-4.83c0-.414-.6381-.414-.6381 0h-.014v4.83c.014.95-1.482.95-1.482 0V3.4437c0-.42-.638-.414-.638 0v5.612c0 .95-1.494.95-1.494 0V4.2317c0-.408-.64-.42-.64 0v6.756c0 .802-1.094 1.088-1.494.388-.26-.446-.518-.892-.776-1.338-.338-.482-1.1-.15-.794.38.326.566.652 1.132.978 1.698.006.012.014.026.02.04.552.946 1.106 1.89 1.658 2.834.19.3.422.578.666.802h-.006c.672.61 1.528.964 2.418 1.052.888.06 1.7921-.124 2.5601-.612.3-.19.572-.416.816-.68.326-.368.57-.776.734-1.204.176-.482.258-.97.258-1.494Zm-.91-8.608-.004-.002c.958-.38 2.058.244 2.058 1.346v7.266c0 .652-.108 1.29-.332 1.894-.216.564-.53 1.114-.964 1.576-.318.34-.666.632-1.046.884-.978.612-2.1461.862-3.2601.774-1.128-.102-2.228-.564-3.098-1.352-.326-.292-.612-.646-.87-1.034-.558-.96-1.114-1.92-1.672-2.88l-.012-.028c-.326-.568-.652-1.138-.978-1.706-.59-1.018.068-2.186 1.156-2.336.536-.074 1.126.116 1.562.72.026.028.04.062.054.096.04.074.082.146.122.218V4.2337c0-1.176 1.244-1.788 2.202-1.278.42-1.278 2.378-1.264 2.792-.014.9721-.51 2.2221.102 2.2221 1.284v.06c.022-.014.046-.026.068-.04Z"/></svg>'

/** Zoom extents icon. */
export const ICON_ZOOM_EXTENT = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M9.3333 14.125 5.875 10.6667V14.125H9.3333Zm4.7917-3.4583-3.4583 3.4583H14.125V10.6667ZM10.6667 5.875 14.125 9.3333V5.875H10.6667ZM5.875 9.3333 9.3333 5.875H5.875V9.3333Zm9.2083 5.475c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917S.9417 7.275 4.1083 4.1083C7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Z"/></svg>'

/** Zoom window icon. */
export const ICON_ZOOM_WINDOW = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M15.0833 14.8083c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917C.8417 12.3667.9417 7.275 4.1083 4.1083 7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Zm-3.55-2.6083V7.2083H7.2083v5.5833h5.5833ZM5.875 5.875h8.25v8.25H5.875V5.875Z"/></svg>'

/** Layer manager icon. */
export const ICON_LAYER = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m434.8 137.65l-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09M160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m160 204.48l-82.8 37.16c-17.6 8-17.6 21.1 0 29.1l148 67.49c16.89 7.7 44.69 7.7 61.58 0l148-67.49c17.7-8 17.7-21.1.1-29.1L352 204.48"/></svg>'

/** Measure tools parent menu icon. */
export const ICON_MEASURE = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M1.5 7h17v6h-17Z M4.25 7h1v2.5h-1Z M7.5 7h.75v1.5H7.5Z M10.25 7h1v2.5h-1Z M13.5 7h.75v1.5H13.5Z M16.25 7h1v2.5h-1Z"/></svg>'

/** Measure distance icon (dimension line between two points). */
export const ICON_MEASURE_DISTANCE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="4" cy="15" r="1.6" fill="currentColor"/><circle cx="16" cy="5" r="1.6" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M5.4 13.6 14.6 6.4"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3 15h2.8M16 5h-2.8"/></svg>'

/** Measure angle icon. */
export const ICON_MEASURE_ANGLE = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 16a8 8 0 0 1 12-5"/><path fill="currentColor" d="M16 9h2v2h-2z"/></svg>'

/** Measure area icon. */
export const ICON_MEASURE_AREA = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 6h8v8H4z"/><path fill="currentColor" d="M12 12h4v4h-4z" opacity=".5"/></svg>'

/** Measure arc length icon. */
export const ICON_MEASURE_ARC = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 14a8 8 0 0 1 12-8"/></svg>'

/** Clear measurements icon (ruler with clear mark). */
export const ICON_CLEAR_MEASUREMENTS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3 13h14"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M6 11v4M9.5 12v2M13 11v4M16.5 12v2"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6.5 5.5 13.5 12.5M13.5 5.5 6.5 12.5"/></svg>'

/** Switch background icon. */
export const ICON_SWITCH_BG = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" fill="currentColor"/><rect x="14" y="14" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M12 4a8 8 0 0 1 7.25 7.25" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M20.75 10 L17.25 10 L19 12.5 Z" fill="currentColor"/><path d="M12 20a8 8 0 0 1-8-8" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M6 14 L2.5 14 L4 11 Z" fill="currentColor"/></svg>'

/** Annotation tools parent menu icon. */
export const ICON_ANNOTATION =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="4" y="6" width="11" height="10" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="currentColor" d="M7 14.5 13.5 8l1.5 1.5-6.5 6.5H7v-1.5Z"/><path fill="currentColor" d="M13.2 7.3 15 5.5l1.5 1.5-1.8 1.8-1.5-1.5Z"/></svg>'

/** Freehand review sketch icon. */
export const ICON_REV_FREEDRAW = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 14c2-4 4-6 8-8 2-1 4 0 4 2"/></svg>'

/** Rectangle review icon. */
export const ICON_REV_RECT = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="4" y="5" width="12" height="10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

/** Revision cloud icon. */
export const ICON_REV_CLOUD = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M5 12c0-2 1-4 4-4 1-2 4-2 5 0 2 0 3 2 3 4"/></svg>'

/** Circle review icon. */
export const ICON_REV_CIRCLE = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

/** Show annotations icon. */
export const ICON_ANNOTATION_SHOW = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6Zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/></svg>'

/** Hide annotations icon. */
export const ICON_ANNOTATION_HIDE = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M2 2l16 16M10 6c3.5 0 6.5 2 7.8 4-1 1.6-3 3.4-5.8 4.1M6.2 6.3C3.8 7.4 2.2 9.1 1.2 10c1.3 2.9 5 6 8.8 6 1.2 0 2.3-.3 3.3-.7"/></svg>'

/** Light theme toggle icon (shown when light theme is active). */
export const ICON_THEME_LIGHT = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="10" r="4" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.5" d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>'

/** Dark theme toggle icon (shown when dark theme is active). */
export const ICON_THEME_DARK = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10 3a7 7 0 1 0 0 14 9 9 0 0 1 0-14Z"/></svg>'

/** Export submenu parent icon (share from document). */
export const ICON_EXPORT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="4" y="7" width="10" height="10" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M11 4h5v5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M10 5 16 11"/></svg>'

/** Export HTML icon. */
export const ICON_EXPORT_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M4 3h12v14H4V3Zm2 2v2h8V5H6Zm0 4v6h8V9H6Z"/></svg>'

/** Export PDF icon. */
export const ICON_EXPORT_PDF = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M5 3h7l3 3v11H5V3Zm6 0v3h3"/><text x="6" y="16" fill="currentColor" font-size="5" font-family="Arial">PDF</text></svg>'

/** Export SVG icon. */
export const ICON_EXPORT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 4h12v12H4z"/><circle cx="8" cy="10" r="2" fill="currentColor"/></svg>'

/** Toolbar dock / placement parent button. */
export const ICON_TOOLBAR_PLACEMENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="15" y="5" width="1.5" height="10" rx=".5" fill="currentColor"/></svg>'

export const ICON_PLACEMENT_TOP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="3" rx=".5" fill="currentColor"/><rect x="5" y="8" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

export const ICON_PLACEMENT_BOTTOM =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="5" y="3" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="14" height="3" rx=".5" fill="currentColor"/></svg>'

export const ICON_PLACEMENT_LEFT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="3" width="3" height="14" rx=".5" fill="currentColor"/><rect x="8" y="5" width="9" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

export const ICON_PLACEMENT_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="5" y="5" width="9" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="3" height="14" rx=".5" fill="currentColor"/></svg>'

/**
 * Creates a DOM icon element from an SVG string, element, or factory.
 *
 * @param icon - Inline SVG markup, existing element, or factory function.
 * @returns Wrapper span with class `ml-ex-ui-icon`, or a cloned/factory element.
 */
export function createIconElement(
  icon: string | HTMLElement | (() => HTMLElement)
): HTMLElement {
  if (typeof icon === 'function') return icon()
  if (icon instanceof HTMLElement) return icon.cloneNode(true) as HTMLElement
  const wrapper = document.createElement('span')
  wrapper.className = 'ml-ex-ui-icon'
  wrapper.innerHTML = icon
  return wrapper
}
