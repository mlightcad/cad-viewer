/**
 * Hand-maintained public API types for `@mlightcad/cad-script-plugin`.
 *
 * Copied to `lib/` by `pnpm build:types`. Keep in sync with `src/index.ts`.
 */
import type { AcApPlugin } from '@mlightcad/cad-simple-viewer'
import type { DefineComponent } from 'vue'

export declare function createCadScriptPlugin(): Promise<AcApPlugin>

/** Manual CAD script console. Runs a script against the active drawing. */
export declare const CadScriptPanel: DefineComponent<object, object, unknown>
