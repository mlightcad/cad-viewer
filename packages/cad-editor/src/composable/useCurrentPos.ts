import {
  AcApDocManager,
  AcApUcsService,
  AcEdBaseView,
  AcEdMouseEventArgs
} from '@mlightcad/cad-simple-viewer'
import { AcGePoint2d } from '@mlightcad/data-model'
import { computed, onMounted, onUnmounted, ref } from 'vue'

function formatCoordinatePair(x: number, y: number): string {
  const db = AcApDocManager.instance.curDocument?.database
  if (!db) {
    return `${x.toFixed(3)}, ${y.toFixed(3)}`
  }
  return db.formatter.formatPoint2d(new AcGePoint2d(x, y))
}

/**
 * Live cursor coordinates for the status bar, expressed in the current UCS.
 *
 * {@link AcEdBaseView} mouse events stay in WCS; display numbers go through
 * {@link AcApUcsService.wcsToUcs}.
 */
export function useCurrentPos(view: AcEdBaseView) {
  const wcsX = ref(0)
  const wcsY = ref(0)
  /** Bumped on UCS change so computed display re-projects the last WCS sample. */
  const ucsEpoch = ref(0)

  function update(event: AcEdMouseEventArgs) {
    wcsX.value = event.x
    wcsY.value = event.y
  }

  function onUcsChanged() {
    ucsEpoch.value++
  }

  onMounted(() => {
    view.events.mouseMove.addEventListener(update)
    AcApUcsService.events.ucsChanged.addEventListener(onUcsChanged)
  })
  onUnmounted(() => {
    view.events.mouseMove.removeEventListener(update)
    AcApUcsService.events.ucsChanged.removeEventListener(onUcsChanged)
  })

  const display = computed(() => {
    void ucsEpoch.value
    return AcApUcsService.wcsToUcs({ x: wcsX.value, y: wcsY.value, z: 0 })
  })

  const x = computed(() => display.value.x)
  const y = computed(() => display.value.y)
  const text = computed(() => formatCoordinatePair(x.value, y.value))

  return { x, y, text }
}
