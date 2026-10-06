import { AcCmColor, AcGePoint3dLike } from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlTransientManager
} from '@mlightcad/three-renderer'

import { AcApContext } from '../../app'
import {
  AcEdBaseView,
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
import { acapSyncLiveOverlayTextHeight } from '../overlay/AcApOverlayDrawUtil'
import { createMarkupMeta } from './AcApMarkupCmdUtil'
import { AcApMarkupDrawCmd } from './AcApMarkupDrawCmd'
import { commitMarkup } from './AcApMarkupPresenter'
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  defaultMarkupStyle,
  getMarkupFontSize,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth,
  markupColorToCss
} from './AcApMarkupUtil'

class AcApMarkupLineJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcTrView2d
  private readonly _p1: AcGePoint3dLike
  private readonly _ht: AcTrHtmlTransientManager
  private readonly _badge: AcTrHtmlBadge
  private readonly _badgeId: string
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  private _p2: AcGePoint3dLike

  constructor(
    view: AcEdBaseView,
    p1: AcGePoint3dLike,
    color: AcCmColor,
    label: string
  ) {
    super(view)
    this._view = view as AcTrView2d
    this._p1 = p1
    this._p2 = p1
    this._color = color
    this._ht = this._view.htmlTransientManager
    this._badgeId = `live-markup-line-${Date.now()}`
    const style = defaultMarkupStyle()
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      text: label,
      worldPosition: p1,
      layer: MARKUP_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId,
      fontSize: style.fontSize
    })
    this._badge.object.visible = false
    this._ht.add(this._badge)
    acapSyncLiveOverlayTextHeight(this._view, [this._badge], style)

    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-markup-line-stroke-${Date.now()}`,
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
    this._badge.setColor(this._color)
    const style = defaultMarkupStyle()
    this._badge.setFontSize(style.fontSize ?? getMarkupFontSize())
    acapSyncLiveOverlayTextHeight(this._view, [this._badge], style)

    const lineWidth = markupCanvasLineWidth(MARKUP_LINE_WEIGHT)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLiveSegment(
        ctx,
        view,
        this._p1,
        this._p2,
        this._color,
        lineWidth
      )
    })

    this._badge.setPosition({
      x: (this._p1.x + p2.x) / 2,
      y: (this._p1.y + p2.y) / 2
    })
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._preview.acapDispose()
    this._ht.remove(this._badgeId)
  }
}

/**
 * Create a line markup between two points.
 */
export class AcApMarkupLineCmd extends AcApMarkupDrawCmd {
  async execute(context: AcApContext) {
    await this.withMarkupInput(context, async () => {
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
          lineWeight: MARKUP_LINE_WEIGHT
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
