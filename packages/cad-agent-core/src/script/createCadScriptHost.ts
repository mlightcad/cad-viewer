import {
  AcApLayerService,
  acapRunDatabaseEdit
} from '@mlightcad/cad-simple-viewer'
import { AcDbEntity, AcGePoint3d } from '@mlightcad/data-model'

import { getDrawingContext } from '../context/DrawingContextProvider'
import type { CadSession } from '../session/CadSession'
import { requireDocument } from '../session/documentAccess'
import { runInsideScriptEdit } from '../session/editDepth'
import { CadActionExecutor } from '../tools/CadActionExecutor'
import type { Point2dInput, ToolResult } from '../tools/types'
import { createCadMeasure } from './createCadMeasure'
import {
  type EntitySnapshot,
  iterateDatabaseEntities,
  openEntityFilterView,
  toEntitySnapshot
} from './entitySnapshot'
import { CAD_EDIT_TX_METHODS, CAD_SCRIPT_API_TREE } from './scriptApi'
import { toBlockSnapshots, toDatabaseTables } from './tableSnapshot'

/** Queued screenshot request from `cad.view.capturePreview`. */
export interface CadScriptPreviewRequest {
  /** Optional max dimension in pixels for the PNG. */
  longSide?: number
}

/** Side effects collected while a script runs. */
export interface CadScriptEffects {
  /** Messages passed to `cad.log`. */
  log: string[]
  /** Ids from the latest `cad.selection` change. */
  highlightedIds: string[]
  /** Entity ids created inside `cad.edit.transaction`. */
  createdIds: string[]
  /**
   * Preview captures requested during the script body.
   * Fulfilled asynchronously after the script returns.
   */
  previewRequests: CadScriptPreviewRequest[]
}

/** Limits enforced by `cad.__tick`. */
export interface CadScriptLimits {
  /** Maximum tick calls before the script is stopped. */
  maxTicks: number
  /** Maximum wall-clock time in milliseconds. */
  maxMilliseconds: number
}

const DEFAULT_LIMITS: CadScriptLimits = {
  maxTicks: 100_000,
  maxMilliseconds: 2_000
}

/**
 * Builds the `cad` value injected into a script.
 *
 * The returned object is sealed with a proxy. Only members declared in
 * {@link CAD_SCRIPT_API_TREE} can be read.
 *
 * @param session - Drawing and view access.
 * @param effects - Mutable log, highlight, and created-id collectors.
 * @param limits - Tick budget. Defaults to 100000 statements or 2 seconds.
 * @returns The host passed as the `cad` argument.
 */
