import {
  AcDbDatabase,
  AcDbDxfCode,
  AcDbRegAppTableRecord,
  AcDbResultBuffer,
  AcDbViewTableRecord,
  AcGeBox2d,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { isModelSpaceDatabase } from '../editor/global/AcEdUiColor'
import type { AcEdBaseView } from '../editor/view/AcEdBaseView'
import { AcApLayerService } from './AcApLayerService'
import { acapRunServiceEdit } from './AcApServiceEdit'

/** XDATA AppId for named-view layer On/Off + Freeze/Thaw snapshots. */
export const MLIGHT_VIEW_LAYER_SNAP_APPID = 'MLIGHT_VIEW_LAYER_SNAP'

/** Bit 0 of VIEW `standardFlags`: paperspace / layout view. */
export const VIEW_PAPERSPACE_FLAG = 0x01

/** Undo label for named-view table edits. */
export const NAMED_VIEW_EDIT_LABEL = 'View'

/**
 * Layer On/Off + Freeze/Thaw captured with a named view (no Locked).
 */
export interface AcApNamedViewLayerSnapshot {
  states: Array<{
    name: string
    isOn: boolean
    isFrozen: boolean
  }>
}

/**
 * Camera box derived from a named view record (DCS center + width/height).
 */
export interface AcApNamedViewCamera {
  center: AcGePoint2d
  viewHeight: number
  viewWidth: number
  viewTwistAngle: number
  isPaperSpace: boolean
  hasLayerSnapshot: boolean
}

export type AcApNamedViewGroup = 'model' | 'layout'

/**
 * Summary row for View Manager / Restore View lists.
 */
export interface AcApNamedViewListItem {
  name: string
  group: AcApNamedViewGroup
  hasLayerSnapshot: boolean
}

export interface AcApCreateNamedViewOptions {
  name: string
  /** World box to store; when omitted, captured from `view`. */
  box?: AcGeBox2d
  saveLayerSnapshot?: boolean
  /** Force paperspace flag; default from `isModelSpaceDatabase(db)`. */
  isPaperSpace?: boolean
}

/**
 * Named-view helpers: capture/restore camera boxes, CRUD on `viewTable`,
 * and optional layer snapshots stored as XDATA on the view record.
 */
export class AcApNamedViewService {
  /**
   * Returns whether `name` is a safe AutoCAD-like symbol-table name.
   *
   * Rejects empty names and characters that break command scripting (`\n`) or
   * AutoCAD symbol naming.
   */
  static isValidViewName(name: string): boolean {
    const trimmed = name.trim()
    if (!trimmed) return false
    if (/[\n\r<>/\\":;?*|,=`]/.test(trimmed)) return false
    return true
  }

  /**
   * Ensures the layer-snapshot AppId exists in the REGAPP table.
   *
   * When already inside an undoable edit, registers the AppId in-place so it
   * shares the same undo group as the caller.
   */
  static ensureLayerSnapAppId(db: AcDbDatabase): void {
    if (db.tables.appIdTable.has(MLIGHT_VIEW_LAYER_SNAP_APPID)) return
    const addAppId = () => {
      if (db.tables.appIdTable.has(MLIGHT_VIEW_LAYER_SNAP_APPID)) return
      db.tables.appIdTable.add(
        new AcDbRegAppTableRecord(MLIGHT_VIEW_LAYER_SNAP_APPID)
      )
    }
    if (db.transactionManager?.hasTransaction?.()) {
      addAppId()
      return
    }
    acapRunServiceEdit(db, NAMED_VIEW_EDIT_LABEL, addAppId)
  }

  /**
   * Captures the current visible world box from the active view.
   */
  static captureViewBox(view: AcEdBaseView): AcGeBox2d {
    const topLeft = view.screenToWorld({ x: 0, y: 0 })
    const bottomRight = view.screenToWorld({
      x: view.width,
      y: view.height
    })
    return new AcGeBox2d().expandByPoint(topLeft).expandByPoint(bottomRight)
  }

  /**
   * Builds a DCS box from a view table record's center / height / width.
   */
  static boxFromRecord(record: AcDbViewTableRecord): AcGeBox2d {
    const halfW = Math.max(record.viewWidth, Number.EPSILON) / 2
    const halfH = Math.max(record.viewHeight, Number.EPSILON) / 2
    const cx = record.centerPoint.x
    const cy = record.centerPoint.y
    return new AcGeBox2d(
      new AcGePoint2d(cx - halfW, cy - halfH),
      new AcGePoint2d(cx + halfW, cy + halfH)
    )
  }

  /**
   * Applies a world box onto a view table record's camera fields.
   */
  static applyBoxToRecord(record: AcDbViewTableRecord, box: AcGeBox2d): void {
    const min = box.min
    const max = box.max
    const width = Math.max(max.x - min.x, Number.EPSILON)
    const height = Math.max(max.y - min.y, Number.EPSILON)
    record.centerPoint = new AcGePoint2d(
      (min.x + max.x) / 2,
      (min.y + max.y) / 2
    )
    record.viewWidth = width
    record.viewHeight = height
    record.viewDirectionFromTarget = new AcGePoint3d(0, 0, 1)
    record.viewTarget = new AcGePoint3d(0, 0, 0)
  }

  /**
   * Captures On/Off + Freeze/Thaw for every layer in the database.
   */
  static captureLayerSnapshot(db: AcDbDatabase): AcApNamedViewLayerSnapshot {
    return {
      states: [...db.tables.layerTable.newIterator()].map(layer => ({
        name: layer.name,
        isOn: !layer.isOff,
        isFrozen: layer.isFrozen
      }))
    }
  }

  /**
   * Writes a layer snapshot into the view record's XDATA.
   */
  static writeLayerSnapshot(
    record: AcDbViewTableRecord,
    snapshot: AcApNamedViewLayerSnapshot
  ): void {
    const rb = new AcDbResultBuffer([
      {
        code: AcDbDxfCode.ExtendedDataRegAppName,
        value: MLIGHT_VIEW_LAYER_SNAP_APPID
      },
      { code: AcDbDxfCode.ExtendedDataInteger16, value: 1 }
    ])
    for (const state of snapshot.states) {
      rb.add({
        code: AcDbDxfCode.ExtendedDataAsciiString,
        value: state.name
      })
      rb.add({
        code: AcDbDxfCode.ExtendedDataInteger16,
        value: state.isOn ? 1 : 0
      })
      rb.add({
        code: AcDbDxfCode.ExtendedDataInteger16,
        value: state.isFrozen ? 1 : 0
      })
    }
    record.setXData(rb)
  }

  /**
   * Reads a layer snapshot from the view record's XDATA, if present.
   */
  static readLayerSnapshot(
    record: AcDbViewTableRecord
  ): AcApNamedViewLayerSnapshot | undefined {
    const rb = record.getXData(MLIGHT_VIEW_LAYER_SNAP_APPID)
    if (!rb || rb.length < 2) return undefined

    const states: AcApNamedViewLayerSnapshot['states'] = []
    let i = 1
    // Skip version integer if present
    const first = rb.at(i)
    if (first && first.code === AcDbDxfCode.ExtendedDataInteger16) {
      i++
    }

    while (i + 2 < rb.length) {
      const nameItem = rb.at(i)
      const onItem = rb.at(i + 1)
      const frozenItem = rb.at(i + 2)
      if (
        !nameItem ||
        nameItem.code !== AcDbDxfCode.ExtendedDataAsciiString ||
        !onItem ||
        onItem.code !== AcDbDxfCode.ExtendedDataInteger16 ||
        !frozenItem ||
        frozenItem.code !== AcDbDxfCode.ExtendedDataInteger16
      ) {
        break
      }
      states.push({
        name: String(nameItem.value),
        isOn: Number(onItem.value) !== 0,
        isFrozen: Number(frozenItem.value) !== 0
      })
      i += 3
    }

    return states.length > 0 ? { states } : undefined
  }

  /**
   * Removes the layer-snapshot XDATA from a view record.
   */
  static clearLayerSnapshot(record: AcDbViewTableRecord): void {
    record.removeXData(MLIGHT_VIEW_LAYER_SNAP_APPID)
  }

  /**
   * Applies a named-view layer snapshot (On/Off + Freeze only).
   */
  static applyLayerSnapshot(
    db: AcDbDatabase,
    snapshot: AcApNamedViewLayerSnapshot
  ): void {
    acapRunServiceEdit(db, NAMED_VIEW_EDIT_LABEL, () => {
      for (const state of snapshot.states) {
        const layer = AcApLayerService.openLayerForWrite(db, state.name)
        if (!layer) continue
        layer.isOff = !state.isOn
        AcApLayerService.setLayerFrozenState(layer, state.isFrozen)
      }
    })
  }

  /**
   * Lists named views grouped as model vs layout.
   */
  static listViews(db: AcDbDatabase): AcApNamedViewListItem[] {
    const items: AcApNamedViewListItem[] = []
    for (const record of db.tables.viewTable.newIterator()) {
      const name = record.name?.trim()
      if (!name) continue
      items.push({
        name,
        group: AcApNamedViewService.isPaperSpaceView(record)
          ? 'layout'
          : 'model',
        hasLayerSnapshot:
          AcApNamedViewService.readLayerSnapshot(record) != null
      })
    }
    items.sort((a, b) => a.name.localeCompare(b.name))
    return items
  }

  /**
   * Returns camera metadata for a named view, or `undefined` if missing.
   */
  static getCamera(
    db: AcDbDatabase,
    name: string
  ): AcApNamedViewCamera | undefined {
    const record = db.tables.viewTable.getAt(name)
    if (!record) return undefined
    return {
      center: new AcGePoint2d(record.centerPoint.x, record.centerPoint.y),
      viewHeight: record.viewHeight,
      viewWidth: record.viewWidth,
      viewTwistAngle: record.viewTwistAngle,
      isPaperSpace: AcApNamedViewService.isPaperSpaceView(record),
      hasLayerSnapshot: AcApNamedViewService.readLayerSnapshot(record) != null
    }
  }

  static isPaperSpaceView(record: AcDbViewTableRecord): boolean {
    return ((record.standardFlags ?? 0) & VIEW_PAPERSPACE_FLAG) !== 0
  }

  /**
   * Creates (or replaces) a named view from the current display or a box.
   *
   * @returns `false` when the name is empty.
   */
  static createView(
    db: AcDbDatabase,
    view: AcEdBaseView,
    options: AcApCreateNamedViewOptions
  ): boolean {
    const name = options.name.trim()
    if (!AcApNamedViewService.isValidViewName(name)) return false

    const box = options.box ?? AcApNamedViewService.captureViewBox(view)
    const isPaperSpace =
      options.isPaperSpace ?? !isModelSpaceDatabase(db)
    const saveLayerSnapshot = options.saveLayerSnapshot !== false

    return acapRunServiceEdit(db, NAMED_VIEW_EDIT_LABEL, () => {
      AcApNamedViewService.ensureLayerSnapAppId(db)

      const existing = db.tables.viewTable.getAt(name)
      const record = existing
        ? db.openObjectForWrite<AcDbViewTableRecord>(existing.objectId)
        : new AcDbViewTableRecord({ name })
      if (!record) return false

      AcApNamedViewService.applyCameraAndSnapshot(
        db,
        record,
        box,
        isPaperSpace,
        saveLayerSnapshot
      )

      if (!existing) {
        db.tables.viewTable.add(record)
      }

      return true
    })
  }

  /**
   * Applies camera box, paperspace flag, and optional layer snapshot to a record.
   *
   * Call before {@link AcDbViewTable.add} for new records, or on a record opened
   * via {@link AcDbDatabase.openObjectForWrite} for existing ones.
   */
  private static applyCameraAndSnapshot(
    db: AcDbDatabase,
    record: AcDbViewTableRecord,
    box: AcGeBox2d,
    isPaperSpace: boolean,
    saveLayerSnapshot: boolean
  ): void {
    AcApNamedViewService.applyBoxToRecord(record, box)
    record.standardFlags = isPaperSpace
      ? (record.standardFlags ?? 0) | VIEW_PAPERSPACE_FLAG
      : (record.standardFlags ?? 0) & ~VIEW_PAPERSPACE_FLAG

    if (saveLayerSnapshot) {
      AcApNamedViewService.writeLayerSnapshot(
        record,
        AcApNamedViewService.captureLayerSnapshot(db)
      )
    } else {
      AcApNamedViewService.clearLayerSnapshot(record)
    }
  }

  /**
   * Updates the layer snapshot on an existing named view to the current layers.
   */
  static updateLayerSnapshot(db: AcDbDatabase, name: string): boolean {
    if (!db.tables.viewTable.has(name)) return false

    return acapRunServiceEdit(db, NAMED_VIEW_EDIT_LABEL, () => {
      AcApNamedViewService.ensureLayerSnapAppId(db)
      const existing = db.tables.viewTable.getAt(name)
      if (!existing) return false
      const opened = db.openObjectForWrite<AcDbViewTableRecord>(
        existing.objectId
      )
      if (!opened) return false
      AcApNamedViewService.writeLayerSnapshot(
        opened,
        AcApNamedViewService.captureLayerSnapshot(db)
      )
      return true
    })
  }

  /**
   * Replaces the camera box of an existing named view (Edit Boundaries).
   */
  static updateBoundaries(
    db: AcDbDatabase,
    name: string,
    box: AcGeBox2d
  ): boolean {
    if (!db.tables.viewTable.has(name)) return false
    return acapRunServiceEdit(db, NAMED_VIEW_EDIT_LABEL, () => {
      const existing = db.tables.viewTable.getAt(name)
      if (!existing) return false
      const record = db.openObjectForWrite<AcDbViewTableRecord>(
        existing.objectId
      )
      if (!record) return false
      AcApNamedViewService.applyBoxToRecord(record, box)
      return true
    })
  }

  /**
   * Deletes a named view.
   */
  static deleteView(db: AcDbDatabase, name: string): boolean {
    if (!db.tables.viewTable.has(name)) return false
    return acapRunServiceEdit(db, NAMED_VIEW_EDIT_LABEL, () =>
      db.tables.viewTable.remove(name)
    )
  }

  /**
   * Restores a named view onto the active camera and optionally layers.
   *
   * @param applyLayers - When true, restores the layer snapshot if present.
   */
  static restoreView(
    db: AcDbDatabase,
    view: AcEdBaseView,
    name: string,
    applyLayers = true
  ): boolean {
    const record = db.tables.viewTable.getAt(name)
    if (!record) return false

    const box = AcApNamedViewService.boxFromRecord(record)
    view.zoomTo(box, 1)

    if (applyLayers) {
      const snapshot = AcApNamedViewService.readLayerSnapshot(record)
      if (snapshot) {
        AcApNamedViewService.applyLayerSnapshot(db, snapshot)
      }
    }

    return true
  }
}
