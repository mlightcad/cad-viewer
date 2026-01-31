import { AcApContext } from '../app/AcApContext'
import { AcEdCommandStack } from '../editor/command/AcEdCommandStack'
import { AcApPlugin } from './AcApPlugin'

/**
 * Plugin manager for dynamically loading and unloading plugins.
 *
 * This class manages the lifecycle of plugins, including:
 * - Loading plugins and calling their `onLoad` hooks
 * - Unloading plugins and calling their `onUnload` hooks
 * - Providing access to the application context and command manager
 *
 * Plugins are responsible for cleaning up their own registered commands
 * in the `onUnload` hook using `commandManager.removeCmd()`.
 *
 * @example
 * ```typescript
 * const pluginManager = AcApDocManager.instance.pluginManager;
 *
 * // Load a plugin
 * const myPlugin = new MyPlugin();
 * await pluginManager.loadPlugin(myPlugin);
 *
 * // Unload a plugin
 * await pluginManager.unloadPlugin('MyPlugin');
 *
 * // Check if a plugin is loaded
 * if (pluginManager.isPluginLoaded('MyPlugin')) {
 *   console.log('Plugin is loaded');
 * }
 *
 * // Get all loaded plugins
 * const loadedPlugins = pluginManager.getLoadedPlugins();
 * ```
 */
export class AcApPluginManager {
  /** Map of loaded plugins by name */
  private _plugins: Map<string, AcApPlugin>
  /** The application context */
  private _context: AcApContext
  /** The command manager */
  private _commandManager: AcEdCommandStack

  /**
   * Creates a new plugin manager.
   *
   * @param context - The application context
   * @param commandManager - The command manager for plugin command registration
   */
  constructor(context: AcApContext, commandManager: AcEdCommandStack) {
    this._plugins = new Map()
    this._context = context
    this._commandManager = commandManager
  }

  /**
   * Loads a plugin and calls its `onLoad` hook.
   *
   * If the plugin is already loaded, this method will throw an error.
   * The plugin's `onLoad` method will be called with the context and command manager.
   *
   * @param plugin - The plugin instance to load
   * @throws {Error} If a plugin with the same name is already loaded
   *
   * @example
   * ```typescript
   * const plugin = new MyPlugin();
   * await pluginManager.loadPlugin(plugin);
   * ```
   */
  async loadPlugin(plugin: AcApPlugin): Promise<void> {
    const pluginName = plugin.name

    if (!pluginName) {
      throw new Error('[AcApPluginManager] Plugin name is required')
    }

    if (this._plugins.has(pluginName)) {
      throw new Error(
        `[AcApPluginManager] Plugin '${pluginName}' is already loaded`
      )
    }

    // Call onLoad hook
    try {
      await plugin.onLoad(this._context, this._commandManager)
    } catch (error) {
      throw new Error(
        `[AcApPluginManager] Failed to load plugin '${pluginName}': ${error}`
      )
    }

    // Store plugin
    this._plugins.set(pluginName, plugin)
  }

  /**
   * Unloads a plugin and calls its `onUnload` hook.
   *
   * This method will:
   * 1. Call the plugin's `onUnload` hook (plugins should clean up their commands here)
   * 2. Remove the plugin from the loaded plugins map
   *
   * @param pluginName - The name of the plugin to unload
   * @returns `true` if the plugin was successfully unloaded, `false` if it wasn't loaded
   *
   * @example
   * ```typescript
   * const success = await pluginManager.unloadPlugin('MyPlugin');
   * if (success) {
   *   console.log('Plugin unloaded successfully');
   * }
   * ```
   */
  async unloadPlugin(pluginName: string): Promise<boolean> {
    const plugin = this._plugins.get(pluginName)

    if (!plugin) {
      return false
    }

    try {
      // Call onUnload hook (plugin should clean up its commands here)
      await plugin.onUnload(this._context, this._commandManager)
    } catch (error) {
      console.error(
        `[AcApPluginManager] Error unloading plugin '${pluginName}':`,
        error
      )
    }

    // Remove plugin from map
    this._plugins.delete(pluginName)

    return true
  }

