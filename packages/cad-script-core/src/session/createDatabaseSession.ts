import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbEntity,
  AcDbLayerTableRecord,
  AcGeBox2d,
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint2d
} from '@mlightcad/data-model'

import {
  type CadSession,
  type CadSessionDocument,
  type CadSessionLayerInfo,
  CadSessionOpenMode,
  type CadSessionView
} from './CadSession'
import {
  isEntityOnLockedLayer,
  LAYER_FROZEN_FLAG,
  LAYER_LOCKED_FLAG
} from './lockedLayer'

/** Options for {@link createDatabaseSession}. */
export interface CreateDatabaseSessionOptions {
  /** Title reported as `cad.drawing.title`. Default `'Untitled'`. */
  title?: string
  /**
   * Open mode, one of {@link CadSessionOpenMode}. Default `Write`. Use `Read`
   * to reject `cad.edit` scripts.
   */
  openMode?: CadSessionOpenMode
}

const LAYER_EDIT_LABEL = 'Layer'
const ENTITY_EDIT_LABEL = 'Entity'

/**
 * Creates a {@link CadSession} backed only by an `AcDbDatabase`.
 *
 * Use it to run CAD scripts without a viewer: in Node, in tests, or in a
 * worker. The session behaves like the viewer session except for what needs
 * a renderer:
 *
 * - `cad.selection` works on an in-memory selection set; nothing is highlighted.
 * - `cad.view.zoomExtents()` does nothing.
 * - `cad.view.capturePreview()` is skipped with a note in the script log.
 * - `cad.file.saveHtml()` is skipped with a note (needs a viewer HTML pipeline).
 * - `cad.file.savePdf()` uses the built-in `@mlightcad/cad-pdf-core` path.
 * - Drawing extents are the union of model-space entity extents.
 *
 * Edits go through `database.runDatabaseEdit`, so undo works as in the viewer.
 * The session declares `runEdit` and `undefined` hooks for `capturePreview`,
 * `exportPdf`, and `exportHtml`, so `withViewerDefaults` in
 * `@mlightcad/cad-agent-core` does not attach the live viewer's notifications,
 * screenshots, or exporters to this unrelated database.
 *
 * @param database - Drawing to operate on.
 * @param options - Title and open mode.
 * @returns A session that always returns the same document and view.
 */
export function createDatabaseSession(
  database: AcDbDatabase,
  options: CreateDatabaseSessionOptions = {}
): CadSession {
  const document = createDatabaseDocument(database, options)
  const view = createDatabaseView(database)
  return {
    getDocument: () => document,
    getView: () => view,
    runEdit(db, label, fn) {
      db.runDatabaseEdit(label, fn)
    },
    capturePreview: undefined,
    // Opt out of viewer exporters; PDF still uses the cad-pdf-core fallback.
    exportPdf: undefined,
    exportHtml: undefined
  }
}

function createDatabaseDocument(
  db: AcDbDatabase,
  options: CreateDatabaseSessionOptions
): CadSessionDocument {
  return {
    database: db,
    openMode: options.openMode ?? CadSessionOpenMode.Write,
    docTitle: options.title ?? 'Untitled',
    layerStore: {
      getLayers(): CadSessionLayerInfo[] {
        return [...db.tables.layerTable.newIterator()].map(layer => ({
          name: layer.name,
          isOn: !layer.isOff,
          isFrozen: ((layer.standardFlags ?? 0) & LAYER_FROZEN_FLAG) !== 0,
          isLocked: ((layer.standardFlags ?? 0) & LAYER_LOCKED_FLAG) !== 0
        }))
      },
      getCurrentLayerName(): string {
        return db.clayer
      }
    },
    layerService: {
      setCurrentLayer(name: string): boolean {
        const layer = db.tables.layerTable.getAt(name)
        if (!layer) return false
        return runServiceEdit(db, LAYER_EDIT_LABEL, () => {
          const opened = openLayerForWrite(db, layer)
          opened.isOff = false
          opened.standardFlags =
            (opened.standardFlags ?? 0) & ~LAYER_FROZEN_FLAG
          db.clayer = opened.name
          return true
        })
      },
      createLayers(names: string[]) {
        return runServiceEdit(db, LAYER_EDIT_LABEL, () => {
          const table = db.tables.layerTable
          let created = 0
          const existed: string[] = []
          for (const name of names) {
            if (table.has(name)) {
              existed.push(name)
              continue
            }
            table.add(
              new AcDbLayerTableRecord({
                name,
                isOff: false,
                isPlottable: true,
                color: new AcCmColor(AcCmColorMethod.ByACI, 7),
                linetype: 'Continuous'
              })
            )
            created++
          }
          return { created, existed }
        })
      }
    },
    entityService: {
      getEntitiesByIds(ids: string[]): AcDbEntity[] {
        return ids
          .map(id => db.tables.blockTable.getEntityById(id))
          .filter((entity): entity is AcDbEntity => !!entity)
      },
      eraseEntities(ids: string[]): number {
        return runServiceEdit(db, ENTITY_EDIT_LABEL, () => {
          let count = 0
          for (const id of ids) {
            const existing = db.tables.blockTable.getEntityById(id)
            if (existing && isEntityOnLockedLayer(db, existing)) continue
            const entity = db.openEntityForWrite(id)
            if (!entity || isEntityOnLockedLayer(db, entity)) continue
            entity.erase()
            count++
          }
          return count
        })
      },
      translateEntities(entities, displacement): number {
        const matrix = new AcGeMatrix3d().makeTranslation(
          displacement.x,
          displacement.y,
          displacement.z
        )
        return transformEntities(db, entities, matrix)
      },
      rotateEntities(entities, basePoint, angleRad): number {
        const matrix = new AcGeMatrix3d()
          .makeTranslation(basePoint.x, basePoint.y, basePoint.z)
          .multiply(new AcGeMatrix3d().makeRotationZ(angleRad))
          .multiply(
            new AcGeMatrix3d().makeTranslation(
              -basePoint.x,
              -basePoint.y,
              -basePoint.z
            )
          )
        return transformEntities(db, entities, matrix)
      }
    }
  }
}

