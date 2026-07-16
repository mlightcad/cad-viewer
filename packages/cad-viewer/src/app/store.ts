import { reactive } from 'vue'

export const store = reactive({
  dialogs: {
    layerManager: false,
    activePaletteTab: 'layerManager',
    /** Sub-tab inside Missing / External Resources palette */
    activeMissingResourceTab: 'font' as 'font' | 'xref'
  },
  features: {
    /** Set when `@mlightcad/cad-agent-plugin` is installed and registered. */
    agentPlugin: false
  },
  /**
   * Bumped by the MEM command after publishing a fresh snapshot so an already
   * mounted Memory palette can pick it up without remounting.
   */
  memoryProfileTick: 0
})
