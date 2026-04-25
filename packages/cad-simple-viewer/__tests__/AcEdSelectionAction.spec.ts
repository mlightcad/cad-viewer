import {
  resolvePointerSelectionAction,
  resolveSelectionActionFromEvent
} from '../src/editor/view/AcEdSelectionAction'

describe('selection action helpers', () => {
  test('plain pointer selection keeps the existing selection set', () => {
    expect(
      resolvePointerSelectionAction({
        shiftKey: false,
        ctrlKey: false,
        metaKey: false
      })
    ).toBe('add')
  })

  test('shift pointer selection removes from the existing selection set', () => {
    expect(
      resolvePointerSelectionAction({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false
      })
    ).toBe('remove')
  })

  test('base resolver still supports explicit replace semantics', () => {
    expect(
      resolveSelectionActionFromEvent(
        {
          shiftKey: false,
          ctrlKey: false,
          metaKey: false
        },
        'replace'
      )
    ).toBe('replace')
  })
})
