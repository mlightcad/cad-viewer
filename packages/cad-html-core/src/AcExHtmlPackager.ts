import type { AcExHtmlAccessManifest } from './AcExHtmlAccess'
import { acexHtmlResolveLocale } from './AcExHtmlI18n'
import { ACEX_DEFAULT_MANIFEST_HREF } from './AcExHtmlPackageBootstrap'
import { ACEX_HTML_SHELL_CSS, acexHtmlBuildShellBody } from './AcExHtmlShell'
import { acexHtmlEncodeSnapshot, acexHtmlSnapshotMimeType } from './AcExHtmlSnapshotCodec'
import type { AcExHtmlEncodedSnapshot } from './AcExHtmlSnapshotCompression'
import type { AcExHtmlSnapshot } from './AcExHtmlSnapshotTypes'

/**
 * Options passed to {@link acexHtmlPackHtml} when assembling a self-contained HTML file.
 */
export interface AcExHtmlPackHtmlOptions {
  /**
   * Page `<title>` and default download filename stem.
   * Falls back to {@link AcExHtmlSnapshot.meta.title} or `"CAD Drawing"`.
   */
  title?: string
  /**
   * Inline viewer bootstrap script (IIFE bundle from the `cad-html-plugin` build).
   * Typically the contents of {@link HTML_VIEWER_RUNTIME_FILE}.
   */
  viewerRuntime: string
  /**
   * Pre-encoded snapshot payload. When omitted, {@link acexHtmlPackHtml} encodes `snapshot`.
   */
  encoded?: AcExHtmlEncodedSnapshot
  /** Optional access manifest for expiry and password protection. */
  accessManifest?: AcExHtmlAccessManifest
}

/**
 * Options for {@link acexHtmlPackHtmlPackage}: shell HTML that loads a remote package.
 */
export interface AcExHtmlPackHtmlPackageOptions {
  /**
   * Page `<title>`.
   * Falls back to {@link AcExHtmlSnapshot.meta.title} or `"CAD Drawing"`.
   */
  title?: string
  /** Inline viewer bootstrap script (IIFE). */
  viewerRuntime: string
  /**
   * Optional URL of the `*.acex.json` manifest relative to the HTML file.
   * When omitted, the generic viewer probes `./drawing.acex.json` (and query /
   * folder / URL pickers) at runtime — no drawing-specific path is embedded.
   */
  manifestUrl?: string
}

/**
 * Builds a self-contained HTML document with an embedded compressed snapshot
 * and inline viewer runtime.
 *
 * @param snapshot - Display snapshot to embed in a `<script id="mlcad-snapshot">` tag.
 * @param options - Page title override and viewer IIFE source.
 * @returns Complete HTML document string (DOCTYPE, shell markup, snapshot, runtime).
 */
export function acexHtmlPackHtml(
  snapshot: AcExHtmlSnapshot,
  options: AcExHtmlPackHtmlOptions
): string {
  const title = options.title ?? snapshot.meta.title ?? 'CAD Drawing'
  const encoded = options.encoded ?? acexHtmlEncodeSnapshot(snapshot)
  const runtime = options.viewerRuntime
  const mime = acexHtmlSnapshotMimeType()
  const compression = encoded.compression
  const encrypted = options.accessManifest?.encrypted === true
  const loadingBg = `#${snapshot.meta.background.toString(16).padStart(6, '0')}`
  const htmlLang = acexHtmlResolveLocale(snapshot.meta.locale) ?? 'en'
  const viewerMode = snapshot.meta.viewerMode ?? 'measure'
  const exportLayouts = snapshot.meta.exportLayouts !== false
  const accessScript = options.accessManifest
    ? `  <script id="mlcad-access" type="application/json">${escapeInlineJson(
        JSON.stringify(options.accessManifest)
      )}</script>\n`
    : ''
  const snapshotType = encrypted
    ? `${mime}+aes-gcm;base85`
    : `${mime}+${compression};base85`

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
${acexHtmlBuildShellBody(loadingBg, viewerMode, exportLayouts)}
${accessScript}  <script id="mlcad-snapshot" type="${snapshotType}">${encoded.payload}</script>
  <script>${escapeInlineScript(runtime)}</script>
</body>
</html>`
}

/**
 * Builds a shell HTML document that loads render data from a package manifest.
 * Contains only HTML/CSS/JS — no embedded geometry and no drawing-specific
 * data-file paths by default (see {@link ACEX_DEFAULT_MANIFEST_HREF}).
 *
 * @param snapshot - Used for title, locale, background, and viewer mode chrome.
 * @param options - Runtime source and optional manifest URL override.
 */
export function acexHtmlPackHtmlPackage(
  snapshot: AcExHtmlSnapshot,
  options: AcExHtmlPackHtmlPackageOptions
): string {
  const title = options.title ?? snapshot.meta.title ?? 'CAD Drawing'
  const runtime = options.viewerRuntime
  const loadingBg = `#${snapshot.meta.background.toString(16).padStart(6, '0')}`
  const htmlLang = acexHtmlResolveLocale(snapshot.meta.locale) ?? 'en'
  const viewerMode = snapshot.meta.viewerMode ?? 'measure'
  const exportLayouts = snapshot.meta.exportLayouts !== false
  const manifestUrl = options.manifestUrl?.trim()
  const packageConfig = JSON.stringify(
    manifestUrl && manifestUrl !== ACEX_DEFAULT_MANIFEST_HREF
      ? { manifestUrl }
      : {}
  )

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
${acexHtmlBuildShellBody(loadingBg, viewerMode, exportLayouts)}
  <script id="mlcad-package" type="application/json">${escapeInlineJson(
    packageConfig
  )}</script>
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
