import {
  AcCmColor,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import {
  AcApHtmlLivePreview,
  acapStrokeLiveCircle
} from '../overlay/AcApHtmlLivePreview'
import {
  configureMarkupCommand,
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

class AcApMarkupCircleJig extends AcEdPreviewJig<number> {
  private readonly _view: AcTrView2d
  private readonly _center: AcGePoint3dLike
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  private _radius = 0

  constructor(view: AcEdBaseView, center: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._view = view as AcTrView2d
    this._center = center
    this._color = color
    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-markup-circle-${Date.now()}`,
      MARKUP_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(radius: number) {
    this._radius = Math.max(radius, 0)
    this._color = defaultMarkupColor()
    const lineWidth = markupCanvasLineWidth(MARKUP_LINE_WEIGHT)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLiveCircle(
        ctx,
        view,
        this._center,
        this._radius,
        this._color,
        lineWidth
      )
    })
  }

  end() {
    super.end()
    this._preview.acapDispose()
  }
}

/**
 * Create a circle markup, optionally with an attached callout (no arrow).
 */
export class AcApMarkupCircleCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const center = await promptShapeFirstCorner(
        context,
        'jig.markup.circle.center'
      )
      if (!center) return

      const radiusPrompt = new AcEdPromptDistanceOptions(
        AcApI18n.t('jig.markup.circle.radius')
      )
      radiusPrompt.allowZero = false
      radiusPrompt.useBasePoint = true
      radiusPrompt.useDashedLine = true
      radiusPrompt.basePoint = new AcGePoint3d(center.x, center.y, center.z ?? 0)
      radiusPrompt.jig = new AcApMarkupCircleJig(context.view, center, color)
      const radiusResult = await context.view.editor.getDistance(radiusPrompt)
      if (radiusResult.status !== AcEdPromptStatus.OK) return
      const radius = radiusResult.value!

      const callout = await promptAttachedCallout(context, {
        kind: 'circle',
        center: { x: center.x, y: center.y },
        radius
      })
      const meta = createMarkupMeta(
        'circle',
        context.view as AcTrView2d,
        context,
        { text: callout?.text }
      )
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'circle',
        geometry: {
          type: 'circle',
          center: { x: center.x, y: center.y },
          radius,
          callout
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
