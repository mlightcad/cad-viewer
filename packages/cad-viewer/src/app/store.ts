import { reactive } from 'vue'

export const store = reactive({
  dialogs: {
    layerManager: false,
    activePaletteTab: 'layerManager',
    /** Sub-tab inside Missing / External Resources palette */
    activeMissingResourceTab: 'font' as 'font' | 'xref',
    /**
     * Dev-oriented Open Performance tab. Hidden until OPENPERF runs so it
     * does not clutter the palette for ordinary users.
     */
    openFileProfileTabVisible: false
  },
  features: {
    /** Set when `@mlightcad/cad-agent-plugin` is installed and registered. */
    agentPlugin: false
  },
  /**
   * Bumped by the MEM command after publishing a fresh snapshot so an already
   * mounted Memory palette can pick it up without remounting.
   */
  memoryProfileTick: 0,
  /**
   * Bumped by the OPENPERF command after publishing the latest open profile.
   */
  openFileProfileTick: 0
})
