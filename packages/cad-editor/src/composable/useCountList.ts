import {
  AcApDocManager,
  AcEdPromptBoxOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbEntity,
  AcDbObjectId,
  AcGeBox2d,
  AcGeMatrix3d
} from '@mlightcad/data-model'

/** One counted block instance (top-level or nested). */
export interface MlCountListInstance {
  /** Object ID used for selection/highlight (parent INSERT for nested). */
  id: AcDbObjectId
  /** Referenced block definition name. */
  blockName: string
  /** WCS insertion point used for area filter / zoom. */
  position: { x: number; y: number; z: number }
  isNested: boolean
}

/** Aggregated count row shown in the Count palette. */
export interface MlCountListGroup {
  key: string
  blockName: string
  label: string
  count: number
  instances: MlCountListInstance[]
}

/** Optional rectangular count area in WCS. */
export type MlCountListArea = AcGeBox2d | null

type InsertionTransformProvider = {
  getFullInsertionTransform?: () => AcGeMatrix3d
}

function isBlockReference(entity: AcDbEntity): entity is AcDbBlockReference {
  return (
    entity.type === 'BlockReference' ||
    (typeof (entity as AcDbBlockReference).blockName === 'string' &&
      typeof (entity as AcDbBlockReference).attributeIterator === 'function')
  )
}

function isCountableBlockName(blockName: string): boolean {
  // Skip anonymous / system blocks (*D, *U, *X, *T, *Model_Space, …).
  return !!blockName && !blockName.startsWith('*')
}

function applyMatrix(
  matrix: AcGeMatrix3d,
  point: { x: number; y: number; z: number }
) {
  const e = matrix.elements
  return {
    x: e[0] * point.x + e[4] * point.y + e[8] * point.z + e[12],
    y: e[1] * point.x + e[5] * point.y + e[9] * point.z + e[13],
    z: e[2] * point.x + e[6] * point.y + e[10] * point.z + e[14]
  }
}

function getInsertionTransform(entity: AcDbBlockReference): AcGeMatrix3d {
  const withTransform = entity as unknown as InsertionTransformProvider
  if (typeof withTransform.getFullInsertionTransform === 'function') {
    return withTransform.getFullInsertionTransform()
  }
  return entity.blockTransform.clone()
}

function isLayerVisible(db: AcDbDatabase, layerName: string): boolean {
  const layer = db.tables.layerTable.getAt(layerName)
  if (!layer) return true
  return !layer.isOff && !layer.isFrozen
}

function isInArea(
  area: MlCountListArea,
  position: { x: number; y: number; z: number }
): boolean {
  if (!area) return true
  return area.containsPoint({ x: position.x, y: position.y })
}

/**
 * Collects countable block instances from model space, including nested
 * inserts inside referenced block definitions (AutoCAD Count behavior).
 */
export function collectCountListInstances(
  area: MlCountListArea = null
): MlCountListInstance[] {
  const doc = AcApDocManager.instance.curDocument
  const db = doc.database
  const modelSpace = db.tables.blockTable.modelSpace
  const result: MlCountListInstance[] = []
  const visitedBlocks = new Set<string>()

  const pushInstance = (
    entity: AcDbBlockReference,
    selectionId: AcDbObjectId,
    worldPosition: { x: number; y: number; z: number },
    isNested: boolean
  ) => {
    if (!isCountableBlockName(entity.blockName)) return
    if (!entity.visibility) return
    if (!isLayerVisible(db, entity.layer)) return
    if (!isInArea(area, worldPosition)) return

    result.push({
      id: selectionId,
      blockName: entity.blockName,
      position: worldPosition,
      isNested
    })
  }

  const walkNested = (
    blockName: string,
    parentId: AcDbObjectId,
    parentMatrix: AcGeMatrix3d,
    depth: number
  ) => {
    if (depth > 16) return
    if (!isCountableBlockName(blockName)) return

    const record = db.tables.blockTable.getAt(blockName)
    if (!record) return

    // Avoid infinite recursion on self-referencing block defs.
    const visitKey = `${blockName}@${depth}`
    if (visitedBlocks.has(visitKey)) return
    visitedBlocks.add(visitKey)

    for (const child of record.newIterator()) {
      if (!isBlockReference(child) || child.type === 'Table') continue
      const local = child.position
      const worldPosition = applyMatrix(parentMatrix, local)
      pushInstance(child, parentId, worldPosition, true)

      const childMatrix = getInsertionTransform(child)
      const composed = parentMatrix.clone().multiply(childMatrix)
      walkNested(child.blockName, parentId, composed, depth + 1)
    }

    visitedBlocks.delete(visitKey)
  }

  for (const entity of modelSpace.newIterator()) {
    if (!isBlockReference(entity) || entity.type === 'Table') continue
    if (!isCountableBlockName(entity.blockName)) continue
    if (!entity.visibility) continue
    if (!isLayerVisible(db, entity.layer)) continue

    const position = {
      x: entity.position.x,
      y: entity.position.y,
      z: entity.position.z
    }
    // Parent may be outside the count area while a nested insert is inside.
    if (isInArea(area, position)) {
      pushInstance(entity, entity.objectId, position, false)
    }

    const parentMatrix = getInsertionTransform(entity)
    walkNested(entity.blockName, entity.objectId, parentMatrix, 1)
  }

  return result
}

