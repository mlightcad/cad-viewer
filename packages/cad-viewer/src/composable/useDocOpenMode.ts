import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { ref } from 'vue'

export function useDocOpenMode() {
  const mode = ref<AcEdOpenMode>(AcApDocManager.instance.curDocument.openMode)

  AcApDocManager.instance.events.documentActivated.addEventListener(args => {
    mode.value = args.doc.openMode
  })

  return mode
}
