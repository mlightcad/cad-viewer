import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import { AcApAgentCmd } from './command/AcApAgentCmd'
import { AcApCadScriptCmd } from './command/AcApCadScriptCmd'

/**
 * CAD Agent plugin: natural-language drawing via LLM tool calling.
 *
 * Registers `agent` (chat) and `cadscript` (manual script console).
 */
export class AcApAgentPlugin implements AcApPlugin {
  /** Plugin identifier used by {@link AcApPluginManager}. Must match `AGENT_PLUGIN_NAME`. */
  name = 'AgentPlugin'
  /** Semantic version from `package.json`. */
  version = packageJson.version
  /** Short human-readable description shown in plugin listings. */
  description = 'Natural-language CAD drawing agent and script console'

  /** Commands registered in {@link onLoad} for removal in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Registers the `agent` and `cadscript` system commands.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to register {@link AcApAgentCmd}.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(group, 'agent', 'agent', new AcApAgentCmd())
    commandManager.addCommand(
      group,
      'cadscript',
      'cadscript',
      new AcApCadScriptCmd()
    )
    this.registeredCommands.push(
      { group, name: 'agent' },
      { group, name: 'cadscript' }
    )
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
