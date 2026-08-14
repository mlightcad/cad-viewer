import {
  AcCmColor,
  AcDbPolyline,
  AcGePoint2dLike
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
import { buildMarkupRect, commitMarkup } from './AcApMarkupPresenter'
import {
  promptAttachedCallout,
  promptShapeFirstCorner
} from './AcApMarkupShapeCallout'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  getMarkupLineWeight
} from './AcApMarkupUtil'

class AcApMarkupRectJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private readonly _rect: AcDbPolyline
  private readonly _first: AcGePoint2dLike

  constructor(view: AcEdBaseView, start: AcGePoint2dLike, color: AcCmColor) {
    super(view)
    this._first = start
    this._rect = new AcDbPolyline()
    this._rect.color = color
    this._rect.lineWeight = getMarkupLineWeight()
  }

  get entity(): AcDbPolyline {
    return this._rect
  }

  update(second: AcGePoint2dLike) {
    this._rect.color = defaultMarkupColor()
    this._rect.lineWeight = getMarkupLineWeight()
    buildMarkupRect(this._rect, this._first, second)
  }
}

/**
 * Create a rectangular markup, optionally with an attached callout (no arrow).
 */
export class AcApMarkupRectCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const p1 = await promptShapeFirstCorner(
        context,
        'jig.markup.rect.firstCorner'
      )
      if (!p1) return

      const p2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.rect.secondCorner')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.jig = new AcApMarkupRectJig(context.view, p1, color)
      const p2Result = await context.view.editor.getPoint(p2Prompt)
      if (p2Result.status !== AcEdPromptStatus.OK) return
      const p2 = p2Result.value!

      const callout = await promptAttachedCallout(context, {
        kind: 'rect',
        corner1: { x: p1.x, y: p1.y },
        corner2: { x: p2.x, y: p2.y }
      })
      const meta = createMarkupMeta('rect', context.view as AcTrView2d, context, {
        text: callout?.text
      })
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'rect',
        geometry: {
          type: 'rect',
          corner1: { x: p1.x, y: p1.y },
          corner2: { x: p2.x, y: p2.y },
          callout
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
