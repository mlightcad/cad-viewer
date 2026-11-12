import {
  ACAP_PALETTE_NAMED_TAB,
  AcApContext,
  AcApPaletteService,
  AcEdCommand
} from '@mlightcad/cad-simple-viewer'

/**
 * Opens the measurement list palette.
 */
export class AcApMeasurementPanelCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    AcApPaletteService.openNamedTab(ACAP_PALETTE_NAMED_TAB.measurements)
  }
}
