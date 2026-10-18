import type { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import type {
  AcDbDatabase,
  AcDbEntity,
  AcGeBox2d,
  AcGeBox3d
} from '@mlightcad/data-model'

/**
 * Layer row exposed to agents. Matches the fields published by the viewer layer store.
 */
export interface CadSessionLayerInfo {
  /** Layer table record name. */
  name: string
  /** Whether the layer is on (not off). */
  isOn: boolean
  /** Whether the layer is frozen. */
  isFrozen: boolean
  /** Whether the layer is locked. */
  isLocked: boolean
}

/**
 * Subset of {@link AcApDocument} used by the agent runtime.
 *
 * The live document satisfies this shape. Tests and a future out-of-process MCP
 * server can supply their own implementation.
 */
export interface CadSessionDocument {
  /** Drawing database for the active document. */
  database: AcDbDatabase
  /** Read or write open mode. */
  openMode: AcEdOpenMode
  /** Human-readable document title. */
  docTitle: string
  /** Layer list and current-layer lookup. */
  layerStore: {
    getLayers(): CadSessionLayerInfo[]
    getCurrentLayerName(): string
  }
  /** Layer creation and CLAYER changes. */
  layerService: {
    setCurrentLayer(name: string): boolean
    createLayers(names: string[]): { created: number; existed: string[] }
  }
  /** Entity lookup and geometric edits. */
  entityService: {
    eraseEntities(ids: string[]): number
    getEntitiesByIds(ids: string[]): AcDbEntity[]
    translateEntities(
      entities: AcDbEntity[],
      displacement: { x: number; y: number; z: number }
    ): number
    rotateEntities(
      entities: AcDbEntity[],
      basePoint: { x: number; y: number; z: number },
      angleRad: number
    ): number
  }
}

/**
 * Subset of the active 2D view used for selection, zoom, and spatial search.
 */
export interface CadSessionView {
  /** Current selection set. Adding ids highlights them through the viewer context. */
  selectionSet: {
    readonly ids: readonly string[]
    add(value: string | readonly string[]): void
    delete(value: string | readonly string[]): void
    clear(): void
  }
  /** Fits the camera to drawable geometry. */
  zoomToFitDrawing(): void
  /**
   * Scene or header extents used by drawing-context snapshots.
   *
   * @returns Bounds, or `undefined` when the view has no geometry yet.
   */
  getDrawingExtents(): AcGeBox2d | undefined
  /**
   * Entities whose scene bounds intersect `box`.
   *
   * @param box - Query box in WCS.
   * @returns Hits that include an entity id.
   */
  search(box: AcGeBox2d | AcGeBox3d): Array<{ id: string }>
}

/**
 * Call-time access to the active drawing and view.
 *
 * Implementations must read the current document on each call so MDI switches
 * are visible to later tool invocations.
 */
export interface CadSession {
  /**
   * Returns the active document, or `undefined` when none is open.
   */
  getDocument(): CadSessionDocument | undefined
  /**
   * Returns the active view, or `undefined` when the viewer has no view yet.
   */
  getView(): CadSessionView | undefined
}
