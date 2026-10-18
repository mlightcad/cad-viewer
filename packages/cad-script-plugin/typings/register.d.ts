/**
 * Public API types for `@mlightcad/cad-script-plugin/register`.
 * Copied to `lib/` by `pnpm build:types`; keep in sync with `src/register.ts`.
 */
import type {
  AcApLocale,
  AcApPluginManager
} from '@mlightcad/cad-simple-viewer'

/** Registered name of the CAD script plugin in the plugin manager. */
export declare const CAD_SCRIPT_PLUGIN_NAME: 'CadScriptPlugin'

/** Trigger commands handled by {@link CAD_SCRIPT_PLUGIN_NAME}. */
export declare const CAD_SCRIPT_PLUGIN_TRIGGERS: readonly ['cadscript']

/**
 * Registers the CAD script plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-script-plugin/register` so the main bundle
 * is not pulled into the application entry chunk.
 */
export declare function registerLazyCadScriptPlugin(
  pluginManager: AcApPluginManager
): void

export declare function registerScriptI18n(): void

/**
 * Merges script-console strings into a vue-i18n instance (e.g. cad-viewer).
 */
export declare function mergeScriptI18nIntoVueI18n(
  mergeLocaleMessage: (locale: AcApLocale, message: object) => void
): void

/** Translates one script-console label. */
export declare function scriptT(key: string): string

/** Callback that opens or focuses the script console in the host UI. */
export type CadScriptPaletteOpener = () => void

export declare function setCadScriptPaletteOpener(
  opener: CadScriptPaletteOpener | undefined
): void

export declare function openCadScriptPalette(): boolean
