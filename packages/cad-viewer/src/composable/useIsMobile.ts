import {
  ML_UI_COARSE_POINTER_MEDIA_QUERY,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MEDIA_QUERY
} from '@mlightcad/cad-simple-viewer'
import { useMediaQuery } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

// Heuristic mobile detection combining viewport, touch capability, and user agent
export function useIsMobile() {
  const isSmallViewport = useMediaQuery(ML_UI_MOBILE_MEDIA_QUERY)
  const isCompactViewport = useMediaQuery(ML_UI_COMPACT_MEDIA_QUERY)
  const isCoarsePointer = useMediaQuery(ML_UI_COARSE_POINTER_MEDIA_QUERY)

  const hasTouchCapability = ref(false)
  const isMobileUserAgent = ref(false)
  const isIpadOs = ref(false)

  onMounted(() => {
    try {
      const nav = window.navigator as Navigator & { msMaxTouchPoints?: number }
      const maxTouchPoints = nav.maxTouchPoints ?? nav.msMaxTouchPoints ?? 0
      const coarsePointer =
        window.matchMedia?.(ML_UI_COARSE_POINTER_MEDIA_QUERY).matches ?? false
      hasTouchCapability.value =
        maxTouchPoints > 0 || coarsePointer || 'ontouchstart' in window

      const ua = nav.userAgent || ''
      isMobileUserAgent.value =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          ua
        )
      isIpadOs.value =
        nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1
    } catch {
      hasTouchCapability.value = false
      isMobileUserAgent.value = false
      isIpadOs.value = false
    }
  })

  const isMobile = computed(() => {
    // Treat as mobile when small viewport and likely mobile input/UA
    return (
      !!isSmallViewport.value &&
      (hasTouchCapability.value || isMobileUserAgent.value)
    )
  })

  const isMobileOrPad = computed(() => {
    return (
      !!isCompactViewport.value ||
      isMobileUserAgent.value ||
      isIpadOs.value ||
      !!isCoarsePointer.value
    )
  })

  return { isMobile, isMobileOrPad, isSmallViewport }
}
