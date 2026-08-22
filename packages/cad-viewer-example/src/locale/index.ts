import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import { i18n } from '@mlightcad/cad-viewer'

import ar from './ar'
import en from './en'
import zh from './zh'

export const initializeLocale = () => {
  AcApI18n.mergeLocaleMessage('en', en)
  AcApI18n.mergeLocaleMessage('zh', zh)
  AcApI18n.mergeLocaleMessage('ar', ar)

  i18n.global.mergeLocaleMessage('en', en)
  i18n.global.mergeLocaleMessage('zh', zh)
  i18n.global.mergeLocaleMessage('ar', ar)
}
