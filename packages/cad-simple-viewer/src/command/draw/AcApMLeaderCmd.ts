import {
  AcDbDatabase,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
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
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcTrView2d } from '../../view'
import { isInsertableBlockName } from './isInsertableBlockName'
import {
  acapApplyMLeaderGeometry,
  acapBuildMLeaderGeometry,
  acapMatchKeyword,
  acapResolveMLeaderContentType,
  acapResolveMLeaderStyle,
  type AcApMLeaderPlacementMode,
  type AcApMLeaderSessionOptions
} from './AcApMLeaderCmdUtil'

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

export type AcApMLeaderJigDragMode = 'landingFromArrow' | 'arrowFromLanding'

/**
 * Preview jig that updates an AcDbMLeader while dragging arrow or landing.
 */
export class AcApMLeaderJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _mleader: AcDbMLeader
  private readonly _fixed: AcGePoint3d
  private readonly _session: AcApMLeaderSessionOptions
  private readonly _dbStyle
  private readonly _dragMode: AcApMLeaderJigDragMode
  private readonly _intermediate: AcGePoint3d[]
  private _previewContents = ' '

  constructor(
    view: AcEdBaseView,
    fixedPoint: AcGePoint3dLike,
    session: AcApMLeaderSessionOptions,
    db: AcDbDatabase,
    dragMode: AcApMLeaderJigDragMode = 'landingFromArrow',
    intermediatePoints: AcGePoint3dLike[] = []
  ) {
    super(view)
    this._fixed = new AcGePoint3d().copy(fixedPoint)
    this._session = session
    this._dbStyle = acapResolveMLeaderStyle(db)
    this._dragMode = dragMode
    this._intermediate = intermediatePoints.map(p => new AcGePoint3d().copy(p))
    this._mleader = new AcDbMLeader()
    const geometry = acapBuildMLeaderGeometry(
      this._fixed,
      this._fixed,
      this._dbStyle,
      this._session,
      this._intermediate
    )
    acapApplyMLeaderGeometry(this._mleader, geometry, this._session)
    const contentType = acapResolveMLeaderContentType(
      this._dbStyle,
      this._session
    )
    this._mleader.contentType = contentType
    if (contentType === AcDbMLeaderContentType.MTextContent) {
      this._mleader.contents = this._previewContents
      this._mleader.textLocation = geometry.textLocation
    }
  }

  get entity(): AcDbMLeader {
    return this._mleader
  }

  setPreviewContents(contents: string) {
    this._previewContents = contents || ' '
    this._mleader.contents = this._previewContents
  }

  update(point: AcGePoint3dLike) {
    const arrow =
      this._dragMode === 'landingFromArrow' ? this._fixed : point
    const content =
      this._dragMode === 'landingFromArrow' ? point : this._fixed
    const geometry = acapBuildMLeaderGeometry(
      arrow,
      content,
      this._dbStyle,
      this._session,
      this._intermediate
    )
    acapApplyMLeaderGeometry(this._mleader, geometry, this._session)
    if (
      acapResolveMLeaderContentType(this._dbStyle, this._session) ===
      AcDbMLeaderContentType.MTextContent
    ) {
      this._mleader.contentType = AcDbMLeaderContentType.MTextContent
      this._mleader.contents = this._previewContents
      this._mleader.textLocation = geometry.textLocation
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
      await this.createFromArrowThenLanding(
        context,
        result.value,
        session
      )
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
    const effectiveMax =
      maxPoints > 0 ? maxPoints : 2
    while (effectiveMax > 2 && intermediate.length < effectiveMax - 2) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.nextPoint`)
      )
      prompt.useBasePoint = true
      prompt.basePoint =
        intermediate.length > 0
          ? intermediate[intermediate.length - 1]
          : arrow
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
    jig.update(landing.value)
    const preview = jig.entity
    jig.end()

    await this.commitMLeader(context, preview, session, landing.value)
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
    jig.update(arrow.value)
    const preview = jig.entity
    jig.end()
    await this.commitMLeader(context, preview, session, fixedLanding)
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
      const mtext = await this.openMTextEditor(context, content.value)
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
      'arrowFromLanding'
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
    jig.update(arrow.value)
    const preview = jig.entity
    if (contents) preview.contents = contents
    jig.end()
    await this.commitMLeader(context, preview, session, fixedContent, {
      skipMtextPrompt: true,
      contents
    })
  }

  private async commitMLeader(
    context: AcApContext,
    preview: AcDbMLeader,
    session: AcApMLeaderSessionOptions,
    contentPoint: AcGePoint3dLike,
    opts?: { skipMtextPrompt?: boolean; contents?: string }
  ) {
    const db = context.doc.database
    const style = acapResolveMLeaderStyle(db)
    const contentType = acapResolveMLeaderContentType(style, session)
    const mleader = new AcDbMLeader()
    // Copy geometry from preview
    const geometry = acapBuildMLeaderGeometry(
      preview.leaders[0]?.leaderLines[0]?.vertices[0] ?? contentPoint,
      contentPoint,
      style,
      session
    )
    // Prefer preview geometry when available
    if (preview.numberOfLeaders > 0) {
      const leaders = preview.leaders
      for (const leader of leaders) {
        mleader.addLeader({
          landingPoint: leader.landingPoint,
          doglegVector: leader.doglegVector,
          doglegVectorSet: leader.doglegVectorSet,
          doglegLength: leader.doglegLength,
          directionType: leader.directionType,
          lastLeaderLinePoint: leader.lastLeaderLinePoint,
          lastLeaderLinePointSet: leader.lastLeaderLinePointSet,
          leaderLines: leader.leaderLines.map(line => ({
            vertices: line.vertices.map(p => p.clone())
          }))
        })
      }
      mleader.doglegEnabled = preview.doglegEnabled
      mleader.doglegLength = preview.doglegLength
      mleader.leaderLineType =
        session.leaderLineType ?? preview.leaderLineType
    } else {
      acapApplyMLeaderGeometry(mleader, geometry, session)
    }

    mleader.contentType = contentType

    if (contentType === AcDbMLeaderContentType.MTextContent) {
      let contents = opts?.contents ?? ''
      if (!opts?.skipMtextPrompt) {
        const edited = await this.openMTextEditor(context, contentPoint)
        // Esc / cancel still creates the multileader (AutoCAD parity).
        if (edited != null) contents = edited
      }
      mleader.contents = contents
      mleader.textLocation = preview.textLocation
        ? new AcGePoint3d().copy(preview.textLocation)
        : geometry.textLocation
    } else if (contentType === AcDbMLeaderContentType.BlockContent) {
      const blockName = session.blockName ?? (await this.promptBlockName(session))
      if (!blockName) return
      const btr = db.tables.blockTable.getAt(blockName)
      if (!btr) return
      const anchor = preview.textLocation
        ? new AcGePoint3d().copy(preview.textLocation)
        : geometry.textLocation.clone()
      // Identity + translation to the content anchor (column-major 4x4).
      mleader.blockContent = {
        blockContentId: btr.objectId,
        transformationMatrix: [
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          anchor.x,
          anchor.y,
          anchor.z,
          1
        ]
      }
      mleader.contentBasePosition = anchor
      mleader.contentType = AcDbMLeaderContentType.BlockContent
    } else {
      mleader.contentType = AcDbMLeaderContentType.NoneContent
    }

    db.tables.blockTable.modelSpace.appendEntity(mleader)
  }

  private async openMTextEditor(
    context: AcApContext,
    location: AcGePoint3dLike
  ): Promise<string | null> {
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
      location,
      width: Math.max(textHeight * 12, 1),
      textHeight,
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
    if (!isInsertableBlockName(blockName) || !db.tables.blockTable.has(blockName)) {
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
