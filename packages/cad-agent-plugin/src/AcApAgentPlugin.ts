import { AcApContext, AcApPlugin, AcEdCommandStack } from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import { AcApAgentCmd } from './command/AcApAgentCmd'

/** Registered name of the CAD Agent plugin in the plugin manager. */
export const AGENT_PLUGIN_NAME = 'AgentPlugin'

/**
 * CAD Agent plugin: natural-language drawing via LLM tool calling.
 *
 * Registers the `agent` command, which opens the agent chat panel in the tool palette.
 */
export class AcApAgentPlugin implements AcApPlugin {
  /** Plugin identifier used by {@link AcApPluginManager}. */
  name = AGENT_PLUGIN_NAME
  /** Semantic version from `package.json`. */
  version = packageJson.version
  /** Short human-readable description shown in plugin listings. */
  description = 'Natural-language CAD drawing agent'

  /** Commands registered in {@link onLoad} for removal in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Registers the `agent` system command that opens the agent palette tab.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to register {@link AcApAgentCmd}.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(group, 'agent', 'agent', new AcApAgentCmd())
    this.registeredCommands.push({ group, name: 'agent' })
  }

  /**
   * Removes commands registered during {@link onLoad}.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to unregister agent commands.
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []
  }
}
