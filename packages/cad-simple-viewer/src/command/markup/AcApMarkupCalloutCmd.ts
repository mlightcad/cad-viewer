import { AcCmColor, AcGePoint3d, AcGePoint3dLike } from '@mlightcad/data-model'
import {
  AcTrHtmlCallout,
  AcTrHtmlDot,
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
import { type AcTrView2d, pickAttachableShapeMarkupAt } from '../../view'
import {
  AcApHtmlLivePreview,
  acapStrokeLiveSegment
} from '../overlay/AcApHtmlLivePreview'
import { acapSyncLiveOverlayTextHeight } from '../overlay/AcApOverlayDrawUtil'
import { createMarkupMeta, promptMarkupCapsuleText } from './AcApMarkupCmdUtil'
import { AcApMarkupDrawCmd } from './AcApMarkupDrawCmd'
import {
  isAttachableShapeMarkup,
  markupShapeOutlineFromGeometry
} from './AcApMarkupGeometry'
import { attachCalloutToMarkup, commitMarkup } from './AcApMarkupPresenter'
import { promptAttachedCallout } from './AcApMarkupShapeCallout'
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  defaultMarkupStyle,
  getMarkupFontSize,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth,
  subscribeMarkupDrawStyle
} from './AcApMarkupUtil'

/**
 * Live preview while placing a callout text bubble:
 * tip marker + leader line + arrowhead + floating callout bubble.
 */
class AcApMarkupCalloutJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _tip: AcGePoint3dLike
  private readonly _view: AcTrView2d
  private readonly _ht: AcTrHtmlTransientManager
  private readonly _tipDot: AcTrHtmlDot
  private readonly _bubble: AcTrHtmlCallout
  private readonly _preview: AcApHtmlLivePreview
  private readonly _tipDotId: string
  private readonly _bubbleId: string
  private _color: AcCmColor
  private _anchor: AcGePoint3dLike
  private _unsubDrawStyle?: () => void

  constructor(
    view: AcEdBaseView,
    tip: AcGePoint3dLike,
    text: string,
    color: AcCmColor
  ) {
    super(view)
    this._view = view as AcTrView2d
    this._tip = { x: tip.x, y: tip.y, z: tip.z ?? 0 }
    this._anchor = { ...this._tip }
    this._color = color
    this._ht = this._view.htmlTransientManager

    const layoutId = this._view.activeLayoutBtrId
    const stamp = Date.now()
    this._tipDotId = `live-markup-callout-tip-${stamp}`
    this._bubbleId = `live-markup-callout-bubble-${stamp}`

    this._tipDot = new AcTrHtmlDot({
      id: this._tipDotId,
      color,
      worldPosition: this._tip,
      layer: MARKUP_LIVE_LAYER,
      layoutId
    })
    this._ht.add(this._tipDot)

    this._bubble = new AcTrHtmlCallout({
      id: this._bubbleId,
      color,
      text,
      fontSize: getMarkupFontSize(),
      worldPosition: this._tip,
      layer: MARKUP_LIVE_LAYER,
      layoutId
    })
    this._ht.add(this._bubble)
    acapSyncLiveOverlayTextHeight(this._view, [this._bubble], defaultMarkupStyle())

    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-markup-callout-leader-${stamp}`,
      MARKUP_LIVE_LAYER
    )

    this._unsubDrawStyle = subscribeMarkupDrawStyle(() =>
      this.applyCurrentStyle()
    )

    this._view.isHtmlDirty = true
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(anchor: AcGePoint3dLike) {
    this._anchor = { x: anchor.x, y: anchor.y, z: anchor.z ?? 0 }
    this._color = defaultMarkupColor()
    this._bubble.setPosition(this._anchor)
    const style = defaultMarkupStyle()
    this._bubble.setFontSize(style.fontSize ?? getMarkupFontSize())
    acapSyncLiveOverlayTextHeight(this._view, [this._bubble], style)
    this.paintLeader()
    this._view.isHtmlDirty = true
  }

  /** Capsule used for in-place text entry after the bubble is placed. */
  get capsule(): AcTrHtmlCallout {
    return this._bubble
  }

  /**
   * Called when point input ends. Keep leader + bubble visible while the user
   * types callout text; {@link disposePreview} cleans up afterwards.
   */
  end() {
    // Intentionally do not remove the HTML overlays.
  }

  /** Remove frozen preview graphics after text entry (or cancel). */
  disposePreview() {
    this._unsubDrawStyle?.()
    this._unsubDrawStyle = undefined
    this._preview.acapDispose()
    this._ht.remove(this._tipDotId)
    this._ht.remove(this._bubbleId)
    this._view.isHtmlDirty = true
  }

  /** Apply session draw style to the frozen preview (including during text entry). */
  private applyCurrentStyle(): void {
    this._color = defaultMarkupColor()
    this._tipDot.setColor(this._color)
    this._bubble.setColor(this._color)
    const style = defaultMarkupStyle()
    this._bubble.setFontSize(style.fontSize ?? getMarkupFontSize())
    acapSyncLiveOverlayTextHeight(this._view, [this._bubble], style)
    this.paintLeader()
    this._view.isHtmlDirty = true
  }

  private paintLeader(): void {
    const lineWidth = markupCanvasLineWidth(MARKUP_LINE_WEIGHT)
    const color = this._color
    const tip = this._tip
    const anchor = this._anchor
    this._preview.acapSetDraw((ctx, view) => {
      // Arrow at tip (leader begins at tip, bubble at anchor).
      acapStrokeLiveSegment(ctx, view, anchor, tip, color, lineWidth, {
        arrow: true
      })
    })
  }
}

/**
 * Create a callout (leader tip + text bubble) with Design Review–style jig preview.
 *
 * Matches Autodesk Design Review 2D callout placement:
 * 1. Click where the leader / arrow tip begins
 * 2. Drag to place the callout text box (live leader + arrow + bubble preview)
 * 3. Type the callout text in the capsule
 *
 * @see Autodesk Design Review help — Create a Callout for 2D Content
 */
export class AcApMarkupCalloutCmd extends AcApMarkupDrawCmd {
  async execute(context: AcApContext) {
    await this.withMarkupInput(context, async () => {
      const color = defaultMarkupColor()

      // 1. Arrow / leader tip (where the leader begins on the drawing)
      const tipPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.callout.tip')
      )
      const tipResult = await context.view.editor.getPoint(tipPrompt)
      if (tipResult.status !== AcEdPromptStatus.OK) return
      const tip = tipResult.value!
      const view2d = context.view as AcTrView2d

      // Clicking the outer frame of a cloud / rect / circle that has no
      // leader yet attaches a callout to that shape instead of creating a
      // standalone callout markup.
      const host = pickAttachableShapeMarkupAt(view2d, { x: tip.x, y: tip.y })
      if (host && isAttachableShapeMarkup(host.geometry)) {
        const outline = markupShapeOutlineFromGeometry(host.geometry)
        const callout = await promptAttachedCallout(context, outline, {
          force: true,
          previewShape: false,
          toward: { x: tip.x, y: tip.y }
        })
        if (callout) {
          attachCalloutToMarkup(context.view, host.id, callout)
        }
        return
      }

      // 2. Text-box location with live jig preview (placeholder bubble)
      const jig = new AcApMarkupCalloutJig(context.view, tip, '', color)
      try {
        const anchorPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.markup.callout.anchor')
        )
        anchorPrompt.basePoint = new AcGePoint3d(tip.x, tip.y, tip.z ?? 0)
        anchorPrompt.useBasePoint = true
        anchorPrompt.useDashedLine = false
        anchorPrompt.jig = jig
        const anchorResult = await context.view.editor.getPoint(anchorPrompt)
        if (anchorResult.status !== AcEdPromptStatus.OK) return
        const anchor = anchorResult.value!

        // 3. Type in the capsule (same as double-click edit)
        const text = await promptMarkupCapsuleText(jig.capsule)

        const meta = createMarkupMeta(
          'callout',
          context.view as AcTrView2d,
          context,
          { text: text || undefined }
        )
        const record: AcApMarkupRecord = {
          ...meta,
          type: 'callout',
          geometry: {
            type: 'callout',
            tip: { x: tip.x, y: tip.y },
            anchor: { x: anchor.x, y: anchor.y }
          }
        }
        commitMarkup(context.view, record)
      } finally {
        jig.disposePreview()
      }
    })
  }
}
