import {
  ACGI_DARK_THEME_FOREGROUND,
  ACGI_LIGHT_THEME_FOREGROUND,
  AcGiContext,
  acgiIsLightBackground
} from '@mlightcad/data-model'

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
 * Extends {@link AcGiContext} so {@link AcGiRenderer.context} can carry the
 * active database and background-dependent colour resolution state.
 *
 * Defaults to {@link alwaysBatchDrawPolicy} so entities merge in
 * {@link AcTrBatchedGroup} whenever possible. Large-coordinate precision is
 * handled at render time by relative-to-eye rebasing in {@link AcTrRenderer}.
 * Inject {@link defaultBatchDrawPolicy} only when you need the legacy
 * coordinate-threshold unbatch path for testing or compatibility.
 */
export class AcTrRenderContext extends AcGiContext {
  readonly styleManager: AcTrStyleManager
  batchDrawPolicy: AcTrBatchDrawPolicy

  constructor(
    styleManager: AcTrStyleManager = new AcTrStyleManager(),
    batchDrawPolicy: AcTrBatchDrawPolicy = alwaysBatchDrawPolicy
  ) {
    super()
    this.styleManager = styleManager
    this.batchDrawPolicy = batchDrawPolicy
  }

  /**
   * Refreshes background-dependent fields from the canvas background colour.
   */
  syncBackgroundColor(backgroundColor: number): void {
    this.backgroundIsDark = !acgiIsLightBackground(backgroundColor)
    this.foregroundOnDark = ACGI_DARK_THEME_FOREGROUND
    this.foregroundOnLight = ACGI_LIGHT_THEME_FOREGROUND
  }
}
