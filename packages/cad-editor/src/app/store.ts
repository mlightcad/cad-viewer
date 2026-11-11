import { reactive } from 'vue'

/** Command panel shown as a palette tab (see `AcApPaletteService`). */
export interface MlHostedPanel {
  /** Palette tab name, `hosted:<content id>`. */
  tab: string
  title: string
  element: HTMLElement
}

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
    openFileProfileTabVisible: false,
    /**
     * Detect and Convert tab. Shown only while BDETECT runs, since its list
     * belongs to that command.
     */
    bdetectTabVisible: false,
    /**
     * Search and Convert tab. Shown only while BSEARCH reviews its found
     * instances (also when BDETECT reviews one group).
     */
    bsearchTabVisible: false,
    /**
     * Panels commands show through `AcApPaletteService` (e.g. `pdftext`).
     * Each is a palette tab while its command runs.
     */
    hostedPanels: [] as MlHostedPanel[],
    /** Bumped by the FIND command so the Find palette focuses its query field. */
    findFocusTick: 0
  },
  features: {
    /** Set when `@mlightcad/cad-agent-plugin` is installed and registered. */
    agentPlugin: false,
    /** Set when `@mlightcad/cad-llm-plugin` is installed and registered. */
    llmPlugin: false,
    /** Set when `@mlightcad/cad-script-plugin` is installed and registered. */
    scriptPlugin: false
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
