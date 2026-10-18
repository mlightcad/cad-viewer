import { AcApCadScriptPlugin } from './AcApCadScriptPlugin'

/**
 * Creates a CAD script plugin instance.
 *
 * @returns A promise that resolves to a new {@link AcApCadScriptPlugin}.
 */
export async function createCadScriptPlugin() {
  return new AcApCadScriptPlugin()
}
