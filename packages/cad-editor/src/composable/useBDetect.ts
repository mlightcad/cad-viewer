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

/** Actions the detection panel sends to the running `BDETECT` command. */
export type MlBDetectAction =
  | { type: 'select'; key: number }
  | { type: 'review'; key: number }
  | { type: 'convert' }
  | { type: 'close' }

const state = reactive({
  /**
   * `detecting` while the search runs, `list` while groups are shown,
   * `reviewing` while one group is reviewed with the Search and Convert
   * toolbar (the list stays visible but inactive).
   */
  phase: 'idle' as 'idle' | 'detecting' | 'list' | 'reviewing',
  /** Detection progress, `0` to `1`. */
  progress: 0,
  /** Groups found so far while detecting. */
  found: 0,
  groups: [] as MlBDetectGroup[],
  /** Key of the highlighted group, or `-1`. */
  selected: -1,
  /** Name validation messages per group key. */
  errors: {} as Record<number, string>
})

let pendingAction: Promise<MlBDetectAction> | undefined
let resolveAction: ((action: MlBDetectAction) => void) | undefined
let abortController: AbortController | undefined

/**
 * Shows the panel in its detecting state.
 *
 * @returns Signal the panel's Stop button aborts.
 */
export function acuiBeginBDetect(): AbortSignal {
  abortController = new AbortController()
  state.phase = 'detecting'
  state.progress = 0
  state.found = 0
  state.groups = []
  state.selected = -1
  state.errors = {}
  return abortController.signal
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

/** Marks the list inactive while one group is reviewed. */
export function acuiSetBDetectReviewing(reviewing: boolean) {
  if (state.phase === 'idle') return
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
  pendingAction = undefined
  resolveAction = undefined
  abortController = undefined
}

/**
 * Ends the run as if Close was clicked (the palette was closed). Stops a
 * running detection too.
 */
export function acuiRequestBDetectClose() {
  if (state.phase === 'idle') return
  abortController?.abort()
  if (!resolveAction) void acuiNextBDetectAction()
  resolveAction?.({ type: 'close' })
}

/**
 * Next panel action. The same promise is returned until an action arrives,
 * so a command can race it against a canvas prompt repeatedly.
 */
export function acuiNextBDetectAction(): Promise<MlBDetectAction> {
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
    // Create the promise on demand so an action sent while the command is
    // between prompts is not lost.
    if (!resolveAction) void acuiNextBDetectAction()
    resolveAction?.(action)
  }
  const find = (key: number) => state.groups.find(g => g.key === key)
  return {
    state: readonly(state),
    select: (key: number) => send({ type: 'select', key }),
    review: (key: number) => send({ type: 'review', key }),
    convert: () => send({ type: 'convert' }),
    close: () => send({ type: 'close' }),
    /** Stops a running detection. */
    stop: () => abortController?.abort(),
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
