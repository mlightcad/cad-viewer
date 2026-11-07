import {
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptEntityOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapAddMLeaderBranch,
  acapCountMLeaderLines,
  acapFindNearestMLeaderLine,
  acapMatchKeyword,
  acapRemoveMLeaderLine,
  acapResolveMLeaderStyle
} from './AcApMLeaderCmdUtil'

const I18N = 'jig.mleaderedit'

/**
 * Transient preview while adding a new leader branch to an existing mleader.
 */
class AcApMLeaderEditAddJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _preview: AcDbMLeader
  private readonly _source: AcDbMLeader
  private readonly _view: AcEdBaseView

  constructor(view: AcEdBaseView, source: AcDbMLeader) {
    super(view)
    this._view = view
    this._source = source
    this._preview = this.cloneMLeader(source)
  }

  get entity(): AcDbMLeader {
    return this._preview
  }

  update(point: AcGePoint3dLike) {
    this._view.removeTransientEntity(this._preview.objectId)
    const next = this.cloneMLeader(this._source)
    const style = acapResolveMLeaderStyle(
      AcApDocManager.instance.curDocument.database
    )
    acapAddMLeaderBranch(next, point, style)
    // Replace internal preview entity by mutating through a rebuild:
    // clear leaders on _preview and copy from next.
    while (this._preview.numberOfLeaders > 0) {
      this._preview.removeLeader(0)
    }
    for (const leader of next.leaders) {
      this._preview.addLeader({
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
    this._preview.contents = this._source.contents
    this._preview.textLocation = this._source.textLocation
    this._preview.contentType = this._source.contentType
    this._preview.doglegEnabled = this._source.doglegEnabled
    this._preview.doglegLength = this._source.doglegLength
    this._preview.leaderLineType = this._source.leaderLineType
    this._view.addTransientEntity(this._preview)
  }

  private cloneMLeader(source: AcDbMLeader) {
    const clone = new AcDbMLeader()
    clone.contentType = source.contentType
    clone.contents = source.contents
    clone.textLocation = source.textLocation
    clone.doglegEnabled = source.doglegEnabled
    clone.doglegLength = source.doglegLength
    clone.leaderLineType = source.leaderLineType
    clone.mleaderStyleId = source.mleaderStyleId
    for (const leader of source.leaders) {
      clone.addLeader({
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
    return clone
  }
}

/**
 * MLEADEREDIT — add or remove leader lines on a multileader.
 */
export class AcApMLeaderEditCmd extends AcEdCommand {
  constructor(private readonly initialMode: 'add' | 'remove' = 'add') {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database

    const entityPrompt = new AcEdPromptEntityOptions(
      AcApI18n.t(`${I18N}.selectMLeader`)
    )
    entityPrompt.addAllowedClass('MLeader')
    entityPrompt.setRejectMessage(AcApI18n.t(`${I18N}.rejectMLeader`))
    const picked = await editor.getEntity(entityPrompt)
    if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return

    const entity = db.tables.blockTable.getEntityById(picked.objectId)
    if (!(entity instanceof AcDbMLeader)) return

    if (this.initialMode === 'remove') {
      await this.removeLoop(context, entity)
      return
    }
    await this.addLoop(context, entity)
  }

  private async addLoop(context: AcApContext, mleader: AcDbMLeader) {
    const editor = AcApDocManager.instance.editor
    const style = acapResolveMLeaderStyle(context.doc.database)

    for (;;) {
      const jig = new AcApMLeaderEditAddJig(context.view, mleader)
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.arrowheadOrRemove`)
      )
      prompt.allowNone = true
      prompt.keywords.add(
        AcApI18n.t(`${I18N}.keywords.remove.display`),
        AcApI18n.t(`${I18N}.keywords.remove.global`),
        AcApI18n.t(`${I18N}.keywords.remove.local`)
      )
      prompt.jig = jig

      const result = await editor.getPoint(prompt)
      jig.end()

      if (result.status === AcEdPromptStatus.Cancel) return
      if (result.status === AcEdPromptStatus.None) {
        context.view.updateEntity(mleader)
        return
      }

      if (result.status === AcEdPromptStatus.Keyword) {
        if (acapMatchKeyword(result.stringResult, 'Remove', 'R')) {
          await this.removeLoop(context, mleader)
          return
        }
        continue
      }

      if (result.status !== AcEdPromptStatus.OK || !result.value) {
        context.view.updateEntity(mleader)
        return
      }

      acapAddMLeaderBranch(mleader, result.value, style)
      context.view.updateEntity(mleader)
    }
  }

  private async removeLoop(context: AcApContext, mleader: AcDbMLeader) {
    const editor = AcApDocManager.instance.editor

    for (;;) {
      if (acapCountMLeaderLines(mleader) <= 0) {
        context.view.updateEntity(mleader)
        return
      }

      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.selectLeaderToRemove`)
      )
      prompt.allowNone = true
      const result = await editor.getPoint(prompt)

      if (
        result.status === AcEdPromptStatus.Cancel ||
        result.status === AcEdPromptStatus.None
      ) {
        context.view.updateEntity(mleader)
        return
      }

      if (result.status !== AcEdPromptStatus.OK || !result.value) {
        context.view.updateEntity(mleader)
        return
      }

      // ~ relative pick tolerance in WCS (generous for annotation tips)
      const extents = mleader.geometricExtents
      const diag = extents.isEmpty()
        ? 1
        : Math.hypot(
            extents.max.x - extents.min.x,
            extents.max.y - extents.min.y
          )
      const pickTol = Math.max(diag * 0.05, 1e-3)
      const nearest = acapFindNearestMLeaderLine(
        mleader,
        result.value,
        pickTol
      )
      if (!nearest) {
        editor.showMessage(AcApI18n.t(`${I18N}.rejectMLeader`), 'warning')
        continue
      }

      // Keep at least one leader line when content exists (AutoCAD-like).
      if (
        acapCountMLeaderLines(mleader) <= 1 &&
        mleader.contentType !== AcDbMLeaderContentType.NoneContent
      ) {
        editor.showMessage(AcApI18n.t(`${I18N}.cannotRemoveLast`), 'warning')
        continue
      }

      acapRemoveMLeaderLine(mleader, nearest.leaderIndex, nearest.lineIndex)
      context.view.updateEntity(mleader)
    }
  }
}
