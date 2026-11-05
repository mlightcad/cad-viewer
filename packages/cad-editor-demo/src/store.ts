import { reactive } from 'vue'

export const store = reactive<{
  selectedFile: File | null
  selectedUrl: string | null
  isNewDrawing: boolean
}>({
  selectedFile: null,
  selectedUrl: null,
  isNewDrawing: false
})
