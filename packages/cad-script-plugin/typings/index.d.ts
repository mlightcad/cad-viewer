/**
 * Hand-maintained public API types for `@mlightcad/cad-script-plugin`.
 *
 * Copied to `lib/` by `pnpm build:types`. Keep in sync with `src/index.ts`.
 */
import type { AcApPlugin } from '@mlightcad/cad-simple-viewer'

export declare function createCadScriptPlugin(): Promise<AcApPlugin>

/**
 * Manual CAD script console. Runs a script against the active drawing.
 *
 * Append {@link element} into a dock or palette tab. Call {@link destroy}
 * when the host removes that tab.
 */
export declare class CadScriptPanel {
  /** Root element that fills the host tab. */
  readonly element: HTMLElement
  constructor()
  /** Removes listeners and the root element. */
  destroy(): void
}
