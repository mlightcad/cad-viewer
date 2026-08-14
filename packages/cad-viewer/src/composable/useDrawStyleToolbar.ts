import {
  isDrawStyleToolbarVisible,
  subscribeDrawStyleToolbarVisibility
} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Reactive flag for the measurement / markup draw-style overlay.
 * Used to hide the filename while a drawing command is active.
 */
export function useDrawStyleToolbarVisible() {
  const visible = ref(isDrawStyleToolbarVisible())
  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    visible.value = isDrawStyleToolbarVisible()
    unsubscribe = subscribeDrawStyleToolbarVisibility(next => {
      visible.value = next
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
    unsubscribe = undefined
  })

  return visible
}
