import { reactive } from 'vue'

export const store = reactive({
  fileName: '',
  dialogs: {
    layerManager: false,
    activePaletteTab: 'layerManager'
  }
})
