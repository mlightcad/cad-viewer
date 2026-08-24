import type { AcExHtmlAccessManifest } from './AcExHtmlAccess'
import { resolveAcExHtmlLocale } from './AcExHtmlI18n'
import { ACEX_HTML_SHELL_CSS, buildAcExHtmlShellBody } from './AcExHtmlShell'
import { encodeSnapshot, snapshotMimeType } from './AcExSnapshotCodec'
import type { AcExEncodedSnapshot } from './AcExSnapshotCompression'
import type { AcExSnapshot } from './AcExSnapshotTypes'

/**
 * Options passed to {@link packHtml} when assembling a self-contained HTML file.
 */
export interface AcExPackHtmlOptions {
  /**
   * Page `<title>` and default download filename stem.
   * Falls back to {@link AcExSnapshot.meta.title} or `"CAD Drawing"`.
   */
  title?: string
  /**
   * Inline viewer bootstrap script (IIFE bundle from the `cad-html-plugin` build).
   * Typically the contents of {@link HTML_VIEWER_RUNTIME_FILE}.
   */
  viewerRuntime: string
  /**
   * Pre-encoded snapshot payload. When omitted, {@link packHtml} encodes `snapshot`.
   */
  encoded?: AcExEncodedSnapshot
  /** Optional access manifest for expiry and password protection. */
  accessManifest?: AcExHtmlAccessManifest
}

/**
 * Builds a self-contained HTML document with an embedded compressed snapshot
 * and inline viewer runtime.
 *
 * @param snapshot - Display snapshot to embed in a `<script id="mlcad-snapshot">` tag.
 * @param options - Page title override and viewer IIFE source.
 * @returns Complete HTML document string (DOCTYPE, shell markup, snapshot, runtime).
 */
export function packHtml(
  snapshot: AcExSnapshot,
  options: AcExPackHtmlOptions
): string {
  const title = options.title ?? snapshot.meta.title ?? 'CAD Drawing'
  const encoded = options.encoded ?? encodeSnapshot(snapshot)
  const runtime = options.viewerRuntime
  const mime = snapshotMimeType()
  const compression = encoded.compression
  const encrypted = options.accessManifest?.encrypted === true
  const loadingBg = `#${snapshot.meta.background.toString(16).padStart(6, '0')}`
  const htmlLang = resolveAcExHtmlLocale(snapshot.meta.locale) ?? 'en'
  const viewerMode = snapshot.meta.viewerMode ?? 'measure'
  const exportLayouts = snapshot.meta.exportLayouts !== false
  const accessScript = options.accessManifest
    ? `  <script id="mlcad-access" type="application/json">${escapeInlineJson(
        JSON.stringify(options.accessManifest)
      )}</script>\n`
    : ''
  const snapshotType = encrypted
    ? `${mime}+aes-gcm;base64`
    : `${mime}+${compression};base64`

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="mlightcad-cad-html-plugin" />
  <title>${escapeHtml(title)}</title>
  <style>${ACEX_HTML_SHELL_CSS}</style>
</head>
<body>
${buildAcExHtmlShellBody(loadingBg, viewerMode, exportLayouts)}
${accessScript}  <script id="mlcad-snapshot" type="${snapshotType}">${encoded.payload}</script>
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

function escapeInlineJson(json: string): string {
  return json.replace(/</g, '\\u003c')
}
