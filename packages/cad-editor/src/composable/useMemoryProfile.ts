import {
  AcApDocManager,
  AcApMemoryProfiler,
  type AcApMemorySnapshot,
  AcTrView2d,
  formatMemoryBytes
} from '@mlightcad/cad-simple-viewer'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDocument } from './useDocument'

export { formatMemoryBytes }
export type { AcApMemorySnapshot }

/** Latest snapshot produced by the MEM command (consumed when the palette mounts). */
let pendingSnapshot: AcApMemorySnapshot | null = null

/**
 * Stores a snapshot collected by {@link AcApMemCmd} for the palette to pick up.
 */
export function publishMemorySnapshot(snapshot: AcApMemorySnapshot): void {
  pendingSnapshot = snapshot
}

/**
 * Takes any snapshot published by the MEM command (one-shot).
 */
export function takePublishedMemorySnapshot(): AcApMemorySnapshot | null {
  const snapshot = pendingSnapshot
  pendingSnapshot = null
  return snapshot
}

/**
 * Collects and holds the current drawing memory snapshot for the Memory palette.
 */
export function useMemoryProfile() {
  const { t } = useI18n()
  const { fileName, docTitle } = useDocument()
  const snapshot = ref<AcApMemorySnapshot | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const collectedAtLabel = computed(() => {
    if (!snapshot.value) return ''
    return new Date(snapshot.value.collectedAt).toLocaleTimeString()
  })

  const summaryRows = computed(() => snapshot.value?.summary ?? [])

  const maxSummaryBytes = computed(() => {
    let max = 0
    for (const row of summaryRows.value) {
      if (row.id === 'heap') continue
      if (row.bytes > max) max = row.bytes
    }
    return max || 1
  })

  const collectNow = async (): Promise<AcApMemorySnapshot> => {
    const docManager = AcApDocManager.instance
    const view = docManager.curView as AcTrView2d
    const database = docManager.curDocument.database
    return AcApMemoryProfiler.collect(view, database)
  }

  /**
   * Adopts a command-published snapshot when one is pending.
   *
   * @returns `true` when a published snapshot was applied
   */
  const adoptPublishedSnapshot = (): boolean => {
    const published = takePublishedMemorySnapshot()
    if (!published) return false
    snapshot.value = published
    error.value = null
    return true
  }

  const refresh = async () => {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      snapshot.value = await AcApDocManager.instance.withBusyIndicator(
        () => collectNow(),
        t('main.toolPalette.memoryProfile.collecting')
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      snapshot.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Applies a command-published snapshot when present; otherwise collects one.
   */
  const hydrateOrRefresh = async () => {
    if (adoptPublishedSnapshot()) return
    await refresh()
  }

  return {
    snapshot,
    loading,
    error,
    collectedAtLabel,
    summaryRows,
    maxSummaryBytes,
    fileName,
    docTitle,
    refresh,
    adoptPublishedSnapshot,
    hydrateOrRefresh,
    formatMemoryBytes
  }
}
