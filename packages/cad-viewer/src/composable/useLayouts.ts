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
    // Deduplicate by block-table-record id: the layout dictionary can briefly
    // hold alias keys for the same layout object (wrong code-page entry names
    // from DWG NOD import). Tabs should show one entry per space.
    const seenBtrIds = new Set<AcDbObjectId>()
    for (const layout of layouts) {
      const btrId = layout.blockTableRecordId
      if (!btrId || seenBtrIds.has(btrId)) continue
      seenBtrIds.add(btrId)
      reactiveLayouts.push({
        name: layout.layoutName,
        tabOrder: layout.tabOrder,
        blockTableRecordId: btrId,
        isActive: btrId == doc.currentSpaceId
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
