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
  acapRemoveMLeaderLine
} from './AcApMLeaderCmdUtil'

const I18N = 'jig.mleaderedit'

/** Screen-pixel aperture for picking a leader line to remove. */
const PICK_APERTURE_PX = 10

/**
 * Converts {@link PICK_APERTURE_PX} into drawing units at `point`, so the
 * pick feels the same at every zoom level.
 */
function pickTolerance(view: AcEdBaseView, point: AcGePoint3dLike) {
  const a = view.worldToScreen(point)
  const b = view.worldToScreen({ x: point.x + 1, y: point.y })
  const pixelsPerUnit = Math.hypot(b.x - a.x, b.y - a.y)
  return pixelsPerUnit > 0 ? PICK_APERTURE_PX / pixelsPerUnit : Infinity
}

/**
 * Transient preview while adding a new leader line to an existing mleader.
 */
class AcApMLeaderEditAddJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _preview: AcDbMLeader
  private readonly _source: AcDbMLeader
  private readonly _view: AcEdBaseView

  constructor(view: AcEdBaseView, source: AcDbMLeader) {
    super(view)
    this._view = view
    this._source = source
    this._preview = this.cloneSource()
  }

  get entity(): AcDbMLeader {
    return this._preview
  }

  update(point: AcGePoint3dLike) {
    this._view.removeTransientEntity(this._preview.objectId)
    // A full clone keeps text height, style, colors and content of the
    // original so the preview looks exactly like the edited result.
    this._preview = this.cloneSource()
    acapAddMLeaderBranch(this._preview, point)
    this._view.addTransientEntity(this._preview)
  }

  private cloneSource() {
    const clone = this._source.clone()
    if (!(clone instanceof AcDbMLeader)) {
      throw new Error('Failed to clone multileader for preview.')
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

    // Open through the command's transaction so the edit gets an undo
    // snapshot; mutating the entity looked up from the block table would not.
    const entity = db.openEntityForWrite(picked.objectId)
    if (!(entity instanceof AcDbMLeader)) return

    if (this.initialMode === 'remove') {
      await this.removeLoop(context, entity)
      return
    }
    await this.addLoop(context, entity)
  }

  private async addLoop(context: AcApContext, mleader: AcDbMLeader) {
    const editor = AcApDocManager.instance.editor

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

      acapAddMLeaderBranch(mleader, result.value)
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

      const nearest = acapFindNearestMLeaderLine(
        mleader,
        result.value,
        pickTolerance(context.view, result.value)
      )
      if (!nearest) {
        editor.showMessage(AcApI18n.t(`${I18N}.noLeaderAtPoint`), 'warning')
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
