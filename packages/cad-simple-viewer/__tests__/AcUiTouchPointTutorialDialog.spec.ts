/** @jest-environment jsdom */

import {
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial
} from '../src/ui/touch-point-tutorial'
import { AcUiDialog } from '../src/ui/AcUiDialog'
import { ACED_TOUCH_POINT_LONG_PRESS_MS } from '../src/editor/input/ui/AcEdTouchPointTiming'

describe('AcUiTouchPointTutorial', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById(AcUiDialog.styleId)?.remove()
    document.getElementById('ml-ui-touch-point-tutorial-styles')?.remove()
  })

  it('shows the demo animation and dismiss controls', async () => {
    const writePrefs = jest.fn()
    void AcUiTouchPointTutorial.maybeShow({
      longPressMs: ACED_TOUCH_POINT_LONG_PRESS_MS,
      labels: {
        title: 'Title',
        description: 'Description',
        snoozeToday: 'Snooze',
        hideForever: 'Hide',
        ok: 'OK'
      },
      shouldShow: () => true,
      readPrefs: () => ({ hideForever: false, snoozeDate: null }),
      writePrefs
    })

    expect(document.querySelector('.ml-touch-tutorial-demo')).not.toBeNull()
    const ok = document.querySelector(
      '.ml-ui-touch-point-tutorial-ok'
    ) as HTMLButtonElement
    ok.click()
    await Promise.resolve()
    expect(writePrefs).toHaveBeenCalled()
    expect(document.querySelector('.ml-ui-dialog-backdrop')).toBeNull()
  })

  it('respects hide and snooze preferences', () => {
    expect(
      acuiShouldShowTouchPointTutorialFromPrefs(
        () => true,
        { hideForever: false, snoozeDate: null }
      )
    ).toBe(true)
    expect(
      acuiShouldShowTouchPointTutorialFromPrefs(
        () => true,
        { hideForever: true, snoozeDate: null }
      )
    ).toBe(false)
    expect(
      acuiShouldShowTouchPointTutorialFromPrefs(
        () => true,
        { hideForever: false, snoozeDate: acuiLocalIsoDate() }
      )
    ).toBe(false)
    expect(
      acuiShouldShowTouchPointTutorialFromPrefs(
        () => false,
        { hideForever: false, snoozeDate: null }
      )
    ).toBe(false)
  })
})