function createDatabaseView(db: AcDbDatabase): CadSessionView {
  const selected = new Set<string>()
  const toList = (value: string | readonly string[]) =>
    typeof value === 'string' ? [value] : value

  return {
    selectionSet: {
      get ids(): readonly string[] {
        return [...selected]
      },
      add(value) {
        for (const id of toList(value)) selected.add(id)
      },
      delete(value) {
        for (const id of toList(value)) selected.delete(id)
      },
      clear() {
        selected.clear()
      }
    },
    zoomToFitDrawing() {
      // No camera without a renderer.
    },
    getDrawingExtents(): AcGeBox2d | undefined {
      const box = new AcGeBox2d()
      for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
        const extents = finiteExtents(entity)
        if (!extents) continue
        box.expandByPoint(new AcGePoint2d(extents.min.x, extents.min.y))
        box.expandByPoint(new AcGePoint2d(extents.max.x, extents.max.y))
      }
      return box.isEmpty() ? undefined : box
    },
    search(query: AcGeBox2d | AcGeBox3d): Array<{ id: string }> {
      const hits: Array<{ id: string }> = []
      for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
        const extents = finiteExtents(entity)
        if (!extents) continue
        const overlaps =
          extents.max.x >= query.min.x &&
          extents.min.x <= query.max.x &&
          extents.max.y >= query.min.y &&
          extents.min.y <= query.max.y
        if (overlaps) hits.push({ id: entity.objectId })
      }
      return hits
    }
  }
}

/**
 * Entity extents, or `undefined` for empty or unbounded geometry (rays, xlines).
 */
function finiteExtents(entity: AcDbEntity): AcGeBox3d | undefined {
  let extents: AcGeBox3d
  try {
    extents = entity.geometricExtents
  } catch {
    return undefined
  }
  if (!extents || extents.isEmpty()) return undefined
  const values = [extents.min.x, extents.min.y, extents.max.x, extents.max.y]
  return values.every(Number.isFinite) ? extents : undefined
}

function transformEntities(
  db: AcDbDatabase,
  entities: AcDbEntity[],
  matrix: AcGeMatrix3d
): number {
  let count = 0
  for (const entity of entities) {
    if (isEntityOnLockedLayer(db, entity)) continue
    const opened = db.openEntityForWrite(entity)
    if (!opened) continue
    opened.transformBy(matrix)
    count++
  }
  return count
}

/**
 * Opens a layer through the active transaction so the change can be undone.
 *
 * Some drawings reuse one handle in several symbol tables, so an id lookup can
 * return another record (for example a text style). In that case the layer is
 * changed directly and the on/thaw part of `setCurrentLayer` is not undoable;
 * the viewer works around this with hooks into the transaction internals.
 */
function openLayerForWrite(
  db: AcDbDatabase,
  layer: AcDbLayerTableRecord
): AcDbLayerTableRecord {
  if (db.getObjectById(layer.objectId) !== layer) return layer
  return db.openObjectForWrite<AcDbLayerTableRecord>(layer.objectId) ?? layer
}

/**
 * Runs a mutation as its own undo step unless a transaction is already open.
 */
function runServiceEdit<T>(db: AcDbDatabase, label: string, fn: () => T): T {
  if (db.transactionManager?.hasTransaction()) return fn()
  let result!: T
  db.runDatabaseEdit(label, () => {
    result = fn()
  })
  return result
}
