import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbEntity,
  AcDbLeader,
  AcDbLeaderAnnotationType,
  AcDbMText,
  AcDbText,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdMTextEditor,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptEntityOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcTrView2d } from '../../view'
import { isInsertableBlockName } from './isInsertableBlockName'

const I18N = 'jig.leader'

function addKeyword(
  prompt: AcEdPromptPointOptions | AcEdPromptKeywordOptions | AcEdPromptStringOptions,
  key: string
) {
  prompt.keywords.add(
    AcApI18n.t(`${I18N}.keywords.${key}.display`),
    AcApI18n.t(`${I18N}.keywords.${key}.global`),
    AcApI18n.t(`${I18N}.keywords.${key}.local`)
  )
}

/**
 * Live preview jig for LEADER vertex acquisition.
 */
export class AcApLeaderJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcEdBaseView
  private _leader: AcDbLeader
  private _fixed: AcGePoint3d[]
  private _hasTemp = false
  private _isSplined = false
  private _hasArrowHead = true
  private _db: AcDbDatabase

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    fixed: AcGePoint3dLike[],
    options?: { isSplined?: boolean; hasArrowHead?: boolean }
  ) {
    super(view)
    this._view = view
    this._db = db
    this._fixed = fixed.map(p => new AcGePoint3d().copy(p))
    this._isSplined = options?.isSplined ?? false
    this._hasArrowHead = options?.hasArrowHead ?? true
    this._leader = this.createLeader(this._fixed)
  }

  get entity(): AcDbLeader {
    return this._leader
  }

  get fixedCount() {
    return this._fixed.length
  }

  get isSplined() {
    return this._isSplined
  }

  set isSplined(value: boolean) {
    this._isSplined = value
    this._leader.isSplined = value
  }

  get hasArrowHead() {
    return this._hasArrowHead
  }

  set hasArrowHead(value: boolean) {
    this._hasArrowHead = value
    this._leader.hasArrowHead = value
  }

  commitPoint(point: AcGePoint3dLike) {
    if (this._hasTemp) {
      this._leader.setVertexAt(this._fixed.length, point)
      this._hasTemp = false
    } else {
      this._leader.appendVertex(point)
    }
    this._fixed.push(new AcGePoint3d().copy(point))
    this.applyHookPreview()
  }

  undoPoint(): boolean {
    if (this._fixed.length <= 1) return false
    if (this._hasTemp) {
      // Drop temp then last fixed via rebuild
      this._hasTemp = false
    }
    this._fixed.pop()
    this.rebuild(undefined)
    return true
  }

  update(point: AcGePoint3dLike) {
    if (this._fixed.length === 0) return
    if (this._hasTemp) {
      this._leader.setVertexAt(this._fixed.length, point)
    } else {
      this._leader.appendVertex(point)
      this._hasTemp = true
    }
    this.applyHookPreview()
  }

  end() {
    super.end()
  }

  private rebuild(cursor: AcGePoint3dLike | undefined) {
    this._view.removeTransientEntity(this._leader.objectId)
    const points = this._fixed.map(p => p.clone())
    if (cursor) points.push(new AcGePoint3d().copy(cursor))
    this._leader = this.createLeader(points)
    this._hasTemp = cursor != null
    this._view.addTransientEntity(this._leader)
  }

  private createLeader(points: AcGePoint3dLike[]) {
    const leader = new AcDbLeader()
    leader.isSplined = this._isSplined
    leader.hasArrowHead = this._hasArrowHead
    leader.dimensionStyle = this._db.dimstyle || 'Standard'
    for (const point of points) {
      leader.appendVertex(point)
    }
    this.applyHookOn(leader)
    return leader
  }

  private applyHookPreview() {
    this.applyHookOn(this._leader)
  }

  private applyHookOn(leader: AcDbLeader) {
    if (leader.numVertices < 2) {
      leader.hasHookLine = false
      return
    }
    const a = leader.vertexAt(leader.numVertices - 2)
    const b = leader.vertexAt(leader.numVertices - 1)
    const dx = b.x - a.x
    leader.hasHookLine = true
    leader.horizontalDirection = new AcGeVector3d(dx >= 0 ? 1 : -1, 0, 0)
  }
}

