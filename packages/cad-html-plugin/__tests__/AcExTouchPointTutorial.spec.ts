/** @jest-environment jsdom */

import { ACEX_TOUCH_POINT_TUTORIAL_PREFS_KEY } from '../src/AcExTouchPointTutorial'

const isMobileOrPad = jest.fn(() => true)

jest.mock('../src/AcExHtmlSimpleViewerUi', () => {
  const actual = jest.requireActual(
    '../../cad-simple-viewer/src/ui/touch-point-tutorial.ts'
  )
  return {
    ...actual,
    acedIsMobileOrPadUi: () => isMobileOrPad()
  }
})

import {
  acexMaybeShowTouchPointTutorial,
  acexShouldShowTouchPointTutorial
} from '../src/AcExTouchPointTutorial'
import { AcUiDialog } from '../../cad-simple-viewer/src/ui/AcUiDialog'

describe('AcExTouchPointTutorial', () => {
  beforeEach(() => {
    localStorage.clear()
    isMobileOrPad.mockReturnValue(true)
    document.body.replaceChildren()
    document.getElementById(AcUiDialog.styleId)?.remove()
    document.getElementById('ml-ui-touch-point-tutorial-styles')?.remove()
  })

  it('shows when mobile/pad UI is active and prefs allow it', () => {
    expect(acexShouldShowTouchPointTutorial()).toBe(true)
    void acexMaybeShowTouchPointTutorial({
      t: (key: string) => key
    } as never)
    expect(document.querySelector('.ml-ui-touch-point-tutorial')).not.toBeNull()
  })

  it('does not show on desktop UI', () => {
    isMobileOrPad.mockReturnValue(false)
    expect(acexShouldShowTouchPointTutorial()).toBe(false)
    void acexMaybeShowTouchPointTutorial({
      t: (key: string) => key
    } as never)
    expect(document.querySelector('.ml-ui-touch-point-tutorial')).toBeNull()
  })

  it('respects hide-forever prefs in localStorage', () => {
    localStorage.setItem(
      ACEX_TOUCH_POINT_TUTORIAL_PREFS_KEY,
      JSON.stringify({ hideForever: true, snoozeDate: null })
    )
    expect(acexShouldShowTouchPointTutorial()).toBe(false)
  })
})
