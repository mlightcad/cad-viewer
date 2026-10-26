import type { AcApDataSourceMenuItem } from '@mlightcad/cad-simple-viewer'
import { reactive } from 'vue'

export const store = reactive<{
  selectedFile: File | null
  selectedUrl: string | null
  isNewDrawing: boolean
  /** Run after the viewer is created (e.g. OneDrive sign-in from the landing page). */
  pendingDataSourceAction: AcApDataSourceMenuItem | null
}>({
  selectedFile: null,
  selectedUrl: null,
  isNewDrawing: false,
  pendingDataSourceAction: null
})
