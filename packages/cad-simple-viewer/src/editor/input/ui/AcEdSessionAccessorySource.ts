import type { AcApContext } from '../../../app/AcApContext'
import type { AcEdSessionAccessory } from '../../command/AcEdSessionAccessory'

/** Desktop top-center slot vs mobile session panel. */
export type AcEdSessionAccessorySlot = 'desktop' | 'mobile'

/** Input for {@link AcEdSessionAccessorySource.resolve}. */
export interface AcEdSessionAccessoryResolveContext {
  /** Target mount slot for this refresh cycle. */
  slot: AcEdSessionAccessorySlot
  /** Current application context. */
  context: AcApContext
}

/**
 * Pluggable fallback resolver for {@link AcEdSessionAccessory} when the active
 * command does not provide one. Sources are consulted in registration order;
 * the first non-null result wins.
 *
 * Command lifecycle (start/end → mount `createSessionAccessory`) is owned by
 * {@link AcEdSessionAccessoryCoordinator}, not by sources.
 */
export interface AcEdSessionAccessorySource {
  /** Stable id for debugging and unregister bookkeeping. */
  readonly id: string
  /**
   * Subscribe to domain changes that affect this source's accessory
   * (selection, settings, and so on — not command lifecycle).
   *
   * @param onChange - Called when {@link AcEdSessionAccessoryCoordinator.refresh}
   *   should rerun.
   * @returns Function that removes this listener.
   */
  subscribe(onChange: () => void): () => void
  /**
   * Returns a fallback accessory for the given slot, or `null` to defer to the
   * next source in the chain.
   */
  resolve(
    input: AcEdSessionAccessoryResolveContext
  ): AcEdSessionAccessory | null
  /** Optional cleanup when the source is unregistered or coordinator disposes. */
  dispose?(): void
}
