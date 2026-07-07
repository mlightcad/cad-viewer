import {
  AcDbDatabase,
  AcDbFileType,
  AcDbObjectId,
  AcDbOpenDatabaseError,
  AcDbOpenDatabaseOptions,
  log
} from '@mlightcad/data-model'

import { eventBus } from '../editor'
import { AcEdOpenMode } from '../editor/view'
import { AcApEntityService } from '../service/AcApEntityService'
import type { AcApLayerIsoSnapshot } from '../service/AcApLayerIsoState'
import { AcApLayerService } from '../service/AcApLayerService'
import type { AcApLayerStore } from '../service/AcApLayerStore'
import { AcApLayerStore as AcApLayerStoreImpl } from '../service/AcApLayerStore'
import {
  acapRunServiceEdit,
  LAYER_EDIT_LABEL
} from '../service/AcApServiceEdit'
import type {
  AcApLayerIsolateResult,
  AcApLayerIsolationMode
} from '../service/types'
import { LAYER_LOCKED_FLAG } from '../service/types'
import type { AcApLayerPreviousSnapshot } from './AcApLayerSessionState'
import { AcApOpenDatabaseOptions } from './AcDbOpenDatabaseOptions'

/**
 * Represents a CAD document that manages a drawing database and associated metadata.
 *
 * This class handles:
 * - Opening CAD files from URIs or file content (DWG/DXF formats)
 * - Managing document properties (title, access mode)
 * - Providing access to the underlying database
 * - Handling file loading errors through event emission
 */
export class AcApDocument {
  /** The URI of the opened document, if opened from a URI */
  private _uri?: string
  /** The underlying CAD database containing all drawing data */
  private _database: AcDbDatabase
  /** The file name of the document */
  private _fileName: string = ''
  /** The display title of the document */
  private _docTitle: string = ''
  /** The access mode for the document */
  private _openMode: AcEdOpenMode = AcEdOpenMode.Write
  /** Object ids temporarily hidden by HIDEOBJECTS in the current session */
  private _hiddenObjects = new Set<AcDbObjectId>()
  /** Layer table snapshot captured before the last layer-modifying operation (`LAYERP`). */
  private _layerPreviousSnapshot?: AcApLayerPreviousSnapshot
  /** Isolation snapshot from the latest `LAYISO` run for `LAYUNISO`. */
  private _layerIsoSnapshot?: AcApLayerIsoSnapshot
  /** Lazily created layer service bound to this document's database. */
  private _layerService?: AcApLayerService
  /** Lazily created entity service bound to this document's database. */
  private _entityService?: AcApEntityService
  /** Lazily created layer store bound to this document. */
  private _layerStore?: AcApLayerStore

  /**
   * Creates a new document instance with an empty database.
   *
   * The document is initialized with an "Untitled" title and write mode enabled.
   */
  constructor() {
    this._database = new AcDbDatabase()
    this.docTitle = 'Untitled'
    this._openMode = AcEdOpenMode.Write
  }

  /**
   * Opens a CAD document from a URI.
   *
   * @param uri - The URI of the CAD file to open
   * @param options - Options for opening the database
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example
   * ```typescript
   * const success = await document.openUri('https://example.com/drawing.dwg', {
   *   mode: AcEdOpenMode.Read
   * });
   * ```
   */
  async openUri(uri: string, options: AcApOpenDatabaseOptions) {
    this._uri = uri
    this._openMode = options?.mode ?? AcEdOpenMode.Read
    this._fileName = this.getFileNameFromUri(uri)
    const openErrorBefore = this._database.lastOpenError
    let isSuccess = true
    try {
      // Convert to base options for database method
      const baseOptions: AcDbOpenDatabaseOptions = {
        ...options,
        readOnly: this._openMode === AcEdOpenMode.Read
      }
      await this._database.openUri(uri, baseOptions)
      this.docTitle = this._fileName
    } catch {
      isSuccess = false
      this.emitOpenFileFailed(uri, openErrorBefore)
    }
    return isSuccess
  }

