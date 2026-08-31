import { AcCmColor, AcGePoint2dLike } from '@mlightcad/data-model'

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
  acapLiveRectCorners,
  acapStrokeLivePolyline
} from '../overlay/AcApHtmlLivePreview'
import {
  configureMarkupDrawCommand,
  createMarkupMeta,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import { commitMarkup } from './AcApMarkupPresenter'
import {
  promptAttachedCallout,
  promptShapeFirstCorner
} from './AcApMarkupShapeCallout'
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth
} from './AcApMarkupUtil'

class AcApMarkupRectJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private readonly _view: AcTrView2d
  private readonly _first: AcGePoint2dLike
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  private _second: AcGePoint2dLike

  constructor(view: AcEdBaseView, start: AcGePoint2dLike, color: AcCmColor) {
    super(view)
    this._view = view as AcTrView2d
    this._first = start
    this._second = start
    this._color = color
    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-markup-rect-${Date.now()}`,
      MARKUP_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(second: AcGePoint2dLike) {
    this._second = second
    this._color = defaultMarkupColor()
    const lineWidth = markupCanvasLineWidth(MARKUP_LINE_WEIGHT)
    const corners = acapLiveRectCorners(this._first, this._second)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLivePolyline(ctx, view, corners, this._color, lineWidth, {
        closed: true
      })
    })
  }

  end() {
    super.end()
    this._preview.acapDispose()
  }
}

/**
 * Create a rectangular markup, optionally with an attached callout (no arrow).
 */
export class AcApMarkupRectCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupDrawCommand(this)
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
