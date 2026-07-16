import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbBlockTableRecordFlag,
  AcDbDatabase,
  AcDbEntity,
  AcDbFileType,
  AcDbLayerTableRecord,
  AcDbPolyline,
  AcDbViewport,
  AcGeBox3d,
  AcGePoint2d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptAngleOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { acapRunDatabaseEdit } from '../../util/AcApDatabaseEdit'

/** Accept list for drawing file pickers (AutoCAD XATTACH formats). */
const XREF_FILE_ACCEPT = '.dwg,.dxf'

/** Fallback preview size when the source drawing has empty extents. */
const DEFAULT_EXTENT_SIZE = 100

/**
 * Resolves a local filesystem path for a browser/Electron {@link File}.
 * Falls back to {@link File.name} when the absolute path is unavailable.
 */
function resolveLocalFilePath(file: File): string {
  const injected = (
    window as Window & {
      mlightcadGetLocalFilePath?: (file: File) => string | undefined
    }
  ).mlightcadGetLocalFilePath?.(file)?.trim()
  if (injected) return injected

  const electronWebUtils = (
    window as Window & {
      electron?: { webUtils?: { getPathForFile?: (file: File) => string } }
    }
  ).electron?.webUtils
  const fromElectron = electronWebUtils?.getPathForFile?.(file)?.trim()
  if (fromElectron) return fromElectron

  const legacy = file as File & { path?: string; mozFullPath?: string }
  const fromPath = legacy.path?.trim()
  if (fromPath) return fromPath

  const fromMoz = legacy.mozFullPath?.trim()
  if (fromMoz) return fromMoz

  return file.name
}

function xrefBaseName(fileName: string): string {
  return fileName.replace(/\.(dwg|dxf)$/i, '') || fileName
}

function uniqueXrefName(db: AcDbDatabase, fileName: string): string {
  const base = xrefBaseName(fileName)
  if (!db.tables.blockTable.has(base)) return base
  let index = 1
  while (db.tables.blockTable.has(`${base}_${index}`)) {
    index++
  }
  return `${base}_${index}`
}

function pickXrefFile(): Promise<File | undefined> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = XREF_FILE_ACCEPT
    input.style.display = 'none'
    document.body.appendChild(input)

    let settled = false
    const finish = (file?: File) => {
      if (settled) return
      settled = true
      input.removeEventListener('change', onChange)
      input.removeEventListener('cancel', onCancel)
      input.remove()
      resolve(file)
    }

    const onChange = () => finish(input.files?.[0])
    const onCancel = () => finish(undefined)

    input.addEventListener('change', onChange)
    input.addEventListener('cancel', onCancel)
    input.click()
  })
}

function resolveSourceExtents(sourceDb: AcDbDatabase): AcGeBox3d {
  const extents = sourceDb.extents?.clone?.() ?? new AcGeBox3d()
  if (!extents.isEmpty()) return extents

  // Fallback: union geometric extents of top-level model-space entities.
  const box = new AcGeBox3d()
  for (const entity of sourceDb.tables.blockTable.modelSpace.newIterator()) {
    if (entity instanceof AcDbViewport) continue
    try {
      const entityBox = entity.geometricExtents
      if (entityBox && !entityBox.isEmpty()) {
        box.expandByPoint(entityBox.min)
        box.expandByPoint(entityBox.max)
      }
    } catch {
      // Skip entities that cannot report extents.
    }
  }
  if (!box.isEmpty()) return box

  return new AcGeBox3d(
    new AcGePoint3d(0, 0, 0),
    new AcGePoint3d(DEFAULT_EXTENT_SIZE, DEFAULT_EXTENT_SIZE, 0)
  )
}

function ensureLayersFromSource(hostDb: AcDbDatabase, sourceDb: AcDbDatabase) {
  const hostLayers = hostDb.tables.layerTable
  for (const layer of sourceDb.tables.layerTable.newIterator()) {
    if (hostLayers.has(layer.name)) continue
    const clone = layer.clone() as AcDbLayerTableRecord
    hostLayers.add(clone)
  }
}

