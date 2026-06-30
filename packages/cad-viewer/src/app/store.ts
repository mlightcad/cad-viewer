import { reactive } from 'vue'

export const store = reactive({
  dialogs: {
    layerManager: false,
    activePaletteTab: 'layerManager'
  },
  features: {
    /** Set when `@mlightcad/cad-agent-plugin` is installed and registered. */
    agentPlugin: false
  }
})
