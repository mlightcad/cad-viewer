import { AcApPdfPlugin } from './AcApPdfPlugin'

/**
 * Creates a PDF plugin instance.
 *
 * @returns A loaded {@link AcApPdfPlugin} instance
 */
export async function createPdfPlugin() {
  return new AcApPdfPlugin()
}
