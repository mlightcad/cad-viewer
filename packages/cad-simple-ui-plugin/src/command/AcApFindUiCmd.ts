import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

/** Actions invoked by the `find` command to prepare and open the find UI. */
export interface AcUiFindCommandActions {
  /** Ensures the dock panel and find tab exist before opening. */
  prepare(): void
  /** Activates the find tab in the dock panel and focuses the query field. */
  toggle(): void
}

/**
 * Command that opens the text search (FIND) tab in the dock panel.
 */
export class AcApFindUiCmd extends AcEdCommand {
  /**
   * @param actions - Prepare and open callbacks wired by the plugin.
   */
  constructor(private readonly actions: AcUiFindCommandActions) {
    super()
  }

  /**
   * Ensures the dock panel is ready, then opens the find tab.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    this.actions.prepare()
    this.actions.toggle()
  }
}
