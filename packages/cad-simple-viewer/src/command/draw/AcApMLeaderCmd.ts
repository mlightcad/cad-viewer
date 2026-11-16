import {
  acdbAddAnnotationScaleToObject,
  AcDbDatabase,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGiMTextAttachmentPoint
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app/index.js'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdMTextEditor,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptAngleOptions,
  AcEdPromptDistanceOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { AcTrView2d } from '../../view/index.js'
import {
  acapCreateMLeader,
  acapLayoutMLeader,
  acapMatchKeyword,
  type AcApMLeaderJigDragMode,
  type AcApMLeaderPlacement,
  type AcApMLeaderPlacementMode,
  type AcApMLeaderSessionOptions,
  acapResolveMLeaderContentType,
  acapResolveMLeaderPlacement,
  acapResolveMLeaderStyle
} from './AcApMLeaderCmdUtil.js'
import { isInsertableBlockName } from './isInsertableBlockName.js'

const I18N = 'jig.mleader'

function addKeyword(
  prompt:
    | AcEdPromptPointOptions
    | AcEdPromptKeywordOptions
    | AcEdPromptDistanceOptions
    | AcEdPromptIntegerOptions
    | AcEdPromptStringOptions,
  key: string
) {
  prompt.keywords.add(
    AcApI18n.t(`${I18N}.keywords.${key}.display`),
    AcApI18n.t(`${I18N}.keywords.${key}.global`),
    AcApI18n.t(`${I18N}.keywords.${key}.local`)
  )
}

/**
 * Preview jig that updates an AcDbMLeader while dragging arrow or landing.
 */
export class AcApMLeaderJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _mleader: AcDbMLeader
  private readonly _fixed: AcGePoint3d
  private readonly _session: AcApMLeaderSessionOptions
  private readonly _dragMode: AcApMLeaderJigDragMode
  private readonly _intermediate: AcGePoint3d[]
  private readonly _contentFirst: boolean
  private _previewContents = ' '

  constructor(
    view: AcEdBaseView,
    fixedPoint: AcGePoint3dLike,
    session: AcApMLeaderSessionOptions,
    db: AcDbDatabase,
    dragMode: AcApMLeaderJigDragMode = 'landingFromArrow',
    intermediatePoints: AcGePoint3dLike[] = [],
    contentFirst = false
  ) {
    super(view)
    this._fixed = new AcGePoint3d().copy(fixedPoint)
    this._session = session
    this._dragMode = dragMode
    this._contentFirst = contentFirst
    this._intermediate = intermediatePoints.map(p => new AcGePoint3d().copy(p))
    this._mleader = acapCreateMLeader(db, session)
    this.update(this._fixed)
  }

  get entity(): AcDbMLeader {
    return this._mleader
  }

  setPreviewContents(contents: string) {
    this._previewContents = contents || ' '
    if (this._mleader.contentType === AcDbMLeaderContentType.MTextContent) {
      this._mleader.contents = this._previewContents
    }
  }

  /**
   * Arrowhead / landing pair for a cursor position.
   */
  placementAt(point: AcGePoint3dLike): AcApMLeaderPlacement {
    return acapResolveMLeaderPlacement(
      this._fixed,
      point,
      this._dragMode,
      this._contentFirst ? (this._mleader.landingGap ?? 0) : undefined
    )
  }

  update(point: AcGePoint3dLike) {
    const { arrow, landing } = this.placementAt(point)
    acapLayoutMLeader(
      this._mleader,
      arrow,
      landing,
      this._session,
      this._intermediate
    )
    if (this._mleader.contentType === AcDbMLeaderContentType.MTextContent) {
      this._mleader.contents = this._previewContents
    }
  }
}

/**
 * MLEADER — create a multileader with AutoCAD-compatible placement modes.
 */
