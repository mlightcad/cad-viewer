import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { type AgentChatLabelKey, agentT, buildAgentLabels } from './index'

/**
 * Reactive agent UI strings that follow {@link AcApI18n} locale changes.
 *
 * @returns `labels` — computed map of all agent strings; `t` — translate one key.
 */
export function useAgentI18n() {
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
    return buildAgentLabels()
  })

  /**
   * Translates one agent label, re-evaluating when the locale changes.
   *
   * @param key - Label key from {@link agentEn}.
   */
  const t = (key: AgentChatLabelKey) => {
    void localeVersion.value
    return agentT(key)
  }

  return { labels, t }
}
