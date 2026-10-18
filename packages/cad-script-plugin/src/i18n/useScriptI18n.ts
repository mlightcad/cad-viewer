import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { buildScriptLabels, type ScriptLabelKey, scriptT } from './index'

/**
 * Reactive script-console strings that follow {@link AcApI18n} locale changes.
 *
 * @returns `labels` — computed map of all console strings; `t` — translate one key.
 */
export function useScriptI18n() {
  /** Bumped on locale change to invalidate computed labels. */
  const localeVersion = ref(0)

  /** Invalidates cached labels when {@link AcApI18n} fires `localeChanged`. */
  const handleLocaleChanged = () => {
    localeVersion.value++
  }

  onMounted(() => {
    AcApI18n.events.localeChanged.addEventListener(handleLocaleChanged)
  })

  onUnmounted(() => {
    AcApI18n.events.localeChanged.removeEventListener(handleLocaleChanged)
  })

  const labels = computed(() => {
    void localeVersion.value
    return buildScriptLabels()
  })

  /**
   * Translates one console label, re-evaluating when the locale changes.
   *
   * @param key - Label key from {@link scriptEn}.
   */
  const t = (key: ScriptLabelKey) => {
    void localeVersion.value
    return scriptT(key)
  }

  return { labels, t }
}
