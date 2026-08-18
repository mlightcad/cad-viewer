import type { AcTrView2d } from '../../view'
import { runMarkupEdit } from './AcApMarkupHistory'
import { getMarkupStore } from './AcApMarkupStore'

/**
 * Options for {@link bindMarkupInlineTextEdit}.
 */
export interface AcApMarkupInlineTextEditOptions {
  /** View used to commit the edit through markup history. */
  view: AcTrView2d
  /** Label element that becomes content-editable. */
  el: HTMLElement
  /**
   * Element that receives the double-click. Defaults to {@link el}.
   * Use the outer capsule / bubble so padding clicks also start editing.
   */
  listenOn?: HTMLElement
  /** Markup record whose `text` is updated. */
  recordId: string
  /**
   * When `true`, Shift+Enter inserts a newline; Enter still commits.
   * @defaultValue `false`
   */
  multiline?: boolean
}

/**
 * Options for {@link editMarkupHtmlText}.
 */
export interface AcApMarkupHtmlTextEditOptions {
  /** Label element that becomes content-editable. */
  el: HTMLElement
  /**
   * Element that receives pointer events while editing.
   * Defaults to {@link el}. Use the outer capsule so padding clicks stay in the editor.
   */
  listenOn?: HTMLElement
  /**
   * When `true`, Shift+Enter inserts a newline; Enter still commits.
   * @defaultValue `false`
   */
  multiline?: boolean
  /** Text shown when editing starts. Defaults to the element's current text. */
  initialText?: string
  /** When aborted, editing cancels and restores {@link initialText}. */
  signal?: AbortSignal
}

/** CSS class applied to the element while inline editing is active. */
const EDITING_CLASS = 'ml-html-text-editing'

/** DOM id of the injected stylesheet for inline text editing. */
const STYLE_ID = 'ml-markup-inline-text-edit-styles'

/** Max interval between two pointer-downs treated as a double-click. */
const DOUBLE_CLICK_MS = 400

/** Max pointer travel between those downs. */
const DOUBLE_CLICK_SLOP_PX = 6

const editingElements = new WeakSet<HTMLElement>()

/** Count of in-progress {@link editMarkupHtmlText} sessions. */
let editingCount = 0

/**
 * Whether a markup capsule / callout label is currently content-editable.
 *
 * View selection gestures check this so canvas clicks cannot pick CAD
 * entities while the user is typing in a capsule.
 */
export function isMarkupHtmlTextEditing(): boolean {
  return editingCount > 0
}

/**
 * Injects inline-edit CSS into `document.head` once.
 */
