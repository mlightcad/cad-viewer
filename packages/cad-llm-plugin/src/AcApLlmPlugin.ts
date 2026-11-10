import {
  AcApContext,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import { AcApLlmSettingsCmd } from './command/AcApLlmSettingsCmd'
import { LLM_PLUGIN_NAME } from './constants'

/**
 * Shared AI model settings plugin.
 *
 * Registers the `llmsettings` command, which opens
 * {@link AcUiLlmSettingsDialog}. Register it lazily with
 * {@link registerLazyLlmPlugin}.
 */
export class AcApLlmPlugin implements AcApPlugin {
  /** @inheritdoc */
  name = LLM_PLUGIN_NAME
  /** @inheritdoc */
  version = packageJson.version
  /** @inheritdoc */
  description =
    'Shared AI model settings (llmsettings) and LLM text recognition'

  /** Commands registered in {@link onLoad} for cleanup in {@link onUnload}. */
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Registers the `llmsettings` system command.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack that receives the command.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(
      group,
      'llmsettings',
      'llmsettings',
      new AcApLlmSettingsCmd()
    )
    this.registeredCommands.push({ group, name: 'llmsettings' })
  }

  /**
   * Removes commands registered in {@link onLoad}.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack that owns the commands.
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []
  }
}

/**
 * Creates the AI model settings plugin.
 *
 * @returns A new {@link AcApLlmPlugin}.
 */
export async function createLlmPlugin(): Promise<AcApLlmPlugin> {
  return new AcApLlmPlugin()
}
