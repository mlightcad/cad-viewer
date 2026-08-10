import { AcApHtmlPlugin } from './AcApHtmlPlugin'
import {
  type AcApHtmlPluginOptions,
  configureHtmlPlugin,
  getHtmlPluginOptions
} from './AcApHtmlPluginOptions'

/**
 * Creates an HTML export plugin instance.
 *
 * @param options - Plugin options such as `viewerRuntimeUrl` (HTML export only)
 * @returns A loaded {@link AcApHtmlPlugin} instance
 */
export async function createHtmlPlugin(options: AcApHtmlPluginOptions = {}) {
  if (options.viewerRuntimeUrl != null) {
    configureHtmlPlugin(options)
  }
  return new AcApHtmlPlugin(getHtmlPluginOptions())
}
