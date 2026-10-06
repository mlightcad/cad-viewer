import { AcApI18n, type AcApLocale } from '@mlightcad/cad-simple-viewer'
import ar from 'element-plus/es/locale/lang/ar'
import cs from 'element-plus/es/locale/lang/cs'
import en from 'element-plus/es/locale/lang/en'
import tr from 'element-plus/es/locale/lang/tr'
import zh from 'element-plus/es/locale/lang/zh-cn'
import { computed, ref, watch } from 'vue'

import type { LocaleProp } from '../locale/types'

/** Must stay in sync with {@link ../locale/i18n.ts} startup persistence. */
const STORAGE_KEY = 'preferred_lang'

export const LOCALE_OPTIONS = [
  { locale: 'en' as const, label: 'English' },
  { locale: 'zh' as const, label: '简体中文' },
  { locale: 'tr' as const, label: 'Türkçe' },
  { locale: 'cs' as const, label: 'Čeština' },
  { locale: 'ar' as const, label: 'العربية' }
]

export const isSupportedLocale = (value: string): value is AcApLocale => {
  return (
    value === 'en' ||
    value === 'zh' ||
    value === 'tr' ||
    value === 'cs' ||
    value === 'ar'
  )
}

/**
 * Shared reactive mirror of {@link AcApI18n.currentLocale}.
 * Updated only from {@link AcApI18n.events.localeChanged}.
 */
const currentLocale = ref<AcApLocale>(AcApI18n.currentLocale)

let localeStateListenerInstalled = false

const ensureLocaleStateListener = () => {
  if (localeStateListenerInstalled) return
  localeStateListenerInstalled = true
  AcApI18n.events.localeChanged.addEventListener(args => {
    currentLocale.value = args.new
  })
}

/**
 * Locale composable for cad-viewer.
 *
 * {@link AcApI18n.setCurrentLocale} is the only write path. vue-i18n is synced
 * from {@link AcApI18n.events.localeChanged} in `locale/i18n.ts`.
 */
export function useLocale(propLocale?: LocaleProp) {
  ensureLocaleStateListener()
  // Re-read in case AcApI18n was aligned after this module first evaluated.
  currentLocale.value = AcApI18n.currentLocale

  const effectiveLocale = computed<LocaleProp>(() => currentLocale.value)

  const isControlled = computed(
    () => !!(propLocale && propLocale !== 'default')
  )

  /**
   * Changes the app locale via {@link AcApI18n.setCurrentLocale}.
   * Persists to localStorage unless a parent `locale` prop controls the value.
   */
  const setLocale = (newLocale: AcApLocale) => {
    if (!isControlled.value) {
      localStorage.setItem(STORAGE_KEY, newLocale)
    }
    AcApI18n.setCurrentLocale(newLocale)
  }

  const clearStoragePreference = () => {
    localStorage.removeItem(STORAGE_KEY)
  }

  if (propLocale) {
    watch(
      () => propLocale,
      newPropLocale => {
        if (newPropLocale && newPropLocale !== 'default') {
          setLocale(newPropLocale)
        }
      },
      { immediate: true }
    )
  }

  const elementPlusLocale = computed(() => {
    if (effectiveLocale.value === 'zh') return zh
    if (effectiveLocale.value === 'tr') return tr
    if (effectiveLocale.value === 'cs') return cs
    if (effectiveLocale.value === 'ar') return ar
    return en
  })

  return {
    currentLocale,
    effectiveLocale,
    elementPlusLocale,
    setLocale,
    clearStoragePreference,
    isControlled
  }
}
