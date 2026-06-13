import {
  AcTrBatchDrawPolicy,
  alwaysBatchDrawPolicy
} from '../draw/AcTrBatchDrawPolicy'
import { AcTrStyleManager } from '../style/AcTrStyleManager'

/**
 * Per-renderer shared services passed into drawable objects during conversion.
 *
 * Bundles material/style access with scene-graph policies so entity instances
 * only hold one reference while each concern stays in its own module.
 *
 * Defaults to {@link alwaysBatchDrawPolicy} so entities merge in
 * {@link AcTrBatchedGroup} whenever possible. Large-coordinate precision is
 * handled at render time by relative-to-eye rebasing in {@link AcTrRenderer}.
 * Inject {@link defaultBatchDrawPolicy} only when you need the legacy
 * coordinate-threshold unbatch path for testing or compatibility.
 */
export class AcTrRenderContext {
  readonly styleManager: AcTrStyleManager
  batchDrawPolicy: AcTrBatchDrawPolicy

  constructor(
    styleManager: AcTrStyleManager = new AcTrStyleManager(),
    batchDrawPolicy: AcTrBatchDrawPolicy = alwaysBatchDrawPolicy
  ) {
    this.styleManager = styleManager
    this.batchDrawPolicy = batchDrawPolicy
  }
}