  /**
   * Checks if a plugin is currently loaded.
   *
   * @param pluginName - The name of the plugin to check
   * @returns `true` if the plugin is loaded, `false` otherwise
   */
  isPluginLoaded(pluginName: string): boolean {
    return this._plugins.has(pluginName)
  }

  /**
   * Gets information about a loaded plugin.
   *
   * @param pluginName - The name of the plugin
   * @returns The plugin instance if loaded, `undefined` otherwise
   */
  getPlugin(pluginName: string): AcApPlugin | undefined {
    return this._plugins.get(pluginName)
  }

  /**
   * Gets all currently loaded plugins.
   *
   * @returns Array of loaded plugin names
   */
  getLoadedPlugins(): string[] {
    return Array.from(this._plugins.keys())
  }

  /**
   * Unloads all currently loaded plugins.
   *
   * This method calls `unloadPlugin` for each loaded plugin.
   *
   * @example
   * ```typescript
   * await pluginManager.unloadAllPlugins();
   * ```
   */
  async unloadAllPlugins(): Promise<void> {
    const pluginNames = Array.from(this._plugins.keys())
    for (const pluginName of pluginNames) {
      await this.unloadPlugin(pluginName)
    }
  }

  /**
   * Loads multiple plugins from a configuration array.
   *
   * This method accepts an array of plugin instances or plugin factory functions.
   * Factory functions are useful when you want to create plugin instances lazily.
   *
   * @param plugins - Array of plugin instances or factory functions that return plugin instances
   * @param options - Optional configuration for loading behavior
   * @param options.continueOnError - If true, continue loading other plugins even if one fails (default: false)
   * @returns Promise that resolves to an object containing successful and failed plugin loads
   *
   * @example
   * ```typescript
   * // Load plugins from instances
   * await pluginManager.loadPluginsFromConfig([
   *   new MyPlugin1(),
   *   new MyPlugin2()
   * ]);
   *
   * // Load plugins from factory functions
   * await pluginManager.loadPluginsFromConfig([
   *   () => new MyPlugin1(),
   *   () => new MyPlugin2()
   * ]);
   *
   * // Continue loading even if some fail
   * const result = await pluginManager.loadPluginsFromConfig(
   *   [new Plugin1(), new Plugin2()],
   *   { continueOnError: true }
   * );
   * console.log('Loaded:', result.loaded);
   * console.log('Failed:', result.failed);
   * ```
   */
  async loadPluginsFromConfig(
    plugins: Array<AcApPlugin | (() => AcApPlugin)>,
    options?: { continueOnError?: boolean }
  ): Promise<{
    loaded: string[]
    failed: Array<{ name: string; error: Error }>
  }> {
    const continueOnError = options?.continueOnError ?? false
    const loaded: string[] = []
    const failed: Array<{ name: string; error: Error }> = []

    for (const pluginOrFactory of plugins) {
      try {
        // If it's a function, call it to get the plugin instance
        const plugin =
          typeof pluginOrFactory === 'function'
            ? pluginOrFactory()
            : pluginOrFactory

        await this.loadPlugin(plugin)
        loaded.push(plugin.name)
      } catch (error) {
        const pluginName =
          typeof pluginOrFactory === 'function'
            ? 'Unknown'
            : pluginOrFactory.name || 'Unknown'
        const err = error instanceof Error ? error : new Error(String(error))

        failed.push({ name: pluginName, error: err })

        if (!continueOnError) {
          throw err
        }
      }
    }

    return { loaded, failed }
  }