function shouldBindEntity(entity: AcDbEntity): boolean {
  // Match overlay attach scope: top-level geometry only. Nested INSERT
  // expansion and viewports are skipped until full xref bind is available.
  if (entity instanceof AcDbViewport) return false
  if (entity instanceof AcDbBlockReference) return false
  return true
}

function bindXrefContent(
  xrefRecord: AcDbBlockTableRecord,
  sourceDb: AcDbDatabase
) {
  const entities: AcDbEntity[] = []
  for (const entity of sourceDb.tables.blockTable.modelSpace.newIterator()) {
    if (!shouldBindEntity(entity)) continue
    entities.push(entity.clone() as AcDbEntity)
  }
  if (entities.length > 0) {
    xrefRecord.appendEntity(entities)
  }
}

/**
 * Preview jig for XATTACH — shows the xref extents frame while the user picks
 * insertion point, scale, or rotation.
 */
class AcApXAttachJig extends AcEdPreviewJig<AcGePoint3dLike | number> {
  private readonly _entity: AcDbPolyline
  private readonly _localCorners: AcGePoint2d[]
  private _mode: 'point' | 'scale' | 'rotation' = 'point'
  private _position = new AcGePoint3d()
  private _scale = 1
  private _rotationRad = 0

  constructor(view: AcEdBaseView, extents: AcGeBox3d) {
    super(view)
    const min = extents.min
    const max = extents.max
    this._localCorners = [
      new AcGePoint2d(min.x, min.y),
      new AcGePoint2d(max.x, min.y),
      new AcGePoint2d(max.x, max.y),
      new AcGePoint2d(min.x, max.y)
    ]
    this._entity = AcDbPolyline.from2dPoints(
      this._localCorners.map(p => p.clone()),
      true
    )
    this.applyGeometry()
  }

  get entity(): AcDbPolyline {
    return this._entity
  }

  setMode(mode: 'point' | 'scale' | 'rotation') {
    this._mode = mode
  }

  setPosition(point: AcGePoint3dLike) {
    this._position = new AcGePoint3d(point)
    this.applyGeometry()
  }

  setScale(scale: number) {
    this._scale = scale
    this.applyGeometry()
  }

  setRotationRad(rotationRad: number) {
    this._rotationRad = rotationRad
    this.applyGeometry()
  }

  update(value: AcGePoint3dLike | number) {
    if (this._mode === 'point' && typeof value !== 'number') {
      this.setPosition(value)
      return
    }
    if (typeof value !== 'number') return
    if (this._mode === 'scale') {
      this.setScale(value > 0 ? value : this._scale)
      return
    }
    if (this._mode === 'rotation') {
      // Angle prompts provide degrees.
      this.setRotationRad((value * Math.PI) / 180)
    }
  }

  private applyGeometry() {
    const cos = Math.cos(this._rotationRad)
    const sin = Math.sin(this._rotationRad)
    const scale = this._scale
    const worldPoints = this._localCorners.map(local => {
      const x = local.x * scale
      const y = local.y * scale
      return new AcGePoint2d(
        this._position.x + x * cos - y * sin,
        this._position.y + x * sin + y * cos
      )
    })
    this._entity.reset(false)
    worldPoints.forEach((point, index) => {
      this._entity.addVertexAt(index, point)
    })
    this._entity.closed = true
  }
}

/**
 * XATTACH (alias: XA) — attaches a DWG/DXF drawing as an external reference.
 *
 * Flow (AutoCAD-aligned):
 * 1. Pick a DWG/DXF file
 * 2. Specify insertion point
 * 3. Specify scale factor (default 1)
 * 4. Specify rotation angle (default 0)
 * 5. Create an xref {@link AcDbBlockTableRecord} (with bound model-space content)
 *    and append an {@link AcDbBlockReference} INSERT
 */
