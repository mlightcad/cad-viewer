import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbBlockTableRecordFlag,
  AcDbDatabase,
  AcDbObjectId,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import {
  acTrCheckOverlaySignal,
  type AcTrOverlayTransform
} from '../view/AcTrOverlayOptions'
import { AcApDocManager } from './AcApDocManager'

/**
 * Transform applied to a reference overlay (from XATTACH INSERT).
 *
 * Position, uniform scale, and Z-axis rotation are applied to the overlay
 * layout's internal scene object so the xref appears aligned with the host INSERT.
 */
export type AcApXrefTransform = AcTrOverlayTransform

/**
 * One loaded external-reference display session.
 *
 * Host document owns only xref metadata (BTR + INSERT). Geometry lives in a
 * read-only secondary database and an overlay layout that is not registered in
 * AcTrScene's editable layout map.
 */
export interface AcApXrefSession {
  /** Unique session id (e.g. `xref-1`). */
  id: string
  /** Host document session; source block names are only unique within it. */
  documentId: string
  /** Host block-table record name for this xref. */
  blockName: string
  /** Host INSERT object id, when an INSERT was created. */
  insertId?: AcDbObjectId
  /** Overlay id returned by {@link AcApDocManager.loadOverlay}. */
  overlayId: string
  /** Source file path or name used for display. */
  sourcePath: string
  /** Whether the overlay geometry is currently visible. */
  visible: boolean
}

/**
 * Options for attaching a read-only xref overlay via {@link AcApXrefManager.attachOverlay}.
 *
 * Provide either {@link sourceDb} or {@link content}; if both are absent, attach fails.
 */
export interface AcApXrefAttachOptions {
  /** Host block-table record name to associate with this overlay. */
  blockName: string
  /** File name passed to the overlay loader when {@link content} is used. */
  fileName: string
  /** Raw DWG/DXF bytes; used when {@link sourceDb} is not provided. */
  content?: ArrayBuffer
  /** When set, skips a second file read and uses this database for rendering. */
  sourceDb?: AcDbDatabase
  /** Source file path or display name stored on the session. */
  sourcePath: string
  /** Optional transform applied before the overlay layout enters the scene. */
  transform?: AcApXrefTransform
  /** When set, associates the session with an existing host INSERT. */
  insertId?: AcDbObjectId
  /** Cancels unfinished parsing or geometry preparation. */
  signal?: AbortSignal
}

/**
 * Manages read-only reference drawing sessions overlaid on the active document.
 *
 * XATTACH and the External References palette should go through this manager
 * instead of binding source entities into the host database.
 */
export class AcApXrefManager {
  /** Singleton instance, created on first access via {@link instance}. */
  private static _instance?: AcApXrefManager
  /** Active xref display sessions keyed by session id. */
  private _sessions = new Map<string, AcApXrefSession>()
  /** Monotonic counter used to generate unique session ids. */
  private _nextId = 1
  private _pending = new Map<string, AbortController>()

  /**
   * Returns the shared {@link AcApXrefManager} singleton.
   *
   * @returns The process-wide xref manager instance.
   */
  static get instance(): AcApXrefManager {
    if (!this._instance) {
      this._instance = new AcApXrefManager()
    }
    return this._instance
  }

  /**
   * All currently loaded xref display sessions.
   *
   * @returns A snapshot array of active sessions (order is map iteration order).
   */
  get sessions(): readonly AcApXrefSession[] {
    return Array.from(this._sessions.values())
  }

  /**
   * Looks up a session by its unique id.
   *
   * @param id - Session id previously returned by {@link attachOverlay}.
   * @returns The matching session, or `undefined` if not found.
   */
  getSession(id: string): AcApXrefSession | undefined {
    return this._sessions.get(id)
  }

  /**
   * Looks up a session by the host block-table record name.
   *
   * @param blockName - Host BTR name associated with the xref.
   * @returns The matching session, or `undefined` if not found.
   */
  getSessionByBlockName(blockName: string): AcApXrefSession | undefined {
    for (const session of this._sessions.values()) {
      if (
        session.blockName === blockName &&
        session.documentId === AcApDocManager.instance.activeSessionId
      )
        return session
    }
    return undefined
  }

