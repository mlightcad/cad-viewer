/**
 * Hand-maintained public API types for `@mlightcad/cad-agent-plugin`.
 *
 * Emitted to `lib/` by `pnpm build:types` (see `scripts/copy-typings.mjs`).
 * Keep in sync with `src/index.ts` exports.
 */
import type { AcApPlugin } from '@mlightcad/cad-simple-viewer'
import type { DefineComponent } from 'vue'

export declare function createAgentPlugin(): Promise<AcApPlugin>

export declare const AgentChatPanel: DefineComponent<object, object, unknown>
