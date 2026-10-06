/**
 * Shared overlay grip helpers for the offline HTML viewer.
 *
 * Markup / measure endpoint circles use the original colored-dot look and
 * are hidden until the overlay is selected.
 */

/** Class identifying an overlay endpoint grip (markup or measure). */
export const ACEX_OVERLAY_GRIP_CLASS = 'ml-html-grip'

/** Toggled on overlay layers while a grip drag is in progress. */
export const ACEX_OVERLAY_GRIP_DRAGGING_CLASS = 'mlcad-grip-dragging'

const MARKUP_DOT = 'mlcad-markup-dot'
const MEASURE_DOT = 'mlcad-measure-dot'

/** True when `el` is a committed markup / measure endpoint grip. */
export function acexIsOverlayGrip(el: Element | null | undefined): boolean {
  if (!el) return false
  return (
    el.classList.contains(MARKUP_DOT) ||
    el.classList.contains(MEASURE_DOT) ||
    el.classList.contains(ACEX_OVERLAY_GRIP_CLASS)
  )
}

/** True when the grip belongs to a currently selected overlay. */
export function acexIsOverlayGripSelected(el: HTMLElement): boolean {
  return (
    el.classList.contains('mlcad-markup-selected') ||
    el.classList.contains('mlcad-measure-selected')
  )
}

/**
 * Hide or restore every overlay endpoint grip (entity-grip drag behavior).
 */
export function acexSetOverlayGripsDragging(dragging: boolean): void {
  document
    .getElementById('mlcad-markup-overlays')
    ?.classList.toggle(ACEX_OVERLAY_GRIP_DRAGGING_CLASS, dragging)
  document
    .getElementById('mlcad-measure-overlays')
    ?.classList.toggle(ACEX_OVERLAY_GRIP_DRAGGING_CLASS, dragging)
}

/** CSS class list for a committed overlay endpoint circle. */
export function acexOverlayGripClassName(kind: 'markup' | 'measure'): string {
  const kindClass = kind === 'markup' ? MARKUP_DOT : MEASURE_DOT
  return `${kindClass} ${ACEX_OVERLAY_GRIP_CLASS}`
}