  /**
   * Loads a DWG/DXF as a read-only overlay and registers a session.
   *
   * Does not mutate the host database — callers create BTR/INSERT separately.
   * If a session already exists for {@link AcApXrefAttachOptions.blockName},
   * it remains visible until the replacement has been prepared successfully.
   *
   * @param options - Overlay source, block name, and optional transform / INSERT link.
   * @returns The newly registered {@link AcApXrefSession}.
   * @throws If neither `sourceDb` nor `content` is provided.
   */
  async attachOverlay(
    options: AcApXrefAttachOptions
  ): Promise<AcApXrefSession> {
    options = { ...options }
    acTrCheckOverlaySignal(options.signal)
    if (!options.sourceDb && !options.content) {
      throw new Error(
        'AcApXrefManager.attachOverlay requires sourceDb or content'
      )
    }
    const manager = AcApDocManager.instance
    const documentId = manager.activeSessionId
    const key = `${documentId}\0${options.blockName}`
    this._pending.get(key)?.abort()
    const controller = new AbortController()
    const abort = () => controller.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) controller.abort()
    this._pending.set(key, controller)
    const existing = this.getSessionByBlockName(options.blockName)
    const attachment = {
      targetView: manager.curView,
      transform: options.transform,
      replaceOverlayId: existing?.overlayId,
      signal: controller.signal
    }
    try {
      const prepared = options.sourceDb
        ? await manager.prepareOverlayDatabase(options.sourceDb, attachment)
        : await manager.prepareOverlay(
            options.fileName,
            options.content!,
            attachment
          )
      try {
        if (
          controller.signal.aborted ||
          this._pending.get(key) !== controller
        ) {
          throw new DOMException(
            'Overlay attachment was cancelled',
            'AbortError'
          )
        }
        const overlayId = prepared.commit()
        // No await between native commit and metadata adoption: a subsequent
        // replacement always captures the currently published native id.
        const session: AcApXrefSession = {
          id: existing?.id ?? `xref-${this._nextId++}`,
          documentId,
          blockName: options.blockName,
          insertId: options.insertId,
          overlayId,
          sourcePath: options.sourcePath,
          visible: existing?.visible ?? true
        }
        if (!session.visible) manager.setOverlayVisible(overlayId, false)
        this._sessions.set(session.id, session)
        return session
      } finally {
        prepared.dispose()
      }
    } finally {
      if (this._pending.get(key) === controller) this._pending.delete(key)
      options.signal?.removeEventListener('abort', abort)
    }
  }

  /**
   * Shows or hides an xref overlay by session id.
   *
   * @param id - Session id of the overlay to update.
   * @param visible - Desired visibility state.
   * @returns `true` if the session exists and visibility was applied; otherwise `false`.
   */
  setVisible(id: string, visible: boolean): boolean {
    const session = this._sessions.get(id)
    if (!session) return false
    const ok = AcApDocManager.instance.setOverlayVisible(
      session.overlayId,
      visible
    )
    if (ok) session.visible = visible
    return ok
  }

  /**
   * Shows or hides an xref overlay by host block-table record name.
   *
   * @param blockName - Host BTR name associated with the xref.
   * @param visible - Desired visibility state.
   * @returns `true` if a matching session exists and visibility was applied; otherwise `false`.
   */
  setVisibleByBlockName(blockName: string, visible: boolean): boolean {
    const session = this.getSessionByBlockName(blockName)
    if (!session) return false
    return this.setVisible(session.id, visible)
  }

  /**
   * Removes overlay geometry and clears the session map entry.
   *
   * Host BTR/INSERT are left untouched (Unload semantics).
   *
   * @param id - Session id to unload.
   * @returns `true` if the session existed and was removed; otherwise `false`.
   */
  unload(id: string): boolean {
    const session = this._sessions.get(id)
    if (!session) return false
    this._pending.get(`${session.documentId}\0${session.blockName}`)?.abort()
    AcApDocManager.instance.removeOverlay(session.overlayId)
    this._sessions.delete(id)
    return true
  }

  /**
   * Unloads an xref overlay by host block-table record name.
   *
   * @param blockName - Host BTR name associated with the xref.
   * @returns `true` if a matching session existed and was unloaded; otherwise `false`.
   */
  unloadByBlockName(blockName: string): boolean {
    const session = this.getSessionByBlockName(blockName)
    if (!session) return false
    return this.unload(session.id)
  }

  /**
   * Drops every reference session and overlay (e.g. before opening a new document).
   */
  clearAll(): void {
    for (const controller of this._pending.values()) controller.abort()
    for (const id of [...this._sessions.keys()]) {
      this.unload(id)
    }
  }

  /** Ends only the reference sessions and pending work owned by one document. */
  clearDocument(documentId: string): void {
    const prefix = `${documentId}\0`
    for (const [key, controller] of this._pending) {
      if (key.startsWith(prefix)) controller.abort()
    }
    for (const session of [...this._sessions.values()]) {
      if (session.documentId === documentId) this.unload(session.id)
    }
  }

  /**
   * Forgets metadata when the native overlay owner removes geometry directly.
   * Does not abort preparation: a successful replacement removes the old id
   * during its synchronous commit and adopts the new id immediately afterward.
   */
  forgetOverlay(overlayId: string): void {
    for (const session of this._sessions.values()) {
      if (session.overlayId === overlayId) this._sessions.delete(session.id)
    }
  }

  /**
   * Creates an empty xref block-table record and INSERT on the host database.
   *
   * Source entities are intentionally not bound into the BTR; geometry is shown
   * via a separate overlay session managed by this class.
   *
   * @param hostDb - Host drawing database that receives the BTR and INSERT.
   * @param blockName - Name for the new xref block-table record.
   * @param pathName - Path stored on the BTR (`pathName` property).
   * @param transform - Position, scale, and rotation applied to the INSERT.
   * @param origin - Optional block origin for the xref BTR.
   * @returns The created block-table record and block reference.
   */
  static createHostXrefInsert(
    hostDb: AcDbDatabase,
    blockName: string,
    pathName: string,
    transform: AcApXrefTransform,
    origin?: AcGePoint3dLike
  ): { record: AcDbBlockTableRecord; insert: AcDbBlockReference } {
    // Set initial attrs via constructor — setters call assertOpenForWrite(),
    // which fails if a detached BTR already holds a real host handle while
    // undo is recording (workingDatabase.generateHandle in older data-model).
    const xrefRecord = new AcDbBlockTableRecord({
      name: blockName,
      pathName,
      flags:
        AcDbBlockTableRecordFlag.Xref |
        AcDbBlockTableRecordFlag.Resolved |
        AcDbBlockTableRecordFlag.Referenced,
      ...(origin ? { origin: new AcGePoint3d(origin) } : {})
    })
    hostDb.tables.blockTable.add(xrefRecord)

    const insert = new AcDbBlockReference(blockName)
    insert.position = new AcGePoint3d(transform.position)
    insert.scaleFactors = new AcGePoint3d(
      transform.scale,
      transform.scale,
      transform.scale
    )
    insert.rotation = transform.rotationRad
    hostDb.tables.blockTable.modelSpace.appendEntity(insert)

    return { record: xrefRecord, insert }
  }
}
