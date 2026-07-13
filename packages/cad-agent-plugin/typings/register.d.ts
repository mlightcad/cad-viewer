/**
 * Public API types for `@mlightcad/cad-agent-plugin/register`.
 * Copied to `lib/` by `pnpm build:types`; keep in sync with `src/register.ts`.
 */
import type {
  AcApLocale,
  AcApPluginManager
} from '@mlightcad/cad-simple-viewer'

/** Registered name of the CAD Agent plugin in the plugin manager. */
export declare const AGENT_PLUGIN_NAME: 'AgentPlugin'

/** Trigger commands handled by {@link AGENT_PLUGIN_NAME}. */
export declare const AGENT_PLUGIN_TRIGGERS: readonly ['agent']

/**
 * Registers the CAD Agent plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-agent-plugin/register` so the main bundle
 * is not pulled into the application entry chunk.
 */
export declare function registerLazyAgentPlugin(
  pluginManager: AcApPluginManager
): void

export declare function registerAgentI18n(): void

/**
 * Merges agent UI strings into a vue-i18n instance (e.g. cad-viewer).
 */
export declare function mergeAgentI18nIntoVueI18n(
  mergeLocaleMessage: (locale: AcApLocale, message: object) => void
): void

/** Callback that opens or focuses the agent tab in the host tool palette. */
export type AgentPaletteOpener = () => void

export declare function setAgentPaletteOpener(
  opener: AgentPaletteOpener | undefined
): void

export declare function openAgentPalette(): boolean