export class AcApXAttachCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const file = await pickXrefFile()
    if (!file) return

    const extension = file.name.split('.').pop()?.toLocaleLowerCase()
    if (extension !== 'dwg' && extension !== 'dxf') {
      this.showMessage(AcApI18n.t('jig.xattach.unsupportedFile'), 'warning')
      return
    }

    let sourceDb: AcDbDatabase
    try {
      const buffer = await file.arrayBuffer()
      sourceDb = await AcApDocManager.instance.withBusyIndicator(async () => {
        const db = new AcDbDatabase()
        await db.read(
          buffer,
          { readOnly: true },
          extension === 'dwg' ? AcDbFileType.DWG : AcDbFileType.DXF
        )
        return db
      }, AcApI18n.t('jig.xattach.loading'))
    } catch {
      this.showMessage(AcApI18n.t('jig.xattach.loadFailed'), 'error')
      return
    }

    const extents = resolveSourceExtents(sourceDb)
    const jig = new AcApXAttachJig(context.view, extents)

    try {
      jig.setMode('point')
      const insertionPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.xattach.insertionPoint')
      )
      insertionPrompt.jig = jig
      const insertionResult =
        await AcApDocManager.instance.editor.getPoint(insertionPrompt)
      if (
        insertionResult.status !== AcEdPromptStatus.OK ||
        !insertionResult.value
      ) {
        return
      }
      const insertionPoint = new AcGePoint3d(insertionResult.value)
      jig.setPosition(insertionPoint)

      jig.setMode('scale')
      const scalePrompt = new AcEdPromptDoubleOptions(
        `${AcApI18n.t('jig.xattach.scale')} <1>`
      )
      scalePrompt.allowNone = true
      scalePrompt.allowNegative = false
      scalePrompt.allowZero = false
      scalePrompt.useDefaultValue = true
      scalePrompt.defaultValue = 1
      scalePrompt.jig = jig
      const scaleResult =
        await AcApDocManager.instance.editor.getDouble(scalePrompt)
      if (
        scaleResult.status === AcEdPromptStatus.Cancel ||
        scaleResult.status === AcEdPromptStatus.Error
      ) {
        return
      }
      const scale =
        scaleResult.status === AcEdPromptStatus.OK &&
        scaleResult.value !== undefined
          ? scaleResult.value
          : 1
      if (!(scale > 0)) {
        this.showMessage(AcApI18n.t('jig.xattach.invalidScale'), 'warning')
        return
      }
      jig.setScale(scale)

      jig.setMode('rotation')
      const rotationPrompt = new AcEdPromptAngleOptions(
        `${AcApI18n.t('jig.xattach.rotation')} <0>`
      )
      rotationPrompt.allowNone = true
      rotationPrompt.allowNegative = true
      rotationPrompt.allowZero = true
      rotationPrompt.useDefaultValue = true
      rotationPrompt.defaultValue = 0
      rotationPrompt.useBasePoint = true
      rotationPrompt.useDashedLine = true
      rotationPrompt.basePoint = insertionPoint
      rotationPrompt.jig = jig
      const rotationResult =
        await AcApDocManager.instance.editor.getAngle(rotationPrompt)
      if (
        rotationResult.status === AcEdPromptStatus.Cancel ||
        rotationResult.status === AcEdPromptStatus.Error
      ) {
        return
      }
      const rotationDeg =
        rotationResult.status === AcEdPromptStatus.OK &&
        rotationResult.value !== undefined
          ? rotationResult.value
          : 0
      const rotationRad = (rotationDeg * Math.PI) / 180

      const db = context.doc.database
      const blockName = uniqueXrefName(db, file.name)
      const filePath = resolveLocalFilePath(file)

      acapRunDatabaseEdit(db, 'XATTACH', () => {
        ensureLayersFromSource(db, sourceDb)

        const xrefRecord = new AcDbBlockTableRecord()
        xrefRecord.name = blockName
        xrefRecord.pathName = filePath
        xrefRecord.flags =
          AcDbBlockTableRecordFlag.Xref |
          AcDbBlockTableRecordFlag.Resolved |
          AcDbBlockTableRecordFlag.Referenced
        xrefRecord.origin =
          sourceDb.tables.blockTable.modelSpace.origin.clone()
        db.tables.blockTable.add(xrefRecord)
        bindXrefContent(xrefRecord, sourceDb)

        const insert = new AcDbBlockReference(blockName)
        insert.position = insertionPoint
        insert.scaleFactors = new AcGePoint3d(scale, scale, scale)
        insert.rotation = rotationRad
        db.tables.blockTable.modelSpace.appendEntity(insert)
      })
    } finally {
      jig.end()
    }
  }
}
