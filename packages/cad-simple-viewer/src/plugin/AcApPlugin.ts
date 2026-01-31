import { AcApContext } from '../app/AcApContext'
import { AcEdCommandStack } from '../editor/command/AcEdCommandStack'

/**
 * Plugin interface that all plugins must implement.
 *
 * Plugins can extend the functionality of the CAD viewer by:
 * - Registering custom commands
 * - Accessing the application context (view, document)
 * - Performing initialization and cleanup
 *
 * @example
 * ```typescript
 * class MyPlugin implements AcApPlugin {
 *   name = 'MyPlugin'
 *   version = '1.0.0'
 *
 *   private registeredCommands: Array<{group: string, name: string}> = []
 *
 *   onLoad(context: AcApContext, commandManager: AcEdCommandStack): void {
 *     // Register custom commands
 *     commandManager.addCommand('USER', 'MYCMD', 'My Command', new MyCommand())
 *     this.registeredCommands.push({group: 'USER', name: 'MYCMD'})
 *   }
 *
 *   onUnload(context: AcApContext, commandManager: AcEdCommandStack): void {
 *     // Clean up registered commands
 *     for (const cmd of this.registeredCommands) {
 *       commandManager.removeCmd(cmd.group, cmd.name)
 *     }
 *     this.registeredCommands = []
 *   }
 * }
 * ```
 */
export interface AcApPlugin {
  /** Unique identifier for the plugin */
  name: string
  /** Version of the plugin */
  version?: string
  /** Optional description of the plugin */
  description?: string

  /**
   * Called when the plugin is loaded.
   *
   * This method is invoked when the plugin is registered with the plugin manager.
   * Use this method to:
   * - Register custom commands using the provided command manager
   * - Initialize plugin-specific resources
   * - Set up event listeners
   *
   * @param context - The current application context (view, document)
   * @param commandManager - The command manager for registering commands
   *
   * @example
   * ```typescript
   * onLoad(context: AcApContext, commandManager: AcEdCommandStack) {
   *   commandManager.addCommand('USER', 'MYCMD', 'My Command', new MyCommand());
   * }
   * ```
   */
  onLoad(
    context: AcApContext,
    commandManager: AcEdCommandStack
  ): void | Promise<void>

  /**
   * Called when the plugin is unloaded.
   *
   * This method is invoked when the plugin is removed from the plugin manager.
   * Use this method to:
   * - Clean up registered commands using commandManager.removeCmd()
   * - Release resources
   * - Remove event listeners
   *
   * @param context - The current application context (view, document)
   * @param commandManager - The command manager for unregistering commands
   *
   * @example
   * ```typescript
   * onUnload(context: AcApContext, commandManager: AcEdCommandStack) {
   *   commandManager.removeCmd('USER', 'MYCMD');
   * }
   * ```
   */
  onUnload(
    context: AcApContext,
    commandManager: AcEdCommandStack
  ): void | Promise<void>
}
