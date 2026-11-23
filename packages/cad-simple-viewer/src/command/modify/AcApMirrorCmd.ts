import { AcGePoint3d, AcGeTol } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app/index.js'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { resolveSelectedEntities } from '../../service/index.js'
import { createMirrorMatrix } from '../../util/AcApGeTransform.js'
import {
  AcApMirrorPreviewJig,
  AcApMirrorStaticJig
} from './AcApMirrorPreviewJig.js'

/**
 * Command to mirror selected entities about a line, mirroring AutoCAD
 * `MIRROR`.
 *
 * Supported workflow:
 * 1) Select entities (or reuse preselection),
 * 2) Specify first point of the mirror line,
 * 3) Specify second point of the mirror line (live preview),
 * 4) Erase source objects? Yes / No (default No),
 * 5) Apply reflection in place or append mirrored copies.
 *
 * TEXT / MTEXT / ATTRIB honor the drawing's **MIRRTEXT** system variable.
 */
export class AcApMirrorCmd extends AcEdCommand {
  /**
   * Creates the MIRROR command. Drawing geometry may only be mirrored in
   * Write mode.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Builds a world-space reflection matrix about the XY line through two
   * points.
   */
  static createMirrorMatrix = createMirrorMatrix

  /**
   * Prompts whether to erase the source objects after mirroring.
   *
   * @returns `true` when sources should be erased, `false` to keep them
   *          (including Enter / cancel of the keyword prompt treated as No),
   *          or `undefined` when the user cancels the command.
   */
  private async promptEraseSource(): Promise<boolean | undefined> {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.mirror.eraseSource')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.mirror.keywords.yes.display'),
      AcApI18n.t('jig.mirror.keywords.yes.global'),
      AcApI18n.t('jig.mirror.keywords.yes.local')
    )
    const noKeyword = prompt.keywords.add(
      AcApI18n.t('jig.mirror.keywords.no.display'),
      AcApI18n.t('jig.mirror.keywords.no.global'),
      AcApI18n.t('jig.mirror.keywords.no.local')
    )
    prompt.keywords.default = noKeyword
    prompt.allowNone = true

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      return result.stringResult === 'Yes'
    }
    // Enter with allowNone → AutoCAD default No (keep source).
    return false
  }

  /**
   * Executes MIRROR using selection reuse, a two-point mirror line, and the
   * erase-source Yes/No prompt.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'mirror'
    })
    if (!resolved) return

    const { entities: sourceEntities } = resolved

    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.mirror.firstPoint')
    )
    firstPointPrompt.jig = new AcApMirrorStaticJig<AcGePoint3d>(
      context.view,
      sourceEntities
    )
    // AutoCAD MIRROR: Enter at first point cancels without mirroring.
    firstPointPrompt.allowNone = true
    const firstPointResult =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)
    if (firstPointResult.status !== AcEdPromptStatus.OK) {
      selectionSet.clear()
      return
    }

    const firstPoint = new AcGePoint3d(firstPointResult.value!)

    let secondPoint: AcGePoint3d | undefined
    while (true) {
      const secondPointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.mirror.secondPoint')
      )
      secondPointPrompt.useBasePoint = true
      secondPointPrompt.useDashedLine = true
      secondPointPrompt.basePoint = firstPoint
      secondPointPrompt.jig = new AcApMirrorPreviewJig(
        context.view,
        sourceEntities,
        firstPoint
      )
      const secondPointResult =
        await AcApDocManager.instance.editor.getPoint(secondPointPrompt)
      if (secondPointResult.status !== AcEdPromptStatus.OK) {
        selectionSet.clear()
        return
      }

      const candidate = new AcGePoint3d(secondPointResult.value!)
      const dx = candidate.x - firstPoint.x
      const dy = candidate.y - firstPoint.y
      if (!AcGeTol.isPositive(Math.hypot(dx, dy))) {
        this.notify(AcApI18n.t('jig.mirror.invalid.mirrorLine'), 'warning')
        continue
      }
      secondPoint = candidate
      break
    }

    const eraseSource = await this.promptEraseSource()
    if (eraseSource === undefined) {
      selectionSet.clear()
      return
    }

    const matrix = createMirrorMatrix(firstPoint, secondPoint)
    const entityService = context.doc.entityService
    if (eraseSource) {
      entityService.transformEntities(sourceEntities, matrix, {
        regenerateDimensions: true
      })
    } else {
      entityService.cloneAndTransform(sourceEntities, matrix, {
        regenerateDimensions: true
      })
    }

    selectionSet.clear()
  }
}
