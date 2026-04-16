import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdCommand,
  AcEdPromptBoxOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptStatus
} from '../editor'
import { AcApI18n } from '../i18n'
import { AcApPngConvertor } from './AcApPngConvertor'

/**
 * Command for exporting the current CAD drawing to PNG format.
 *
 * This command creates a PNG converter and initiates the conversion
 * process to export the current drawing as a PNG file. The command:
 * - Creates a new PNG converter instance
 * - Prompts for optional bounding box (or press Enter to use drawing extents)
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
   * 1. Optional bounding box (press Enter to skip and use drawing extents)
   * 2. Optional long side pixel value (press Enter for default 8000)
   *
   * @param _context - The application context (unused in this command)
   */
  async execute(_context: AcApContext) {
    const converter = new AcApPngConvertor()

    // Prompt for bounding box (optional - press Enter to skip)
    const boxOptions = new AcEdPromptBoxOptions(
      AcApI18n.t('pngout.boundsFirstCorner'),
      AcApI18n.t('pngout.boundsSecondCorner')
    )
    const boxResult = await AcApDocManager.instance.editor.getBox(boxOptions)

    let bounds: AcGeBox2d
    if (boxResult.status === AcEdPromptStatus.OK && boxResult.value) {
      bounds = boxResult.value
    } else {
      // fallback - use drawing extents
      const db = AcApDocManager.instance.curDocument.database
      const ext = db.extents
      bounds = new AcGeBox2d(
        new AcGePoint2d(ext.min.x, ext.min.y),
        new AcGePoint2d(ext.max.x, ext.max.y)
      )
    }

    // Prompt for long side value (optional - press Enter for default 8000)
    const longSidePrompt = new AcEdPromptDoubleOptions(
      AcApI18n.t('pngout.longSidePrompt')
    )
    longSidePrompt.allowNone = true
    const longSideResult =
      await AcApDocManager.instance.editor.getDouble(longSidePrompt)

    const longSide =
      longSideResult.status === AcEdPromptStatus.OK &&
      longSideResult.value !== undefined
        ? longSideResult.value
        : 8000

    converter.convert(bounds, longSide)
  }
}
