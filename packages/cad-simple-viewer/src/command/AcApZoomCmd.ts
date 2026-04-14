import { AcGeBox2d, AcGePoint2dLike, AcGePoint3d } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdCommand,
  AcEdPromptBoxOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../editor'
import { AcApI18n } from '../i18n'

/**
 * AutoCAD-style ZOOM command with keyword-driven branches in a single command.
 *
 * Supported flows:
 * - Press Enter: zoom extents.
 * - Pick first corner: zoom window.
 * - Keywords:
 *   - `All` / `Extents`: zoom extents.
 *   - `Window`: prompt two corners and zoom to that box.
 *   - `Center`: prompt center + height/scale factor.
 *   - `Scale`: scale relative to current view (`n`, `nX`, `nXP`).
 *   - `Previous`: restore previous zoom box.
 *
 * This command intentionally keeps all zoom branches in one implementation so
 * callers can use script-style command input such as:
 *
 * ```text
 * zoom
 * window
 * ```
 */
export class AcApZoomCmd extends AcEdCommand {
  /**
   * Stores the last view box before a zoom operation so `Previous` can restore it.
   */
  private static previousViewBox?: AcGeBox2d

  /**
   * Captures current visible world box from the viewport corners.
   *
   * @param context - Current command context.
   * @returns Current view box in world coordinates.
   */
  private captureCurrentViewBox(context: AcApContext) {
    const topLeft = context.view.screenToWorld({ x: 0, y: 0 })
    const bottomRight = context.view.screenToWorld({
      x: context.view.width,
      y: context.view.height
    })

    return new AcGeBox2d().expandByPoint(topLeft).expandByPoint(bottomRight)
  }

  /**
   * Saves current view box before executing a zoom branch.
   *
   * @param context - Current command context.
   */
  private rememberViewBeforeZoom(context: AcApContext) {
    AcApZoomCmd.previousViewBox = this.captureCurrentViewBox(context)
  }

  /**
   * Executes extents-like zoom and records previous view for rollback.
   *
   * @param context - Current command context.
   */
  private zoomToExtents(context: AcApContext) {
    this.rememberViewBeforeZoom(context)
    context.view.zoomToFitDrawing()
  }

  /**
   * Executes window zoom from two corner points.
   *
   * @param context - Current command context.
   * @param first - First corner in WCS.
   * @param second - Opposite corner in WCS.
   */
  private zoomToWindow(
    context: AcApContext,
    first: AcGePoint2dLike,
    second: AcGePoint2dLike
  ) {
    const box = new AcGeBox2d().expandByPoint(first).expandByPoint(second)
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(box, 1)
  }

  /**
   * Prompts second corner from a known first corner, then performs window zoom.
   *
   * @param context - Current command context.
   * @param firstCorner - First window corner in WCS.
   */
  private async promptAndZoomWindowFromFirstCorner(
    context: AcApContext,
    firstCorner: AcGePoint2dLike
  ) {
    const secondPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.zoom.secondCorner')
    )
    secondPrompt.useBasePoint = true
    secondPrompt.basePoint = new AcGePoint3d(firstCorner)
    secondPrompt.useDashedLine = true

