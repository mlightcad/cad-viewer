import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import { AcApExportHtmlCmd } from './AcApExportHtmlCmd'
import type { AcApHtmlPluginOptions } from './AcApHtmlPluginOptions'

/**
 * HTML export plugin for cad-simple-viewer.
 *
 * Registers `-chtml` (interactive prompts) and, when no UI `chtml` command
 * exists, a non-interactive `chtml` that exports with defaults. Register this
 * plugin lazily via {@link registerLazyHtmlPlugin} so the export bundle is
 * fetched on demand.
 */
export class AcApHtmlPlugin implements AcApPlugin {
  /** @inheritdoc */
  name = 'HtmlPlugin'
  /** @inheritdoc */
  version = packageJson.version
  /** @inheritdoc */
  description = 'HTML export (chtml / -chtml) command'

  /** Commands registered in {@link onLoad} for cleanup in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * @param options - HTML export options (e.g. where to fetch `viewer-runtime.iife.js`)
   */
  constructor(private readonly options: AcApHtmlPluginOptions = {}) {}

  /**
   * Registers HTML export commands.
   *
   * - `-chtml` — command-line prompts for export options
   * - `chtml` — one-shot export with defaults when no dialog command is registered
   *   (e.g. cad-simple-viewer-example toolbar). Full cad-viewer registers its own
   *   `chtml` dialog command first, so this alias is skipped there.
   *
   * @param _context - Application context (unused)
   * @param commandManager - Command stack used to register the HTML export command
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    const interactiveCmd = new AcApExportHtmlCmd({
      pluginOptions: this.options,
      interactive: true
    })

    commandManager.addCommand(group, '-chtml', '-chtml', interactiveCmd)
    this.registeredCommands.push({ group, name: '-chtml' })

    if (!commandManager.lookupGlobalCmd('chtml')) {
      const quickCmd = new AcApExportHtmlCmd({
        pluginOptions: this.options,
        interactive: false
      })
      commandManager.addCommand(group, 'chtml', 'chtml', quickCmd)
      this.registeredCommands.push({ group, name: 'chtml' })
    }
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
