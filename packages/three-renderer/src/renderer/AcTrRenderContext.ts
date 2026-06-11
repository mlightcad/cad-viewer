import {
  AcTrBatchDrawPolicy,
  defaultBatchDrawPolicy
} from '../draw/AcTrBatchDrawPolicy'
import { AcTrStyleManager } from '../style/AcTrStyleManager'

/**
 * Per-renderer shared services passed into drawable objects during conversion.
 *
 * Bundles material/style access with scene-graph policies so entity instances
 * only hold one reference while each concern stays in its own module.
 */
export class AcTrRenderContext {
  readonly styleManager: AcTrStyleManager
  batchDrawPolicy: AcTrBatchDrawPolicy

  constructor(
    styleManager: AcTrStyleManager = new AcTrStyleManager(),
    batchDrawPolicy: AcTrBatchDrawPolicy = defaultBatchDrawPolicy
  ) {
    this.styleManager = styleManager
    this.batchDrawPolicy = batchDrawPolicy
  }
}
