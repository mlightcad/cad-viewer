import { reactive } from 'vue'

export const store = reactive<{
  selectedFile: File | null
  isNewDrawing: boolean
}>({
  selectedFile: null,
  isNewDrawing: false
})
