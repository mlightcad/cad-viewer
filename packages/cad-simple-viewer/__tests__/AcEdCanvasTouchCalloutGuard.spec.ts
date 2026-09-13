/**
 * @jest-environment jsdom
 */

import {
  acedApplyCanvasTouchCalloutStyles,
  acedClearDomSelection,
  acedGuardCanvasTouchCallout
} from '../src/editor/input/ui/AcEdCanvasTouchCalloutGuard'

describe('acedGuardCanvasTouchCallout', () => {
  it('applies iOS callout / selection suppression styles', () => {
    const canvas = document.createElement('canvas')
    acedApplyCanvasTouchCalloutStyles(canvas)
    expect(canvas.style.touchAction).toBe('none')
    expect(canvas.style.userSelect).toBe('none')
    // jsdom normalizes / drops some -webkit-* properties; tap-highlight remains.
    expect(canvas.style.cssText).toContain('-webkit-tap-highlight-color')
  })

  it('prevents default on touchstart and selectstart', () => {
    const canvas = document.createElement('canvas')
    const host = document.createElement('div')
    host.appendChild(canvas)
    document.body.appendChild(host)
    const dispose = acedGuardCanvasTouchCallout(canvas, host)

    const touchEvent = new Event('touchstart', {
      bubbles: true,
      cancelable: true
    })
    canvas.dispatchEvent(touchEvent)
    expect(touchEvent.defaultPrevented).toBe(true)

    const selectEvent = new Event('selectstart', {
      bubbles: true,
      cancelable: true
    })
    canvas.dispatchEvent(selectEvent)
    expect(selectEvent.defaultPrevented).toBe(true)

    dispose()
    host.remove()
  })

  it('clears an active DOM selection', () => {
    const text = document.createElement('p')
    text.textContent = 'selectable'
    document.body.appendChild(text)
    const range = document.createRange()
    range.selectNodeContents(text)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    expect(selection?.rangeCount ?? 0).toBeGreaterThan(0)

    acedClearDomSelection()
    expect(selection?.rangeCount ?? 0).toBe(0)
    text.remove()
  })
})
