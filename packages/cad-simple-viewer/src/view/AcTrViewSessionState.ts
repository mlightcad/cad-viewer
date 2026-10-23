import type { AcDbObjectId } from '@mlightcad/data-model'
import type { AcTrMeshGlyphWorldBatch } from '@mlightcad/three-renderer'

import type { AcApOpenViewMode } from '../app/AcApOpenDatabaseOptions'
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
  /**
   * Open options → Initial view for this document (Extents / Saved).
   * Kept with the session so a late first visit to any unvisited layout
   * still matches the choice used when the file was opened.
   */
  openViewMode: AcApOpenViewMode
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
  /**
   * Scene-level TrueType mesh-glyph InstancedMesh batch for this document.
   * Parked with the scene so multi-doc switch keeps pick/highlight maps
   * aligned with the parked layer groups.
   */
  meshGlyphBatch: AcTrMeshGlyphWorldBatch
}
