import {
  AcCmEventManager,
  AcDbCircle,
  AcDbDatabase,
  AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbPolyline,
  AcDbUcsTableRecord,
  AcDbViewportTableRecord,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeTol} from '@mlightcad/data-model'

import { isModelSpaceDatabase } from '../editor/global/AcEdUiColor'
import { acapRunServiceEdit } from './AcApServiceEdit'

/** Undo label for UCS table / viewport edits. */
export const UCS_EDIT_LABEL = 'UCS'

/** Max Previous UCS entries per space (AutoCAD). */
export const UCS_PREVIOUS_LIMIT = 10

/**
 * VPORT `standardFlag` bits used by UCS settings.
 * - `0x8` — UCSFOLLOW
 * - `0x20` — UCS icon visible
 * - `0x40` — UCS icon at origin
 */
export const UCS_FOLLOW_FLAG = 0x8
export const UCS_ICON_VISIBLE_FLAG = 0x20
export const UCS_ICON_ORIGIN_FLAG = 0x40

/**
 * Values for {@link AcGiView.ucsIconSetting} (VPORT DXF group 74).
 * Bit 0 = on, bit 1 = at origin (AutoCAD commonly uses 0/1/3).
 */
export const UCS_ICON_SETTING_ON = 0x1
export const UCS_ICON_SETTING_ORIGIN = 0x2

export const UCS_WORLD_NAME = 'World'
export const UCS_UNNAMED_NAME = 'Unnamed'
export const UCS_PREVIOUS_NAME = 'Previous'

export interface AcApUcsFrame {
  origin: AcGePoint3d
  xAxis: AcGePoint3d
  yAxis: AcGePoint3d
}

export type AcApUcsListKind = 'world' | 'unnamed' | 'previous' | 'named'

export interface AcApUcsListItem {
  name: string
  kind: AcApUcsListKind
  isCurrent: boolean
}

export interface AcApUcsIconSettings {
  on: boolean
  atOrigin: boolean
  applyToAllActiveViewports: boolean
  allowSelectingIcon: boolean
}

export interface AcApUcsViewportSettings {
  saveUcsWithViewport: boolean
  updateViewToPlan: boolean
}

export interface AcApUcsChangedEventArgs {
  database: AcDbDatabase
}

type SpaceKey = 'model' | 'paper'

const previousStacks = new WeakMap<AcDbDatabase, Map<SpaceKey, AcApUcsFrame[]>>()
const sessionFrames = new WeakMap<AcDbDatabase, Map<SpaceKey, AcApUcsFrame>>()
const allowSelectIconByDb = new WeakMap<AcDbDatabase, boolean>()
const applyIconToAllByDb = new WeakMap<AcDbDatabase, boolean>()
const saveUcsWithViewportByDb = new WeakMap<AcDbDatabase, boolean>()

function cloneFrame(frame: AcApUcsFrame): AcApUcsFrame {
  return {
    origin: frame.origin.clone(),
    xAxis: frame.xAxis.clone(),
    yAxis: frame.yAxis.clone()
  }
}

function worldFrame(): AcApUcsFrame {
  return {
    origin: new AcGePoint3d(0, 0, 0),
    xAxis: new AcGePoint3d(1, 0, 0),
    yAxis: new AcGePoint3d(0, 1, 0)
  }
}

function framesEqual(a: AcApUcsFrame, b: AcApUcsFrame, tol = 1e-8): boolean {
  const near = (p: AcGePoint3d, q: AcGePoint3d) =>
    Math.abs(p.x - q.x) <= tol &&
    Math.abs(p.y - q.y) <= tol &&
    Math.abs(p.z - q.z) <= tol
  return near(a.origin, b.origin) && near(a.xAxis, b.xAxis) && near(a.yAxis, b.yAxis)
}

function normalizeAxis(axis: AcGePoint3dLike): AcGePoint3d {
  const len = Math.hypot(axis.x, axis.y, axis.z ?? 0)
  if (len < 1e-12) return new AcGePoint3d(1, 0, 0)
  return new AcGePoint3d(axis.x / len, axis.y / len, (axis.z ?? 0) / len)
}

