import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbObjectId
} from '@mlightcad/data-model'
import { reactive } from 'vue'

export interface LayoutInfo {
  name: string
  tabOrder: number
  blockTableRecordId: AcDbObjectId
  isActive: boolean
}

export function useLayouts(editor: AcApDocManager) {
  const reactiveLayouts = reactive<LayoutInfo[]>([])
  const doc = editor.curDocument

  const reset = (doc: AcDbDatabase) => {
    const layouts = doc.objects.layout.newIterator()
    reactiveLayouts.length = 0
    for (const layout of layouts) {
      reactiveLayouts.push({
        name: layout.layoutName,
        tabOrder: layout.tabOrder,
        blockTableRecordId: layout.blockTableRecordId,
        isActive: layout.blockTableRecordId == doc.currentSpaceId
      })
    }
    reactiveLayouts.sort((a, b) => a.tabOrder - b.tabOrder)
  }
  reset(doc.database)

  editor.events.documentActivated.addEventListener(args => {
    reactiveLayouts.length = 0
    reset(args.doc.database)
  })

  acdbHostApplicationServices().layoutManager.events.layoutSwitched.addEventListener(
    args => {
      const newLayout = args.layout
      reactiveLayouts.forEach(layout => {
        if (layout.name == newLayout.layoutName) {
          layout.isActive = true
        } else {
          layout.isActive = false
        }
      })
    }
  )

  return reactiveLayouts
}
