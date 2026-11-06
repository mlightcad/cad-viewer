import { AcApI18n as AcApViewerI18n } from '@mlightcad/cad-simple-viewer'
import {
  AcApI18n,
  type AcApLocale
} from '@mlightcad/cad-simple-viewer/file-open-panel'

/** Whether the landing → viewer locale bridge is already installed. */
let isBridgeInstalled = false

/**
 * Mirrors the landing-page {@link AcApI18n} locale onto the full-viewer
 * singleton used by plugins (e.g. CAD Agent).
 *
 * Demo/production builds can load `@mlightcad/cad-simple-viewer/file-open-panel`
 * and `@mlightcad/cad-simple-viewer` as separate graphs, each with its own
 * static `AcApI18n`. Host UI / vue-i18n use the landing singleton; agent and
 * other viewer plugins read the main-package singleton.
 */
export function syncViewerAcApI18n(): void {
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