function cross(
  a: AcGePoint3dLike,
  b: AcGePoint3dLike
): AcGePoint3d {
  return new AcGePoint3d(
    a.y * (b.z ?? 0) - (a.z ?? 0) * b.y,
    (a.z ?? 0) * b.x - a.x * (b.z ?? 0),
    a.x * b.y - a.y * b.x
  )
}

function spaceKey(db: AcDbDatabase): SpaceKey {
  return isModelSpaceDatabase(db) ? 'model' : 'paper'
}

/** Returns the working database, or null when none is set (getter throws). */
function tryWorkingDatabase(): AcDbDatabase | null {
  try {
    return acdbHostApplicationServices().workingDatabase
  } catch {
    return null
  }
}

function getPreviousStack(db: AcDbDatabase): AcApUcsFrame[] {
  let bySpace = previousStacks.get(db)
  if (!bySpace) {
    bySpace = new Map()
    previousStacks.set(db, bySpace)
  }
  const key = spaceKey(db)
  let stack = bySpace.get(key)
  if (!stack) {
    stack = []
    bySpace.set(key, stack)
  }
  return stack
}

/**
 * Active UCS helpers: resolve/apply frames, named UCS CRUD, icon/UCSVP flags,
 * and UCS↔WCS transforms used by input and the UCS / UCSMAN commands.
 */
export class AcApUcsService {
  static readonly events = {
    ucsChanged: new AcCmEventManager<AcApUcsChangedEventArgs>()
  }

