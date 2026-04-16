import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

export function useDocOpenMode() {
  const mode = ref<AcEdOpenMode>(AcEdOpenMode.Read)
  let unbind: (() => void) | undefined
  let retryTimer: ReturnType<typeof setInterval> | undefined

  const tryBind = () => {
    try {
      const manager = AcApDocManager.instance
      mode.value = manager.curDocument.openMode

      const onDocumentActivated = (args: {
        doc: { openMode: AcEdOpenMode }
      }) => {
        mode.value = args.doc.openMode
      }
      manager.events.documentActivated.addEventListener(onDocumentActivated)
      unbind = () => {
        manager.events.documentActivated.removeEventListener(
          onDocumentActivated
        )
      }
      return true
    } catch {
      return false
    }
  }

  // Try immediately in case caller runs after viewer initialization.
  if (!tryBind()) {
    onMounted(() => {
      if (tryBind()) return
      retryTimer = setInterval(() => {
        if (!tryBind()) return
        if (retryTimer) {
          clearInterval(retryTimer)
          retryTimer = undefined
        }
      }, 50)
    })
  }

  onUnmounted(() => {
    unbind?.()
    if (retryTimer) clearInterval(retryTimer)
  })

  return mode
}
