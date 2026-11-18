import type { AcApSmartBlockDetectOptions } from '@mlightcad/cad-simple-viewer'
import { reactive, readonly } from 'vue'

/** One detected group as the detection panel shows it. */
export interface MlBDetectGroup {
  /** Stable key of the group within one `BDETECT` run. */
  key: number
  instanceCount: number
  /** Objects per instance. */
  entityCount: number
  /** Objects a conversion removes. */
  savings: number
  /** Layers of the representative's objects. */
  layers: string[]
  /** Whether instances carry texts that differ (they become attributes). */
  hasVariableText: boolean
  /** PNG data URL of the representative, once captured. */
  thumbnail?: string
  /** Name of the block the group becomes. */
  name: string
  /** Converted by "Convert selected". */
  checked: boolean
}

/** Detection options shown and edited in the Detect and Convert panel. */
export type MlBDetectOptions = Required<
  Pick<
    AcApSmartBlockDetectOptions,
    | 'allowRotation'
    | 'allowMirror'
    | 'allowScale'
    | 'matchLayer'
    | 'textVariations'
    | 'minInstances'
    | 'minSavings'
    | 'maxEntities'
  >
>

/** Actions the detection panel sends to the running `BDETECT` command. */
export type MlBDetectAction =
  | { type: 'detect' }
  | { type: 'select'; key: number }
  | { type: 'review'; key: number }
  | { type: 'convert' }
  | { type: 'close' }

const defaultOptions = (): MlBDetectOptions => ({
  allowRotation: true,
  allowMirror: true,
  allowScale: false,
  matchLayer: true,
  textVariations: true,
  minInstances: 2,
  minSavings: 10,
  maxEntities: 64
})

const state = reactive({
  /**
   * `ready` before the first search (and after Stop), `detecting` while the
   * search runs, `list` while groups are shown, `reviewing` while one group
   * is reviewed with Search and Convert (the list stays visible but inactive).
   */
  phase: 'idle' as 'idle' | 'ready' | 'detecting' | 'list' | 'reviewing',
  /** Detection progress, `0` to `1`. */
  progress: 0,
  /** Groups found so far while detecting. */
  found: 0,
  groups: [] as MlBDetectGroup[],
  /** Key of the highlighted group, or `-1`. */
  selected: -1,
  /** Name validation messages per group key. */
  errors: {} as Record<number, string>,
  /** Thresholds and match filters for the next detection run. */
  options: defaultOptions()
})

let pendingAction: Promise<MlBDetectAction> | undefined
let resolveAction: ((action: MlBDetectAction) => void) | undefined
/** Latest panel action sent while the command is between prompt waits. */
let queuedAction: MlBDetectAction | undefined
let abortController: AbortController | undefined
/** Set when the palette requests Close so Stop and Close can be told apart. */
let closeRequested = false

/**
 * Opens the Detect and Convert panel in its ready state (options + Detect).
 * Does not start searching until the user clicks Detect.
 */
export function acuiOpenBDetect(
  options?: Partial<MlBDetectOptions>
): MlBDetectOptions {
  closeRequested = false
  abortController = undefined
  state.phase = 'ready'
  state.progress = 0
  state.found = 0
  state.groups = []
  state.selected = -1
  state.errors = {}
  state.options = { ...defaultOptions(), ...options }
  return state.options
}

/**
 * Starts a detection run (from ready or after Detect again).
 *
 * @returns Signal the panel's Stop button aborts.
 */
export function acuiBeginBDetect(): AbortSignal {
  closeRequested = false
  abortController = new AbortController()
  state.phase = 'detecting'
  state.progress = 0
  state.found = 0
  state.groups = []
  state.selected = -1
  state.errors = {}
  return abortController.signal
}

/** Whether Close was requested while a detection was aborting. */
export function acuiBDetectCloseRequested(): boolean {
  return closeRequested
}

/** Snapshot of the options the next detection should use. */
export function acuiBDetectOptions(): MlBDetectOptions {
  return { ...state.options }
}

/** Updates the detection progress. */
export function acuiSetBDetectProgress(fraction: number, found: number) {
  state.progress = fraction
  state.found = found
}

/** Shows the found groups. */
export function acuiShowBDetectGroups(groups: MlBDetectGroup[]) {
  state.groups = groups
  state.phase = 'list'
}

/**
 * Returns to the ready state after Stop (no partial results) so the user can
 * change options and run Detect again.
 */