/**
 * LEADER — create a legacy leader with annotation options.
 */
export class AcApLeaderCmd extends AcEdCommand {
  private readonly mtextEditor = new AcEdMTextEditor()

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database

    const startPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.startPoint`)
    )
    const start = await editor.getPoint(startPrompt)
    if (start.status !== AcEdPromptStatus.OK || !start.value) return

    let isSplined = false
    let hasArrowHead = true
    const jig = new AcApLeaderJig(context.view, db, [start.value], {
      isSplined,
      hasArrowHead
    })

    for (;;) {
      jig.isSplined = isSplined
      jig.hasArrowHead = hasArrowHead

      const nextPrompt = new AcEdPromptPointOptions(
        jig.fixedCount >= 2
          ? AcApI18n.t(`${I18N}.nextPointOrOptions`)
          : AcApI18n.t(`${I18N}.nextPoint`)
      )
      nextPrompt.useBasePoint = true
      nextPrompt.basePoint = jig.entity.vertexAt(jig.fixedCount - 1)
      if (jig.fixedCount >= 2) {
        nextPrompt.allowNone = true
        addKeyword(nextPrompt, 'annotation')
        addKeyword(nextPrompt, 'format')
        addKeyword(nextPrompt, 'undo')
      } else if (jig.fixedCount >= 1) {
        addKeyword(nextPrompt, 'undo')
      }
      nextPrompt.jig = jig

      const result = await editor.getPoint(nextPrompt)
      if (result.status === AcEdPromptStatus.Cancel) {
        jig.end()
        return
      }

      if (result.status === AcEdPromptStatus.None) {
        jig.end()
        await this.finishAnnotation(context, jig.entity, true)
        return
      }

      if (result.status === AcEdPromptStatus.Keyword) {
        const key = (result.stringResult ?? '').toUpperCase()
        if (key === 'ANNOTATION' || key === 'A') {
          if (jig.fixedCount < 2) continue
          jig.end()
          await this.finishAnnotation(context, jig.entity, true)
          return
        }
        if (key === 'FORMAT' || key === 'F') {
          const format = await this.promptFormat()
          if (format === 'cancel') {
            jig.end()
            return
          }
          if (format === 'spline') isSplined = true
          if (format === 'straight') isSplined = false
          if (format === 'arrow') hasArrowHead = true
          if (format === 'none') hasArrowHead = false
          jig.isSplined = isSplined
          jig.hasArrowHead = hasArrowHead
          continue
        }
        if (key === 'UNDO' || key === 'U') {
          if (!jig.undoPoint()) {
            jig.end()
            return
          }
          continue
        }
        continue
      }

      if (result.status !== AcEdPromptStatus.OK || !result.value) {
        jig.end()
        return
      }

      jig.commitPoint(result.value)
    }
  }

  private async promptFormat(): Promise<
    'spline' | 'straight' | 'arrow' | 'none' | 'cancel' | null
  > {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t(`${I18N}.formatPrompt`)
    )
    addKeyword(prompt, 'spline')
    addKeyword(prompt, 'straight')
    addKeyword(prompt, 'arrow')
    addKeyword(prompt, 'none')
    const result = await editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return 'cancel'
    if (result.status !== AcEdPromptStatus.OK && result.status !== AcEdPromptStatus.Keyword) {
      return null
    }
    const key = (result.stringResult ?? '').toUpperCase()
    if (key === 'SPLINE' || key === 'S') return 'spline'
    if (key === 'STRAIGHT' || key === 'T') return 'straight'
    if (key === 'ARROW' || key === 'A') return 'arrow'
    if (key === 'NONE' || key === 'N') return 'none'
    return null
  }

  private async finishAnnotation(
    context: AcApContext,
    preview: AcDbLeader,
    fromOptions: boolean
  ) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database
    const leader = this.cloneLeader(preview, db)

    if (!fromOptions) {
      db.tables.blockTable.modelSpace.appendEntity(leader)
      return
    }

    // First annotation prompt: text line or <options>
    const textPrompt = new AcEdPromptStringOptions(
      AcApI18n.t(`${I18N}.annotationText`)
    )
    textPrompt.allowEmpty = true
    textPrompt.allowSpaces = true
    const textResult = await editor.getString(textPrompt)

    if (textResult.status === AcEdPromptStatus.Cancel) return

    if (
      textResult.status === AcEdPromptStatus.OK &&
      textResult.stringResult != null &&
      textResult.stringResult.trim() !== ''
    ) {
      const lines = [textResult.stringResult]
      for (;;) {
        const more = new AcEdPromptStringOptions(
          AcApI18n.t(`${I18N}.nextAnnotationLine`)
        )
        more.allowEmpty = true
        more.allowSpaces = true
        const next = await editor.getString(more)
        if (next.status !== AcEdPromptStatus.OK || next.stringResult == null) {
          break
        }
        if (next.stringResult === '') break
        lines.push(next.stringResult)
      }
      const mtext = this.createMTextAtLeaderEnd(
        context,
        leader,
        lines.join('\\P')
      )
      leader.annoType = AcDbLeaderAnnotationType.MText
      leader.hasHookLine = true
      db.tables.blockTable.modelSpace.appendEntity(mtext)
      leader.associatedAnnotation = mtext.objectId
      db.tables.blockTable.modelSpace.appendEntity(leader)
      return
    }

    // Options submenu
    for (;;) {
      const options = new AcEdPromptKeywordOptions(
        AcApI18n.t(`${I18N}.annotationOptions`)
      )
      addKeyword(options, 'tolerance')
      addKeyword(options, 'copy')
      addKeyword(options, 'block')
      addKeyword(options, 'none')
      addKeyword(options, 'mtext')
      const picked = await editor.getKeywords(options)
      if (picked.status === AcEdPromptStatus.Cancel) return
      const key = (picked.stringResult ?? '').toUpperCase()

      if (key === 'TOLERANCE') {
        editor.showMessage(AcApI18n.t(`${I18N}.toleranceUnavailable`), 'warning')
        continue
      }

      if (key === 'NONE' || key === 'N') {
        leader.annoType = AcDbLeaderAnnotationType.NoAnnotation
        leader.hasHookLine = false
        db.tables.blockTable.modelSpace.appendEntity(leader)
        return
      }

      if (key === 'MTEXT' || key === 'M') {
        const mtext = await this.promptMText(context, leader)
        if (!mtext) continue
        leader.annoType = AcDbLeaderAnnotationType.MText
        leader.hasHookLine = true
        db.tables.blockTable.modelSpace.appendEntity(mtext)
        leader.associatedAnnotation = mtext.objectId
        db.tables.blockTable.modelSpace.appendEntity(leader)
        return
      }

      if (key === 'COPY' || key === 'C') {
        const entityPrompt = new AcEdPromptEntityOptions(
          AcApI18n.t(`${I18N}.selectAnnotation`)
        )
        entityPrompt.addAllowedClass('MText')
        entityPrompt.addAllowedClass('Text')
        entityPrompt.addAllowedClass('BlockReference')
        entityPrompt.addAllowedClass('Fcf')
        entityPrompt.setRejectMessage(AcApI18n.t(`${I18N}.rejectAnnotation`))
        const pickedEntity = await editor.getEntity(entityPrompt)
        if (
          pickedEntity.status !== AcEdPromptStatus.OK ||
          !pickedEntity.objectId
        ) {
          continue
        }
        const source = db.tables.blockTable.getEntityById(
          pickedEntity.objectId
        ) as AcDbEntity | undefined
        if (!source) continue
        // AcDbLeader only associates MText / Fcf / Block — promote Text to MText.
        let annotation: AcDbEntity
        if (source instanceof AcDbText) {
          const mtext = new AcDbMText()
          mtext.contents = source.textString
          mtext.height = source.height
          mtext.location = source.position.clone()
          annotation = mtext
        } else {
          annotation = source.clone() as AcDbEntity
        }
        this.moveEntityToLeaderEnd(annotation, leader)
        if (annotation instanceof AcDbBlockReference) {
          leader.annoType = AcDbLeaderAnnotationType.BlockReference
          leader.hasHookLine = false
        } else if (annotation.type === 'Fcf') {
          leader.annoType = AcDbLeaderAnnotationType.Fcf
          leader.hasHookLine = false
        } else {
          leader.annoType = AcDbLeaderAnnotationType.MText
          leader.hasHookLine = true
        }
        db.tables.blockTable.modelSpace.appendEntity(annotation)
        leader.associatedAnnotation = annotation.objectId
        db.tables.blockTable.modelSpace.appendEntity(leader)
        return
      }

      if (key === 'BLOCK' || key === 'B') {
        const namePrompt = new AcEdPromptStringOptions(
          AcApI18n.t('jig.insert.blockName')
        )
        const nameResult = await editor.getString(namePrompt)
        if (nameResult.status !== AcEdPromptStatus.OK) continue
        const blockName = String(nameResult.stringResult ?? '').trim()
        if (
          !isInsertableBlockName(blockName) ||
          !db.tables.blockTable.has(blockName)
        ) {
          editor.showMessage(
            `${AcApI18n.t('jig.insert.blockNotFound')}: ${blockName}`,
            'warning'
          )
          continue
        }
        const end = leader.vertexAt(leader.numVertices - 1)
        const insert = new AcDbBlockReference(blockName)
        insert.position = end
        leader.annoType = AcDbLeaderAnnotationType.BlockReference
        leader.hasHookLine = false
        db.tables.blockTable.modelSpace.appendEntity(insert)
        leader.associatedAnnotation = insert.objectId
        db.tables.blockTable.modelSpace.appendEntity(leader)
        return
      }
    }
  }

  private async promptMText(context: AcApContext, leader: AcDbLeader) {
    const end = leader.vertexAt(leader.numVertices - 1)
    const view = context.view as AcTrView2d
    const textHeight = this.pixelsToWorldY(view, 24)
    const availableFonts =
      (await AcApDocManager.instance.getAvaiableFonts()) ?? []
    const toolbarFontFamilies = Array.from(
      new Set(
        availableFonts
          .flatMap(fontInfo => fontInfo.name)
          .map(fontName => fontName.trim())
          .filter(fontName => fontName.length > 0)
      )
    )
    const result = await this.mtextEditor.open({
      view,
      location: end,
      width: Math.max(textHeight * 10, 1),
      textHeight,
      toolbarFontFamilies
    })
    if (!result || !result.contents.trim()) return null
    const mtext = new AcDbMText()
    mtext.location = result.location
    mtext.contents = result.contents
    mtext.width = result.width
    mtext.height = result.height
    mtext.lineSpacingFactor = result.lineSpacingFactor
    mtext.attachmentPoint = result.attachmentPoint
    return mtext
  }

  private createMTextAtLeaderEnd(
    context: AcApContext,
    leader: AcDbLeader,
    contents: string
  ) {
    const end = leader.vertexAt(leader.numVertices - 1)
    const view = context.view as AcTrView2d
    const textHeight = this.pixelsToWorldY(view, 24)
    const mtext = new AcDbMText()
    mtext.location = end
    mtext.contents = contents
    mtext.height = textHeight
    mtext.width = Math.max(textHeight * 10, 1)
    return mtext
  }

  private moveEntityToLeaderEnd(entity: AcDbEntity, leader: AcDbLeader) {
    const end = leader.vertexAt(leader.numVertices - 1)
    if (entity instanceof AcDbMText) {
      entity.location = end
      return
    }
    if (entity instanceof AcDbBlockReference) {
      entity.position = end
      return
    }
    if ('position' in entity && entity.position) {
      ;(entity as { position: AcGePoint3dLike }).position = end
    }
  }

  private cloneLeader(source: AcDbLeader, db: AcDbDatabase) {
    const leader = new AcDbLeader()
    leader.isSplined = source.isSplined
    leader.hasArrowHead = source.hasArrowHead
    leader.hasHookLine = source.hasHookLine
    leader.horizontalDirection = source.horizontalDirection
    leader.dimensionStyle = db.dimstyle || source.dimensionStyle || 'Standard'
    leader.annoType = source.annoType
    for (let i = 0; i < source.numVertices; i++) {
      leader.appendVertex(source.vertexAt(i))
    }
    return leader
  }

  private pixelsToWorldY(view: AcTrView2d, pixels: number) {
    const p0 = view.screenToWorld({ x: 0, y: 0 })
    const p1 = view.screenToWorld({ x: 0, y: pixels })
    return Math.max(Math.abs(p1.y - p0.y), 1e-4)
  }
}
