import {
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial,
  type AcUiTouchPointTutorialPrefs
} from './AcExHtmlSimpleViewerUi'

import { acExHtmlIsCompactLayout } from './AcExHtmlDrawerSheet'
import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { ACEX_TOUCH_POINT_LONG_PRESS_MS } from './AcExTouchPointSession'

/** `localStorage` key for offline HTML tutorial preferences. */
export const ACEX_TOUCH_POINT_TUTORIAL_PREFS_KEY =
  'mlcad-touch-point-tutorial-prefs'

function readPrefs(): AcUiTouchPointTutorialPrefs {
  if (typeof localStorage === 'undefined') {
    return { hideForever: false, snoozeDate: null }
  }
  try {
    const raw = localStorage.getItem(ACEX_TOUCH_POINT_TUTORIAL_PREFS_KEY)
    if (!raw) return { hideForever: false, snoozeDate: null }
    const parsed = JSON.parse(raw) as Partial<AcUiTouchPointTutorialPrefs>
    return {
      hideForever: parsed.hideForever === true,
      snoozeDate:
        typeof parsed.snoozeDate === 'string' ? parsed.snoozeDate : null
    }
  } catch {
    return { hideForever: false, snoozeDate: null }
  }
}

function writePrefs(prefs: AcUiTouchPointTutorialPrefs): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    ACEX_TOUCH_POINT_TUTORIAL_PREFS_KEY,
    JSON.stringify(prefs)
  )
}

/**
 * Whether the precise point-pick tutorial should appear in exported HTML.
 */
export function acExShouldShowTouchPointTutorial(): boolean {
  return acuiShouldShowTouchPointTutorialFromPrefs(
    acExHtmlIsCompactLayout,
    readPrefs()
  )
}

/**
 * Shows the shared touch-point tutorial when the session panel opens on
 * phone/pad layouts in exported HTML.
 */
export function acExMaybeShowTouchPointTutorial(
  i18n: AcExHtmlI18n,
  host: HTMLElement = document.body
): Promise<void> {
  return AcUiTouchPointTutorial.maybeShow({
    host,
    longPressMs: ACEX_TOUCH_POINT_LONG_PRESS_MS,
    labels: {
      title: i18n.t('touchPointTutorial.title'),
      description: i18n.t('touchPointTutorial.description'),
      snoozeToday: i18n.t('touchPointTutorial.snoozeToday'),
      hideForever: i18n.t('touchPointTutorial.hideForever'),
      ok: i18n.t('touchPointTutorial.ok')
    },
    shouldShow: acExShouldShowTouchPointTutorial,
    readPrefs,
    writePrefs
  })
}

export { acuiLocalIsoDate }
