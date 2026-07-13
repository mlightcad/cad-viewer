import { AcApPlugin } from './AcApPlugin'

/**
 * Descriptor for a plugin that is registered up front but loaded only when triggered.
 *
 * Register with {@link AcApPluginManager.registerLazyPlugin}. The plugin module is not
 * fetched until the user runs one of the {@link triggers} commands.
 *
 * @example
 * ```typescript
 * import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'
 *
 * registerLazyPdfPlugin(pluginManager)
 * ```
 */
export interface AcApLazyPluginRegistration {
  /** Unique plugin identifier; must match {@link AcApPlugin.name} returned by {@link loader}. */
  name: string
  /** Command names that load this plugin when executed (case-insensitive). */
  triggers: string[]
  /** Factory that creates the plugin instance when a trigger command runs. */
  loader: () => AcApPlugin | Promise<AcApPlugin>
}
