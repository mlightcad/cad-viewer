import {
  AcApDocManager,
  type AcApMeasurementRecord,
  clearLayoutMeasurements,
  focusMeasurement,
  getMeasurementValueText,
  getSelectedMeasurementId,
  listLayoutMeasurements,
  subscribeMeasurements,
  subscribeMeasurementSelection
} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Reactive bridge from the measurement store to Vue UI.
 */
export function useMeasurement() {
  const measurements = ref<AcApMeasurementRecord[]>([])
  const selectedId = ref<string | undefined>()
  const valueById = ref<Record<string, string>>({})

  const refresh = () => {
    const view = AcApDocManager.instance.curView
    const db = AcApDocManager.instance.curDocument?.database
    const list = view ? listLayoutMeasurements(view) : []
    measurements.value = list
    selectedId.value = getSelectedMeasurementId()
    const values: Record<string, string> = {}
    for (const record of list) {
      values[record.id] = getMeasurementValueText(record.id, db) || '—'
    }
    valueById.value = values
  }

  let unsubscribeList: (() => void) | undefined
  let unsubscribeSelection: (() => void) | undefined

  onMounted(() => {
    refresh()
    unsubscribeList = subscribeMeasurements(refresh)
    unsubscribeSelection = subscribeMeasurementSelection(refresh)
    AcApDocManager.instance.events.documentActivated.addEventListener(refresh)
  })

  onUnmounted(() => {
    unsubscribeList?.()
    unsubscribeSelection?.()
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      refresh
    )
  })

  const focus = (record: AcApMeasurementRecord) => {
    const view = AcApDocManager.instance.curView
    if (!view) return
    focusMeasurement(view, record)
  }

  const clearAll = () => {
    const view = AcApDocManager.instance.curView
    if (!view) return
    clearLayoutMeasurements(view)
  }

  return {
    measurements,
    selectedId,
    valueById,
    refresh,
    focus,
    clearAll
  }
}