  /**
   * Loads plugins from a folder using dynamic imports.
   *
   * This method scans a folder for plugin files and dynamically imports them.
   * It expects each plugin file to export a default export that is either:
   * - A plugin instance
   * - A plugin class (constructor function)
   * - A factory function that returns a plugin instance
   *
   * @param folderPath - Path to the folder containing plugin files (relative to the base URL)
   * @param options - Optional configuration for loading behavior
   * @param options.pattern - Glob pattern to match plugin files (default: '*.js' or '*.ts')
   * @param options.continueOnError - If true, continue loading other plugins even if one fails (default: false)
   * @param options.pluginList - Optional array of specific plugin file names to load (if not provided, attempts to auto-discover)
   * @returns Promise that resolves to an object containing successful and failed plugin loads
   *
   * @example
   * ```typescript
   * // Load all plugins from a folder (requires plugin list or manifest)
   * await pluginManager.loadPluginsFromFolder('./plugins', {
   *   pluginList: ['MyPlugin1.js', 'MyPlugin2.js']
   * });
   *
   * // Or with continue on error
   * const result = await pluginManager.loadPluginsFromFolder('./plugins', {
   *   pluginList: ['Plugin1.js', 'Plugin2.js'],
   *   continueOnError: true
   * });
   * ```
   *
   * @remarks
   * In browser environments, you typically need to provide a list of plugin files
   * to load, as there's no direct way to list directory contents. You can:
   * 1. Provide a `pluginList` array with specific file names
   * 2. Create a manifest file that lists all plugins
   * 3. Use a build-time tool to generate the plugin list
   */
  async loadPluginsFromFolder(
    folderPath: string,
    options?: {
      pluginList?: string[]
      continueOnError?: boolean
    }
  ): Promise<{
    loaded: string[]
    failed: Array<{ name: string; error: Error }>
  }> {
    const continueOnError = options?.continueOnError ?? false
    const pluginList = options?.pluginList || []
    const loaded: string[] = []
    const failed: Array<{ name: string; error: Error }> = []

    if (pluginList.length === 0) {
      console.warn(
        '[AcApPluginManager] No plugin list provided. Cannot load plugins from folder without a list of files.'
      )
      return { loaded, failed }
    }

    // Normalize folder path (remove trailing slash, add leading ./ if needed)
    const normalizedPath = folderPath.replace(/\/$/, '')
    const basePath = normalizedPath.startsWith('./')
      ? normalizedPath
      : `./${normalizedPath}`

    for (const pluginFile of pluginList) {
      try {
        // Construct the import path
        const importPath = `${basePath}/${pluginFile.replace(/^\//, '')}`

        // Dynamically import the plugin module
        // @ts-expect-error - Dynamic imports are supported at runtime in modern environments
        const module = await import(/* @vite-ignore */ importPath)

        // Get the plugin from the module
        // Support: default export, named export 'Plugin', or named export matching filename
        let pluginExport = module.default

        // If no default export, try common named exports
        let className: string | undefined
        if (!pluginExport) {
          const fileName = pluginFile.replace(/\.(js|ts)$/, '')
          className = fileName
            .split(/[-_]/)
            .map(
              part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join('')
          pluginExport = module[className] || module.Plugin || module[fileName]
        }

        if (!pluginExport) {
          const exportName = className || 'Plugin'
          throw new Error(
            `No plugin export found in ${pluginFile}. Expected default export, or named export 'Plugin' or '${exportName}'.`
          )
        }

        // Create plugin instance if it's a class/constructor
        let plugin: AcApPlugin
        if (typeof pluginExport === 'function') {
          // Check if it's a class (has prototype) or factory function
          if (pluginExport.prototype && pluginExport.prototype.onLoad) {
            // It's a class, instantiate it
            plugin = new pluginExport()
          } else {
            // It's a factory function, call it
            plugin = pluginExport()
          }
        } else {
          // It's already an instance
          plugin = pluginExport
        }

        // Verify it's a valid plugin
        if (!plugin || typeof plugin.onLoad !== 'function') {
          throw new Error(
            `Invalid plugin in ${pluginFile}. Plugin must implement AcApPlugin interface.`
          )
        }

        await this.loadPlugin(plugin)
        loaded.push(plugin.name)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))

        failed.push({ name: pluginFile, error: err })

        if (!continueOnError) {
          throw err
        }
      }
    }

    return { loaded, failed }
  }
}
