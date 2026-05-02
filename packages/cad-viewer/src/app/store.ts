import { reactive } from 'vue'

export const store = reactive({
  fileName: '',
  dialogs: {
    layerManager: false,
    activePaletteTab: 'layerManager'
  },
  hatch: {
    patternName: 'ANSI31',
    patternScale: 1,
    patternAngle: 0,
    style: 'Normal' as 'Normal' | 'Outer' | 'Ignore',
    associative: true
  }
})