export function acuiShowBDetectReady() {
  abortController = undefined
  state.phase = 'ready'
  state.progress = 0
  state.found = 0
  state.groups = []
  state.selected = -1
  state.errors = {}
}

/** Marks the list inactive while one group is reviewed. */
export function acuiSetBDetectReviewing(reviewing: boolean) {
  if (state.phase === 'idle' || state.phase === 'ready') return
  state.phase = reviewing ? 'reviewing' : 'list'
}

/** Sets the highlighted group. */
export function acuiSetBDetectSelected(key: number) {
  state.selected = key
}

/** Removes converted groups from the list. */
export function acuiRemoveBDetectGroups(keys: number[]) {
  const gone = new Set(keys)
  state.groups = state.groups.filter(g => !gone.has(g.key))
  if (gone.has(state.selected)) state.selected = -1
}

/** Shows (or clears with `undefined`) a name error on a group. */
export function acuiSetBDetectError(key: number, message?: string) {
  if (message) state.errors[key] = message
  else delete state.errors[key]
}

/** Stores a group's captured thumbnail. */
export function acuiSetBDetectThumbnail(key: number, thumbnail: string) {
  const group = state.groups.find(g => g.key === key)
  if (group) group.thumbnail = thumbnail
}

/** Ends the run: hides the panel and drops pending requests. */
export function acuiEndBDetect() {
  state.phase = 'idle'
  state.groups = []
  state.selected = -1
  state.errors = {}
  state.options = defaultOptions()
  pendingAction = undefined
  resolveAction = undefined
  queuedAction = undefined
  abortController = undefined
  closeRequested = false
}

/**
 * Ends the run as if Close was clicked (the palette was closed). Stops a
 * running detection too.
 */
export function acuiRequestBDetectClose() {
  if (state.phase === 'idle') return
  closeRequested = true
  abortController?.abort()
  deliverAction({ type: 'close' })
}

/**
 * Next panel action. The same promise is returned until an action arrives,
 * so a command can race it against a canvas prompt repeatedly. An action
 * sent while no waiter is active is kept and returned on the next call.
 */
export function acuiNextBDetectAction(): Promise<MlBDetectAction> {
  if (queuedAction !== undefined) {
    const action = queuedAction
    queuedAction = undefined
    return Promise.resolve(action)
  }
  if (!pendingAction) {
    pendingAction = new Promise(resolve => {
      resolveAction = action => {
        pendingAction = undefined
        resolveAction = undefined
        resolve(action)
      }
    })
  }
  return pendingAction
}

/** Delivers a panel action to a waiting command, or queues it until one waits. */
function deliverAction(action: MlBDetectAction) {
  if (resolveAction) resolveAction(action)
  else queuedAction = action
}

/** Current group list (mutable: names and check boxes are edited in place). */
export function acuiBDetectGroups(): MlBDetectGroup[] {
  return state.groups
}

/**
 * Detection panel access to the running `BDETECT` (Smart Blocks: Detect and
 * Convert).
 */
export function useBDetect() {
  const send = (action: MlBDetectAction) => {
    // Queue when the command is between waits (e.g. right after Detect
    // finishes) so Detect again / Convert / Close are not dropped.
    deliverAction(action)
  }
  const find = (key: number) => state.groups.find(g => g.key === key)
  const optionsEditable =
    () => state.phase === 'ready' || state.phase === 'list'
  return {
    state: readonly(state),
    detect: () => send({ type: 'detect' }),
    select: (key: number) => send({ type: 'select', key }),
    review: (key: number) => send({ type: 'review', key }),
    convert: () => send({ type: 'convert' }),
    close: () => send({ type: 'close' }),
    /** Stops a running detection. */
    stop: () => abortController?.abort(),
    setOptions: (patch: Partial<MlBDetectOptions>) => {
      if (!optionsEditable()) return
      const next = { ...state.options, ...patch }
      next.minInstances = Math.max(2, Math.floor(next.minInstances) || 2)
      next.minSavings = Math.max(0, Math.floor(next.minSavings) || 0)
      next.maxEntities = Math.max(2, Math.floor(next.maxEntities) || 2)
      state.options = next
    },
    setChecked: (key: number, checked: boolean) => {
      const group = find(key)
      if (group) group.checked = checked
    },
    setAllChecked: (checked: boolean) =>
      state.groups.forEach(g => (g.checked = checked)),
    rename: (key: number, name: string) => {
      const group = find(key)
      if (group) group.name = name
      delete state.errors[key]
    }
  }
}
