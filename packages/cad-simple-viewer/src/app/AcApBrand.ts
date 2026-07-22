/**
 * Shared mlightcad brand assets and metadata for progress overlays and About UI.
 */

/** Cloud + "ML" mark matching the product logo (`currentColor`). */
export const MLIGHTCAD_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true">' +
  '<path fill="currentColor" d="M737.216 357.952 704 349.824l-11.776-32a192.064 192.064 0 0 0-367.424 23.04l-8.96 39.04-39.04 8.96A192.064 192.064 0 0 0 320 768h368a207.81 207.81 0 0 0 207.808-208 208.32 208.32 0 0 0-158.592-202.048m15.168-62.208A272.32 272.32 0 0 1 959.744 560a271.81 271.81 0 0 1-271.552 272H320a256 256 0 0 1-57.536-505.536 256.128 256.128 0 0 1 489.92-30.72"/>' +
  '<text x="512" y="580" text-anchor="middle" dominant-baseline="middle" font-size="300" font-family="Arial,sans-serif" fill="currentColor" font-weight="bold">ML</text>' +
  '</svg>'

/** Public-facing brand / product name. */
export const MLIGHTCAD_BRAND_NAME = 'mlightcad'

/** Marketing / demo site. */
export const MLIGHTCAD_WEBSITE_URL = 'https://mlightcad.github.io/cad-viewer/'

/** API documentation site. */
export const MLIGHTCAD_DOCS_URL = 'https://mlightcad.github.io/cad-viewer/docs/'

/** Source repository. */
export const MLIGHTCAD_REPO_URL = 'https://github.com/mlightcad/cad-viewer'

/**
 * Creates the mlightcad logo icon element (no wordmark).
 *
 * @param options.className - Optional CSS class on the icon wrapper
 * @param options.size - CSS size for the icon (default `40px`)
 * @returns Detached icon element
 */
export function acapCreateMlightcadIcon(options?: {
  className?: string
  size?: string
}): HTMLElement {
  const icon = document.createElement('span')
  icon.className = options?.className ?? 'ml-brand-mark-icon'
  icon.setAttribute('role', 'img')
  icon.setAttribute('aria-label', MLIGHTCAD_BRAND_NAME)
  icon.innerHTML = MLIGHTCAD_ICON_SVG
  const size = options?.size ?? '40px'
  icon.style.width = size
  icon.style.height = size
  return icon
}

/**
 * Creates a brand mark row: logo icon + wordmark text.
 *
 * @param options.className - Optional CSS class on the root element
 * @param options.iconSize - CSS size for the icon (default `40px`)
 * @returns Detached brand mark element
 */
export function acapCreateMlightcadBrandMark(options?: {
  className?: string
  iconSize?: string
}): HTMLElement {
  const root = document.createElement('div')
  root.className = options?.className ?? 'ml-brand-mark'
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', MLIGHTCAD_BRAND_NAME)

  const icon = acapCreateMlightcadIcon({
    className: 'ml-brand-mark-icon',
    size: options?.iconSize ?? '40px'
  })
  // Nested icon already has aria; keep mark-level label for the composite.
  icon.removeAttribute('role')
  icon.removeAttribute('aria-label')

  const label = document.createElement('span')
  label.className = 'ml-brand-mark-label'
  label.textContent = MLIGHTCAD_BRAND_NAME

  root.appendChild(icon)
  root.appendChild(label)
  return root
}