  static isValidUcsName(name: string): boolean {
    const trimmed = name.trim()
    if (!trimmed) return false
    if (/[\n\r<>/\\":;?*|,=`]/.test(trimmed)) return false
    const upper = trimmed.toUpperCase()
    if (
      upper === UCS_WORLD_NAME.toUpperCase() ||
      upper === UCS_UNNAMED_NAME.toUpperCase() ||
      upper === UCS_PREVIOUS_NAME.toUpperCase()
    ) {
      return false
    }
    return true
  }

  static isWorldFrame(frame: AcApUcsFrame): boolean {
    return framesEqual(frame, worldFrame())
  }

  static getActiveFrame(database?: AcDbDatabase): AcApUcsFrame {
    const db = database ?? tryWorkingDatabase()
    if (!db) return worldFrame()

    // Prefer persisted VPORT/layout so undo/redo of UCS edits stays coherent.
    // Session cache is only a fallback when the drawing has no *ACTIVE VPORT.
    if (isModelSpaceDatabase(db)) {
      const vport = db.tables.viewportTable.getActiveVport()
      if (vport) {
        return {
          origin: vport.ucsOrigin.clone(),
          xAxis: normalizeAxis(vport.ucsXAxis),
          yAxis: normalizeAxis(vport.ucsYAxis)
        }
      }
    }

    const layout = acdbHostApplicationServices().layoutManager.getActiveLayout(db)
    if (layout) {
      return {
        origin: layout.ucsOrigin.clone(),
        xAxis: normalizeAxis(layout.ucsXAxis),
        yAxis: normalizeAxis(layout.ucsYAxis)
      }
    }

    const session = sessionFrames.get(db)?.get(spaceKey(db))
    if (session) return cloneFrame(session)

    return worldFrame()
  }

  static getCurrentName(database?: AcDbDatabase): string {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return UCS_WORLD_NAME
    const frame = this.getActiveFrame(db)
    if (this.isWorldFrame(frame)) return UCS_WORLD_NAME
    const named = this.findNamedMatching(db, frame)
    return named?.name ?? UCS_UNNAMED_NAME
  }

  static listUcsNames(database?: AcDbDatabase): AcApUcsListItem[] {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) {
      return [
        { name: UCS_WORLD_NAME, kind: 'world', isCurrent: true }
      ]
    }

    const currentName = this.getCurrentName(db)
    const items: AcApUcsListItem[] = [
      {
        name: UCS_WORLD_NAME,
        kind: 'world',
        isCurrent: currentName === UCS_WORLD_NAME
      }
    ]

    if (currentName === UCS_UNNAMED_NAME) {
      items.push({
        name: UCS_UNNAMED_NAME,
        kind: 'unnamed',
        isCurrent: true
      })
    }

    if (getPreviousStack(db).length > 0) {
      items.push({
        name: UCS_PREVIOUS_NAME,
        kind: 'previous',
        isCurrent: false
      })
    }

    for (const record of db.tables.ucsTable.newIterator()) {
      items.push({
        name: record.name,
        kind: 'named',
        isCurrent: currentName.toUpperCase() === record.name.toUpperCase()
      })
    }

    return items
  }

  static findNamedMatching(
    db: AcDbDatabase,
    frame: AcApUcsFrame
  ): AcDbUcsTableRecord | undefined {
    for (const record of db.tables.ucsTable.newIterator()) {
      const candidate: AcApUcsFrame = {
        origin: record.origin.clone(),
        xAxis: normalizeAxis(record.xAxis),
        yAxis: normalizeAxis(record.yAxis)
      }
      if (framesEqual(candidate, frame)) return record
    }
    return undefined
  }

  static getFrameByName(
    name: string,
    database?: AcDbDatabase
  ): AcApUcsFrame | undefined {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return undefined
    const trimmed = name.trim()
    const upper = trimmed.toUpperCase()

    if (upper === UCS_WORLD_NAME.toUpperCase()) return worldFrame()
    if (upper === UCS_UNNAMED_NAME.toUpperCase()) {
      return cloneFrame(this.getActiveFrame(db))
    }
    if (upper === UCS_PREVIOUS_NAME.toUpperCase()) {
      const stack = getPreviousStack(db)
      const prev = stack[stack.length - 1]
      return prev ? cloneFrame(prev) : undefined
    }

    const record = db.tables.ucsTable.getAt(trimmed)
    if (!record) return undefined
    return {
      origin: record.origin.clone(),
      xAxis: normalizeAxis(record.xAxis),
      yAxis: normalizeAxis(record.yAxis)
    }
  }

  /**
   * Applies a UCS frame as current, pushing the prior frame onto Previous.
   */
  static applyFrame(
    db: AcDbDatabase,
    frame: AcApUcsFrame,
    options?: { pushPrevious?: boolean; skipFollow?: boolean }
  ): void {
    const pushPrevious = options?.pushPrevious !== false
    const next = {
      origin: frame.origin.clone(),
      xAxis: normalizeAxis(frame.xAxis),
      yAxis: normalizeAxis(frame.yAxis)
    }

    acapRunServiceEdit(db, UCS_EDIT_LABEL, () => {
      const current = this.getActiveFrame(db)
      if (pushPrevious && !framesEqual(current, next)) {
        const stack = getPreviousStack(db)
        stack.push(cloneFrame(current))
        while (stack.length > UCS_PREVIOUS_LIMIT) stack.shift()
      }

      this.writeFrameToActive(db, next)

      if (!options?.skipFollow && this.getViewportSettings(db).updateViewToPlan) {
        this.applyPlanViewTwist(db, next)
      }
    })

    this.events.ucsChanged.dispatch({ database: db })
  }

  static setCurrent(name: string, database?: AcDbDatabase): boolean {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return false
    const upper = name.trim().toUpperCase()

    if (upper === UCS_PREVIOUS_NAME.toUpperCase()) {
      return this.restorePrevious(db)
    }

    const frame = this.getFrameByName(name, db)
    if (!frame) return false
    this.applyFrame(db, frame)
    return true
  }

  static restorePrevious(database?: AcDbDatabase): boolean {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return false
    const stack = getPreviousStack(db)
    const prev = stack.pop()
    if (!prev) return false
    this.applyFrame(db, prev, { pushPrevious: false })
    return true
  }

  static setWorld(database?: AcDbDatabase): void {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return
    this.applyFrame(db, worldFrame())
  }

  static saveNamed(name: string, database?: AcDbDatabase): boolean {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db || !this.isValidUcsName(name)) return false
    const trimmed = name.trim()
    const frame = this.getActiveFrame(db)

    acapRunServiceEdit(db, UCS_EDIT_LABEL, () => {
      const existing = db.tables.ucsTable.getAt(trimmed)
      if (existing) {
        const opened =
          db.openObjectForWrite<AcDbUcsTableRecord>(existing.objectId) ??
          existing
        opened.origin = frame.origin.clone()
        opened.xAxis = frame.xAxis.clone()
        opened.yAxis = frame.yAxis.clone()
        return
      }
      db.tables.ucsTable.add(
        new AcDbUcsTableRecord({
          name: trimmed,
          origin: frame.origin.clone(),
          xAxis: frame.xAxis.clone(),
          yAxis: frame.yAxis.clone()
        })
      )
    })

    this.events.ucsChanged.dispatch({ database: db })
    return true
  }