  /**
   * Opens a CAD document from file content.
   *
   * @param fileName - The name of the file (used to determine file type from extension)
   * @param content - The file content as string or ArrayBuffer
   * @param options - Options for opening the database
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example
   * ```typescript
   * const fileContent = await fetch('drawing.dwg').then(r => r.arrayBuffer());
   * const success = await document.openDocument('drawing.dwg', fileContent, {
   *   mode: AcEdOpenMode.Write
   * });
   * ```
   */
  async openDocument(
    fileName: string,
    content: ArrayBuffer,
    options: AcApOpenDatabaseOptions
  ) {
    let isSuccess = true
    this._fileName = fileName
    this._openMode = options?.mode ?? AcEdOpenMode.Read
    const openErrorBefore = this._database.lastOpenError
    try {
      const fileExtension = fileName.split('.').pop()?.toLocaleLowerCase()
      // Convert to base options for database method
      const baseOptions: AcDbOpenDatabaseOptions = {
        ...options,
        readOnly: this._openMode === AcEdOpenMode.Read
      }
      await this._database.read(
        content,
        baseOptions,
        fileExtension == 'dwg' ? AcDbFileType.DWG : AcDbFileType.DXF
      )
      this.docTitle = this._fileName
    } catch {
      isSuccess = false
      this.emitOpenFileFailed(fileName, openErrorBefore)
    }
    return isSuccess
  }

  /**
   * Clears file identity after creating a document from a template.
   *
   * Template content remains in the database; only URI, file name, and title
   * are reset so the document presents as a new unsaved drawing.
   */
  resetNewDocumentIdentity() {
    this._uri = undefined
    this._fileName = ''
    this.docTitle = 'Untitled'
  }

  /**
   * Gets the URI of the document if opened from a URI.
   *
   * @returns The document URI, or undefined if not opened from URI
   */
  get uri() {
    return this._uri
  }

  /**
   * Gets the database object containing all drawing data.
   *
   * @returns The underlying CAD database instance
   */
  get database() {
    return this._database
  }

  /**
   * Gets the file name of the current document.
   *
   * @returns The file name, or an empty string for untitled documents
   */
  get fileName() {
    return this._fileName
  }

  /**
   * Gets the display title of the document.
   *
   * @returns The title of the document
   */
  get docTitle() {
    return this._docTitle
  }

  /**
   * Sets the display title of the document.
   *
   * Notes:
   * The browser tab title isn't updated on purpose because users may use it as
   * one component and don't want to the browser tab title changed. So if you
   * want to change the browser tab title, you can listen events
   * `AcApDocManager.events.documentActivated` to change it in your event listener.
   *
   * @param value - The new document title
   */
  set docTitle(value: string) {
    this._docTitle = value
  }

  /**
   * Gets the access mode of the document.
   *
   * @returns The access mode (Read, Review, or Write)
   */
  get openMode() {
    return this._openMode
  }

  /**
   * Returns true when the object is temporarily hidden by HIDEOBJECTS.
   */
  isObjectHidden(objectId: AcDbObjectId) {
    return this._hiddenObjects.has(objectId)
  }

  /**
   * Records one object as temporarily hidden in the current session.
   */
  addHiddenObject(objectId: AcDbObjectId) {
    this._hiddenObjects.add(objectId)
  }

  /**
   * Returns and clears all temporarily hidden object ids.
   */
  takeHiddenObjects(): AcDbObjectId[] {
    const hiddenIds = [...this._hiddenObjects]
    this._hiddenObjects.clear()
    return hiddenIds
  }

  /**
   * Returns the layer service for this document's database.
   */
  get layerService(): AcApLayerService {
    if (!this._layerService) {
      this._layerService = new AcApLayerService(this._database)
    }
    return this._layerService
  }

  /**
   * Returns the entity service for this document's database.
   */
  get entityService(): AcApEntityService {
    if (!this._entityService) {
      this._entityService = new AcApEntityService(this._database)
    }
    return this._entityService
  }

  /**
   * Returns the layer store for UI integrations observing this document.
   */
  get layerStore(): AcApLayerStore {
    if (!this._layerStore) {
      this._layerStore = new AcApLayerStoreImpl(this)
    }
    return this._layerStore
  }

  /**
   * Tears down document-scoped services and session state.
   *
   * Call before replacing this document's drawing content or when discarding
   * the document. Lazy services are recreated on the next access.
   */
  destroy(): void {
    this._layerStore?.destroy()
    this._layerStore = undefined
    this._layerService = undefined
    this._entityService = undefined
    this.clearLayerPreviousState()
    this.clearLayerIsoSnapshot()
    this._hiddenObjects.clear()
  }

