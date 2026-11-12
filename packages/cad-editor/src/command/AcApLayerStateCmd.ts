import {
  ACAP_PALETTE_NAMED_TAB,
  AcApContext,
  AcApPaletteService,
  AcEdCommand
} from '@mlightcad/cad-simple-viewer'

export class AcApLayerStateCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    AcApPaletteService.openNamedTab(ACAP_PALETTE_NAMED_TAB.layers)
  }
}
