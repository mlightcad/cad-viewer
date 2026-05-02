import { AcApContext, AcApDocManager, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

export class AcApHatchRibbonCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const hatch = store.hatch
    const script = [
      '-hatch',
      'Pattern',
      hatch.patternName,
      'Scale',
      String(hatch.patternScale),
      'Angle',
      String(hatch.patternAngle),
      'HatchStyle',
      hatch.style,
      'AssociativeMode',
      hatch.associative ? 'Yes' : 'No'
    ].join('\n')
    AcApDocManager.instance.sendStringToExecute(script)
  }
}
