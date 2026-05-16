import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcEdBaseView, AcEdMouseEventArgs } from '@mlightcad/cad-simple-viewer'
import { AcGePoint2d } from '@mlightcad/data-model'
import { computed, onMounted, onUnmounted, ref } from 'vue'

function formatCoordinatePair(x: number, y: number): string {
  const db = AcApDocManager.instance.curDocument?.database
  if (!db) {
    return `${x.toFixed(3)}, ${y.toFixed(3)}`
  }
  return db.formatter.formatPoint2d(new AcGePoint2d(x, y))
}

export function useCurrentPos(view: AcEdBaseView) {
  const x = ref(0)
  const y = ref(0)

  function update(event: AcEdMouseEventArgs) {
    x.value = event.x
    y.value = event.y
  }

  onMounted(() => view.events.mouseMove.addEventListener(update))
  onUnmounted(() => view.events.mouseMove.removeEventListener(update))

  const text = computed(() => formatCoordinatePair(x.value, y.value))

  return { x, y, text }
}