export class AcApMLeaderCmd extends AcEdCommand {
  private readonly mtextEditor = new AcEdMTextEditor()

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const session: AcApMLeaderSessionOptions = {}
    let mode: AcApMLeaderPlacementMode = 'arrowheadFirst'

    // First prompt may switch mode / options before picking geometry.
    for (;;) {
      const first = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.arrowheadOrOptions`)
      )
      addKeyword(first, 'landingFirst')
      addKeyword(first, 'contentFirst')
      addKeyword(first, 'options')
      const result = await editor.getPoint(first)

      if (result.status === AcEdPromptStatus.Cancel) return

      if (result.status === AcEdPromptStatus.Keyword) {
        const key = result.stringResult
        if (acapMatchKeyword(key, 'Landing first', 'LandingFirst', 'L')) {
          mode = 'landingFirst'
          break
        }
        if (acapMatchKeyword(key, 'Content first', 'ContentFirst', 'C')) {
          mode = 'contentFirst'
          break
        }
        if (acapMatchKeyword(key, 'Options', 'O')) {
          const ok = await this.promptOptions(session)
          if (!ok) return
          continue
        }
        continue
      }

      if (result.status !== AcEdPromptStatus.OK || !result.value) return

      // Arrowhead first with first point already picked
      await this.createFromArrowThenLanding(context, result.value, session)
      return
    }

    if (mode === 'landingFirst') {
      await this.createLandingFirst(context, session)
      return
    }
    if (mode === 'contentFirst') {
      await this.createContentFirst(context, session)
    }
  }

  private async createFromArrowThenLanding(
    context: AcApContext,
    arrowPoint: AcGePoint3dLike,
    session: AcApMLeaderSessionOptions
  ) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database
    const style = acapResolveMLeaderStyle(db)
    const maxPoints = session.maxPoints ?? style?.maxLeaderSegmentsPoints ?? 2

    const arrow = new AcGePoint3d().copy(arrowPoint)
    const intermediate: AcGePoint3d[] = []
    // maxPoints includes arrow + landing; collect points between them.
    const effectiveMax = maxPoints > 0 ? maxPoints : 2
    while (effectiveMax > 2 && intermediate.length < effectiveMax - 2) {
      const prompt = new AcEdPromptPointOptions(AcApI18n.t(`${I18N}.nextPoint`))
      prompt.useBasePoint = true
      prompt.basePoint =
        intermediate.length > 0 ? intermediate[intermediate.length - 1] : arrow
      prompt.useDashedLine = true
      const next = await editor.getPoint(prompt)
      if (next.status !== AcEdPromptStatus.OK || !next.value) return
      intermediate.push(new AcGePoint3d().copy(next.value))
    }

    const jig = new AcApMLeaderJig(
      context.view,
      arrow,
      session,
      db,
      'landingFromArrow',
      intermediate
    )

    const landingPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.landingLocation`)
    )
    landingPrompt.jig = jig
    const landing = await editor.getPoint(landingPrompt)
    if (landing.status !== AcEdPromptStatus.OK || !landing.value) {
      jig.end()
      return
    }
    const placement = jig.placementAt(landing.value)
    jig.end()

    await this.commitMLeader(context, session, placement, intermediate)
  }

  private async createLandingFirst(
    context: AcApContext,
    session: AcApMLeaderSessionOptions
  ) {
    const editor = AcApDocManager.instance.editor
    const landingPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.landingFirstPoint`)
    )
    const landing = await editor.getPoint(landingPrompt)
    if (landing.status !== AcEdPromptStatus.OK || !landing.value) return

    const fixedLanding = new AcGePoint3d().copy(landing.value)
    const jig = new AcApMLeaderJig(
      context.view,
      fixedLanding,
      session,
      context.doc.database,
      'arrowFromLanding'
    )
    const arrowPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.arrowheadLocation`)
    )
    arrowPrompt.jig = jig
    const arrow = await editor.getPoint(arrowPrompt)
    if (arrow.status !== AcEdPromptStatus.OK || !arrow.value) {
      jig.end()
      return
    }
    const placement = jig.placementAt(arrow.value)
    jig.end()
    await this.commitMLeader(context, session, placement)
  }

  private async createContentFirst(
    context: AcApContext,
    session: AcApMLeaderSessionOptions
  ) {
    const editor = AcApDocManager.instance.editor
    const contentPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.contentLocation`)
    )
    const content = await editor.getPoint(contentPrompt)
    if (content.status !== AcEdPromptStatus.OK || !content.value) return

    // Collect content before arrow when mtext
    const style = acapResolveMLeaderStyle(context.doc.database)
    const contentType = acapResolveMLeaderContentType(style, session)
    let contents = ''
    if (contentType === AcDbMLeaderContentType.MTextContent) {
      const mtext = await this.openMTextEditor(
        context,
        acapCreateMLeader(context.doc.database, session),
        content.value
      )
      if (mtext == null) return
      contents = mtext
    } else if (contentType === AcDbMLeaderContentType.BlockContent) {
      const blockName = await this.promptBlockName(session)
      if (!blockName) return
      session.blockName = blockName
    }

    const fixedContent = new AcGePoint3d().copy(content.value)
    const jig = new AcApMLeaderJig(
      context.view,
      fixedContent,
      session,
      context.doc.database,
      'arrowFromLanding',
      [],
      true
    )
    if (contents) jig.setPreviewContents(contents)
    const arrowPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.arrowheadLocation`)
    )
    arrowPrompt.jig = jig
    const arrow = await editor.getPoint(arrowPrompt)
    if (arrow.status !== AcEdPromptStatus.OK || !arrow.value) {
      jig.end()
      return
    }
    const placement = jig.placementAt(arrow.value)
    jig.end()
    await this.commitMLeader(context, session, placement, [], {
      skipMtextPrompt: true,
      contents
    })
  }

  private async commitMLeader(
    context: AcApContext,
    session: AcApMLeaderSessionOptions,
    placement: AcApMLeaderPlacement,
    intermediate: AcGePoint3dLike[] = [],
    opts?: { skipMtextPrompt?: boolean; contents?: string }
  ) {
    const db = context.doc.database
    const style = acapResolveMLeaderStyle(db)
    const mleader = acapCreateMLeader(db, session)
    acapLayoutMLeader(
      mleader,
      placement.arrow,
      placement.landing,
      session,
      intermediate
    )

    if (mleader.contentType === AcDbMLeaderContentType.MTextContent) {
      let contents = opts?.contents ?? ''
      if (!opts?.skipMtextPrompt) {
        const edited = await this.openMTextEditor(
          context,
          mleader,
          mleader.textLocation ?? placement.landing,
          mleader.textAttachmentPoint
        )
        // Esc / cancel still creates the multileader (AutoCAD parity).
        if (edited != null) contents = edited
      }
      mleader.contents = contents
    } else if (mleader.contentType === AcDbMLeaderContentType.BlockContent) {
      const blockName =
        session.blockName ?? (await this.promptBlockName(session))
      if (!blockName) return
      const btr = db.tables.blockTable.getAt(blockName)
      if (!btr) return
      const anchor = new AcGePoint3d().copy(
        mleader.contentBasePosition ?? placement.landing
      )
      const scale = style?.blockScale
      // Style block scale + translation to the landing end (column-major).
      mleader.blockContent = {
        blockContentId: btr.objectId,
        position: anchor,
        scale,
        transformationMatrix: [
          scale?.x ?? 1,
          0,
          0,
          0,
          0,
          scale?.y ?? 1,
          0,
          0,
          0,
          0,
          scale?.z ?? 1,
          0,
          anchor.x,
          anchor.y,
          anchor.z,
          1
        ]
      }
    }

    db.tables.blockTable.modelSpace.appendEntity(mleader)
    if (mleader.annotative && db.cannoscale) {
      acdbAddAnnotationScaleToObject(mleader, db.cannoscale)
    }
  }

  private async openMTextEditor(
    context: AcApContext,
    mleader: AcDbMLeader,
    location: AcGePoint3dLike,
    attachmentPoint: AcGiMTextAttachmentPoint = AcGiMTextAttachmentPoint.TopLeft
  ): Promise<string | null> {
    const view = context.view as AcTrView2d
    const db = context.doc.database
    // Edit with the multileader's own text height and style, like AutoCAD.
    const styleTextHeight = mleader.resolveAnnotativePresentation().textHeight
    const textHeight =
      styleTextHeight > 0 ? styleTextHeight : this.pixelsToWorldY(view, 24)
    const textStyleName = mleader.textStyleId
      ? db.tables.textStyleTable.getIdAt(mleader.textStyleId)?.name
      : undefined
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
      location,
      initialAttachmentPoint: attachmentPoint,
      width: Math.max(textHeight * 12, 1),
      textHeight,
      textStyleName,
      toolbarFontFamilies
    })
    if (!result) return null
    return result.contents
  }

  private async promptBlockName(session: AcApMLeaderSessionOptions) {
    if (session.blockName) return session.blockName
    const editor = AcApDocManager.instance.editor
    const db = AcApDocManager.instance.curDocument.database
    const namePrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.insert.blockName')
    )
    const nameResult = await editor.getString(namePrompt)
    if (nameResult.status !== AcEdPromptStatus.OK) return null
    const blockName = String(nameResult.stringResult ?? '').trim()
    if (
      !isInsertableBlockName(blockName) ||
      !db.tables.blockTable.has(blockName)
    ) {
      editor.showMessage(
        `${AcApI18n.t('jig.insert.blockNotFound')}: ${blockName}`,
        'warning'
      )
      return null
    }
    return blockName
  }

  private async promptOptions(
    session: AcApMLeaderSessionOptions
  ): Promise<boolean> {
    const editor = AcApDocManager.instance.editor
    for (;;) {
      const prompt = new AcEdPromptKeywordOptions(
        AcApI18n.t(`${I18N}.optionsPrompt`)
      )
      addKeyword(prompt, 'leaderType')
      addKeyword(prompt, 'landing')
      addKeyword(prompt, 'contentType')
      addKeyword(prompt, 'maxpoints')
      addKeyword(prompt, 'firstAngle')
      addKeyword(prompt, 'secondAngle')
      addKeyword(prompt, 'exitOptions')
      const result = await editor.getKeywords(prompt)
      if (result.status === AcEdPromptStatus.Cancel) return false
      const key = result.stringResult

      if (acapMatchKeyword(key, 'eXit options', 'Exit options', 'X')) {
        return true
      }

      if (acapMatchKeyword(key, 'Leader type', 'LeaderType', 'T')) {
        const typePrompt = new AcEdPromptKeywordOptions(
          AcApI18n.t(`${I18N}.leaderTypePrompt`)
        )
        addKeyword(typePrompt, 'straight')
        addKeyword(typePrompt, 'spline')
        addKeyword(typePrompt, 'noneLeader')
        const typeResult = await editor.getKeywords(typePrompt)
        const t = typeResult.stringResult
        if (acapMatchKeyword(t, 'Straight', 'S')) {
          session.leaderLineType = AcDbMLeaderLineType.StraightLeader
        } else if (acapMatchKeyword(t, 'sPline', 'Spline', 'P')) {
          session.leaderLineType = AcDbMLeaderLineType.SplineLeader
        } else if (acapMatchKeyword(t, 'None', 'NoneLeader', 'N')) {
          session.leaderLineType = AcDbMLeaderLineType.InvisibleLeader
        }
        continue
      }

      if (acapMatchKeyword(key, 'lAnding', 'Landing', 'A')) {
        const landPrompt = new AcEdPromptKeywordOptions(
          AcApI18n.t(`${I18N}.landingPrompt`)
        )
        addKeyword(landPrompt, 'yes')
        addKeyword(landPrompt, 'no')
        const landResult = await editor.getKeywords(landPrompt)
        const l = landResult.stringResult
        if (acapMatchKeyword(l, 'Yes', 'Y')) {
          session.enableLanding = true
          const lenPrompt = new AcEdPromptDistanceOptions(
            AcApI18n.t(`${I18N}.landingLength`)
          )
          lenPrompt.allowNegative = false
          lenPrompt.allowZero = true
          const len = await editor.getDistance(lenPrompt)
          if (len.status === AcEdPromptStatus.OK && len.value != null) {
            session.doglegLength = len.value
          }
        } else if (acapMatchKeyword(l, 'No', 'N')) {
          session.enableLanding = false
        }
        continue
      }

      if (acapMatchKeyword(key, 'Content type', 'ContentType', 'C')) {
        const contentPrompt = new AcEdPromptKeywordOptions(
          AcApI18n.t(`${I18N}.contentTypePrompt`)
        )
        addKeyword(contentPrompt, 'block')
        addKeyword(contentPrompt, 'mtext')
        addKeyword(contentPrompt, 'none')
        const contentResult = await editor.getKeywords(contentPrompt)
        const c = contentResult.stringResult
        if (acapMatchKeyword(c, 'Block', 'B')) {
          session.contentType = AcDbMLeaderContentType.BlockContent
          const blockName = await this.promptBlockName(session)
          if (blockName) session.blockName = blockName
        } else if (acapMatchKeyword(c, 'Mtext', 'M')) {
          session.contentType = AcDbMLeaderContentType.MTextContent
        } else if (acapMatchKeyword(c, 'None', 'N')) {
          session.contentType = AcDbMLeaderContentType.NoneContent
        }
        continue
      }

      if (acapMatchKeyword(key, 'Maxpoints', 'M')) {
        const maxPrompt = new AcEdPromptIntegerOptions(
          AcApI18n.t(`${I18N}.maxPoints`)
        )
        maxPrompt.allowNegative = false
        maxPrompt.allowZero = false
        const maxResult = await editor.getInteger(maxPrompt)
        if (
          maxResult.status === AcEdPromptStatus.OK &&
          maxResult.value != null
        ) {
          session.maxPoints = Math.max(2, maxResult.value)
        }
        continue
      }

      if (acapMatchKeyword(key, 'First angle', 'FirstAngle', 'F')) {
        const anglePrompt = new AcEdPromptAngleOptions(
          AcApI18n.t(`${I18N}.firstAngle`)
        )
        anglePrompt.allowNegative = true
        anglePrompt.allowZero = true
        const angleResult = await editor.getAngle(anglePrompt)
        if (
          angleResult.status === AcEdPromptStatus.OK &&
          angleResult.value != null
        ) {
          session.firstAngle = angleResult.value
        }
        continue
      }

      if (acapMatchKeyword(key, 'Second angle', 'SecondAngle', 'S')) {
        const anglePrompt = new AcEdPromptAngleOptions(
          AcApI18n.t(`${I18N}.secondAngle`)
        )
        anglePrompt.allowNegative = true
        anglePrompt.allowZero = true
        const angleResult = await editor.getAngle(anglePrompt)
        if (
          angleResult.status === AcEdPromptStatus.OK &&
          angleResult.value != null
        ) {
          session.secondAngle = angleResult.value
        }
        continue
      }
    }
  }

  private pixelsToWorldY(view: AcTrView2d, pixels: number) {
    const p0 = view.screenToWorld({ x: 0, y: 0 })
    const p1 = view.screenToWorld({ x: 0, y: pixels })
    return Math.max(Math.abs(p1.y - p0.y), 1e-4)
  }
}
