import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

/** Actions invoked by the `measurementpanel` command to prepare and open measurement UI. */
export interface AcUiMeasurementPanelCommandActions {
  /** Ensures the dock panel and measurements tab exist before opening. */
  prepare(): void
  /** Activates the measurements tab in the dock panel. */
  toggle(): void
}

/**
 * Command that opens the measurement list in the dock panel.
 */
export class AcApMeasurementPanelUiCmd extends AcEdCommand {
  /**
   * @param actions - Prepare and open callbacks wired by the plugin.
   */
  constructor(private readonly actions: AcUiMeasurementPanelCommandActions) {
    super()
  }

  /**
   * Ensures the dock panel is ready, then opens or focuses the measurements tab.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    this.actions.prepare()
    this.actions.toggle()
  }
}