export function createCadScriptHost(
  session: CadSession,
  effects: CadScriptEffects,
  limits: CadScriptLimits = DEFAULT_LIMITS
) {
  const executor = new CadActionExecutor(session)
  const startedAt = Date.now()
  let ticks = 0

  const entities = {
    where(predicate: (entity: EntitySnapshot) => boolean): EntitySnapshot[] {
      if (typeof predicate !== 'function') {
        throw new Error('cad.entities.where expects a function')
      }
      const doc = requireDocumentRecord(session)
      const matches: EntitySnapshot[] = []
      for (const entity of iterateDatabaseEntities(doc.database)) {
        const view = openEntityFilterView(entity)
        let matched = false
        try {
          matched = Boolean(predicate(view.value))
        } finally {
          view.release()
        }
        if (matched) matches.push(toEntitySnapshot(entity))
      }
      return matches
    },
    byId(id: string): EntitySnapshot | undefined {
      return snapshotById(session, id)
    },
    inBox(min: Point2dInput, max: Point2dInput): EntitySnapshot[] {
      const doc = requireDocumentRecord(session)
      const minX = Math.min(min.x, max.x)
      const maxX = Math.max(min.x, max.x)
      const minY = Math.min(min.y, max.y)
      const maxY = Math.max(min.y, max.y)
      const snapshots: EntitySnapshot[] = []
      for (const entity of iterateDatabaseEntities(doc.database)) {
        const view = openEntityFilterView(entity)
        const extents = view.value.extents
        view.release()
        if (!extents) continue
        const hits =
          extents.max.x >= minX &&
          extents.min.x <= maxX &&
          extents.max.y >= minY &&
          extents.min.y <= maxY
        if (hits) snapshots.push(toEntitySnapshot(entity))
      }
      return snapshots
    }
  }

  const selection = {
    get ids(): string[] {
      return [...requireView(session).selectionSet.ids]
    },
    get entities(): EntitySnapshot[] {
      const snapshots: EntitySnapshot[] = []
      for (const id of this.ids) {
        const snapshot = snapshotById(session, id)
        if (snapshot) snapshots.push(snapshot)
      }
      return snapshots
    },
    replace(ids: string[]): void {
      const view = requireView(session)
      view.selectionSet.clear()
      view.selectionSet.add(ids)
      effects.highlightedIds = [...ids]
    },
    add(ids: string[]): void {
      const view = requireView(session)
      view.selectionSet.add(ids)
      effects.highlightedIds = [...view.selectionSet.ids]
    },
    remove(ids: string[]): void {
      const view = requireView(session)
      view.selectionSet.delete(ids)
      effects.highlightedIds = [...view.selectionSet.ids]
    },
    clear(): void {
      requireView(session).selectionSet.clear()
      effects.highlightedIds = []
    }
  }

  const view = {
    zoomExtents(): void {
      const result = executor.zoomExtents()
      if (!result.success) throw new Error(result.message)
    },
    /**
     * Queues a PNG screenshot of the current drawing extents.
     *
     * Capture runs after the script body finishes (async WebGL). The image is
     * attached to the tool result for the model; it is not returned inline
     * (data URLs exceed the script JSON size limit).
     *
     * @param options - Optional `longSide` in pixels (default 1024).
     * @returns `{ queued: true, index }` identifying this capture.
     */
    capturePreview(options?: { longSide?: number }): {
      queued: true
      index: number
    } {
      const longSide =
        options && typeof options.longSide === 'number'
          ? options.longSide
          : undefined
      const index = effects.previewRequests.length
      effects.previewRequests.push(
        longSide !== undefined ? { longSide } : {}
      )
      return { queued: true, index }
    }
  }

  const measure = createCadMeasure(id => snapshotById(session, id))

  const edit = {
    transaction(label: string, fn: (tx: CadEditTransaction) => void): void {
      if (typeof fn !== 'function') {
        throw new Error('cad.edit.transaction expects a function')
      }
      const accessError = requireDocument(session, true)
      if (accessError) throw new Error(accessError.error ?? accessError.message)
      const db = session.getDocument()!.database
      runInsideScriptEdit(() => {
        acapRunDatabaseEdit(db, label || 'Agent script', () => {
          fn(
            seal(
              createTransaction(session, executor, effects),
              CAD_EDIT_TX_METHODS
            )
          )
        })
      })
    }
  }

  const host = {
    get drawing() {
      const doc = session.getDocument()
      if (!doc) throw new Error('no_document')
      const context = getDrawingContext(session)
      return {
        title: context.documentTitle,
        currentLayer: context.currentLayer,
        units: context.insunits,
        layers: doc.layerStore.getLayers().map(layer => ({
          name: layer.name,
          isOn: layer.isOn,
          isFrozen: layer.isFrozen,
          isLocked: layer.isLocked
        })),
        extents: context.extents
      }
    },
    entities,
    get tables() {
      return toDatabaseTables(requireDocumentRecord(session).database)
    },
    get blocks() {
      return toBlockSnapshots(requireDocumentRecord(session).database)
    },
    selection,
    view,
    measure,
    edit,
    log(...values: unknown[]): void {
      effects.log.push(values.map(formatLogValue).join(' '))
    },
    __tick(): void {
      ticks++
      if (
        ticks > limits.maxTicks ||
        Date.now() - startedAt > limits.maxMilliseconds
      ) {
        throw new Error('script_timeout')
      }
    }
  }

  return seal(host, Object.keys(CAD_SCRIPT_API_TREE))
}

/** Transaction methods exposed inside `cad.edit.transaction`. */
export interface CadEditTransaction {
  drawLine(input: {
    start: Point2dInput
    end: Point2dInput
    layer?: string
  }): string
  drawCircle(input: {
    center: Point2dInput
    radius: number
    layer?: string
  }): string
  drawArc(input: {
    center: Point2dInput
    radius: number
    startAngleDeg: number
    endAngleDeg: number
    layer?: string
  }): string
  drawRectangle(input: {
    corner1: Point2dInput
    corner2: Point2dInput
    layer?: string
  }): string
  drawPolyline(input: {
    points: Point2dInput[]
    closed?: boolean
    layer?: string
  }): string
  drawEllipse(input: {
    center: Point2dInput
    majorRadius: number
    minorRadius: number
    rotationDeg?: number
    startAngleDeg?: number
    endAngleDeg?: number
    layer?: string
  }): string
  drawHatch(input: {
    boundary: Point2dInput[]
    patternName?: string
    patternScale?: number
    patternAngleDeg?: number
    layer?: string
  }): string
  drawPoint(input: { position: Point2dInput; layer?: string }): string
  drawRay(input: {
    start: Point2dInput
    through: Point2dInput
    layer?: string
  }): string
  drawXline(input: {
    start: Point2dInput
    through: Point2dInput
    layer?: string
  }): string
  drawSpline(input: {
    points: Point2dInput[]
    closed?: boolean
    layer?: string
  }): string
  drawText(input: {
    position: Point2dInput
    text: string
    height?: number
    layer?: string
  }): string
  erase(ids: string[]): number
  setLayer(ids: string[], layer: string): void
  move(ids: string[], dx: number, dy: number): number
  rotate(ids: string[], center: Point2dInput, angleDeg: number): number
  createLayer(name: string): void
  setCurrentLayer(name: string): void
}

