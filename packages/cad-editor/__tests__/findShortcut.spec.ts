/** @jest-environment jsdom */

const mockStore = {
  dialogs: { activePaletteTab: '', layerManager: false, findFocusTick: 0 }
}

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcEdCommand: class {},
  AcApContext: class {}
}))
jest.mock('../src/app', () => ({ store: mockStore }))

import {
  isFindShortcut,
  isFindShortcutInViewer,
  openFindPalette
} from '../src/command/AcApFindCmd'

const key = (init: Partial<KeyboardEvent>) =>
  ({
    key: 'f',
    code: 'KeyF',
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...init
  }) as KeyboardEvent

describe('isFindShortcut', () => {
  it('accepts Ctrl+F and Cmd+F (any case, any layout)', () => {
    expect(isFindShortcut(key({}))).toBe(true)
    expect(isFindShortcut(key({ ctrlKey: false, metaKey: true }))).toBe(true)
    expect(isFindShortcut(key({ key: 'F' }))).toBe(true)
    expect(isFindShortcut(key({ key: 'а', code: 'KeyF' }))).toBe(true)
  })

  it('ignores other chords', () => {
    expect(isFindShortcut(key({ ctrlKey: false }))).toBe(false)
    expect(isFindShortcut(key({ altKey: true }))).toBe(false)
    expect(isFindShortcut(key({ shiftKey: true }))).toBe(false)
    expect(isFindShortcut(key({ key: 'g', code: 'KeyG' }))).toBe(false)
  })
})

describe('isFindShortcutInViewer', () => {
  const inside = {} as Node
  const outside = {} as Node
  const root = { contains: (node: Node) => node === inside }

  it('handles Ctrl+F pressed in the page body or with nothing focused', () => {
    expect(isFindShortcutInViewer(null, root)).toBe(true)
    expect(isFindShortcutInViewer(document.body, root)).toBe(true)
    expect(isFindShortcutInViewer(document.documentElement, root)).toBe(true)
    // Body focus counts even before the viewer root is mounted.
    expect(isFindShortcutInViewer(document.body, undefined)).toBe(true)
  })

  it('handles Ctrl+F pressed inside the viewer', () => {
    expect(isFindShortcutInViewer(inside as EventTarget, root)).toBe(true)
  })

  it('leaves the browser search to fields outside the viewer', () => {
    expect(isFindShortcutInViewer(outside as EventTarget, root)).toBe(false)
    expect(isFindShortcutInViewer(outside as EventTarget, undefined)).toBe(
      false
    )
  })
})

describe('openFindPalette', () => {
  it('shows the Find tab and asks it to focus its field', () => {
    openFindPalette()
    expect(mockStore.dialogs.activePaletteTab).toBe('find')
    expect(mockStore.dialogs.layerManager).toBe(true)
    expect(mockStore.dialogs.findFocusTick).toBe(1)
    openFindPalette()
    expect(mockStore.dialogs.findFocusTick).toBe(2)
  })
})
