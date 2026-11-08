import { i18n } from '@mlightcad/cad-editor/locale'
import { AcApI18n } from '@mlightcad/cad-simple-viewer/file-open-panel'

import ar from './ar'
import cs from './cs'
import en from './en'
import ja from './ja'
import ko from './ko'
import tr from './tr'
import zh from './zh'

export const initializeLocale = () => {
  AcApI18n.mergeLocaleMessage('en', en)
  AcApI18n.mergeLocaleMessage('zh', zh)
  AcApI18n.mergeLocaleMessage('ja', ja)
  AcApI18n.mergeLocaleMessage('ko', ko)
  AcApI18n.mergeLocaleMessage('tr', tr)
  AcApI18n.mergeLocaleMessage('cs', cs)
  AcApI18n.mergeLocaleMessage('ar', ar)

  i18n.global.mergeLocaleMessage('en', en)
  i18n.global.mergeLocaleMessage('zh', zh)
  i18n.global.mergeLocaleMessage('ja', ja)
  i18n.global.mergeLocaleMessage('ko', ko)
  i18n.global.mergeLocaleMessage('tr', tr)
  i18n.global.mergeLocaleMessage('cs', cs)
  i18n.global.mergeLocaleMessage('ar', ar)
}
