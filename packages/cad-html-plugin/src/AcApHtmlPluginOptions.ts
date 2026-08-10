/**
 * Options for the HTML export plugin and convertor.
 *
 * These settings belong to `@mlightcad/cad-html-plugin`, not to
 * `AcApDocManager`. Opening DXF/DWG never requires them.
 */
export interface AcApHtmlPluginOptions {
  /**
   * URL of `viewer-runtime.iife.js` fetched and inlined when exporting HTML
   * (`chtml` / `-chtml`). Hosts must serve this file only if they use HTML export.
   *
   * @default './viewer-runtime.iife.js'
   */
  viewerRuntimeUrl?: string | URL
}

/** Relative URL used when no override is configured. */
export const DEFAULT_HTML_VIEWER_RUNTIME_URL = './viewer-runtime.iife.js'

let htmlPluginDefaults: AcApHtmlPluginOptions = {}

/**
 * Merges default options used by {@link createHtmlPlugin},
 * {@link registerLazyHtmlPlugin}, and {@link AcApHtmlConvertor}.
 *
 * Call from the host when registering the plugin, e.g.:
 * `registerLazyHtmlPlugin(pm, { viewerRuntimeUrl: './assets/viewer-runtime.iife.js' })`.
 */
export function configureHtmlPlugin(options: AcApHtmlPluginOptions): void {
  htmlPluginDefaults = { ...htmlPluginDefaults, ...options }
}

/** Returns the current HTML plugin defaults (shallow copy). */
export function getHtmlPluginOptions(): AcApHtmlPluginOptions {
  return { ...htmlPluginDefaults }
}

/**
 * Resolves the runtime script URL for HTML export.
 *
 * Precedence: explicit override → {@link configureHtmlPlugin} defaults →
 * {@link DEFAULT_HTML_VIEWER_RUNTIME_URL}.
 */
export function resolveViewerRuntimeUrl(override?: string | URL): string {
  if (override != null) {
    return String(override)
  }
  if (htmlPluginDefaults.viewerRuntimeUrl != null) {
    return String(htmlPluginDefaults.viewerRuntimeUrl)
  }
  return DEFAULT_HTML_VIEWER_RUNTIME_URL
}
