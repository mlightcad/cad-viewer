/**
 * Product page for the commercial DWG parser (`@mlight-cad/dwg-converter`).
 * Shown when LibreDWG runs out of memory while opening a drawing.
 */
export const ACAP_DWG_PARSER_PRODUCT_URL =
  'https://mlightcad.com/dwg-parser.html'

/** Matches a single markdown link `[label](https://...)`. */
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

/**
 * Escapes text for safe interpolation into HTML content.
 *
 * @param text - Raw text.
 * @returns HTML-escaped string.
 */
export function acapEscapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Builds a markdown link `[label](url)` for use in localized message templates.
 *
 * @param label - Visible link text.
 * @param url - Absolute `http(s)` URL.
 */
export function acapMarkdownLink(label: string, url: string): string {
  return `[${label}](${url})`
}

/**
 * Converts plain text that may contain markdown links into safe HTML.
 * Only `http` / `https` link targets are rendered as anchors.
 *
 * @param text - Message text, optionally with `[label](https://...)` links.
 * @returns Escaped HTML with clickable anchors.
 */
export function acapFormatMessageHtml(text: string): string {
  const parts: string[] = []
  let lastIndex = 0
  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push(acapEscapeHtml(text.slice(lastIndex, index)))
    }
    const label = acapEscapeHtml(match[1])
    // Escape attribute value so crafted file names cannot break out of href="...".
    const href = acapEscapeHtml(match[2])
    parts.push(
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
    )
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(acapEscapeHtml(text.slice(lastIndex)))
  }
  return parts.join('')
}

/**
 * Appends plain text and markdown links as DOM nodes (no `innerHTML`).
 *
 * @param container - Element that receives text and optional `<a>` children.
 * @param text - Message text, optionally with `[label](https://...)` links.
 */
export function acapAppendLinkedText(
  container: HTMLElement,
  text: string
): void {
  container.replaceChildren()
  let lastIndex = 0
  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      container.appendChild(
        document.createTextNode(text.slice(lastIndex, index))
      )
    }
    const anchor = document.createElement('a')
    anchor.href = match[2]
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.textContent = match[1]
    container.appendChild(anchor)
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)))
  }
}

/**
 * Opens a URL in a new tab when `window` is available.
 *
 * @param url - Absolute URL to open.
 */
export function acapOpenUrl(url: string): void {
  if (typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}
