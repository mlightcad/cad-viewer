import { AcApAgentPlugin } from './AcApAgentPlugin'

/**
 * Creates a CAD Agent plugin instance.
 *
 * @returns A promise that resolves to a new {@link AcApAgentPlugin}.
 */
export async function createAgentPlugin() {
  return new AcApAgentPlugin()
}
