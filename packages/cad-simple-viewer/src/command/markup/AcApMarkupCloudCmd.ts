import {
  AcCmColor,
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
  type AcApHtmlLivePoint,
  AcApHtmlLivePreview,
  acapStrokeLivePolyline
} from '../overlay'
import {
  configureMarkupCommand,
  createMarkupMeta,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import { commitMarkup } from './AcApMarkupPresenter'
import {
  markupCloudVertices,
  tessellateMarkupCloud
} from './AcApMarkupShapeBuilder'
import {
  promptAttachedCallout,
  promptShapeFirstCorner
} from './AcApMarkupShapeCallout'
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  getMarkupLineWeight,
  markupCanvasLineWidth
} from './AcApMarkupUtil'

/** Build tessellated cloud outline (HTML stroke; no AcDb). */
function cloudLivePoints(
  first: AcGePoint2dLike,
  second: AcGePoint2dLike,
  view: AcEdBaseView
): AcApHtmlLivePoint[] {
  return tessellateMarkupCloud(markupCloudVertices(first, second, view))
}

class AcApMarkupCloudJig extends AcEdPreviewJig<AcGePoint2dLike> {
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
      `live-markup-cloud-${Date.now()}`,
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
    const lineWidth = markupCanvasLineWidth(getMarkupLineWeight())
    const points = cloudLivePoints(this._first, this._second, this._view)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLivePolyline(ctx, view, points, this._color, lineWidth, {
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
 * Create a rectangular revision-cloud markup, optionally with an attached
 * callout (leader + text, no arrow).
 */
export class AcApMarkupCloudCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const p1 = await promptShapeFirstCorner(
        context,
        'jig.markup.cloud.firstCorner'
      )
      if (!p1) return

      const p2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.cloud.secondCorner')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.jig = new AcApMarkupCloudJig(context.view, p1, color)
      const p2Result = await context.view.editor.getPoint(p2Prompt)
      if (p2Result.status !== AcEdPromptStatus.OK) return
      const p2 = p2Result.value!

      const callout = await promptAttachedCallout(context, {
        kind: 'cloud',
        corner1: { x: p1.x, y: p1.y },
        corner2: { x: p2.x, y: p2.y }
      })
      const meta = createMarkupMeta(
        'cloud',
        context.view as AcTrView2d,
        context,
        { text: callout?.text }
      )
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'cloud',
        geometry: {
          type: 'cloud',
          corner1: { x: p1.x, y: p1.y },
          corner2: { x: p2.x, y: p2.y },
          callout
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
