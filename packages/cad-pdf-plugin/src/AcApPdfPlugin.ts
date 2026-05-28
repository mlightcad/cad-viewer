import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import { AcApConvertToPdfCmd } from './AcApConvertToPdfCmd'
import { AcApImportPdfCmd } from './AcApImportPdfCmd'

/**
 * PDF export/import plugin for cad-simple-viewer.
 *
 * Registers `cpdf` and `ipdf` commands when loaded. Register this plugin
 * lazily via {@link registerLazyPdfPlugin} so PDF libraries are fetched on demand.
 */
export class AcApPdfPlugin implements AcApPlugin {
  /** @inheritdoc */
  name = 'PdfPlugin'
  /** @inheritdoc */
  version = '1.0.0'
  /** @inheritdoc */
  description = 'PDF export (cpdf) and import (ipdf) commands'

  /** Commands registered in {@link onLoad} for cleanup in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Registers `cpdf` and `ipdf` system commands.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to register PDF commands
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(group, 'cpdf', 'cpdf', new AcApConvertToPdfCmd())
    commandManager.addCommand(group, 'ipdf', 'ipdf', new AcApImportPdfCmd())
    this.registeredCommands.push(
      { group, name: 'cpdf' },
      { group, name: 'ipdf' }
    )
  }

  /**
   * Removes commands registered in {@link onLoad}.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to unregister PDF commands
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []
  }
}
