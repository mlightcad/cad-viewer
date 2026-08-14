import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

/** Actions invoked by the `markuppanel` command to prepare and open review UI. */
export interface AcExMarkupPanelCommandActions {
  /** Ensures the dock panel and review tab exist before opening. */
  prepare(): void
  /** Activates the review tab in the dock panel. */
  toggle(): void
}

/**
 * Command that opens the review palette in the dock panel.
 */
export class AcApMarkupPanelUiCmd extends AcEdCommand {
  /**
   * @param actions - Prepare and open callbacks wired by the plugin.
   */
  constructor(private readonly actions: AcExMarkupPanelCommandActions) {
    super()
  }

  /**
   * Ensures the dock panel is ready, then opens or focuses the review tab.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    this.actions.prepare()
    this.actions.toggle()
  }
}