function createTransaction(
  session: CadSession,
  executor: CadActionExecutor,
  effects: CadScriptEffects
): CadEditTransaction {
  const created = (result: ToolResult): string => {
    if (!result.success || !result.entityIds?.length) {
      throw new Error(result.error ?? result.message)
    }
    effects.createdIds.push(...result.entityIds)
    return result.entityIds[0]
  }

  return {
    drawLine: input => created(executor.drawLine(input)),
    drawCircle: input => created(executor.drawCircle(input)),
    drawArc: input => created(executor.drawArc(input)),
    drawRectangle: input => created(executor.drawRectangle(input)),
    drawPolyline: input => created(executor.drawPolyline(input)),
    drawEllipse: input => created(executor.drawEllipse(input)),
    drawHatch: input => created(executor.drawHatch(input)),
    drawPoint: input => created(executor.drawPoint(input)),
    drawRay: input => created(executor.drawRay(input)),
    drawXline: input => created(executor.drawXline(input)),
    drawSpline: input => created(executor.drawSpline(input)),
    drawText: input => created(executor.drawText(input)),
    erase(ids) {
      return session.getDocument()!.entityService.eraseEntities(ids)
    },
    setLayer(ids, layer) {
      const doc = session.getDocument()!
      const known = doc.layerStore
        .getLayers()
        .some(entry => entry.name === layer)
      if (!known) throw new Error('layer_not_found')
      const db = doc.database
      for (const id of ids) {
        const existing = db.tables.blockTable.getEntityById(id)
        if (existing && AcApLayerService.isEntityOnLockedLayer(db, existing)) {
          continue
        }
        const entity = db.openEntityForWrite(id)
        if (!entity || AcApLayerService.isEntityOnLockedLayer(db, entity)) {
          continue
        }
        entity.layer = layer
      }
    },
    move(ids, dx, dy) {
      const service = session.getDocument()!.entityService
      return service.translateEntities(service.getEntitiesByIds(ids), {
        x: dx,
        y: dy,
        z: 0
      })
    },
    rotate(ids, center, angleDeg) {
      const service = session.getDocument()!.entityService
      return service.rotateEntities(
        service.getEntitiesByIds(ids),
        new AcGePoint3d(center.x, center.y, 0),
        (angleDeg * Math.PI) / 180
      )
    },
    createLayer(name) {
      const result = executor.createLayer(name)
      if (!result.success) throw new Error(result.error ?? result.message)
    },
    setCurrentLayer(name) {
      const result = executor.setCurrentLayer(name)
      if (!result.success) throw new Error(result.error ?? result.message)
    }
  }
}

/**
 * Reads one entity through the database id map.
 *
 * Opening the object by id avoids scanning every block once per selected id.
 *
 * @param session - Drawing access.
 * @param id - Entity object id.
 * @returns Snapshot, or `undefined` when the id is missing or not an entity.
 */
function snapshotById(
  session: CadSession,
  id: string
): EntitySnapshot | undefined {
  const doc = requireDocumentRecord(session)
  const opened = doc.database.openObjectForRead(id)
  const entity =
    opened instanceof AcDbEntity
      ? opened
      : doc.database.tables.blockTable.getEntityById(id)
  if (!entity) return undefined
  return toEntitySnapshot(entity)
}

function requireDocumentRecord(session: CadSession) {
  const doc = session.getDocument()
  if (!doc) throw new Error('no_document')
  return doc
}

function requireView(session: CadSession) {
  const view = session.getView()
  if (!view) throw new Error('no_view')
  return view
}

function formatLogValue(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return stringifyScriptValue(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * JSON text for a script value.
 *
 * `JSON.stringify` omits functions, so an API object such as `cad.selection`
 * becomes `{}` and the result pane shows an object with no properties.
 * Function members are kept as `function name` strings.
 *
 * @param value - Return value or log argument.
 * @returns JSON text, or `undefined` when the value cannot be represented.
 */
export function stringifyScriptValue(value: unknown): string | undefined {
  return JSON.stringify(value, (key, current: unknown) => {
    if (key === '__tick') return undefined
    if (typeof current !== 'function') return current
    const name = current.name.replace(/^bound /, '')
    return name ? `function ${name}` : 'function'
  })
}

function seal<T extends object>(target: T, allowed: readonly string[]): T {
  const keys = new Set(allowed)
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop !== 'string') return undefined
      if (!keys.has(prop)) {
        // JSON.stringify reads toJSON before enumerating. The script validator
        // still rejects a written `cad.toJSON` access.
        if (prop === 'toJSON') return undefined
        throw new Error(`unknown_api:${prop}`)
      }
      const value = Reflect.get(obj, prop, receiver)
      return typeof value === 'function' ? value.bind(obj) : value
    },
    set() {
      return false
    }
  })
}
