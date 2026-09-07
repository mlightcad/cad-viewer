import { AcApPdfPlugin, type AcApPdfPluginOptions } from './AcApPdfPlugin'

/**
 * Creates a PDF plugin instance.
 *
 * @param options - Optional plugin options (e.g. whether to skip `cpdf`)
 * @returns A loaded {@link AcApPdfPlugin} instance
 */
export async function createPdfPlugin(options: AcApPdfPluginOptions = {}) {
  return new AcApPdfPlugin(options)
}
