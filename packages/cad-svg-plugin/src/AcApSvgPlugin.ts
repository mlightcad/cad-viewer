import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import { AcApConvertToSvgCmd } from './AcApConvertToSvgCmd'

/**
 * SVG export plugin for cad-simple-viewer.
 *
 * Registers `csvg` when loaded. Register this plugin lazily via
 * {@link registerLazySvgPlugin} so the export bundle is fetched on demand.
 */
export class AcApSvgPlugin implements AcApPlugin {
  /** @inheritdoc */
  name = 'SvgPlugin'
  /** @inheritdoc */
  version = '1.0.0'
  /** @inheritdoc */
  description = 'SVG export (csvg) command'

  /** Commands registered in {@link onLoad} for cleanup in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Registers the `csvg` system command.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to register the SVG export command
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(group, 'csvg', 'csvg', new AcApConvertToSvgCmd())
    this.registeredCommands.push({ group, name: 'csvg' })
  }

  /**
   * Removes commands registered in {@link onLoad}.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to unregister the SVG export command
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []
  }
}