  static deleteNamed(name: string, database?: AcDbDatabase): boolean {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return false
    const trimmed = name.trim()
    const upper = trimmed.toUpperCase()
    if (
      !trimmed ||
      upper === UCS_WORLD_NAME.toUpperCase() ||
      upper === UCS_UNNAMED_NAME.toUpperCase() ||
      upper === UCS_PREVIOUS_NAME.toUpperCase()
    ) {
      return false
    }
    if (!db.tables.ucsTable.has(trimmed)) return false

    acapRunServiceEdit(db, UCS_EDIT_LABEL, () => {
      db.tables.ucsTable.remove(trimmed)
    })
    this.events.ucsChanged.dispatch({ database: db })
    return true
  }

  static renameNamed(
    oldName: string,
    newName: string,
    database?: AcDbDatabase
  ): boolean {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db || !this.isValidUcsName(newName)) {
      return false
    }
    const from = oldName.trim()
    const to = newName.trim()
    if (!from || !db.tables.ucsTable.has(from)) return false
    if (from.toUpperCase() === to.toUpperCase()) return true
    if (db.tables.ucsTable.has(to)) return false
    const record = db.tables.ucsTable.getAt(from)
    if (!record) return false

    acapRunServiceEdit(db, UCS_EDIT_LABEL, () => {
      const opened =
        db.openObjectForWrite<AcDbUcsTableRecord>(record.objectId) ?? record
      const next = new AcDbUcsTableRecord({
        name: to,
        origin: opened.origin.clone(),
        xAxis: opened.xAxis.clone(),
        yAxis: opened.yAxis.clone(),
        elevation: opened.elevation,
        isOrthographic: opened.isOrthographic,
        orthographicType: opened.orthographicType,
        orthographicOrigin: opened.orthographicOrigin?.clone(),
        baseUcsId: opened.baseUcsId,
        standardFlags: opened.standardFlags
      })
      db.tables.ucsTable.remove(from)
      db.tables.ucsTable.add(next)
    })
    this.events.ucsChanged.dispatch({ database: db })
    return true
  }

  static ucsToWcs(
    point: AcGePoint3dLike,
    frame?: AcApUcsFrame,
    database?: AcDbDatabase
  ): AcGePoint3d {
    const f = frame ?? this.getActiveFrame(database)
    const x = normalizeAxis(f.xAxis)
    const y = normalizeAxis(f.yAxis)
    const z = normalizeAxis(cross(x, y))
    return new AcGePoint3d(
      f.origin.x + point.x * x.x + point.y * y.x + (point.z ?? 0) * z.x,
      f.origin.y + point.x * x.y + point.y * y.y + (point.z ?? 0) * z.y,
      f.origin.z + point.x * x.z + point.y * y.z + (point.z ?? 0) * z.z
    )
  }

  static wcsToUcs(
    point: AcGePoint3dLike,
    frame?: AcApUcsFrame,
    database?: AcDbDatabase
  ): AcGePoint3d {
    const f = frame ?? this.getActiveFrame(database)
    const x = normalizeAxis(f.xAxis)
    const y = normalizeAxis(f.yAxis)
    const z = normalizeAxis(cross(x, y))
    const dx = point.x - f.origin.x
    const dy = point.y - f.origin.y
    const dz = (point.z ?? 0) - f.origin.z
    return new AcGePoint3d(
      dx * x.x + dy * x.y + dz * x.z,
      dx * y.x + dy * y.y + dz * y.z,
      dx * z.x + dy * z.y + dz * z.z
    )
  }

  /**
   * Defines a UCS from one, two, or three points (AutoCAD origin prompt).
   */
  static frameFromPoints(
    origin: AcGePoint3dLike,
    xPoint?: AcGePoint3dLike,
    yPoint?: AcGePoint3dLike,
    current?: AcApUcsFrame
  ): AcApUcsFrame {
    const base = current ? cloneFrame(current) : worldFrame()
    base.origin = new AcGePoint3d(origin.x, origin.y, origin.z ?? 0)

    if (!xPoint) return base

    const xDir = normalizeAxis({
      x: xPoint.x - origin.x,
      y: xPoint.y - origin.y,
      z: (xPoint.z ?? 0) - (origin.z ?? 0)
    })
    base.xAxis = xDir

    if (!yPoint) {
      // Keep previous Z, recompute Y = Z × X for a right-handed frame in XY.
      const z = normalizeAxis(cross(base.xAxis, base.yAxis))
      // If degenerate (x parallel to old y), use world Z.
      const zUse =
        Math.hypot(z.x, z.y, z.z) < 1e-8 ? new AcGePoint3d(0, 0, 1) : z
      base.yAxis = normalizeAxis(cross(zUse, xDir))
      return base
    }

    const yRaw = {
      x: yPoint.x - origin.x,
      y: yPoint.y - origin.y,
      z: (yPoint.z ?? 0) - (origin.z ?? 0)
    }
    const z = normalizeAxis(cross(xDir, yRaw))
    base.yAxis = normalizeAxis(cross(z, xDir))
    return base
  }

  static rotateFrame(
    frame: AcApUcsFrame,
    axis: 'x' | 'y' | 'z',
    angleRad: number
  ): AcApUcsFrame {
    const x = normalizeAxis(frame.xAxis)
    const y = normalizeAxis(frame.yAxis)
    const z = normalizeAxis(cross(x, y))
    const pivot =
      axis === 'x' ? x : axis === 'y' ? y : z

    const rotateVec = (v: AcGePoint3d): AcGePoint3d => {
      // Rodrigues around pivot
      const c = Math.cos(angleRad)
      const s = Math.sin(angleRad)
      const dot = v.x * pivot.x + v.y * pivot.y + v.z * pivot.z
      const cr = cross(pivot, v)
      return new AcGePoint3d(
        v.x * c + cr.x * s + pivot.x * dot * (1 - c),
        v.y * c + cr.y * s + pivot.y * dot * (1 - c),
        v.z * c + cr.z * s + pivot.z * dot * (1 - c)
      )
    }

    return {
      origin: frame.origin.clone(),
      xAxis: normalizeAxis(rotateVec(x)),
      yAxis: normalizeAxis(rotateVec(y))
    }
  }

  static frameFromZAxis(
    origin: AcGePoint3dLike,
    zPoint: AcGePoint3dLike
  ): AcApUcsFrame {
    const z = normalizeAxis({
      x: zPoint.x - origin.x,
      y: zPoint.y - origin.y,
      z: (zPoint.z ?? 0) - (origin.z ?? 0)
    })
    // Pick a helper axis not parallel to Z.
    const helper =
      Math.abs(z.x) < 0.9
        ? new AcGePoint3d(1, 0, 0)
        : new AcGePoint3d(0, 1, 0)
    const y = normalizeAxis(cross(z, helper))
    const x = normalizeAxis(cross(y, z))
    return {
      origin: new AcGePoint3d(origin.x, origin.y, origin.z ?? 0),
      xAxis: x,
      yAxis: y
    }
  }

  static frameFromView(
    current: AcApUcsFrame,
    viewXAxisWcs: AcGePoint3dLike = { x: 1, y: 0, z: 0 },
    viewYAxisWcs: AcGePoint3dLike = { x: 0, y: 1, z: 0 }
  ): AcApUcsFrame {
    return {
      origin: current.origin.clone(),
      xAxis: normalizeAxis(viewXAxisWcs),
      yAxis: normalizeAxis(viewYAxisWcs)
    }
  }

  /**
   * Aligns UCS to a selected entity (AutoCAD Object option, 2D subset).
   */
  static frameFromEntity(
    entity: AcDbEntity,
    pickPoint: AcGePoint3dLike
  ): AcApUcsFrame | undefined {
    if (entity instanceof AcDbLine) {
      const start = entity.startPoint
      const end = entity.endPoint
      const dStart = Math.hypot(
        pickPoint.x - start.x,
        pickPoint.y - start.y,
        (pickPoint.z ?? 0) - start.z
      )
      const dEnd = Math.hypot(
        pickPoint.x - end.x,
        pickPoint.y - end.y,
        (pickPoint.z ?? 0) - end.z
      )
      const origin = dStart <= dEnd ? start : end
      const other = dStart <= dEnd ? end : start
      return this.frameFromPoints(origin, other)
    }

    if (entity instanceof AcDbCircle) {
      const center = entity.center
      const pick = new AcGePoint3d(pickPoint.x, pickPoint.y, pickPoint.z ?? 0)
      return this.frameFromPoints(center, pick)
    }

    if (entity instanceof AcDbPolyline) {
      const num = entity.numberOfVertices
      if (num < 2) return undefined
      let bestI = 0
      let bestD = Number.POSITIVE_INFINITY
      for (let i = 0; i < num; i++) {
        const v = entity.getPoint3dAt(i)
        const d = Math.hypot(
          pickPoint.x - v.x,
          pickPoint.y - v.y,
          (pickPoint.z ?? 0) - (v.z ?? 0)
        )
        if (d < bestD) {
          bestD = d
          bestI = i
        }
      }
      const origin = entity.getPoint3dAt(bestI)
      const next =
        bestI + 1 < num
          ? entity.getPoint3dAt(bestI + 1)
          : entity.getPoint3dAt(Math.max(bestI - 1, 0))
      if (!AcGeTol.isPositive(Math.hypot(next.x - origin.x, next.y - origin.y))) {
        return {
          origin: new AcGePoint3d(origin.x, origin.y, origin.z ?? 0),
          xAxis: new AcGePoint3d(1, 0, 0),
          yAxis: new AcGePoint3d(0, 1, 0)
        }
      }
      return this.frameFromPoints(origin, next)
    }

    // Fallback: move origin to pick, keep orientation.
    return {
      origin: new AcGePoint3d(pickPoint.x, pickPoint.y, pickPoint.z ?? 0),
      xAxis: new AcGePoint3d(1, 0, 0),
      yAxis: new AcGePoint3d(0, 1, 0)
    }
  }

  static getIconSettings(database?: AcDbDatabase): AcApUcsIconSettings {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    const applyToAll = db ? (applyIconToAllByDb.get(db) ?? false) : false
    const allowSelecting = db ? (allowSelectIconByDb.get(db) ?? false) : false

    if (!db) {
      return {
        on: true,
        atOrigin: true,
        applyToAllActiveViewports: applyToAll,
        allowSelectingIcon: allowSelecting
      }
    }

    const vport = db.tables.viewportTable.getActiveVport()
    if (vport) {
      const setting = vport.ucsIconSetting
      const flags = vport.standardFlag
      const on =
        (setting & UCS_ICON_SETTING_ON) !== 0 ||
        (flags & UCS_ICON_VISIBLE_FLAG) !== 0 ||
        setting === 1 ||
        setting === 3
      const atOrigin =
        (setting & UCS_ICON_SETTING_ORIGIN) !== 0 ||
        (flags & UCS_ICON_ORIGIN_FLAG) !== 0 ||
        setting === 2 ||
        setting === 3
      // Default AutoCAD: icon on + at origin when unset (0 often means default on).
      if (setting === 0 && (flags & (UCS_ICON_VISIBLE_FLAG | UCS_ICON_ORIGIN_FLAG)) === 0) {
        return {
          on: true,
          atOrigin: true,
          applyToAllActiveViewports: applyToAll,
          allowSelectingIcon: allowSelecting
        }
      }
      return {
        on,
        atOrigin,
        applyToAllActiveViewports: applyToAll,
        allowSelectingIcon: allowSelecting
      }
    }

    return {
      on: true,
      atOrigin: true,
      applyToAllActiveViewports: applyToAll,
      allowSelectingIcon: allowSelecting
    }
  }

  static setIconSettings(
    settings: AcApUcsIconSettings,
    database?: AcDbDatabase
  ): void {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return

    applyIconToAllByDb.set(db, settings.applyToAllActiveViewports)
    allowSelectIconByDb.set(db, settings.allowSelectingIcon)

    const iconSetting =
      (settings.on ? UCS_ICON_SETTING_ON : 0) |
      (settings.atOrigin ? UCS_ICON_SETTING_ORIGIN : 0)

    acapRunServiceEdit(db, UCS_EDIT_LABEL, () => {
      const applyToVport = (vport: AcDbViewportTableRecord) => {
        const opened =
          db.openObjectForWrite<AcDbViewportTableRecord>(vport.objectId) ??
          vport
        opened.ucsIconSetting = iconSetting
        let flags = opened.standardFlag
        if (settings.on) flags |= UCS_ICON_VISIBLE_FLAG
        else flags &= ~UCS_ICON_VISIBLE_FLAG
        if (settings.atOrigin) flags |= UCS_ICON_ORIGIN_FLAG
        else flags &= ~UCS_ICON_ORIGIN_FLAG
        opened.standardFlag = flags
      }

      const active = db.tables.viewportTable.getActiveVport()
      if (active) applyToVport(active)

      if (settings.applyToAllActiveViewports) {
        for (const record of db.tables.viewportTable.newIterator()) {
          applyToVport(record)
        }
      }
    })

    this.events.ucsChanged.dispatch({ database: db })
  }

  static getViewportSettings(
    database?: AcDbDatabase
  ): AcApUcsViewportSettings {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) {
      return { saveUcsWithViewport: true, updateViewToPlan: false }
    }
    const vport = db.tables.viewportTable.getActiveVport()
    const follow = vport ? !!(vport.standardFlag & UCS_FOLLOW_FLAG) : false
    return {
      saveUcsWithViewport: saveUcsWithViewportByDb.get(db) ?? true,
      updateViewToPlan: follow
    }
  }

  static setViewportSettings(
    settings: AcApUcsViewportSettings,
    database?: AcDbDatabase
  ): void {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return

    saveUcsWithViewportByDb.set(db, settings.saveUcsWithViewport)

    acapRunServiceEdit(db, UCS_EDIT_LABEL, () => {
      const vport = db.tables.viewportTable.getActiveVport()
      if (!vport) return
      const opened =
        db.openObjectForWrite<AcDbViewportTableRecord>(vport.objectId) ?? vport
      let flags = opened.standardFlag
      if (settings.updateViewToPlan) flags |= UCS_FOLLOW_FLAG
      else flags &= ~UCS_FOLLOW_FLAG
      opened.standardFlag = flags
    })

    this.events.ucsChanged.dispatch({ database: db })
  }

  static applyCurrentToAllViewports(database?: AcDbDatabase): void {
    const db = database ?? acdbHostApplicationServices().workingDatabase
    if (!db) return
    const frame = this.getActiveFrame(db)
    acapRunServiceEdit(db, UCS_EDIT_LABEL, () => {
      for (const record of db.tables.viewportTable.newIterator()) {
        const opened =
          db.openObjectForWrite<AcDbViewportTableRecord>(record.objectId) ??
          record
        opened.ucsOrigin = frame.origin.clone()
        opened.ucsXAxis = frame.xAxis.clone()
        opened.ucsYAxis = frame.yAxis.clone()
      }
    })
    this.events.ucsChanged.dispatch({ database: db })
  }

  private static writeFrameToActive(db: AcDbDatabase, frame: AcApUcsFrame): void {
    let bySpace = sessionFrames.get(db)
    if (!bySpace) {
      bySpace = new Map()
      sessionFrames.set(db, bySpace)
    }
    bySpace.set(spaceKey(db), cloneFrame(frame))

    if (isModelSpaceDatabase(db)) {
      const vport = db.tables.viewportTable.getActiveVport()
      if (vport) {
        const opened =
          db.openObjectForWrite<AcDbViewportTableRecord>(vport.objectId) ??
          vport
        opened.ucsOrigin = frame.origin.clone()
        opened.ucsXAxis = frame.xAxis.clone()
        opened.ucsYAxis = frame.yAxis.clone()
        return
      }
    }

    const layout = acdbHostApplicationServices().layoutManager.getActiveLayout(db)
    if (layout) {
      layout.ucsOrigin = frame.origin.clone()
      layout.ucsXAxis = frame.xAxis
      layout.ucsYAxis = frame.yAxis
    }
  }

  /**
   * Stores Plan twist on the active VPORT (UCS X angle in WCS).
   * Visual camera twist for model space may be applied by the view layer.
   */
  private static applyPlanViewTwist(db: AcDbDatabase, frame: AcApUcsFrame): void {
    const angle = Math.atan2(frame.xAxis.y, frame.xAxis.x)
    const vport = db.tables.viewportTable.getActiveVport()
    if (!vport) return
    const opened =
      db.openObjectForWrite<AcDbViewportTableRecord>(vport.objectId) ?? vport
    opened.viewTwistAngle = angle
  }
}
