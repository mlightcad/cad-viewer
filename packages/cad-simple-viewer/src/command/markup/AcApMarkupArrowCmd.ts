import { AcCmColor, AcGePoint3dLike } from '@mlightcad/data-model'

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
  AcApHtmlLivePreview,
  acapStrokeLiveSegment
} from '../overlay/AcApHtmlLivePreview'
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
  markupCanvasLineWidth
} from './AcApMarkupUtil'

class AcApMarkupArrowJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcTrView2d
  private readonly _p1: AcGePoint3dLike
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  private _p2: AcGePoint3dLike

  constructor(view: AcEdBaseView, p1: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._view = view as AcTrView2d
    this._p1 = p1
    this._p2 = p1
    this._color = color
    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-markup-arrow-${Date.now()}`,
      MARKUP_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p2: AcGePoint3dLike) {
    this._p2 = p2
    this._color = defaultMarkupColor()
    const lineWidth = markupCanvasLineWidth(getMarkupLineWeight())
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLiveSegment(ctx, view, this._p1, this._p2, this._color, lineWidth, {
        arrow: true
      })
    })
  }

  end() {
    super.end()
    this._preview.acapDispose()
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
