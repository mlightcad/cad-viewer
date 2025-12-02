import { AcGePoint3dLike } from '@mlightcad/data-model'

import { AcEdPromptPointOptions } from '../prompt/AcEdPromptPointOptions'
import { AcEdInputHandler } from './AcEdInputHandler'

/**
 * Handles validation and parsing of point user input.
 */
export class AcEdPointHandler implements AcEdInputHandler<AcGePoint3dLike> {
  protected options: AcEdPromptPointOptions

  constructor(options: AcEdPromptPointOptions) {
    this.options = options
  }

  parse(x: string, y?: string) {
    const nx = Number(x)
    const ny = Number(y)

    if (isNaN(nx) || isNaN(ny)) {
      return null
    }

    return { x: nx, y: ny, z: 0 }
  }
}
