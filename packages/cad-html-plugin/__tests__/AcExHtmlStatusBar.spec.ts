/** @jest-environment jsdom */

describe('status bar visibility', () => {
  it('hides when empty and shows when text is set', () => {
    document.body.innerHTML =
      '<footer id="mlcad-status-bar" aria-live="polite" hidden></footer>'
    const el = document.getElementById('mlcad-status-bar')!
    const sync = () => {
      el.hidden = !el.textContent?.trim()
    }
    const observer = new MutationObserver(sync)
    observer.observe(el, {
      characterData: true,
      childList: true,
      subtree: true
    })
    sync()

    expect(el.hidden).toBe(true)

    el.textContent = 'Zoom: Layer1'
    // MutationObserver is async in jsdom — flush microtasks.
    return Promise.resolve().then(() => {
      expect(el.hidden).toBe(false)
      el.textContent = ''
      return Promise.resolve().then(() => {
        expect(el.hidden).toBe(true)
        observer.disconnect()
      })
    })
  })
})
