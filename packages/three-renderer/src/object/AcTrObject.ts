import * as THREE from 'three'

import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../style/AcTrStyleManager'

/**
 * Base class for all drawable object
 */
export class AcTrObject extends THREE.Object3D {
  private _context: AcTrRenderContext

  constructor(context: AcTrRenderContext) {
    super()
    this._context = context
  }

  get renderContext() {
    return this._context
  }

  get styleManager(): AcTrStyleManager {
    return this._context.styleManager
  }

  /**
   * @inheritdoc
   */
  copy(object: AcTrObject, recursive?: boolean) {
    this._context = object._context
    return super.copy(object, recursive)
  }
}