  /**
   * Captures the current layer table state for {@link AcApLayerPCmd}.
   */
  captureLayerPreviousState(): void {
    const db = this._database
    this._layerPreviousSnapshot = {
      clayer: db.clayer,
      states: [...db.tables.layerTable.newIterator()].map(layer => ({
        name: layer.name,
        isOn: !layer.isOff,
        isFrozen: layer.isFrozen,
        isLocked: ((layer.standardFlags ?? 0) & LAYER_LOCKED_FLAG) !== 0
      }))
    }
  }

  /**
   * Returns the stored `LAYERP` snapshot without clearing it.
   */
  getLayerPreviousSnapshot(): AcApLayerPreviousSnapshot | undefined {
    return this._layerPreviousSnapshot
  }

  /**
   * Clears the stored `LAYERP` snapshot without restoring it.
   */
  clearLayerPreviousState(): void {
    this._layerPreviousSnapshot = undefined
  }

  /**
   * Stores the latest `LAYISO` snapshot for {@link AcApLayerUnisoCmd}.
   *
   * @param snapshot - Isolation snapshot produced by `LAYISO`.
   */
  setLayerIsoSnapshot(snapshot: AcApLayerIsoSnapshot): void {
    this._layerIsoSnapshot = snapshot
  }

  /**
   * Consumes the stored `LAYISO` snapshot for a one-shot `LAYUNISO` restore.
   */
  consumeLayerIsoSnapshot(): AcApLayerIsoSnapshot | undefined {
    const snapshot = this._layerIsoSnapshot
    this._layerIsoSnapshot = undefined
    return snapshot
  }

  /**
   * Clears the stored `LAYISO` snapshot without restoring it.
   */
  clearLayerIsoSnapshot(): void {
    this._layerIsoSnapshot = undefined
  }

  /**
   * Restores the previously captured `LAYERP` layer table state.
   *
   * @returns `true` when a snapshot existed and was applied.
   */
  restoreLayerPreviousState(): boolean {
    const snapshot = this._layerPreviousSnapshot
    if (!snapshot) return false

    return acapRunServiceEdit(this._database, LAYER_EDIT_LABEL, () =>
      AcApLayerService.applyLayerPreviousSnapshot(this._database, snapshot)
    )
  }

  /**
   * Isolates layers using `LAYISO` semantics and stores an undo snapshot.
   *
   * @param layerNames - Names of layers to keep visible.
   * @param isolationMode - How non-isolated layers are hidden.
   * @returns Public isolation result, or `undefined` when `layerNames` is empty.
   */
  isolateLayers(
    layerNames: string[],
    isolationMode: AcApLayerIsolationMode
  ): AcApLayerIsolateResult | undefined {
    const result = this.layerService.isolateLayers(layerNames, isolationMode)
    if (!result) return undefined

    this._layerIsoSnapshot = result.isoSnapshot
    return {
      layerNames: result.layerNames,
      affectedLayerCount: result.affectedLayerCount
    }
  }

  /**
   * Restores the latest `LAYISO` snapshot (`LAYUNISO`).
   *
   * @returns Number of restored layers, or `undefined` when no snapshot exists.
   */
  unisolateLayers(): number | undefined {
    const snapshot = this.consumeLayerIsoSnapshot()
    if (!snapshot) return undefined
    return this.layerService.unisolateFromSnapshot(snapshot)
  }

  /**
   * Emits `failed-to-open-file` with structured error details from the database.
   */
  private emitOpenFileFailed(
    fileName: string,
    openErrorBefore: AcDbOpenDatabaseError | null = null
  ): void {
    const openError = this._database.lastOpenError
    const isFreshOpenError = openError != null && openError !== openErrorBefore
    eventBus.emit('failed-to-open-file', {
      fileName,
      ...(isFreshOpenError && {
        errorCode: openError.code,
        errorMessage: openError.message
      })
    })
  }

  /**
   * Extracts the file name from a URI.
   *
   * @param uri - The URI to extract the file name from
   * @returns The extracted file name, or empty string if extraction fails
   * @private
   */
  private getFileNameFromUri(uri: string): string {
    try {
      // Create a new URL object
      const url = new URL(uri)
      // Get the pathname from the URL
      const pathParts = url.pathname.split('/')
      // Return the last part of the pathname as the file name
      return pathParts[pathParts.length - 1] || ''
    } catch (error) {
      log.error('Invalid URI:', error)
      return ''
    }
  }
}
