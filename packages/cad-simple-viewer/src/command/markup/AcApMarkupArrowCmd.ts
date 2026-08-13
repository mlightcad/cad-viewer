import {
  AcCmColor,
  AcDbLine,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import {
  configureMarkupCommand,
  createMarkupMeta,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import { commitMarkup } from './AcApMarkupPresenter'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  getMarkupLineWeight,
  markupColorToCss
} from './AcApMarkupUtil'

class AcApMarkupArrowJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _line: AcDbLine

  constructor(view: AcEdBaseView, p1: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._line = new AcDbLine(p1, p1)
    this._line.color = color
    this._line.lineWeight = getMarkupLineWeight()
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p2: AcGePoint3dLike) {
    this._line.endPoint = p2
  }
}

/**
 * Create an arrow markup (line + arrowhead overlay).
 */
export class AcApMarkupArrowCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const p1Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.arrow.firstPoint')
      )
      const p1Result = await context.view.editor.getPoint(p1Prompt)
      if (p1Result.status !== AcEdPromptStatus.OK) return
      const p1 = p1Result.value!

      const p2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.arrow.secondPoint')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.jig = new AcApMarkupArrowJig(context.view, p1, color)
      const p2Result = await context.view.editor.getPoint(p2Prompt)
      if (p2Result.status !== AcEdPromptStatus.OK) return
      const p2 = p2Result.value!

      const meta = createMarkupMeta('arrow', context.view as AcTrView2d, context)
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'arrow',
        style: {
          color: markupColorToCss(color),
          lineWeight: getMarkupLineWeight()
        },
        geometry: {
          type: 'arrow',
          start: { x: p1.x, y: p1.y },
          end: { x: p2.x, y: p2.y }
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
