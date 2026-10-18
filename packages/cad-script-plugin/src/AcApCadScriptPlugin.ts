import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import { AcApCadScriptCmd } from './command/AcApCadScriptCmd'

/**
 * Manual CAD script console.
 *
 * Registers the `cadscript` system command.
 */
export class AcApCadScriptPlugin implements AcApPlugin {
  /** Plugin identifier used by {@link AcApPluginManager}. Must match `CAD_SCRIPT_PLUGIN_NAME`. */
  name = 'CadScriptPlugin'
  /** Semantic version from `package.json`. */
  version = packageJson.version
  /** Short human-readable description shown in plugin listings. */
  description = 'Manual CAD script console'

  /** Commands registered in {@link onLoad} for removal in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Registers the `cadscript` system command.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to register {@link AcApCadScriptCmd}.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(
      group,
      'cadscript',
      'cadscript',
      new AcApCadScriptCmd()
    )
    this.registeredCommands.push({ group, name: 'cadscript' })
  }

  /**
   * Removes commands registered during {@link onLoad}.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to unregister the script command.
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []
  }
}