function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .ml-html-text-editing,
    .ml-html-text-editing:focus,
    .ml-html-selected.ml-html-text-editing {
      outline: none !important;
      outline-offset: 0;
      box-shadow: var(--ml-ui-shadow, 0 1px 4px rgba(0, 0, 0, 0.2));
      cursor: text !important;
      user-select: text;
      pointer-events: auto;
      min-height: 1.2em;
    }
  `
  document.head.appendChild(style)
}

/**
 * Selects the full text content of an element.
 *
 * @param el - Content-editable host.
 */
function selectAll(el: HTMLElement): void {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * Enables plaintext editing, falling back to `contenteditable="true"`.
 *
 * @param el - Element that will receive keyboard input.
 */
function enablePlaintext(el: HTMLElement): void {
  el.setAttribute('contenteditable', 'plaintext-only')
  if (el.contentEditable !== 'plaintext-only') {
    el.contentEditable = 'true'
  }
}

/**
 * Whether two pointer downs form a double-click (time + distance).
 *
 * Overlay click/drag handlers often call `preventDefault`, which makes
 * browsers omit the native `dblclick` event. Callers should use this
 * instead of waiting for `dblclick`.
 */
export function isMarkupDoublePointer(
  previous: { t: number; x: number; y: number } | undefined,
  next: { t: number; x: number; y: number }
): boolean {
  if (!previous) return false
  const dt = next.t - previous.t
  if (dt < 0 || dt > DOUBLE_CLICK_MS) return false
  const dx = next.x - previous.x
  const dy = next.y - previous.y
  return dx * dx + dy * dy <= DOUBLE_CLICK_SLOP_PX * DOUBLE_CLICK_SLOP_PX
}

/**
 * Makes a markup capsule / callout label content-editable until the user
 * commits or cancels.
 *
 * Enter (or blur) commits; Escape cancels and restores {@link AcApMarkupHtmlTextEditOptions.initialText}.
 * Shift+Enter inserts a newline when {@link AcApMarkupHtmlTextEditOptions.multiline} is true.
 *
 * @returns Trimmed text on commit, or `undefined` when the user presses Escape.
 */
export function editMarkupHtmlText(
  options: AcApMarkupHtmlTextEditOptions
): Promise<string | undefined> {
  ensureStyles()
  const { el, multiline = false } = options
  const listenOn = options.listenOn ?? el
  if (editingElements.has(el)) {
    return Promise.resolve(undefined)
  }
  if (options.signal?.aborted) {
    return Promise.resolve(undefined)
  }

  const original =
    options.initialText !== undefined
      ? options.initialText
      : (el.textContent ?? '').trim()

  return new Promise(resolve => {
    editingElements.add(el)
    editingCount += 1
    listenOn.style.pointerEvents = 'auto'
    el.style.pointerEvents = 'auto'
    el.textContent = original
    el.classList.add(EDITING_CLASS)
    listenOn.classList.add(EDITING_CLASS)
    el.tabIndex = 0
    enablePlaintext(el)

    let settled = false
    let suppressBlurUntil = performance.now() + 300

    const cleanup = () => {
      options.signal?.removeEventListener('abort', onAbort)
      el.classList.remove(EDITING_CLASS)
      listenOn.classList.remove(EDITING_CLASS)
      el.removeAttribute('contenteditable')
      el.removeAttribute('tabindex')
      listenOn.removeEventListener('pointerdown', onPointerDown, true)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('blur', onBlur)
      editingElements.delete(el)
      editingCount = Math.max(0, editingCount - 1)
    }

    const finish = (commit: boolean) => {
      if (settled) return
      settled = true
      const next = (el.textContent ?? '').trim()
      if (!commit) {
        el.textContent = original
        cleanup()
        resolve(undefined)
        return
      }
      el.textContent = next
      cleanup()
      resolve(next)
    }

    const onPointerDown = (e: PointerEvent) => {
      e.stopPropagation()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      e.stopPropagation()
      if (e.key === 'Escape') {
        e.preventDefault()
        finish(false)
        return
      }
      if (e.key === 'Enter' && (!multiline || !e.shiftKey)) {
        e.preventDefault()
        finish(true)
      }
    }

    const onBlur = () => {
      if (performance.now() < suppressBlurUntil) {
        el.focus()
        return
      }
      finish(true)
    }

    const onAbort = () => finish(false)

    listenOn.addEventListener('pointerdown', onPointerDown, true)
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('blur', onBlur)
    options.signal?.addEventListener('abort', onAbort)

    requestAnimationFrame(() => {
      if (settled) return
      suppressBlurUntil = performance.now() + 300
      el.focus()
      selectAll(el)
    })
  })
}

/**
 * Binds in-place text editing on a markup capsule or callout label.
 *
 * Starts on a timed double pointer-down (native `dblclick` is unreliable
 * on these overlays). Enter commits; Escape cancels. Shift+Enter inserts a
 * newline when {@link AcApMarkupInlineTextEditOptions.multiline} is true.
 *
 * @param options - Bind options.
 * @returns Function that cancels an in-progress edit and unbinds listeners.
 */
export function bindMarkupInlineTextEdit(
  options: AcApMarkupInlineTextEditOptions
): () => void {
  const { view, el, recordId, multiline = false } = options
  const listenOn = options.listenOn ?? el
  listenOn.style.pointerEvents = 'auto'
  el.style.pointerEvents = 'auto'
  let lastPointer: { t: number; x: number; y: number } | undefined
  let disposed = false
  let abort: AbortController | undefined

  const startEdit = () => {
    if (disposed || editingElements.has(el)) return
    const record = getMarkupStore().get(recordId)
    const original = (record?.text ?? el.textContent ?? '').trim()
    getMarkupStore().setSelectedId(recordId)
    view.htmlTransientManager.selectGroup(recordId)
    abort = new AbortController()
    void editMarkupHtmlText({
      el,
      listenOn,
      multiline,
      initialText: original,
      signal: abort.signal
    }).then(next => {
      abort = undefined
      if (disposed || next === undefined || next === original) return
      runMarkupEdit(view, 'Edit Markup Text', () => {
        getMarkupStore().updateMeta(recordId, { text: next })
      })
    })
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    if (editingElements.has(el)) return
    const next = { t: performance.now(), x: e.clientX, y: e.clientY }
    const isDouble = e.detail >= 2 || isMarkupDoublePointer(lastPointer, next)
    lastPointer = next
    if (!isDouble) return
    e.stopPropagation()
    startEdit()
  }

  const onDblClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startEdit()
  }

  listenOn.addEventListener('pointerdown', onPointerDown, true)
  listenOn.addEventListener('dblclick', onDblClick)
  return () => {
    disposed = true
    abort?.abort()
    listenOn.removeEventListener('pointerdown', onPointerDown, true)
    listenOn.removeEventListener('dblclick', onDblClick)
  }
}
