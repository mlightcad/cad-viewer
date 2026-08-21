import type { AcApMarkupHistory } from './AcApMarkupHistory'
import type { AcApMarkupPresenter } from './AcApMarkupPresenter'
import type { AcApMarkupStore } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'

/** Per-document markup bags (store + presenter + history). */
export interface AcApMarkupSessionBag {
  /** Markup records for this session. */
  store: AcApMarkupStore
  /** Overlay visuals for this session. */
  presenter: AcApMarkupPresenter
  /** Undo/redo stack for this session. */
  history: AcApMarkupHistory
}

/** Factory that builds a fresh {@link AcApMarkupSessionBag}. */
type BagFactory = () => AcApMarkupSessionBag

/** Bags keyed by {@link AcApDocSession.id}. */
const bags = new Map<string, AcApMarkupSessionBag>()
/** Session currently receiving markup commands. */
let activeSessionId: string | undefined
/** Installed by {@link acapSetMarkupBagFactory}. */
let bagFactory: BagFactory | undefined
/** Fallback bag used before any session is bound. */
let fallbackBag: AcApMarkupSessionBag | undefined

/**
 * Installs the factory used to create per-session markup bags.
 * Called once from the markup module bootstrap to avoid circular imports.
 *
 * @param factory - Creates a store + presenter + history bag.
 */
export function acapSetMarkupBagFactory(factory: BagFactory): void {
  bagFactory = factory
}

/**
 * Returns the bag for `sessionId`, creating it (or the process fallback) as needed.
 *
 * @param sessionId - Document session id, or omitted for the unbound fallback.
 */
function ensureBag(sessionId?: string): AcApMarkupSessionBag {
  if (!bagFactory) {
    throw new Error('Markup session bag factory is not installed')
  }
  if (!sessionId) {
    if (!fallbackBag) fallbackBag = bagFactory()
    return fallbackBag
  }
  let bag = bags.get(sessionId)
  if (!bag) {
    bag = bagFactory()
    bags.set(sessionId, bag)
  }
  return bag
}

/** Returns the bag for the active session (or a process fallback). */
export function getActiveMarkupBag(): AcApMarkupSessionBag {
  return ensureBag(activeSessionId)
}

/**
 * Binds markup APIs to a document session id.
 *
 * @param sessionId - {@link AcApDocSession.id} of the active document.
 */
export function acapBindMarkupSession(sessionId: string): void {
  activeSessionId = sessionId
  ensureBag(sessionId)
}

/** Returns the currently bound session id, if any. */
export function acapActiveMarkupSessionId(): string | undefined {
  return activeSessionId
}

/**
 * Disposes markup state for a closed document session.
 *
 * @param sessionId - Session whose bag should be dropped.
 */
export function acapDisposeMarkupSession(sessionId: string): void {
  bags.delete(sessionId)
  if (activeSessionId === sessionId) {
    activeSessionId = undefined
  }
}

/**
 * Lists markup records for a session without activating it.
 *
 * @param sessionId - Session to inspect.
 */
export function listMarkupsForSession(sessionId: string): AcApMarkupRecord[] {
  return bags.get(sessionId)?.store.list() ?? []
}

/**
 * Returns the store for a session without activating it.
 *
 * @param sessionId - Session to inspect.
 */
export function getMarkupStoreForSession(
  sessionId: string
): AcApMarkupStore | undefined {
  return bags.get(sessionId)?.store
}
