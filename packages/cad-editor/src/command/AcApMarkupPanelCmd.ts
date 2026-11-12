import {
  ACAP_PALETTE_NAMED_TAB,
  AcApContext,
  AcApPaletteService,
  AcEdCommand
} from '@mlightcad/cad-simple-viewer'

/**
 * Opens the Design Review markup palette.
 */
export class AcApMarkupPanelCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    AcApPaletteService.openNamedTab(ACAP_PALETTE_NAMED_TAB.review)
  }
}
