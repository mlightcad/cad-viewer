/** @jest-environment jsdom */

import {
  editMarkupHtmlText,
  isMarkupHtmlTextEditing
} from '../src/command/markup/AcApMarkupTextEdit'

describe('isMarkupHtmlTextEditing', () => {
  it('is true only while a capsule edit is in progress', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    expect(isMarkupHtmlTextEditing()).toBe(false)

    const done = editMarkupHtmlText({
      el,
      initialText: 'Note',
      multiline: false
    })
    expect(isMarkupHtmlTextEditing()).toBe(true)

    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
    await expect(done).resolves.toBe('Note')
    expect(isMarkupHtmlTextEditing()).toBe(false)
  })

  it('clears the flag when Escape cancels', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    const done = editMarkupHtmlText({
      el,
      initialText: 'Draft',
      multiline: false
    })
    expect(isMarkupHtmlTextEditing()).toBe(true)

    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await expect(done).resolves.toBeUndefined()
    expect(isMarkupHtmlTextEditing()).toBe(false)
  })
})
