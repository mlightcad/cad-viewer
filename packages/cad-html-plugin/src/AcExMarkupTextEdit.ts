/**
 * In-place contenteditable text editing for markup capsules in the offline HTML viewer.
 *
 * Mirrors `@mlightcad/cad-simple-viewer` {@link editMarkupHtmlText} semantics:
 * Enter / blur commits; Escape cancels; Shift+Enter inserts a newline when multiline.
 *
 * @module AcExMarkupTextEdit
 * @packageDocumentation
 */

/** Options for {@link editAcExMarkupHtmlText}. */
export interface AcExMarkupHtmlTextEditOptions {
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
const EDITING_CLASS = 'mlcad-markup-text-editing'

/** DOM id of the injected stylesheet for inline text editing. */
const STYLE_ID = 'mlcad-markup-inline-text-edit-styles'

const editingElements = new WeakSet<HTMLElement>()

/** Count of in-progress {@link editAcExMarkupHtmlText} sessions. */
let editingCount = 0

/**
 * Whether a markup capsule is currently content-editable.
 * Canvas gestures should ignore Escape / pick while this is true.
 */
export function isAcExMarkupHtmlTextEditing(): boolean {
  return editingCount > 0
}

/** Max interval between two pointer-downs treated as a double-click. */
const DOUBLE_CLICK_MS = 400

/** Max pointer travel between those downs. */
const DOUBLE_CLICK_SLOP_PX = 6

/**
 * Whether two pointer downs form a double-click (time + distance).
 * Overlay handlers often preventDefault, so native `dblclick` is unreliable.
 */
export function isAcExMarkupDoublePointer(
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
function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .mlcad-markup-text-editing,
    .mlcad-markup-text-editing:focus,
    .mlcad-markup-selected.mlcad-markup-text-editing {
      outline: none !important;
      outline-offset: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      cursor: text !important;
      user-select: text;
      pointer-events: auto;
      min-width: 80px;
      min-height: 1.75em;
      white-space: pre-wrap;
    }
  `
  document.head.appendChild(style)
}

/** Selects the full text content of an element. */
function selectAll(el: HTMLElement): void {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}

/** Enables plaintext editing, falling back to `contenteditable="true"`. */
function enablePlaintext(el: HTMLElement): void {
  el.setAttribute('contenteditable', 'plaintext-only')
  if (el.contentEditable !== 'plaintext-only') {
    el.contentEditable = 'true'
  }
}

/**
 * Makes a markup capsule content-editable until the user commits or cancels.
 *
 * @returns Trimmed text on commit, or `undefined` when the user presses Escape.
 */
export function editAcExMarkupHtmlText(
  options: AcExMarkupHtmlTextEditOptions
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
    el.tabIndex = 0
    enablePlaintext(el)

    let settled = false
    let suppressBlurUntil = performance.now() + 300

    const cleanup = () => {
      options.signal?.removeEventListener('abort', onAbort)
      el.classList.remove(EDITING_CLASS)
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
