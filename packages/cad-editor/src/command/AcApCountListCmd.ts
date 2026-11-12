import {
  ACAP_PALETTE_NAMED_TAB,
  AcApContext,
  AcApPaletteService,
  AcEdCommand
} from '@mlightcad/cad-simple-viewer'

/**
 * Opens the Count palette (AutoCAD-style COUNTLIST).
 *
 * The palette lists visible model-space blocks with instance counts and
 * supports search, area filtering, selection, and zoom. Create Table is
 * intentionally not implemented.
 */
export class AcApCountListCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    AcApPaletteService.openNamedTab(ACAP_PALETTE_NAMED_TAB.countList)
  }
}