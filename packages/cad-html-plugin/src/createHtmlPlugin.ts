import { AcApHtmlPlugin } from './AcApHtmlPlugin'

/**
 * Creates an HTML export plugin instance.
 *
 * @returns A loaded {@link AcApHtmlPlugin} instance
 */
export async function createHtmlPlugin() {
  return new AcApHtmlPlugin()
}
