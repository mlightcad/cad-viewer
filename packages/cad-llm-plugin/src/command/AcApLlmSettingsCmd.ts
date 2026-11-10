import { type AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { AcUiLlmSettingsDialog } from '../ui/AcUiLlmSettingsDialog'

/**
 * Opens the shared AI model settings dialog. The command name is
 * `llmsettings`.
 */
export class AcApLlmSettingsCmd extends AcEdCommand {
  /** The settings live in browser storage, not in the drawing. */
  recordsUndoStack = false

  /**
   * Shows {@link AcUiLlmSettingsDialog} over the current view.
   *
   * @param context - Application context providing the view host.
   */
  async execute(context: AcApContext) {
    await AcUiLlmSettingsDialog.open({
      host: context.view?.container ?? document.body
    })
  }
}
