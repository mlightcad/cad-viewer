/**
 * Shared option + prompts for shape markups (cloud / rect / circle) that can
 * optionally attach a leader + text box (no arrow), matching Design Review
 * “callout with shape” behavior. Default: callout attachment enabled.
 *
 * Design Review placement:
 * 1. Draw the shape
 * 2. Move the cursor to place the text box — leader tip is computed on the
 *    shape outline toward the cursor (user does not pick the tip)
 * 3. Type text in the capsule
 */

import {
  AcCmColor,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlCallout,
  AcTrHtmlDot,
  AcTrHtmlTransientManager
} from '@mlightcad/three-renderer'

import type { AcApContext } from '../../app'
import {
  AcEdBaseView,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import {
  type AcApHtmlLivePoint,
  AcApHtmlLivePreview,
  acapLiveRectCorners,
  acapStrokeLiveCircle,
  acapStrokeLivePolyline,
  acapStrokeLiveSegment
} from '../overlay/AcApHtmlLivePreview'
import { acapSyncLiveOverlayTextHeight } from '../overlay/AcApOverlayDrawUtil'
import { promptMarkupCapsuleText } from './AcApMarkupCmdUtil'
import {
  markupCloudVertices,
  tessellateMarkupCloud
} from './AcApMarkupShapeBuilder'
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type {
  AcApMarkupAttachedCallout,
  AcApMarkupPoint2d
} from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  defaultMarkupStyle,
  getMarkupFontSize,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth,
  subscribeMarkupDrawStyle
} from './AcApMarkupUtil'

/** Session flag: whether shape markups attach a callout by default. */
let shapeCalloutEnabled = true

/** Shape outline used to auto-place the leader tip on the perimeter. */
export type AcApMarkupShapeOutline =
  | {
      kind: 'rect' | 'cloud'
      corner1: AcApMarkupPoint2d
      corner2: AcApMarkupPoint2d
    }
  | {
      kind: 'circle'
      center: AcApMarkupPoint2d
      radius: number
    }

/** Whether newly created cloud/rect/circle markups should prompt for a callout. */
export function isMarkupShapeCalloutEnabled(): boolean {
  return shapeCalloutEnabled
}

/** Enable or disable the shape-callout option for subsequent shape commands. */
export function setMarkupShapeCalloutEnabled(enabled: boolean): void {
  shapeCalloutEnabled = enabled
}

/**
 * Prompt for the first corner of a shape, with Callout / NoCallout keywords
 * to toggle the session option (default ON).
 */
export async function promptShapeFirstCorner(
  context: AcApContext,
  messageKey: string
): Promise<AcGePoint3dLike | undefined> {
  while (true) {
    const statusKey = shapeCalloutEnabled
      ? 'jig.markup.shape.calloutOn'
      : 'jig.markup.shape.calloutOff'
    const prompt = new AcEdPromptPointOptions(
      `${AcApI18n.t(messageKey)} ${AcApI18n.t(statusKey)}`
    )
    prompt.keywords.add(
      AcApI18n.t('jig.markup.shape.keywords.callout.display'),
      AcApI18n.t('jig.markup.shape.keywords.callout.global'),
      AcApI18n.t('jig.markup.shape.keywords.callout.local')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.markup.shape.keywords.noCallout.display'),
      AcApI18n.t('jig.markup.shape.keywords.noCallout.global'),
      AcApI18n.t('jig.markup.shape.keywords.noCallout.local')
    )

    const result = await context.view.editor.getPoint(prompt)
    if (result.status === AcEdPromptStatus.Keyword) {
      const kw = result.stringResult ?? ''
      if (kw === 'Callout') {
        shapeCalloutEnabled = true
        continue
      }
      if (kw === 'NoCallout') {
        shapeCalloutEnabled = false
        continue
      }
      continue
    }
    if (result.status !== AcEdPromptStatus.OK) return undefined
    return result.value!
  }
}

function shapeCenter(outline: AcApMarkupShapeOutline): AcApMarkupPoint2d {
  if (outline.kind === 'circle') {
    return { ...outline.center }
  }
  return {
    x: (outline.corner1.x + outline.corner2.x) / 2,
    y: (outline.corner1.y + outline.corner2.y) / 2
  }
}

