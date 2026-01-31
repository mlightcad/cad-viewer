import { AcApContext } from '../app/AcApContext'
import { AcEdCommand } from '../editor/command/AcEdCommand'
import { AcEdCommandStack } from '../editor/command/AcEdCommandStack'
import { AcApPlugin } from './AcApPlugin'

/**
 * Example plugin demonstrating how to create and use plugins in cad-simple-viewer.
 *
 * This example shows:
 * - How to implement the AcApPlugin interface
 * - How to register custom commands in the onLoad hook
 * - How to clean up resources in the onUnload hook
 *
 * @example
 * ```typescript
 * import { AcApDocManager } from '@mlightcad/cad-simple-viewer';
 * import { ExamplePlugin } from './AcApPluginExample';
 *
 * // Load the plugin
 * const plugin = new ExamplePlugin();
 * await AcApDocManager.instance.pluginManager.loadPlugin(plugin);
 *
 * // The plugin's commands are now available
 * // You can execute them via: docManager.sendStringToExecute('HELLO');
 *
 * // Unload the plugin when done
 * await AcApDocManager.instance.pluginManager.unloadPlugin('ExamplePlugin');
 * ```
 */

/**
 * Example command that prints a greeting message.
 */
class AcApHelloCommand extends AcEdCommand {
  execute(context: AcApContext) {
    console.log('Hello from ExamplePlugin!')
    console.log('Current document:', context.doc)
    console.log('Current view:', context.view)
  }
}

/**
 * Example plugin implementation.
 */
export class AcApExamplePlugin implements AcApPlugin {
  name = 'ExamplePlugin'
  version = '1.0.0'
  description = 'An example plugin demonstrating the plugin system'

  // Track registered commands for cleanup
  private registeredCommands: Array<{ group: string; name: string }> = []

  /**
   * Called when the plugin is loaded.
   * Register custom commands here.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    // Register a custom command
    commandManager.addCommand(
      'USER', // Command group
      'HELLO', // Global command name
      'Hello', // Local command name
      new AcApHelloCommand()
    )

    // Track the command for cleanup
    this.registeredCommands.push({ group: 'USER', name: 'HELLO' })

    console.log(`[${this.name}] Plugin loaded successfully`)
    console.log(`[${this.name}] Registered command: HELLO`)
  }

  /**
   * Called when the plugin is unloaded.
   * Clean up registered commands and other resources here.
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    // Remove all registered commands
    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []

    console.log(`[${this.name}] Plugin unloaded`)
  }
}
