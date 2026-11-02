function asHtmlElement(target: EventTarget | null): HTMLElement | null {
  // Guarded so headless (non-DOM) callers can still classify key events.
  if (typeof HTMLElement === 'undefined') return null
  return target instanceof HTMLElement ? target : null
}

/**
 * Whether a key event target takes typed text itself (inputs, text areas,
 * selects and contenteditable regions).
 *
 * @param target - Event target or focused element to test
 * @returns `true` when keys pressed on the target belong to that element
 */
export function acedIsTextEntryTarget(target: EventTarget | null): boolean {
  const el = asHtmlElement(target)
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return el.isContentEditable
}

/**
 * Whether Space pressed on the target is reserved by the browser for
 * activating a control (button, link, checkbox, ...).
 *
 * @param target - Event target or focused element to test
 * @returns `true` when Space should be left to the target
 */
export function acedIsSpaceActivatedTarget(
  target: EventTarget | null
): boolean {
  const el = asHtmlElement(target)
  if (!el) return false
  if (acedIsTextEntryTarget(el)) return true
  return (
    el.closest(
      'button, a[href], summary, [role="button"], [role="checkbox"], ' +
        '[role="menuitem"], [role="option"], [role="radio"], [role="switch"], ' +
        '[role="tab"]'
    ) != null
  )
}

/**
 * Whether a key confirms the current prompt the way Enter does.
 *
 * AutoCAD treats Space as Enter while picking on the canvas, so Space counts
 * as a confirm key unless a modifier is held, an IME is composing, or the
 * target needs Space for its own text entry or activation.
 *
 * @param e - Keyboard event to classify
 * @returns `true` for Enter, and for Space outside text entry and controls
 */
export function acedIsConfirmKey(
  e: Pick<
    KeyboardEvent,
    'key' | 'target' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing'
  >
): boolean {
  if (e.key === 'Enter') return true
  if (e.key !== ' ') return false
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false
  return !acedIsSpaceActivatedTarget(e.target)
}
