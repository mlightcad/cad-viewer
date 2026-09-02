import { AcApSettingManager } from '../app/AcApSettingManager'
import { acedIsMobileOrPadUi } from '../editor/global/AcEdUiLayout'
import { resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { ACED_TOUCH_POINT_LONG_PRESS_MS } from '../editor/input/ui/AcEdTouchPointSession'
import { AcApI18n } from '../i18n/AcApI18n'
import {
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial
} from './touch-point-tutorial'

/**
 * Whether the mobile precise point-pick tutorial should be shown.
 */
export function acuiShouldShowTouchPointTutorial(): boolean {
  const settings = AcApSettingManager.instance
  return acuiShouldShowTouchPointTutorialFromPrefs(
    acedIsMobileOrPadUi,
    {
      hideForever: settings.get('hideTouchPointTutorial'),
      snoozeDate: settings.get('touchPointTutorialSnoozeDate')
    }
  )
}

/**
 * Live-viewer adapter for {@link AcUiTouchPointTutorial} backed by
 * {@link AcApSettings} and {@link AcApI18n}.
 */
export class AcUiTouchPointTutorialDialog {
  /**
   * Opens the tutorial when {@link acuiShouldShowTouchPointTutorial} is true.
   *
   * @param host - Backdrop host; defaults to `document.body`.
   */
  static maybeShow(host: HTMLElement = document.body): Promise<void> {
    return AcUiTouchPointTutorial.maybeShow({
      host,
      theme: resolveUiTheme(host),
      longPressMs: ACED_TOUCH_POINT_LONG_PRESS_MS,
      labels: {
        title: AcApI18n.t('main.touchPointTutorial.title'),
        description: AcApI18n.t('main.touchPointTutorial.description'),
        snoozeToday: AcApI18n.t('main.touchPointTutorial.snoozeToday'),
        hideForever: AcApI18n.t('main.touchPointTutorial.hideForever'),
        ok: AcApI18n.t('main.touchPointTutorial.ok')
      },
      shouldShow: acuiShouldShowTouchPointTutorial,
      readPrefs: () => ({
        hideForever: AcApSettingManager.instance.get('hideTouchPointTutorial'),
        snoozeDate: AcApSettingManager.instance.get(
          'touchPointTutorialSnoozeDate'
        )
      }),
      writePrefs: prefs => {
        const settings = AcApSettingManager.instance
        settings.set('hideTouchPointTutorial', prefs.hideForever)
        settings.set('touchPointTutorialSnoozeDate', prefs.snoozeDate)
      }
    })
  }
}

export {
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial,
  type AcUiTouchPointTutorialConfig,
  type AcUiTouchPointTutorialLabels,
  type AcUiTouchPointTutorialPrefs
} from './touch-point-tutorial'
