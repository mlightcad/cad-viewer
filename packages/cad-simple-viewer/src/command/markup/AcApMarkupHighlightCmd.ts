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
import { acapFillLiveHighlight,AcApHtmlLivePreview } from '../overlay'
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
  markupCanvasLineWidth,
  markupColorToCss
} from './AcApMarkupUtil'

class AcApMarkupHighlightJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcTrView2d
  private readonly _first: AcGePoint3dLike
  private readonly _preview: AcApHtmlLivePreview
  private _second: AcGePoint3dLike
  private _colorCss: string

  constructor(view: AcEdBaseView, start: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._view = view as AcTrView2d
    this._first = start
    this._second = start
    this._colorCss = markupColorToCss(color)
    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-markup-highlight-${Date.now()}`,
      MARKUP_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(second: AcGePoint3dLike) {
    this._second = second
    this._colorCss = markupColorToCss(defaultMarkupColor())
    const lineWidth = markupCanvasLineWidth(getMarkupLineWeight())
    this._preview.acapSetDraw((ctx, view) => {
      acapFillLiveHighlight(
        ctx,
        view,
        this._first,
        this._second,
        this._colorCss,
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
