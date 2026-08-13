import {
  AcCmColor,
  AcDbPolyline,
  AcGePoint2d,
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

function setRect(
  poly: AcDbPolyline,
  a: AcGePoint3dLike,
  b: AcGePoint3dLike
): void {
  poly.reset(false)
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  poly.addVertexAt(0, new AcGePoint2d(minX, minY))
  poly.addVertexAt(1, new AcGePoint2d(maxX, minY))
  poly.addVertexAt(2, new AcGePoint2d(maxX, maxY))
  poly.addVertexAt(3, new AcGePoint2d(minX, maxY))
  poly.closed = true
}

class AcApMarkupHighlightJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _first: AcGePoint3dLike
  private readonly _poly: AcDbPolyline

  constructor(view: AcEdBaseView, start: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._first = start
    this._poly = new AcDbPolyline()
    this._poly.color = color
    this._poly.lineWeight = getMarkupLineWeight()
    setRect(this._poly, start, start)
  }

  get entity(): AcDbPolyline {
    return this._poly
  }

  update(second: AcGePoint3dLike) {
    setRect(this._poly, this._first, second)
  }
}

/**
 * Create a semi-transparent rectangular highlight markup.
 */
export class AcApMarkupHighlightCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const colorCss = markupColorToCss(color)
      const p1Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.highlight.firstCorner')
      )
      const p1Result = await context.view.editor.getPoint(p1Prompt)
      if (p1Result.status !== AcEdPromptStatus.OK) return
      const p1 = p1Result.value!

      const p2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.highlight.secondCorner')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.jig = new AcApMarkupHighlightJig(context.view, p1, color)
      const p2Result = await context.view.editor.getPoint(p2Prompt)
      if (p2Result.status !== AcEdPromptStatus.OK) return
      const p2 = p2Result.value!

      const meta = createMarkupMeta(
        'highlight',
        context.view as AcTrView2d,
        context
      )
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'highlight',
        style: {
          color: colorCss,
          lineWeight: getMarkupLineWeight()
        },
        geometry: {
          type: 'highlight',
          corner1: { x: p1.x, y: p1.y },
          corner2: { x: p2.x, y: p2.y }
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