    const secondResult =
      await AcApDocManager.instance.editor.getPoint(secondPrompt)
    if (secondResult.status !== AcEdPromptStatus.OK || !secondResult.value)
      return
    this.zoomToWindow(context, firstCorner, secondResult.value)
  }

  /**
   * Prompts a window box using editor `getBox`, then zooms to that box.
   *
   * @param context - Current command context.
   */
  private async promptAndZoomWindowByBox(context: AcApContext) {
    const boxOptions = new AcEdPromptBoxOptions(
      AcApI18n.t('jig.zoom.firstCorner'),
      AcApI18n.t('jig.zoom.secondCorner')
    )
    const boxResult = await AcApDocManager.instance.editor.getBox(boxOptions)
    if (boxResult.status !== AcEdPromptStatus.OK || !boxResult.value) return
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(boxResult.value, 1)
  }

  /**
   * Handles `Center` branch:
   * - pick center point
   * - input height or scale factor
   *
   * @param context - Current command context.
   */
  private async runCenter(context: AcApContext) {
    const centerPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.zoom.centerPoint')
    )
    const centerResult =
      await AcApDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== AcEdPromptStatus.OK || !centerResult.value)
      return

    const heightPrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.zoom.heightOrScale')
    )
    const heightResult =
      await AcApDocManager.instance.editor.getString(heightPrompt)
    if (
      heightResult.status !== AcEdPromptStatus.OK ||
      !heightResult.stringResult
    )
      return

    const parsedScale = this.parseScaleFactor(heightResult.stringResult)
    if (parsedScale != null) {
      this.applyRelativeScale(context, parsedScale, centerResult.value)
      return
    }

    const viewHeight = Number(heightResult.stringResult)
    if (!Number.isFinite(viewHeight) || viewHeight <= 0) return
    const aspect = context.view.width / Math.max(context.view.height, 1)
    const halfHeight = viewHeight / 2
    const halfWidth = (viewHeight * aspect) / 2
    const box = new AcGeBox2d()
      .expandByPoint({
        x: centerResult.value.x - halfWidth,
        y: centerResult.value.y - halfHeight
      })
      .expandByPoint({
        x: centerResult.value.x + halfWidth,
        y: centerResult.value.y + halfHeight
      })
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(box, 1)
  }

  /**
   * Parses scale factor text from AutoCAD-like inputs:
   * - `2` / `2x` / `2xp`
   *
   * @param raw - Raw user input.
   * @returns Positive scale factor, or `undefined` when invalid.
   */
  private parseScaleFactor(raw: string) {
    const text = raw.trim().toLowerCase()
    if (!text) return undefined

    if (text.endsWith('xp')) {
      const value = Number(text.slice(0, -2))
      return Number.isFinite(value) && value > 0 ? value : undefined
    }

    if (text.endsWith('x')) {
      const value = Number(text.slice(0, -1))
      return Number.isFinite(value) && value > 0 ? value : undefined
    }

    const value = Number(text)
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  /**
   * Applies relative zoom around the specified center (or current view center).
   *
   * @param context - Current command context.
   * @param factor - Relative zoom factor (> 0).
   * @param centerPoint - Optional explicit zoom center in WCS.
   */
  private applyRelativeScale(
    context: AcApContext,
    factor: number,
    centerPoint?: AcGePoint2dLike
  ) {
    const current = this.captureCurrentViewBox(context)
    const width = Math.max(current.max.x - current.min.x, 1e-9)
    const height = Math.max(current.max.y - current.min.y, 1e-9)
    const halfWidth = width / (2 * factor)
    const halfHeight = height / (2 * factor)

    const center = centerPoint ?? {
      x: (current.min.x + current.max.x) / 2,
      y: (current.min.y + current.max.y) / 2
    }

    const target = new AcGeBox2d()
      .expandByPoint({ x: center.x - halfWidth, y: center.y - halfHeight })
      .expandByPoint({ x: center.x + halfWidth, y: center.y + halfHeight })
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(target, 1)
  }

  /**
   * Restores previous view box if one exists and swaps buffers to allow toggling.
   *
   * @param context - Current command context.
   */
  private runPrevious(context: AcApContext) {
    if (!AcApZoomCmd.previousViewBox) return
    const current = this.captureCurrentViewBox(context)
    context.view.zoomTo(AcApZoomCmd.previousViewBox, 1)
    AcApZoomCmd.previousViewBox = current
  }

  /**
   * Runs zoom interaction with keyword-capable branching.
   *
   * @param context - Current command context.
   */
  async execute(context: AcApContext) {
    const firstPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.zoom.mainPrompt')
    )
    firstPrompt.allowNone = true
    firstPrompt.keywords.add(
      AcApI18n.t('jig.zoom.keywords.all.display'),
      AcApI18n.t('jig.zoom.keywords.all.global'),
      AcApI18n.t('jig.zoom.keywords.all.local')
    )
    firstPrompt.keywords.add(
      AcApI18n.t('jig.zoom.keywords.center.display'),
      AcApI18n.t('jig.zoom.keywords.center.global'),
      AcApI18n.t('jig.zoom.keywords.center.local')
    )
    firstPrompt.keywords.add(
      AcApI18n.t('jig.zoom.keywords.extents.display'),
      AcApI18n.t('jig.zoom.keywords.extents.global'),
      AcApI18n.t('jig.zoom.keywords.extents.local')
    )
    firstPrompt.keywords.add(
      AcApI18n.t('jig.zoom.keywords.previous.display'),
      AcApI18n.t('jig.zoom.keywords.previous.global'),
      AcApI18n.t('jig.zoom.keywords.previous.local')
    )
    firstPrompt.keywords.add(
      AcApI18n.t('jig.zoom.keywords.scale.display'),
      AcApI18n.t('jig.zoom.keywords.scale.global'),
      AcApI18n.t('jig.zoom.keywords.scale.local')
    )
    firstPrompt.keywords.add(
      AcApI18n.t('jig.zoom.keywords.window.display'),
      AcApI18n.t('jig.zoom.keywords.window.global'),
      AcApI18n.t('jig.zoom.keywords.window.local')
    )

    const firstResult =
      await AcApDocManager.instance.editor.getPoint(firstPrompt)
    if (firstResult.status === AcEdPromptStatus.None) {
      this.zoomToExtents(context)
      return
    }

    if (firstResult.status === AcEdPromptStatus.OK && firstResult.value) {
      await this.promptAndZoomWindowFromFirstCorner(context, firstResult.value)
      return
    }

    if (firstResult.status !== AcEdPromptStatus.Keyword) return

    const keyword = firstResult.stringResult ?? ''
    if (keyword === 'All' || keyword === 'Extents') {
      this.zoomToExtents(context)
      return
    }
    if (keyword === 'Window') {
      await this.promptAndZoomWindowByBox(context)
      return
    }
    if (keyword === 'Center') {
      await this.runCenter(context)
      return
    }
    if (keyword === 'Scale') {
      const scalePrompt = new AcEdPromptStringOptions(
        AcApI18n.t('jig.zoom.scaleFactor')
      )
      const scaleResult =
        await AcApDocManager.instance.editor.getString(scalePrompt)
      if (
        scaleResult.status !== AcEdPromptStatus.OK ||
        !scaleResult.stringResult
      )
        return
      const factor = this.parseScaleFactor(scaleResult.stringResult)
      if (factor == null) return
      this.applyRelativeScale(context, factor)
      return
    }
    if (keyword === 'Previous') {
      this.runPrevious(context)
    }
  }
}
