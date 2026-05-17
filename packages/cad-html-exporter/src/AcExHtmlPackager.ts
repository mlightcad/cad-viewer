import { resolveAcExHtmlLocale } from './AcExHtmlI18n'
import { ACEX_HTML_SHELL_CSS, buildAcExHtmlShellBody } from './AcExHtmlShell'
import { encodeSnapshot, snapshotMimeType } from './AcExSnapshotCodec'
import type { AcExSnapshotV1 } from './AcExSnapshotTypes'

/**
 * Options passed to {@link packHtml} when assembling a self-contained HTML file.
 */
export interface AcExPackHtmlOptions {
  /**
   * Page `<title>` and default download filename stem.
   * Falls back to {@link AcExSnapshotV1.meta.title} or `"CAD Drawing"`.
   */
  title?: string
  /**
   * Inline viewer bootstrap script (IIFE bundle from the `cad-html-exporter` build).
   * Typically the contents of {@link HTML_VIEWER_RUNTIME_FILE}.
   */
  viewerRuntime: string
}

/**
 * Builds a self-contained HTML document with an embedded gzip-compressed snapshot
 * and inline viewer runtime.
 *
 * @param snapshot - Display snapshot to embed in a `<script id="mlcad-snapshot">` tag.
 * @param options - Page title override and viewer IIFE source.
 * @returns Complete HTML document string (DOCTYPE, shell markup, snapshot, runtime).
 */
export function packHtml(
  snapshot: AcExSnapshotV1,
  options: AcExPackHtmlOptions
): string {
  const title = options.title ?? snapshot.meta.title ?? 'CAD Drawing'
  const payload = encodeSnapshot(snapshot)
  const runtime = options.viewerRuntime
  const mime = snapshotMimeType()
  const loadingBg = `#${snapshot.meta.background.toString(16).padStart(6, '0')}`
  const htmlLang = resolveAcExHtmlLocale(snapshot.meta.locale) ?? 'en'

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="mlightcad-cad-html-exporter" />
  <title>${escapeHtml(title)}</title>
  <style>${ACEX_HTML_SHELL_CSS}</style>
</head>
<body>
${buildAcExHtmlShellBody(loadingBg)}
  <script id="mlcad-snapshot" type="${mime}+gzip;base64">${payload}</script>
  <script>${escapeInlineScript(runtime)}</script>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Escapes `</script>` sequences so inline script content cannot terminate
 * the surrounding HTML `<script>` element.
 *
 * @param code - Raw JavaScript source to embed in HTML.
 * @returns Escaped source safe for inline `<script>` bodies.
 */
function escapeInlineScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}
