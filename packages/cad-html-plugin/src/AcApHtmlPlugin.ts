import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import { AcApExportHtmlCmd } from './AcApExportHtmlCmd'

/**
 * HTML export plugin for cad-simple-viewer.
 *
 * Registers `chtml` when loaded. Register this plugin lazily via
 * {@link registerLazyHtmlPlugin} so the export bundle is fetched on demand.
 */
export class AcApHtmlPlugin implements AcApPlugin {
  /** @inheritdoc */
  name = 'HtmlPlugin'
  /** @inheritdoc */
  version = '1.0.0'
  /** @inheritdoc */
  description = 'HTML export (chtml) command'

  /** Commands registered in {@link onLoad} for cleanup in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Registers the `chtml` system command.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to register the HTML export command
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(group, 'chtml', 'chtml', new AcApExportHtmlCmd())
    this.registeredCommands.push({ group, name: 'chtml' })
  }

  /**
   * Removes commands registered in {@link onLoad}.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to unregister the HTML export command
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []
  }
}
