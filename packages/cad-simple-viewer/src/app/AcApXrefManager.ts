import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbBlockTableRecordFlag,
  AcDbDatabase,
  AcDbObjectId,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import type { AcTrLayout } from '../view/AcTrLayout'
import { AcApDocManager } from './AcApDocManager'

/**
 * Transform applied to a reference overlay (from XATTACH INSERT).
 *
 * Position, uniform scale, and Z-axis rotation are applied to the overlay
 * layout's internal scene object so the xref appears aligned with the host INSERT.
 */
export interface AcApXrefTransform {
  /** Insertion point in world coordinates. */
  position: AcGePoint3dLike
  /** Uniform scale factor applied on all axes. */
  scale: number
  /** Rotation about the Z axis, in radians. */
  rotationRad: number
}

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
  /** Optional transform applied to the overlay layout after load. */
  transform?: AcApXrefTransform
  /** When set, associates the session with an existing host INSERT. */
  insertId?: AcDbObjectId
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
      if (session.blockName === blockName) return session
    }
    return undefined
  }

  /**
   * Loads a DWG/DXF as a read-only overlay and registers a session.
   *
   * Does not mutate the host database — callers create BTR/INSERT separately.
   * If a session already exists for {@link AcApXrefAttachOptions.blockName},
   * it is unloaded first.
   *
   * @param options - Overlay source, block name, and optional transform / INSERT link.
   * @returns The newly registered {@link AcApXrefSession}.
   * @throws If neither `sourceDb` nor `content` is provided.
   */
  async attachOverlay(options: AcApXrefAttachOptions): Promise<AcApXrefSession> {
    const existing = this.getSessionByBlockName(options.blockName)
    if (existing) {
      this.unload(existing.id)
    }

    let overlayId: string
    if (options.sourceDb) {
      overlayId = await AcApDocManager.instance.registerOverlayDatabase(
        options.sourceDb
      )
    } else if (options.content) {
      overlayId = await AcApDocManager.instance.loadOverlay(
        options.fileName,
        options.content
      )
    } else {
      throw new Error(
        'AcApXrefManager.attachOverlay requires sourceDb or content'
      )
    }

    const layout = AcApDocManager.instance.getOverlayLayout(overlayId)
    if (layout && options.transform) {
      applyOverlayTransform(layout, options.transform)
    }

    const session: AcApXrefSession = {
      id: `xref-${this._nextId++}`,
      blockName: options.blockName,
      insertId: options.insertId,
      overlayId,
      sourcePath: options.sourcePath,
      visible: true
    }
    this._sessions.set(session.id, session)
    return session
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
    for (const id of [...this._sessions.keys()]) {
      this.unload(id)
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

/**
 * Applies an {@link AcApXrefTransform} to an overlay layout's internal scene object.
 *
 * Sets position, uniform scale, and Z-axis rotation so the overlay aligns with
 * the corresponding host INSERT.
 *
 * @param layout - Overlay layout whose internal object should be transformed.
 * @param transform - Position, scale, and rotation to apply.
 */
function applyOverlayTransform(
  layout: AcTrLayout,
  transform: AcApXrefTransform
): void {
  const obj = layout.internalObject
  obj.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z ?? 0
  )
  obj.scale.set(transform.scale, transform.scale, transform.scale)
  obj.rotation.set(0, 0, transform.rotationRad)
}
