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

/** CSS class applied to the element while inline editing is active. */
const EDITING_CLASS = 'ml-html-text-editing'

/** DOM id of the injected stylesheet for inline text editing. */
const STYLE_ID = 'ml-markup-inline-text-edit-styles'

/** Max interval between two pointer-downs treated as a double-click. */
const DOUBLE_CLICK_MS = 400

/** Max pointer travel between those downs. */
const DOUBLE_CLICK_SLOP_PX = 6

/**
 * Injects inline-edit CSS into `document.head` once.
 */
function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .ml-html-text-editing {
      outline: 1px solid var(--ml-ui-accent, #409eff);
      outline-offset: 1px;
      cursor: text !important;
      user-select: text;
      pointer-events: auto;
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
  ensureStyles()
  const { view, el, recordId, multiline = false } = options
  const listenOn = options.listenOn ?? el
  listenOn.style.pointerEvents = 'auto'
  el.style.pointerEvents = 'auto'
  let editing = false
  let original = ''
  let suppressBlurUntil = 0
  let lastPointer: { t: number; x: number; y: number } | undefined

  const finish = (commit: boolean) => {
    if (!editing) return
    editing = false
    el.classList.remove(EDITING_CLASS)
    el.removeAttribute('contenteditable')
    el.removeAttribute('tabindex')
    const next = (el.textContent ?? '').trim()
    if (!commit || next === original) {
      el.textContent = original
      return
    }
    runMarkupEdit(view, 'Edit Markup Text', () => {
      getMarkupStore().updateMeta(recordId, { text: next })
    })
    el.textContent = next
  }

  const startEdit = () => {
    if (editing) return
    const record = getMarkupStore().get(recordId)
    original = (record?.text ?? el.textContent ?? '').trim()
    el.textContent = original
    editing = true
    suppressBlurUntil = performance.now() + 300
    el.classList.add(EDITING_CLASS)
    el.tabIndex = 0
    enablePlaintext(el)
    getMarkupStore().setSelectedId(recordId)
    view.htmlTransientManager.selectGroup(recordId)
    el.focus()
    selectAll(el)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    if (editing) return
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

  const onKeyDown = (e: KeyboardEvent) => {
    if (!editing) return
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

  listenOn.addEventListener('pointerdown', onPointerDown, true)
  listenOn.addEventListener('dblclick', onDblClick)
  el.addEventListener('keydown', onKeyDown)
  el.addEventListener('blur', onBlur)
  return () => {
    finish(false)
    listenOn.removeEventListener('pointerdown', onPointerDown, true)
    listenOn.removeEventListener('dblclick', onDblClick)
    el.removeEventListener('keydown', onKeyDown)
    el.removeEventListener('blur', onBlur)
  }
}
