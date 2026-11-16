import { AcApSvgPlugin } from './AcApSvgPlugin.js'

/**
 * Creates an SVG export plugin instance.
 *
 * @returns A loaded {@link AcApSvgPlugin} instance
 */
export async function createSvgPlugin() {
  return new AcApSvgPlugin()
}
