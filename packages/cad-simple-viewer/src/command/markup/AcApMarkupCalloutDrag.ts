/**
 * Pointer-drag grips for callout tip / text bubble on committed markups.
 */

import type { AcTrHtmlElement, AcTrHtmlGroup } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../view'
import {
  type AcApMarkupShapeOutline,
  computeLeaderTipOnShape} from './AcApMarkupShapeCallout'
import type { AcApMarkupPoint2d } from './AcApMarkupTypes'

export interface AcApMarkupCalloutGripState {
  tip: AcApMarkupPoint2d
  anchor: AcApMarkupPoint2d
}

/**
 * Wire drag handles on callout tip + bubble.
 * - Bubble: free move of text location
 * - Tip: free move for standalone callouts; constrained to {@link outline}
 *   for shape-attached callouts (cloud / rect / circle)
 *
 * Hover + drag works without selecting the markup first. Drag start optionally
 * selects the group for visual feedback via {@link onDragStart}.
 */
export function bindMarkupCalloutGrips(options: {
  view: AcTrView2d
  group: AcTrHtmlGroup
  tipEl: AcTrHtmlElement
  bubbleEl: AcTrHtmlElement
  state: AcApMarkupCalloutGripState
  outline?: AcApMarkupShapeOutline
  onDragStart?: () => void
  onLiveChange: () => void
  onCommit: (next: AcApMarkupCalloutGripState) => void
}): () => void {
  const {
    view,
    tipEl,
    bubbleEl,
    state,
    outline,
    onDragStart,
    onLiveChange,
    onCommit
  } = options

  tipEl.element.style.pointerEvents = 'auto'
  tipEl.element.style.cursor = 'grab'
  tipEl.element.style.width = '14px'
  tipEl.element.style.height = '14px'
  bubbleEl.element.style.pointerEvents = 'auto'
  bubbleEl.element.style.cursor = 'grab'

  const cleanups: Array<() => void> = []

  const bindHandle = (el: HTMLElement, kind: 'tip' | 'anchor') => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      onDragStart?.()
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'

      const onPointerMove = (ev: PointerEvent) => {
        const canvas = view.viewportToCanvas({
          x: ev.clientX,
          y: ev.clientY
        })
        const world = view.screenToWorld(canvas)
        const point = { x: world.x, y: world.y }
        if (kind === 'tip') {
          state.tip = outline
            ? computeLeaderTipOnShape(outline, point)
            : point
          tipEl.setPosition(state.tip)
        } else {
          state.anchor = point
          bubbleEl.setPosition(state.anchor)
        }
        onLiveChange()
        view.isDirty = true
      }

      const onPointerUp = (ev: PointerEvent) => {
        el.releasePointerCapture(ev.pointerId)
        el.style.cursor = 'grab'
        el.removeEventListener('pointermove', onPointerMove)
        el.removeEventListener('pointerup', onPointerUp)
        el.removeEventListener('pointercancel', onPointerUp)
        onCommit({ tip: { ...state.tip }, anchor: { ...state.anchor } })
      }

      el.addEventListener('pointermove', onPointerMove)
      el.addEventListener('pointerup', onPointerUp)
      el.addEventListener('pointercancel', onPointerUp)
    }

    el.addEventListener('pointerdown', onPointerDown)
    cleanups.push(() => el.removeEventListener('pointerdown', onPointerDown))
  }

  bindHandle(tipEl.element, 'tip')
  bindHandle(bubbleEl.element, 'anchor')

  return () => {
    for (const fn of cleanups) fn()
  }
}
