import { AcApI18n } from '@mlightcad/cad-simple-viewer'

import en from './en'
import zh from './zh'

export const initializeLocale = () => {
  AcApI18n.mergeLocaleMessage('en', en)
  AcApI18n.mergeLocaleMessage('zh', zh)
}
