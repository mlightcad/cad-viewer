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
import {
  AcApRasterImageConvertor,
  AcApRasterImageFormat
} from './AcApRasterImageConvertor'

const DEFAULT_LONG_SIDE_PX = 1024

/**
 * Shared command logic for exporting the current drawing to a raster image.
 *
 * Prompts for an export bounding box and optional long-side pixel size, then
 * downloads the image via {@link AcApRasterImageConvertor}.
 */
export class AcApConvertToRasterImageCmd extends AcEdCommand {
  private readonly _format: AcApRasterImageFormat
  private readonly _jigKey: string

  /**
   * @param format - Target raster format (`png`, `jpeg`, or `bmp`).
   * @param jigKey - i18n jig namespace (`pngout`, `jpgout`, or `bmpout`).
   */
  constructor(format: AcApRasterImageFormat, jigKey: string) {
    super()
    this._format = format
    this._jigKey = jigKey
  }

  /**
   * Executes the raster export command.
   *
   * Prompts the user for:
   * 1. Export bounding box
   * 2. Optional long side pixel value (press Enter for default 1024)
   *
   * @param _context - The application context (unused in this command)
   */
  async execute(_context: AcApContext) {
    const converter = new AcApRasterImageConvertor(this._format)
    const view = AcApDocManager.instance.curView as AcTrView2d
    this.syncActiveLayoutViewSize(view)

    const boxOptions = new AcEdPromptBoxOptions(
      AcApI18n.t(`jig.${this._jigKey}.boundsFirstCorner`),
      AcApI18n.t(`jig.${this._jigKey}.boundsSecondCorner`)
    )
    // Export window corners should follow exact click positions.
    boxOptions.disableOSnap = true
    // Empty Enter (script blank line) → use drawing extents.
    boxOptions.allowNone = true
    const boxResult = await AcApDocManager.instance.editor.getBox(boxOptions)

    let bounds: AcGeBox2d
    if (boxResult.status === AcEdPromptStatus.OK && boxResult.value) {
      bounds = boxResult.value
    } else if (boxResult.status === AcEdPromptStatus.None) {
      bounds = this.getCurrentDrawingBounds()
    } else {
      // User canceled or prompt failed: abort command gracefully.
      return
    }

    const longSidePrompt = new AcEdPromptDoubleOptions(
      AcApI18n.t(`jig.${this._jigKey}.longSidePrompt`)
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

    await converter.convert(bounds, longSide)
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
