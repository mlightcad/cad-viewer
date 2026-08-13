import {
  AcApDocManager,
  type AcApMarkupRecord,
  type AcApMarkupStatus,
  getMarkupPresenter,
  getMarkupStore,
  MARKUP_STATUSES,
  runMarkupEdit} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Reactive bridge from {@link getMarkupStore} to Vue UI.
 */
export function useMarkup() {
  const markups = ref<AcApMarkupRecord[]>([])
  const selectedId = ref<string | undefined>()
  const dirty = ref(false)

  const refresh = () => {
    const store = getMarkupStore()
    markups.value = store.list()
    selectedId.value = store.selectedId
    dirty.value = store.dirty
  }

  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    refresh()
    unsubscribe = getMarkupStore().subscribe(refresh)
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  const select = (id: string) => {
    const view = AcApDocManager.instance.curView
    getMarkupPresenter().select(view, id)
  }

  const focus = (record: AcApMarkupRecord) => {
    const view = AcApDocManager.instance.curView
    getMarkupPresenter().focus(view, record)
  }

  const updateMeta = (
    id: string,
    patch: Partial<Pick<AcApMarkupRecord, 'comment' | 'status' | 'text'>>
  ) => {
    const view = AcApDocManager.instance.curView
    runMarkupEdit(view, 'Edit Markup', () => {
      const updated = getMarkupStore().updateMeta(id, patch)
      if (!updated) return
      if (patch.text != null) {
        getMarkupPresenter().publish(view, updated)
      }
    })
  }

  const remove = (id: string) => {
    getMarkupPresenter().unpublish(AcApDocManager.instance.curView, id)
  }

  const clearAll = () => {
    getMarkupPresenter().clearVisuals(AcApDocManager.instance.curView, {
      clearStore: true
    })
  }

  const statuses = MARKUP_STATUSES

  return {
    markups,
    selectedId,
    dirty,
    statuses: statuses as readonly AcApMarkupStatus[],
    refresh,
    select,
    focus,
    updateMeta,
    remove,
    clearAll
  }
}
