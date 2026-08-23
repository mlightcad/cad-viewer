/** Inline SVG markup for the pane header open-file button. */
const OPEN_FILE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
</svg>
`.trim()

/** Toolbar: side-by-side view (Heroicons `view-columns`). */
export const ICON_SIDE_BY_SIDE = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
</svg>
`.trim()

/** Toolbar: overlay view (Heroicons `square-2-stack`). */
export const ICON_OVERLAY = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" />
</svg>
`.trim()

/** Toolbar: show / hide the comparison results side panel. */
export const ICON_RESULTS_PANEL = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 5.625C3 5.004 3.504 4.5 4.125 4.5h15.75c.621 0 1.125.504 1.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 18.375V5.625Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 4.5v15" />
</svg>
`.trim()

/** Toolbar: lock pan/zoom of the two side-by-side canvases (Heroicons `arrows-right-left`). */
export const ICON_SYNC_VIEWS = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
</svg>
`.trim()

/** Results panel: show field-level differences for a modified entity. */
export const ICON_INFO = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
</svg>
`.trim()

/** Toolbar: compare-display settings (Heroicons `cog-6-tooth`). */
export const ICON_SETTINGS = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" />
</svg>
`.trim()

/**
 * Toolbar: switch to light theme (Element Plus `Sunny`, same as cad-viewer
 * status-bar theme button when dark theme is active).
 */
export const ICON_THEME_SUNNY =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true"><path fill="currentColor" d="M512 704a192 192 0 1 0 0-384 192 192 0 0 0 0 384m0 64a256 256 0 1 1 0-512 256 256 0 0 1 0 512m0-704a32 32 0 0 1 32 32v64a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32m0 768a32 32 0 0 1 32 32v64a32 32 0 1 1-64 0v-64a32 32 0 0 1 32-32m384-384a32 32 0 0 1-32 32h-64a32 32 0 0 1 0-64h64a32 32 0 0 1 32 32M96 512a32 32 0 0 1 32-32H192a32 32 0 1 1 0 64H128a32 32 0 0 1-32-32m741.056-266.944a32 32 0 0 1-45.248 45.248l-45.248-45.248a32 32 0 0 1 45.248-45.248zm-589.056 589.056a32 32 0 0 1-45.248 45.248l-45.248-45.248a32 32 0 0 1 45.248-45.248zm589.056 0-45.248 45.248a32 32 0 0 1-45.248-45.248l45.248-45.248a32 32 0 0 1 45.248 45.248M247.936 201.984a32 32 0 0 1-45.248 45.248l-45.248-45.248a32 32 0 0 1 45.248-45.248z"/></svg>'

/**
 * Toolbar: switch to dark theme (Element Plus `Moon`, same as cad-viewer
 * status-bar theme button when light theme is active).
 */
export const ICON_THEME_MOON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true"><path fill="currentColor" d="M240.448 240.448a384 384 0 1 0 543.104 543.104 476.16 476.16 0 0 1-543.104-543.104"/></svg>'

/** Toolbar: generate markup clouds from compare change sets. */
export const ICON_COMPARE_CLOUDS = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.06 2.25h9.44a3.75 3.75 0 1 0-.3-7.49 5.25 5.25 0 0 0-10.12 1.5A4.5 4.5 0 0 0 2.25 15Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75 16.82 4.61 17.68 4.93 16.82 5.25 16.5 6.11 16.18 5.25 15.32 4.93 16.18 4.61 16.5 3.75Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5 20.5 8.16 21.16 8.41 20.5 8.66 20.25 9.32 20 8.66 19.34 8.41 20 8.16 20.25 7.5Z" />
</svg>
`.trim()

/** Inline SVG markup for the empty-pane illustration. */
const EMPTY_FILE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
</svg>
`.trim()

/** Creates the open-file SVG used in pane headers. */
export function acapCreateOpenFileIcon(): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'ml-diff-icon'
  wrap.innerHTML = OPEN_FILE_ICON
  return wrap
}

/** Creates the empty-state SVG shown when a pane has no drawing. */
export function acapCreateEmptyFileIcon(): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'ml-diff-empty-icon'
  wrap.innerHTML = EMPTY_FILE_ICON
  return wrap
}
