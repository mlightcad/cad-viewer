import {
  AcCmColor,
  AcDbLine,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlCallout,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot,
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
  promptMarkupCapsuleText,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import { commitMarkup } from './AcApMarkupPresenter'
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  getMarkupFontSize,
  getMarkupLineWeight,
  markupColorToCss,
  subscribeMarkupDrawStyle
} from './AcApMarkupUtil'

function fitCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLElement
): CanvasRenderingContext2D | null {
  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.style.left = '0'
  canvas.style.top = '0'
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)
  return ctx
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const size = 12
  const left = {
    x: to.x - ux * size - uy * size * 0.45,
    y: to.y - uy * size + ux * size * 0.45
  }
  const right = {
    x: to.x - ux * size + uy * size * 0.45,
    y: to.y - uy * size - ux * size * 0.45
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(left.x, left.y)
  ctx.lineTo(right.x, right.y)
  ctx.closePath()
  ctx.fill()
}

/**
 * Live preview while placing a callout text bubble:
 * tip marker + leader line + arrowhead + floating callout bubble.
 */
class AcApMarkupCalloutJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _tip: AcGePoint3dLike
  private readonly _line: AcDbLine
  private readonly _view: AcTrView2d
  private readonly _ht: AcTrHtmlTransientManager
  private readonly _tipDot: AcTrHtmlDot
  private readonly _bubble: AcTrHtmlCallout
  private readonly _overlay: AcTrHtmlCanvasOverlay
  private readonly _tipDotId: string
  private readonly _bubbleId: string
  private readonly _canvasId: string
  private _colorCss: string
  private _anchor: AcGePoint3dLike
  private _onViewChanged?: () => void
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
    this._colorCss = markupColorToCss(color)
    this._ht = this._view.htmlTransientManager

    this._line = new AcDbLine(this._tip, this._tip)
    this._line.color = color
    this._line.lineWeight = getMarkupLineWeight()

    const layoutId = this._view.activeLayoutBtrId
    const stamp = Date.now()
    this._tipDotId = `live-markup-callout-tip-${stamp}`
    this._bubbleId = `live-markup-callout-bubble-${stamp}`
    this._canvasId = `live-markup-callout-canvas-${stamp}`

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

    this._overlay = new AcTrHtmlCanvasOverlay({
      id: this._canvasId,
      container: this._view.container,
      layer: MARKUP_LIVE_LAYER,
      layoutId
    })
    this._ht.add(this._overlay)

    this._onViewChanged = () => this.paintArrow()
    this._view.events.viewChanged.addEventListener(this._onViewChanged)
    this._unsubDrawStyle = subscribeMarkupDrawStyle(() =>
      this.applyCurrentStyle()
    )

    this._view.isHtmlDirty = true
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(anchor: AcGePoint3dLike) {
    this._anchor = { x: anchor.x, y: anchor.y, z: anchor.z ?? 0 }
    this._line.endPoint = this._anchor
    this._line.color = defaultMarkupColor()
    this._line.lineWeight = getMarkupLineWeight()
    this._bubble.setPosition(this._anchor)
    this._bubble.setFontSize(getMarkupFontSize())
    this.paintArrow()
    this._view.isHtmlDirty = true
  }

  override render(): void {
    super.render()
    this.paintArrow()
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
    // Intentionally do not remove the line / HTML overlays.
  }

  /** Remove frozen preview graphics after text entry (or cancel). */
  disposePreview() {
    this._unsubDrawStyle?.()
    this._unsubDrawStyle = undefined
    this._view.removeTransientEntity(this._line.objectId)
    if (this._onViewChanged) {
      this._view.events.viewChanged.removeEventListener(this._onViewChanged)
      this._onViewChanged = undefined
    }
    this._ht.remove(this._tipDotId)
    this._ht.remove(this._bubbleId)
    this._ht.remove(this._canvasId)
    this._view.isHtmlDirty = true
  }

  /** Apply session draw style to the frozen preview (including during text entry). */
  private applyCurrentStyle(): void {
    const color = defaultMarkupColor()
    this._colorCss = markupColorToCss(color)
    this._line.color = color
    this._line.lineWeight = getMarkupLineWeight()
    this._view.removeTransientEntity(this._line.objectId)
    this._view.addTransientEntity(this._line)
    this._tipDot.setColor(color)
    this._bubble.setColor(color)
    this._bubble.setFontSize(getMarkupFontSize())
    this.paintArrow()
    this._view.isHtmlDirty = true
  }

  private paintArrow(): void {
    const ctx = fitCanvas(this._overlay.canvas, this._view.container)
    if (!ctx) return
    const tipScreen = this._view.worldToScreen(this._tip)
    const anchorScreen = this._view.worldToScreen(this._anchor)
    // CAD transient line draws the shaft; canvas only adds the arrowhead.
    drawArrowHead(ctx, anchorScreen, tipScreen, this._colorCss)
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
export class AcApMarkupCalloutCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()

      // 1. Arrow / leader tip (where the leader begins on the drawing)
      const tipPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.callout.tip')
      )
      const tipResult = await context.view.editor.getPoint(tipPrompt)
      if (tipResult.status !== AcEdPromptStatus.OK) return
      const tip = tipResult.value!

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
