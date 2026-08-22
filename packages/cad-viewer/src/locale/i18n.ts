import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import { AcDbEntity } from '@mlightcad/data-model'
import { createI18n } from 'vue-i18n'

import arCommand from './ar/command'
import arDialog from './ar/dialog'
import arEntity from './ar/entity'
import arMain from './ar/main'
import csCommand from './cs/command'
import csDialog from './cs/dialog'
import csEntity from './cs/entity'
import csMain from './cs/main'
import enCommand from './en/command'
import enDialog from './en/dialog'
import enEntity from './en/entity'
import enMain from './en/main'
import trCommand from './tr/command'
import trDialog from './tr/dialog'
import trEntity from './tr/entity'
import trMain from './tr/main'
import zhCommand from './zh/command'
import zhDialog from './zh/dialog'
import zhEnity from './zh/entity'
import zhMain from './zh/main'

// Get language of browser - use same logic as useLocale
const getInitialLocale = (): string => {
  const stored = localStorage.getItem('preferred_lang')
  if (
    stored === 'en' ||
    stored === 'zh' ||
    stored === 'tr' ||
    stored === 'cs' ||
    stored === 'ar'
  )
    return stored

  const browserLang = navigator.language.toLowerCase()
  const browserLocale = browserLang.substring(0, 2)
  if (browserLocale === 'zh') return 'zh'
  if (browserLocale === 'tr') return 'tr'
  if (browserLocale === 'cs') return 'cs'
  if (browserLocale === 'ar') return 'ar'
  return 'en'
}

const messages = {
  en: {
    main: enMain,
    command: enCommand,
    dialog: enDialog,
    entity: enEntity
  },
  zh: {
    main: zhMain,
    command: zhCommand,
    dialog: zhDialog,
    entity: zhEnity
  },
  tr: {
    main: trMain,
    command: trCommand,
    dialog: trDialog,
    entity: trEntity
  },
  cs: {
    main: csMain,
    command: csCommand,
    dialog: csDialog,
    entity: csEntity
  },
  ar: {
    main: arMain,
    command: arCommand,
    dialog: arDialog,
    entity: arEntity
  }
}

AcApI18n.mergeLocaleMessage('en', messages.en)
AcApI18n.mergeLocaleMessage('zh', messages.zh)
AcApI18n.mergeLocaleMessage('tr', messages.tr)
AcApI18n.mergeLocaleMessage('cs', messages.cs)
AcApI18n.mergeLocaleMessage('ar', messages.ar)

export const i18n = createI18n({
  legacy: false,
  messages: AcApI18n.messages,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  allowComposition: true,
  globalInjection: true
})
export const entityName = (entity: AcDbEntity) => {
  const t = i18n.global.t
  const key = 'entity.entityName.' + entity.type
  return t(key, entity.type, { missingWarn: false })
}

export const entityPropName = (name: string) => {
  const t = i18n.global.t
  const key = 'entity.property.' + name
  return t(key, name, { missingWarn: false })
}

export const entityPropEnum = (name: string) => {
  const t = i18n.global.t
  const key = 'entity.enum.' + name
  return t(key, name, { missingWarn: true })
}

export const colorName = (colorKeyName: string) => {
  const normalizedSymbolicColor = colorKeyName.trim().toLowerCase()

  if (i18n.global.locale.value === 'ar') {
    if (normalizedSymbolicColor === 'bylayer') return 'حسب الطبقة'
    if (normalizedSymbolicColor === 'byblock') return 'حسب الكتلة'
  }
  const value = colorKeyName.trim()

  // Numeric values are AutoCAD Color Index (ACI) values.
  // They are identifiers, not locale message keys.
  if (/^\d+$/.test(value)) {
    return value
  }

  if (value === 'ByLayer' || value === 'ByBlock') {
    return value
  }

  const t = i18n.global.t
  const key = 'entity.color.' + value.toLowerCase()
  return t(key, value, {
    missingWarn: false,
    fallbackWarn: false
  })
}
export const toolPaletteTitle = (name: string) => {
  const t = i18n.global.t
  const key = `main.toolPalette.${name}.title`
  return t(key, name, { missingWarn: false })
}

export const toolPaletteTabName = (name: string) => {
  const t = i18n.global.t
  const key = `main.toolPalette.${name}.tab`
  return t(key, name, { missingWarn: false })
}

export default i18n
