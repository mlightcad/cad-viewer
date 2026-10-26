import {
  AcApDocManager,
  AcEdSelectionEventArgs
} from '@mlightcad/cad-simple-viewer'
import { AcDbObjectId } from '@mlightcad/data-model'
import { onMounted, onUnmounted, ref } from 'vue'

export function useSelectionSet() {
  const selectionSet = ref<AcDbObjectId[]>([])
  const added = ref<AcDbObjectId[]>([])
  const removed = ref<AcDbObjectId[]>([])

  const selectionAdded = (args: AcEdSelectionEventArgs) => {
    added.value = args.ids
    selectionSet.value = AcApDocManager.instance.curView.selectionSet.ids
  }

  const selectionRemoved = (args: AcEdSelectionEventArgs) => {
    removed.value = args.ids
    selectionSet.value = AcApDocManager.instance.curView.selectionSet.ids
  }

  /** Register event listeners when the component mounts */
  onMounted(() => {
    const events = AcApDocManager.instance.curView.selectionSet.events
    events.selectionAdded.addEventListener(selectionAdded)
    events.selectionRemoved.addEventListener(selectionRemoved)
  })

  /** Unregister event listeners when the component unmounts */
  onUnmounted(() => {
    const events = AcApDocManager.instance.curView.selectionSet.events
    events.selectionAdded.removeEventListener(selectionAdded)
    events.selectionRemoved.removeEventListener(selectionRemoved)
  })

  return {
    selectionSet,
    added,
    removed
  }
}
