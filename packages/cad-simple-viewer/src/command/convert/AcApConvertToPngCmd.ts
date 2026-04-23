import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdPromptBoxOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcTrView2d } from '../../view'
import { AcApPngConvertor } from './AcApPngConvertor'

const DEFAULT_LONG_SIDE_PX = 1024

/**
 * Command for exporting the current CAD drawing to PNG format.
 *
 * This command creates a PNG converter and initiates the conversion
 * process to export the current drawing as a PNG file. The command:
 * - Creates a new PNG converter instance
 * - Prompts for an export bounding box
 * - Prompts for optional long side pixel value (or press Enter for default)
 * - Converts the current view to PNG format
 * - Automatically downloads the PNG file
 *
 * This is useful for exporting drawings to a raster image format
 * that can be displayed in browsers or used in other applications.
 *
 * @example
 * ```typescript
 * const convertCmd = new AcApConvertToPngCmd();
 * convertCmd.execute(context); // User prompted for bounds and longside
 * ```
 */
export class AcApConvertToPngCmd extends AcEdCommand {
  /**
   * Executes the PNG conversion command.
   *
   * Prompts the user for:
   * 1. Export bounding box
   * 2. Optional long side pixel value (press Enter for default 1024)
   *
   * @param _context - The application context (unused in this command)
   */
  async execute(_context: AcApContext) {
    const converter = new AcApPngConvertor()
    const view = AcApDocManager.instance.curView as AcTrView2d
    this.syncActiveLayoutViewSize(view)

    // Prompt for export bounds.
    const boxOptions = new AcEdPromptBoxOptions(
      AcApI18n.t('jig.pngout.boundsFirstCorner'),
      AcApI18n.t('jig.pngout.boundsSecondCorner')
    )
    // Export window corners should follow exact click positions.
    boxOptions.disableOSnap = true
    const boxResult = await AcApDocManager.instance.editor.getBox(boxOptions)

    let bounds: AcGeBox2d
    if (boxResult.status === AcEdPromptStatus.OK && boxResult.value) {
      const expandedBounds = this.expandBoundsToEntityExtents(
        boxResult.value,
        view
      )
      bounds = expandedBounds.bounds
    } else if (boxResult.status === AcEdPromptStatus.None) {
      bounds = this.getCurrentDrawingBounds()
    } else {
      // User canceled or prompt failed: abort command gracefully.
      return
    }

    // Prompt for long side value (optional - press Enter for default 1024)
    const longSidePrompt = new AcEdPromptDoubleOptions(
      `${AcApI18n.t('jig.pngout.longSidePrompt')} <${DEFAULT_LONG_SIDE_PX}>`
    )
    longSidePrompt.allowNone = true
    longSidePrompt.allowNegative = false
    longSidePrompt.allowZero = false
    longSidePrompt.defaultValue = DEFAULT_LONG_SIDE_PX
    longSidePrompt.useDefaultValue = true
    const longSideResult =
      await AcApDocManager.instance.editor.getDouble(longSidePrompt)

    if (
      longSideResult.status === AcEdPromptStatus.Cancel ||
      longSideResult.status === AcEdPromptStatus.Error
    ) {
      return
    }

    const longSide =
      longSideResult.status === AcEdPromptStatus.OK &&
      longSideResult.value !== undefined
        ? longSideResult.value
        : DEFAULT_LONG_SIDE_PX

    converter.convert(bounds, longSide)
  }

  /**
   * Returns the current drawing extents projected to XY bounds.
   */
  private getCurrentDrawingBounds(): AcGeBox2d {
    const db = AcApDocManager.instance.curDocument.database
    const ext = db.extents
    return new AcGeBox2d(
      new AcGePoint2d(ext.min.x, ext.min.y),
      new AcGePoint2d(ext.max.x, ext.max.y)
    )
  }

  /**
   * Expands user-picked bounds to include extents of intersected entities.
   *
   * This avoids cutting entities when the pick box touches their geometry
   * edges (for example anti-aliased line caps or text glyph overhangs).
   */
  private expandBoundsToEntityExtents(
    userBounds: AcGeBox2d,
    view: AcTrView2d
  ): { bounds: AcGeBox2d; expanded: boolean } {
    const hits = view.search(userBounds)
    const entityBounds = new AcGeBox2d()
    let hasEntityBounds = false

    const expandByItem = (item: {
      minX: number
      minY: number
      maxX: number
      maxY: number
      children?: Array<{
        minX: number
        minY: number
        maxX: number
        maxY: number
      }>
    }) => {
      entityBounds.expandByPoint(new AcGePoint2d(item.minX, item.minY))
      entityBounds.expandByPoint(new AcGePoint2d(item.maxX, item.maxY))
      hasEntityBounds = true

      item.children?.forEach(child => {
        entityBounds.expandByPoint(new AcGePoint2d(child.minX, child.minY))
        entityBounds.expandByPoint(new AcGePoint2d(child.maxX, child.maxY))
      })
    }

    hits.forEach(hit => expandByItem(hit))

    if (!hasEntityBounds || entityBounds.isEmpty()) {
      return { bounds: userBounds, expanded: false }
    }

    const merged = new AcGeBox2d()
      .expandByPoint(userBounds.min)
      .expandByPoint(userBounds.max)
      .expandByPoint(entityBounds.min)
      .expandByPoint(entityBounds.max)

    const expanded =
      merged.min.x !== userBounds.min.x ||
      merged.min.y !== userBounds.min.y ||
      merged.max.x !== userBounds.max.x ||
      merged.max.y !== userBounds.max.y

    return { bounds: merged, expanded }
  }

  /**
   * Keeps active layout-view size in sync with current view size.
   *
   * This guards against stale screen-to-world mapping after container layout
   * changes that do not fire a window resize event.
   */
  private syncActiveLayoutViewSize(view: AcTrView2d) {
    const layoutView = view.activeLayoutView
    if (!layoutView) {
      return
    }

    layoutView.resize(view.width, view.height)
  }
}