/**
 * AutoCAD Design Review–style leader tip: intersection of the ray from the
 * shape center toward the cursor with the shape outer frame (AABB for
 * rect/cloud, circle perimeter for circle).
 */
export function computeLeaderTipOnShape(
  outline: AcApMarkupShapeOutline,
  toward: AcApMarkupPoint2d
): AcApMarkupPoint2d {
  if (outline.kind === 'circle') {
    const { center, radius } = outline
    const dx = toward.x - center.x
    const dy = toward.y - center.y
    const len = Math.hypot(dx, dy)
    if (len < 1e-9 || radius <= 0) {
      return { x: center.x + radius, y: center.y }
    }
    const s = radius / len
    return { x: center.x + dx * s, y: center.y + dy * s }
  }

  const minX = Math.min(outline.corner1.x, outline.corner2.x)
  const maxX = Math.max(outline.corner1.x, outline.corner2.x)
  const minY = Math.min(outline.corner1.y, outline.corner2.y)
  const maxY = Math.max(outline.corner1.y, outline.corner2.y)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const hx = (maxX - minX) / 2
  const hy = (maxY - minY) / 2
  const dx = toward.x - cx
  const dy = toward.y - cy

  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    return { x: maxX, y: cy }
  }

  // Scale direction so the point lands on the nearer AABB edge.
  const sx = Math.abs(dx) > 1e-9 ? hx / Math.abs(dx) : Number.POSITIVE_INFINITY
  const sy = Math.abs(dy) > 1e-9 ? hy / Math.abs(dy) : Number.POSITIVE_INFINITY
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

/** Collect tessellated cloud outline vertices (HTML stroke; no AcDb). */
function cloudLivePoints(
  corner1: AcApMarkupPoint2d,
  corner2: AcApMarkupPoint2d,
  view: AcEdBaseView
): AcApHtmlLivePoint[] {
  return tessellateMarkupCloud(markupCloudVertices(corner1, corner2, view))
}

/**
 * Live preview while placing a shape-attached callout:
 * keeps the shape visible, auto-updates leader tip on the outline, and shows
 * leader (no arrow) + text bubble following the cursor.
 */
/** Options for {@link promptAttachedCallout}. */
export interface AcApPromptAttachedCalloutOptions {
  /** Prompt even when the session Callout option is off. */
  force?: boolean
  /**
   * When false, do not redraw the shape in the live preview (it is already
   * on screen). Default true.
   */
  previewShape?: boolean
  /** Initial cursor direction used to place the leader tip on the outline. */
  toward?: AcApMarkupPoint2d
}

class AcApMarkupShapeCalloutJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _outline: AcApMarkupShapeOutline
  private readonly _previewShape: boolean
  private readonly _ht: AcTrHtmlTransientManager
  private readonly _tipDot: AcTrHtmlDot
  private readonly _bubble: AcTrHtmlCallout
  private readonly _preview: AcApHtmlLivePreview
  private readonly _tipDotId: string
  private readonly _bubbleId: string
  private readonly _view: AcTrView2d
  private _tip: AcApMarkupPoint2d
  private _anchor: AcApMarkupPoint2d
  private _color: AcCmColor
  private _unsubDrawStyle?: () => void

  constructor(
    view: AcEdBaseView,
    outline: AcApMarkupShapeOutline,
    color: AcCmColor,
    options?: Pick<AcApPromptAttachedCalloutOptions, 'previewShape' | 'toward'>
  ) {
    super(view)
    this._view = view as AcTrView2d
    this._outline = outline
    this._previewShape = options?.previewShape !== false
    this._color = color
    this._ht = this._view.htmlTransientManager

    const center = shapeCenter(outline)
    const toward = options?.toward ?? {
      x: center.x + 1,
      y: center.y
    }
    this._tip = computeLeaderTipOnShape(outline, toward)
    this._anchor = { ...this._tip }

    const stamp = Date.now()
    this._tipDotId = `live-shape-callout-tip-${stamp}`
    this._bubbleId = `live-shape-callout-bubble-${stamp}`
    const layoutId = this._view.activeLayoutBtrId

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
      text: '',
      fontSize: getMarkupFontSize(),
      worldPosition: this._tip,
      layer: MARKUP_LIVE_LAYER,
      layoutId
    })
    this._ht.add(this._bubble)
    acapSyncLiveOverlayTextHeight(this._view, [this._bubble], defaultMarkupStyle())

    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-shape-callout-stroke-${stamp}`,
      MARKUP_LIVE_LAYER
    )
    this._unsubDrawStyle = subscribeMarkupDrawStyle(() =>
      this.applyCurrentStyle()
    )
    this.paintPreview()
    this._view.isHtmlDirty = true
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(anchor: AcGePoint3dLike) {
    const toward = { x: anchor.x, y: anchor.y }
    this._tip = computeLeaderTipOnShape(this._outline, toward)
    this._anchor = toward

    this._tipDot.setPosition(this._tip)
    this._bubble.setPosition(toward)
    const style = defaultMarkupStyle()
    this._bubble.setFontSize(style.fontSize ?? getMarkupFontSize())
    acapSyncLiveOverlayTextHeight(this._view, [this._bubble], style)
    this.paintPreview()
    this._view.isHtmlDirty = true
  }

  /** Capsule used for in-place text entry after the bubble is placed. */
  get capsule(): AcTrHtmlCallout {
    return this._bubble
  }

  /**
   * Keep the shape + leader + bubble visible while the user enters text.
   * Cleanup is done by {@link disposePreview}.
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
    this.paintPreview()
    this._view.isHtmlDirty = true
  }

  private paintPreview(): void {
    const outline = this._outline
    const color = this._color
    const lineWidth = markupCanvasLineWidth(MARKUP_LINE_WEIGHT)
    const tip = this._tip
    const anchor = this._anchor
    const viewForCloud = this._view

    const previewShape = this._previewShape
    this._preview.acapSetDraw((ctx, view) => {
      if (previewShape) {
        if (outline.kind === 'circle') {
          acapStrokeLiveCircle(
            ctx,
            view,
            outline.center,
            outline.radius,
            color,
            lineWidth
          )
        } else if (outline.kind === 'cloud') {
          const points = cloudLivePoints(
            outline.corner1,
            outline.corner2,
            viewForCloud
          )
          acapStrokeLivePolyline(ctx, view, points, color, lineWidth, {
            closed: true
          })
        } else {
          acapStrokeLivePolyline(
            ctx,
            view,
            acapLiveRectCorners(outline.corner1, outline.corner2),
            color,
            lineWidth,
            { closed: true }
          )
        }
      }
      // Design Review style: leader without arrowhead.
      acapStrokeLiveSegment(ctx, view, tip, anchor, color, lineWidth)
    })
  }
}

/**
 * After a shape is placed, if the callout option is on, prompt for text
 * location (leader tip is auto-computed on the outline). Returns undefined
 * when the option is off or cancelled.
 *
 * Pass {@link AcApPromptAttachedCalloutOptions.force} when attaching a
 * callout to an existing shape from the callout command.
 */
export async function promptAttachedCallout(
  context: AcApContext,
  outline: AcApMarkupShapeOutline,
  options?: AcApPromptAttachedCalloutOptions
): Promise<AcApMarkupAttachedCallout | undefined> {
  if (!options?.force && !shapeCalloutEnabled) return undefined

  const color = defaultMarkupColor()
  const jig = new AcApMarkupShapeCalloutJig(context.view, outline, color, {
    previewShape: options?.previewShape,
    toward: options?.toward
  })

  try {
    const anchorPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.markup.shape.calloutAnchor')
    )
    // Leader is drawn by the jig from the auto tip; do not draw a fixed base line.
    anchorPrompt.useBasePoint = false
    anchorPrompt.jig = jig

    const anchorResult = await context.view.editor.getPoint(anchorPrompt)
    if (anchorResult.status !== AcEdPromptStatus.OK) return undefined
    const anchor = anchorResult.value!
    const tip = computeLeaderTipOnShape(outline, {
      x: anchor.x,
      y: anchor.y
    })

    const text = await promptMarkupCapsuleText(jig.capsule)

    return {
      tip,
      anchor: { x: anchor.x, y: anchor.y },
      text: text || undefined
    }
  } finally {
    jig.disposePreview()
  }
}
