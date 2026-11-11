import type {
  AcApSmartBlockSearch,
  AcApSmartBlockSearchOptions,
  AcEdAffine2d
} from '@mlightcad/cad-simple-viewer'
import { reactive, readonly } from 'vue'

/** Actions the Search and Convert palette sends to the running `BSEARCH`. */
export type MlBSearchAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'toggleCurrent' }
  /** Makes instance `index` current and zooms to it. */
  | { type: 'select'; index: number }
  | { type: 'setIncluded'; index: number; included: boolean }
  | { type: 'setAllIncluded'; included: boolean }
  | { type: 'options'; options: Partial<AcApSmartBlockSearchOptions> }
  | { type: 'convert' }
  | { type: 'cancel' }

/** One found instance as the palette list shows it. */
export interface MlBSearchMatchRow {
  /** Zero-based index into the search's matches. */
  index: number
  included: boolean
  /** Rotation in degrees, `[0, 360)`, rounded to 0.1. */
  rotation: number
  mirrored: boolean
  /** Uniform scale, rounded to 3 decimals. */
  scale: number
  /** The instance is an existing block reference. */
  blockReference: boolean
  /** Text strings of the instance, in template order. */
  texts: string[]
}

/** One varying template text that can become an attribute. */
export interface MlBSearchAttributeRow {
  /** Template feature index. */
  index: number
  /** Text of the selected source. */
  sample: string
  /** A few other strings found in the instances. */
  variants: string[]
  tag: string
  prompt: string
}

/** A block definition that already holds the searched geometry. */
export interface MlBSearchEquivalentBlock {
  blockName: string
  transform: AcEdAffine2d
}

/** Editable state of the Convert to Block dialog. */
export interface MlBConvertDraft {
  target: 'new' | 'existing'
  name: string
  basePoint: { x: number; y: number }
  existingBlock: string
  /** Degrees; used for existing blocks without an equivalent definition. */
  rotation: number
  scale: number
  sourceOnly: boolean
  attributes: MlBSearchAttributeRow[]
}

/** What the Convert dialog hands back to the command. */
export type MlBConvertResult =
  | { type: 'ok' }
  | { type: 'pickBasePoint' }
  | { type: 'cancel' }

const state = reactive({
  /** True while a `BSEARCH` review is running. */
  active: false,
  total: 0,
  included: 0,
  /** Zero-based index of the reviewed instance, `-1` before navigation. */
  current: -1,
  currentIncluded: false,
  options: {} as AcApSmartBlockSearchOptions,
  /** Selection contains text, so the text-variation filter applies. */
  hasText: false,
  /** Objects in the selected source. */
  sourceCount: 0,
  /** PNG data URL of the selected source, once captured. */
  thumbnail: '',
  /** Found instances in list order. */
  matches: [] as MlBSearchMatchRow[],
  /** Dialog inputs; filled by the command before the dialog opens. */
  draft: {
    target: 'new',
    name: '',
    basePoint: { x: 0, y: 0 },
    existingBlock: '',
    rotation: 0,
    scale: 1,
    sourceOnly: false,
    attributes: []
  } as MlBConvertDraft,
  /** Existing user blocks offered by the dialog. */
  blockNames: [] as string[],
  /** Blocks whose definition is the searched geometry. */
  equivalentBlocks: [] as MlBSearchEquivalentBlock[],
  /** Center of the selected geometry (default insertion point). */
  defaultBasePoint: { x: 0, y: 0 }
})

let pendingAction: Promise<MlBSearchAction> | undefined
let resolveAction: ((action: MlBSearchAction) => void) | undefined
let resolveDialog: ((result: MlBConvertResult) => void) | undefined
let unsubscribe: (() => void) | undefined

