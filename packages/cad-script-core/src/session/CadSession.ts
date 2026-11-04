import type {
  AcDbDatabase,
  AcDbEntity,
  AcGeBox2d,
  AcGeBox3d
} from '@mlightcad/data-model'

import type { CaptureDrawingPreviewResult } from '../preview/types'
import type {
  CadScriptHtmlExportOptions,
  CadScriptHtmlExportResult
} from '../script/saveHtml'
import type { CadScriptPdfExportOptions } from '../script/savePdf'

/**
 * Open-mode codes used by {@link CadSessionDocument.openMode}.
 *
 * The values match `AcEdOpenMode` in `@mlightcad/cad-simple-viewer`, so a live
 * `AcApDocument` satisfies {@link CadSessionDocument} without an adapter. A
 * higher value includes the lower ones: only `Write` allows edits.
 */
export const CadSessionOpenMode = {
  /** View only. */
  Read: 0,
  /** View and review markup; drawing edits are still rejected. */
  Review: 4,
  /** Full read/write access. */
  Write: 8
} as const

/** One of the {@link CadSessionOpenMode} values. */
export type CadSessionOpenMode =
  (typeof CadSessionOpenMode)[keyof typeof CadSessionOpenMode]

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
 * Document surface used by the script runtime.
 *
 * A viewer `AcApDocument` satisfies this shape. `createDatabaseSession`
 * provides a headless implementation backed only by an `AcDbDatabase`.
 */
export interface CadSessionDocument {
  /** Drawing database for the active document. */
  database: AcDbDatabase
  /**
   * Open mode, one of {@link CadSessionOpenMode}. Edits require
   * {@link CadSessionOpenMode.Write}.
   */
  openMode: number
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
  /**
   * Current selection set. In a viewer, adding ids also highlights them.
   */
  selectionSet: {
    readonly ids: readonly string[]
    add(value: string | readonly string[]): void
    delete(value: string | readonly string[]): void
    clear(): void
  }
  /** Fits the camera to drawable geometry. Headless views may do nothing. */
  zoomToFitDrawing(): void
  /**
   * Extents of drawable geometry, used by drawing-context snapshots.
   *
   * @returns Bounds, or `undefined` when the view has no geometry yet.
   */
  getDrawingExtents(): AcGeBox2d | undefined
  /**
   * Entities whose bounds intersect `box`.
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
 *
 * The optional hooks are how a host adds behavior this package cannot provide
 * by itself (UI notifications, rendering). When a hook is missing the runtime
 * falls back to plain `@mlightcad/data-model` behavior.
 *
 * A session that declares a hook key with the value `undefined` opts out of
 * host defaults for it: `withViewerDefaults` in `@mlightcad/cad-agent-core`
 * only fills hooks whose keys are absent.
 */
export interface CadSession {
  /**
   * Returns the active document, or `undefined` when none is open.
   */
  getDocument(): CadSessionDocument | undefined
  /**
   * Returns the active view, or `undefined` when there is no view.
   */
  getView(): CadSessionView | undefined
  /**
   * Runs one undoable database edit.
   *
   * Defaults to `database.runDatabaseEdit(label, fn)`. A viewer overrides this
   * to also notify the UI (undo stack, redraw) once the edit commits.
   *
   * @param database - Database being edited.
   * @param label - Undo label.
   * @param fn - Mutation callback.
   */
  runEdit?(database: AcDbDatabase, label: string, fn: () => void): void
  /**
   * Renders a PNG of the current drawing for `cad.view.capturePreview`.
   *
   * Sessions without a renderer leave this out; preview requests are then
   * skipped and a note is written to the script log.
   *
   * @param longSide - Maximum output width or height in pixels.
   */
  capturePreview?(longSide: number): Promise<CaptureDrawingPreviewResult>
  /**
   * Renders the current drawing to PDF for `cad.file.savePdf`.
   *
   * When this is a function, the script runtime uses it instead of the
   * built-in `@mlightcad/cad-pdf-core` fallback (viewer hosts supply fonts).
   * Declare the key as `undefined` to opt out of host defaults without
   * disabling the core fallback.
   *
   * @param options - Framing, layout, text, and colour options.
   */
  exportPdf?(options: CadScriptPdfExportOptions): Promise<Uint8Array>
  /**
   * Builds offline HTML (or a multi-file zip) for `cad.file.saveHtml`.
   *
   * Sessions without a viewer HTML pipeline leave this out or set it to
   * `undefined`; those requests are then skipped with a log note.
   *
   * @param options - Format, layout, and background options.
   */
  exportHtml?(
    options: CadScriptHtmlExportOptions
  ): Promise<CadScriptHtmlExportResult>
}
