import { AcApI18n as AcApViewerI18n } from '@mlightcad/cad-simple-viewer'
import {
  AcApI18n,
  type AcApLocale
} from '@mlightcad/cad-simple-viewer/file-open-panel'

/** Whether the landing → viewer locale bridge is already installed. */
let isBridgeInstalled = false

const LOCALES: readonly AcApLocale[] = ['en', 'zh', 'tr', 'cs', 'ar']

/**
 * Copies editor/landing catalogs onto the full-viewer {@link AcApI18n}
 * singleton used by the command line and plugins.
 *
 * Demo/production builds can load `@mlightcad/cad-simple-viewer/file-open-panel`
 * and `@mlightcad/cad-simple-viewer` as separate graphs, each with its own
 * static `AcApI18n`. Host UI / vue-i18n use the landing singleton; the command
 * line and viewer plugins read the main-package singleton — so editor-registered
 * command descriptions (e.g. `mleaderstyle`) must be merged into both.
 */
function mergeLandingMessagesIntoViewer() {
  for (const locale of LOCALES) {
    AcApViewerI18n.mergeLocaleMessage(
      locale,
      AcApI18n.getLocaleMessage(locale)
    )
  }
}

/**
 * Mirrors the landing-page {@link AcApI18n} locale (and editor catalogs) onto
 * the full-viewer singleton used by the command line and plugins (e.g. CAD Agent).
 */
export function syncViewerAcApI18n(): void {
  mergeLandingMessagesIntoViewer()

  const sync = (locale: AcApLocale) => {
    if (AcApViewerI18n.currentLocale !== locale) {
      AcApViewerI18n.setCurrentLocale(locale)
    }
  }

  sync(AcApI18n.currentLocale)

  if (isBridgeInstalled) return
  isBridgeInstalled = true
  AcApI18n.events.localeChanged.addEventListener(args => {
    sync(args.new)
  })
}
