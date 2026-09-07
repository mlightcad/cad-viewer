import type { AcDbObjectId } from '@mlightcad/data-model'

import type { AcTrLayoutViewManager } from './AcTrLayoutViewManager'
import type { AcTrScene } from './AcTrScene'

/**
 * GPU and camera state for one parked document session.
 *
 * Owned by {@link AcApDocSession} while the shared {@link AcTrView2d} is
 * showing a different document.
 */
export interface AcTrViewSessionState {
  /** Scene graph for this document (layouts, layers, HTML transients). */
  scene: AcTrScene
  /** Per-layout cameras for this document. */
  layoutViewManager: AcTrLayoutViewManager
  /** Layouts that have already received first-visit framing. */
  initializedLayouts: Set<AcDbObjectId>
  /** Layouts framed by document-open, not first user visit. */
  externallyFramedLayouts: Set<AcDbObjectId>
  /** Layouts currently being batch-converted. */
  loadingLayouts: Set<AcDbObjectId>
  /** Missing raster images keyed by entity id. */
  missedImages: Map<AcDbObjectId, string>
  /**
   * Missing fonts reported while this document was active.
   * Parked with the session so FontManager's live map can track the active
   * document only; restored when the session becomes active again.
   */
  missedFonts: Record<string, number>
  /** Selected entity ids at the moment the session was parked. */
  selectionIds: AcDbObjectId[]
}
