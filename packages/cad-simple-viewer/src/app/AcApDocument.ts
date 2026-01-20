import {
  AcDbDatabase,
  AcDbFileType,
  AcDbOpenDatabaseOptions
} from '@mlightcad/data-model'

import { eventBus } from '../editor'

/**
 * Represents a CAD document that manages a drawing database and associated metadata.
 *
 * This class handles:
 * - Opening CAD files from URIs or file content (DWG/DXF formats)
 * - Managing document properties (title, read-only state)
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
  /** Whether the document is opened in read-only mode */
  private _isReadOnly: boolean = true

  /**
   * Creates a new document instance with an empty database.
   *
   * The document is initialized with an "Untitled" title and read-only mode enabled.
   */
  constructor() {
    this._database = new AcDbDatabase()
    this.docTitle = 'Untitled'
  }

  /**
   * Opens a CAD document from a URI.
   *
   * @param uri - The URI of the CAD file to open
   * @param options - Options for opening the database, including read-only mode
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example
   * ```typescript
   * const success = await document.openUri('https://example.com/drawing.dwg', {
   *   readOnly: true
   * });
   * ```
   */
  async openUri(uri: string, options: AcDbOpenDatabaseOptions) {
    this._uri = uri
    this._isReadOnly = (options && options.readOnly) || false
    this._fileName = this.getFileNameFromUri(uri)
    let isSuccess = true
    try {
      await this._database.openUri(uri, options)
      this.docTitle = this._fileName
    } catch (_) {
      isSuccess = false
      eventBus.emit('failed-to-open-file', { fileName: uri })
    }
    return isSuccess
  }

  /**
   * Opens a CAD document from file content.
   *
   * @param fileName - The name of the file (used to determine file type from extension)
   * @param content - The file content as string or ArrayBuffer
   * @param options - Options for opening the database, including read-only mode
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example
   * ```typescript
   * const fileContent = await fetch('drawing.dwg').then(r => r.arrayBuffer());
   * const success = await document.openDocument('drawing.dwg', fileContent, {
   *   readOnly: false
   * });
   * ```
   */
  async openDocument(
    fileName: string,
    content: ArrayBuffer,
    options: AcDbOpenDatabaseOptions
  ) {
    let isSuccess = true
    this._fileName = fileName
    try {
      const fileExtension = fileName.split('.').pop()?.toLocaleLowerCase()
      await this._database.read(
        content,
        options,
        fileExtension == 'dwg' ? AcDbFileType.DWG : AcDbFileType.DXF
      )
      this.docTitle = this._fileName
    } catch {
      isSuccess = false
      eventBus.emit('failed-to-open-file', { fileName: fileName })
    }
    return isSuccess
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
   * Gets whether the document is opened in read-only mode.
   *
   * @returns True if the document is read-only, false if editable
   */
  get isReadOnly() {
    return this._isReadOnly
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
      console.error('Invalid URI:', error)
      return ''
    }
  }
}