/** Aggregates instances into Count palette rows by block name. */
export function buildCountListGroups(
  instances: MlCountListInstance[],
  search = ''
): MlCountListGroup[] {
  const query = search.trim().toLowerCase()
  const map = new Map<string, MlCountListGroup>()

  for (const instance of instances) {
    if (query && !instance.blockName.toLowerCase().includes(query)) {
      continue
    }

    const key = instance.blockName
    let group = map.get(key)
    if (!group) {
      group = {
        key,
        blockName: instance.blockName,
        label: instance.blockName,
        count: 0,
        instances: []
      }
      map.set(key, group)
    }

    group.instances.push(instance)
    group.count = group.instances.length
  }

  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  )
}

/** Selects the given object IDs in the active view. */
export function selectCountListInstances(ids: AcDbObjectId[]) {
  const selectionSet = AcApDocManager.instance.curView.selectionSet
  selectionSet.clear()
  const unique = Array.from(new Set(ids))
  if (unique.length > 0) {
    selectionSet.add(unique)
  }
}

/**
 * Zooms the view to the geometric extents of the given object IDs.
 * Falls back to insertion points when extents are empty.
 */
export function zoomToCountListInstances(
  ids: AcDbObjectId[],
  fallbackPositions: Array<{ x: number; y: number }> = []
): boolean {
  const view = AcApDocManager.instance.curView
  const db = AcApDocManager.instance.curDocument.database
  const box = new AcGeBox2d()
  let hasPoint = false

  for (const id of ids) {
    const entity = db.tables.blockTable.getEntityById(id)
    if (!entity) continue
    try {
      const extents = entity.geometricExtents
      if (extents && !extents.isEmpty()) {
        box.expandByPoint({ x: extents.min.x, y: extents.min.y })
        box.expandByPoint({ x: extents.max.x, y: extents.max.y })
        hasPoint = true
        continue
      }
    } catch {
      // Some entities may not provide extents; fall through.
    }
    if (isBlockReference(entity)) {
      box.expandByPoint({ x: entity.position.x, y: entity.position.y })
      hasPoint = true
    }
  }

  if (!hasPoint) {
    for (const point of fallbackPositions) {
      box.expandByPoint(point)
      hasPoint = true
    }
  }

  if (!hasPoint || box.isEmpty()) return false
  view.zoomTo(box, 1.5)
  return true
}

/**
 * Prompts the user for a rectangular count area (or Entire via keyword).
 * Returns the selected box, `null` for entire drawing, or `undefined` if cancelled.
 */
export async function promptCountListArea(
  firstCornerMessage: string,
  secondCornerMessage: string
): Promise<AcGeBox2d | null | undefined> {
  const boxOptions = new AcEdPromptBoxOptions(
    firstCornerMessage,
    secondCornerMessage
  )
  boxOptions.keywords.add('Entire')

  const boxResult = await AcApDocManager.instance.editor.getBox(boxOptions)
  if (boxResult.status === AcEdPromptStatus.Keyword) {
    if (boxResult.stringResult?.toUpperCase() === 'ENTIRE') {
      return null
    }
    return undefined
  }
  if (boxResult.status !== AcEdPromptStatus.OK || !boxResult.value) {
    return undefined
  }
  return boxResult.value
}

/** Convenience: rebuild groups from current drawing state. */
export function getCountListGroups(
  search = '',
  area: MlCountListArea = null
): MlCountListGroup[] {
  return buildCountListGroups(collectCountListInstances(area), search)
}