function syncFrom(search: AcApSmartBlockSearch) {
  state.total = search.matches.length
  state.included = search.includedCount
  state.current = search.current
  state.currentIncluded = search.matches[search.current]?.included ?? false
  state.options = { ...search.options }
  state.matches = search.matches.map((match, index) => {
    const degrees = (((match.rotation * 180) / Math.PI) % 360) + 360
    const rotation = Math.round((degrees % 360) * 10) / 10
    return {
      index,
      included: match.included,
      rotation: rotation >= 360 ? 0 : rotation,
      mirrored: match.mirrored,
      scale: Math.round(match.scale * 1000) / 1000,
      blockReference: !!match.blockReference,
      texts: match.texts.filter((text): text is string => text !== undefined)
    }
  })
}

/**
 * Starts mirroring `search` into the reactive review state.
 *
 * @param search - Session owned by the running `BSEARCH` command.
 */
export function acuiBeginBSearch(search: AcApSmartBlockSearch) {
  unsubscribe?.()
  state.active = true
  state.hasText = search.template.texts.some(text => text !== undefined)
  state.sourceCount = search.template.ids.length
  state.thumbnail = ''
  syncFrom(search)
  unsubscribe = search.onChange(() => syncFrom(search))
}

/** Stores the captured preview of the selected source. */
export function acuiSetBSearchThumbnail(thumbnail: string) {
  state.thumbnail = thumbnail
}

/** Ends the review: hides the palette and drops pending requests. */
export function acuiEndBSearch() {
  unsubscribe?.()
  unsubscribe = undefined
  state.active = false
  state.matches = []
  state.thumbnail = ''
  pendingAction = undefined
  resolveAction = undefined
  resolveDialog?.({ type: 'cancel' })
  resolveDialog = undefined
}

/**
 * Next palette action. The same promise is returned until an action
 * arrives, so a command can race it against a canvas prompt repeatedly.
 */
export function acuiNextBSearchAction(): Promise<MlBSearchAction> {
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

/**
 * Waits for the Convert dialog's answer. The caller opens the dialog.
 */
export function acuiWaitBConvertDialog(): Promise<MlBConvertResult> {
  resolveDialog?.({ type: 'cancel' })
  return new Promise(resolve => {
    resolveDialog = result => {
      resolveDialog = undefined
      resolve(result)
    }
  })
}

/** Fills the dialog state (blocks, defaults) before it opens. */
export function acuiPrepareBConvertDialog(data: {
  draft: MlBConvertDraft
  blockNames: string[]
  equivalentBlocks: MlBSearchEquivalentBlock[]
  defaultBasePoint: { x: number; y: number }
}) {
  // Keep the draft object stable: the dialog form binds to it.
  Object.assign(state.draft, data.draft)
  state.blockNames = data.blockNames
  state.equivalentBlocks = data.equivalentBlocks
  state.defaultBasePoint = data.defaultBasePoint
}

/**
 * Ends the review as if Cancel was clicked (the palette was closed).
 */
export function acuiRequestBSearchCancel() {
  if (!state.active) return
  if (!resolveAction) void acuiNextBSearchAction()
  resolveAction?.({ type: 'cancel' })
}

/**
 * Search and Convert palette and Convert dialog access to the running
 * `BSEARCH`.
 */
export function useBSearch() {
  const send = (action: MlBSearchAction) => {
    // Create the promise on demand so an action sent while the command is
    // between prompts is not lost.
    if (!resolveAction) void acuiNextBSearchAction()
    resolveAction?.(action)
  }
  return {
    state: readonly(state),
    /** Mutable dialog draft (bound to the dialog's form). */
    draft: state.draft,
    next: () => send({ type: 'next' }),
    prev: () => send({ type: 'prev' }),
    toggleCurrent: () => send({ type: 'toggleCurrent' }),
    select: (index: number) => send({ type: 'select', index }),
    setIncluded: (index: number, included: boolean) =>
      send({ type: 'setIncluded', index, included }),
    setAllIncluded: (included: boolean) =>
      send({ type: 'setAllIncluded', included }),
    setOptions: (options: Partial<AcApSmartBlockSearchOptions>) =>
      send({ type: 'options', options }),
    convert: () => send({ type: 'convert' }),
    cancel: () => send({ type: 'cancel' }),
    /** Answers the Convert dialog. */
    finishDialog: (result: MlBConvertResult) => resolveDialog?.(result)
  }
}
