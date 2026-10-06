import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import { AcApConvertToPdfCmd } from './AcApConvertToPdfCmd'
import { AcApImportPdfCmd } from './AcApImportPdfCmd'

export interface AcApPdfPluginOptions {
  /**
   * When true, only `ipdf` is registered. Defaults to false.
   */
  disableExport?: boolean
}

/**
 * PDF export/import plugin for cad-simple-viewer.
 *
 * Registers `-cpdf` and `ipdf` when loaded. Also registers `cpdf` when no UI
 * dialog command is already present. Register this plugin lazily via
 * {@link registerLazyPdfPlugin} so the PDF renderer is fetched on demand.
 */
export class AcApPdfPlugin implements AcApPlugin {
  /** @inheritdoc */
  name = 'PdfPlugin'
  /** @inheritdoc */
  version = packageJson.version
  /** @inheritdoc */
  description = 'PDF export (-cpdf / cpdf) and import (ipdf) commands'

  private readonly _disableExport: boolean

  /** Commands registered in {@link onLoad} for cleanup in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  constructor(options: AcApPdfPluginOptions = {}) {
    this._disableExport = options.disableExport === true
  }

  /**
   * Registers `-cpdf` (when export is enabled) and `ipdf` system commands.
   * Registers `cpdf` only when a host UI has not already claimed that name.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to register PDF commands
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    if (!this._disableExport) {
      const exportCmd = new AcApConvertToPdfCmd()
      commandManager.addCommand(group, '-cpdf', '-cpdf', exportCmd)
      this.registeredCommands.push({ group, name: '-cpdf' })
      if (!commandManager.lookupGlobalCmd('cpdf')) {
        commandManager.addCommand(group, 'cpdf', 'cpdf', exportCmd)
        this.registeredCommands.push({ group, name: 'cpdf' })
      }
    }
    commandManager.addCommand(group, 'ipdf', 'ipdf', new AcApImportPdfCmd())
    this.registeredCommands.push({ group, name: 'ipdf' })
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
