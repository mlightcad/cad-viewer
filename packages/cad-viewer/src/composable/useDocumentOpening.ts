import { AcApDocManager, eventBus } from '@mlightcad/cad-simple-viewer'
import { onMounted, readonly, ref } from 'vue'

const isDocumentOpening = ref(false)

let isBound = false
let retryTimer: ReturnType<typeof setInterval> | undefined

function getExistingDocManager(): AcApDocManager | null {
  const singleton = AcApDocManager as unknown as {
    _instance?: AcApDocManager
  }
  return singleton._instance ?? null
}

function stopRetryTimer() {
  if (!retryTimer) return
  clearInterval(retryTimer)
  retryTimer = undefined
}

function beginDocumentOpening() {
  isDocumentOpening.value = true
}

function endDocumentOpening() {
  isDocumentOpening.value = false
}

function tryBind() {
  if (isBound) return true

  const docManager = getExistingDocManager()
  if (!docManager) return false

  docManager.events.documentToBeOpened.addEventListener(beginDocumentOpening)
  docManager.events.documentActivated.addEventListener(endDocumentOpening)
  eventBus.on('failed-to-open-file', endDocumentOpening)

  isBound = true
  stopRetryTimer()
  return true
}

function ensureDocumentOpeningSync() {
  if (tryBind() || retryTimer) return

  retryTimer = setInterval(() => {
    tryBind()
  }, 50)
}

export function useDocumentOpening() {
  ensureDocumentOpeningSync()

  onMounted(() => {
    ensureDocumentOpeningSync()
  })

  return {
    isDocumentOpening: readonly(isDocumentOpening),
    beginDocumentOpening,
    endDocumentOpening
  }
}
