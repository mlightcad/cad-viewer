import { reactive } from 'vue'

export const store = reactive<{
  selectedFile: File | null
}>({
  selectedFile: null
})
