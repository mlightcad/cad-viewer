import {
  AcCmColor,
  AcDbLine,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlTransientManager
} from '@mlightcad/three-renderer'

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
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  getMarkupLineWeight,
  markupColorToCss
} from './AcApMarkupUtil'

class AcApMarkupLineJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _line: AcDbLine
  private readonly _ht: AcTrHtmlTransientManager
  private readonly _badge: AcTrHtmlBadge
  private readonly _badgeId: string

  constructor(
    view: AcEdBaseView,
    p1: AcGePoint3dLike,
    color: AcCmColor,
    label: string
  ) {
    super(view)
    this._line = new AcDbLine(p1, p1)
    this._line.color = color
    this._line.lineWeight = getMarkupLineWeight()
    this._ht = (view as AcTrView2d).htmlTransientManager
    this._badgeId = `live-markup-line-${Date.now()}`
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      text: label,
      worldPosition: p1,
      layer: MARKUP_LIVE_LAYER,
      layoutId: (view as AcTrView2d).activeLayoutBtrId
    })
    this._badge.object.visible = false
    this._ht.add(this._badge)
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p2: AcGePoint3dLike) {
    this._line.endPoint = p2
    this._badge.setPosition({
      x: (this._line.startPoint.x + p2.x) / 2,
      y: (this._line.startPoint.y + p2.y) / 2
    })
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._ht.remove(this._badgeId)
  }
}

/**
 * Create a line markup between two points.
 */
export class AcApMarkupLineCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const p1Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.line.firstPoint')
      )
      const p1Result = await context.view.editor.getPoint(p1Prompt)
      if (p1Result.status !== AcEdPromptStatus.OK) return
      const p1 = p1Result.value!

      const p2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.line.secondPoint')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.jig = new AcApMarkupLineJig(context.view, p1, color, 'Line')
      const p2Result = await context.view.editor.getPoint(p2Prompt)
      if (p2Result.status !== AcEdPromptStatus.OK) return
      const p2 = p2Result.value!

      const meta = createMarkupMeta('line', context.view as AcTrView2d, context)
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'line',
        style: {
          color: markupColorToCss(color),
          lineWeight: getMarkupLineWeight()
        },
        geometry: {
          type: 'line',
          start: { x: p1.x, y: p1.y },
          end: { x: p2.x, y: p2.y }
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
