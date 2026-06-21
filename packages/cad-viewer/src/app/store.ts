import { reactive } from 'vue'

export const store = reactive({
  dialogs: {
    layerManager: false,
    activePaletteTab: 'layerManager'
  }
})
