import { ParsedDxf } from '@mlightcad/dxf-json'
import {
  CommonDXFObject,
  ImageDefDXFObject,
  LayoutDXFObject
} from '@mlightcad/dxf-json'

import { AcDbObject } from '../base'
import { AcDbBlockTableRecord } from '../database/AcDbBlockTableRecord'
import {
  AcDbLayout,
  AcDbPlotPaperUnits,
  AcDbPlotRotation,
  AcDbPlotShadePlotResLevel,
  AcDbPlotShadePlotType,
  AcDbPlotStdScaleType,
  AcDbPlotType,
  AcDbRasterImageDef
} from '../object'

/**
 * Converts DXF objects to AcDbObject instances.
 *
 * This class provides functionality to convert various DXF object types
 * (such as layouts and image definitions) into their corresponding
 * AcDbObject instances.
 *
 * @example
 * ```typescript
 * const converter = new AcDbObjectConverter();
 * const layout = converter.convertLayout(dxfLayout);
 * const imageDef = converter.convertImageDef(dxfImageDef);
 * ```
 */
export class AcDbObjectConverter {
  /**
   * Converts a DXF layout object to an AcDbLayout.
   *
   * @param layout - The DXF layout object to convert
   * @returns The converted AcDbLayout instance
   *
   * @example
   * ```typescript
   * const dxfLayout = { layoutName: 'Model', tabOrder: 1, ... };
   * const acDbLayout = converter.convertLayout(dxfLayout);
   * ```
   */
  convertLayout(layout: LayoutDXFObject, model: ParsedDxf) {
    const dbObject = new AcDbLayout()
    dbObject.layoutName = layout.layoutName
    dbObject.tabOrder = layout.tabOrder
    dbObject.plotSettingsName = layout.pageSetupName
    dbObject.plotCfgName = layout.configName
    dbObject.canonicalMediaName = layout.paperSize
    dbObject.plotViewName = layout.plotViewName
    dbObject.currentStyleSheet = layout.currentStyleSheet

    dbObject.plotPaperMargins = {
      left: layout.marginLeft,
      right: layout.marginRight,
      top: layout.marginTop,
      bottom: layout.marginBottom
    }
    dbObject.plotPaperSize.copy({
      x: layout.paperWidth,
      y: layout.paperHeight
    })
    dbObject.plotOrigin.copy({
      x: layout.plotOriginX,
      y: layout.plotOriginY
    })
    dbObject.plotWindowArea.min.copy({
      x: layout.windowAreaXMin,
      y: layout.windowAreaYMin
    })
    dbObject.plotWindowArea.max.copy({
      x: layout.windowAreaXMax,
      y: layout.windowAreaYMax
    })
    dbObject.customPrintScale = {
      numerator: layout.printScaleNumerator,
      denominator: layout.printScaleDenominator
    }

    dbObject.plotPaperUnits =
      layout.plotPaperUnit as unknown as AcDbPlotPaperUnits
    dbObject.plotRotation = layout.plotRotation as AcDbPlotRotation
    dbObject.plotType = layout.plotType as unknown as AcDbPlotType
    dbObject.stdScaleType = layout.standardScaleType as AcDbPlotStdScaleType
    dbObject.shadePlot = (() => {
      switch (layout.shadePlotMode) {
        case 1:
          return AcDbPlotShadePlotType.kWireframe
        case 2:
          return AcDbPlotShadePlotType.kHidden
        case 3:
          return AcDbPlotShadePlotType.kRendered
        default:
          return AcDbPlotShadePlotType.kAsDisplayed
      }
    })()
    dbObject.shadePlotResLevel = (() => {
      switch (layout.shadePlotResolution) {
        case 1:
          return AcDbPlotShadePlotResLevel.kPreview
        case 2:
          return AcDbPlotShadePlotResLevel.kNormal
        case 3:
          return AcDbPlotShadePlotResLevel.kPresentation
        case 4:
          return AcDbPlotShadePlotResLevel.kMaximum
        case 5:
          return AcDbPlotShadePlotResLevel.kCustom
        default:
          return AcDbPlotShadePlotResLevel.kDraft
      }
    })()
    if (layout.shadePlotCustomDPI != null) {
      dbObject.shadePlotCustomDPI = layout.shadePlotCustomDPI
    }
    if (layout.shadePlotId) {
      dbObject.shadePlotId = layout.shadePlotId
    }

    const flag = layout.layoutFlag ?? 0
    dbObject.plotViewportBorders = (flag & 1) !== 0
    dbObject.showPlotStyles = (flag & 2) !== 0
    dbObject.plotCentered = (flag & 4) !== 0
    dbObject.plotHidden = (flag & 8) !== 0
    dbObject.useStandardScale = (flag & 16) !== 0
    dbObject.plotPlotStyles = (flag & 32) !== 0
    dbObject.scaleLineweights = (flag & 64) !== 0
    dbObject.printLineweights = (flag & 128) !== 0
    dbObject.drawViewportsFirst = (flag & 512) !== 0
    dbObject.modelType = (flag & 1024) !== 0

    if (layout.layoutName === 'Model') {
      // Upper case model space name
      const modelSpaceName = AcDbBlockTableRecord.MODEL_SPACE_NAME.toUpperCase()
      model.tables.BLOCK_RECORD?.entries.some(btr => {
        if (btr.name.toUpperCase() === modelSpaceName) {
          dbObject.blockTableRecordId = btr.handle
          return true
        }
        return false
      })
    } else {
      // layout.paperSpaceTableId doesn't point to the block table record asscicated with
      // this layout. So let's get the assocated block table record id from block table.
      model.tables.BLOCK_RECORD?.entries.some(btr => {
        if (btr.layoutObjects === layout.handle) {
          dbObject.blockTableRecordId = btr.handle
          return true
        }
        return false
      })

      // If blockTableRecordId value is still invalid, let's try to use
      // layout.paperSpaceTableId finally
      if (!dbObject.blockTableRecordId) {
        dbObject.blockTableRecordId = layout.paperSpaceTableId
      }
    }

    if (layout.minLimit) {
      dbObject.limits.min.copy(layout.minLimit)
    }
    if (layout.maxLimit) {
      dbObject.limits.max.copy(layout.maxLimit)
    }
    if (layout.minExtent) {
      dbObject.extents.min.copy(layout.minExtent)
    }
    if (layout.maxExtent) {
      dbObject.extents.max.copy(layout.maxExtent)
    }
    this.processCommonAttrs(layout, dbObject)
    return dbObject
  }

  /**
   * Converts a DXF image definition object to an AcDbRasterImageDef.
   *
   * @param image - The DXF image definition object to convert
   * @returns The converted AcDbRasterImageDef instance
   *
   * @example
   * ```typescript
   * const dxfImageDef = { fileName: 'image.jpg', ... };
   * const acDbImageDef = converter.convertImageDef(dxfImageDef);
   * ```
   */
  convertImageDef(image: ImageDefDXFObject) {
    const dbObject = new AcDbRasterImageDef()
    dbObject.sourceFileName = image.fileName
    this.processCommonAttrs(image, dbObject)
    return dbObject
  }

  /**
   * Processes common attributes from a DXF object to an AcDbObject.
   *
   * This method copies common properties like object ID and owner ID
   * from the DXF object to the corresponding AcDbObject.
   *
   * @param object - The source DXF object
   * @param dbObject - The target AcDbObject to populate
   *
   * @example
   * ```typescript
   * converter.processCommonAttrs(dxfObject, acDbObject);
   * ```
   */
  private processCommonAttrs(object: CommonDXFObject, dbObject: AcDbObject) {
    dbObject.objectId = object.handle
    dbObject.ownerId = object.ownerObjectId
  }
}
