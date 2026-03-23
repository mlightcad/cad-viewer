import { AcGeBox2d, AcGePoint2d } from '@mlightcad/geometry-engine'

import { AcDbDxfFiler } from '../../base/AcDbDxfFiler'
import { AcDbObject, AcDbObjectId } from '../../base/AcDbObject'

/**
 * Paper margins for plot settings.
 *
 * Values are expressed in millimeters, matching ObjectARX semantics.
 */
export interface AcDbPlotPaperMargins {
  /** Unprintable margin on the left side of the paper (mm). */
  left: number
  /** Unprintable margin on the right side of the paper (mm). */
  right: number
  /** Unprintable margin on the top side of the paper (mm). */
  top: number
  /** Unprintable margin on the bottom side of the paper (mm). */
  bottom: number
}

/**
 * Plot scale represented as a ratio of paper units to drawing units.
 *
 * The numerator represents paperspace units, and the denominator represents
 * the physical media units (paper units).
 */
export interface AcDbPlotScale {
  /** Paperspace units (numerator). */
  numerator: number
  /** Media units (denominator). */
  denominator: number
}

/**
 * Enumeration of plot paper units used by the plot settings.
 */
export enum AcDbPlotPaperUnits {
  /** Paper units are inches. */
  kInches = 0,
  /** Paper units are millimeters. */
  kMillimeters = 1,
  /** Paper units are pixels (device units). */
  kPixels = 2
}

/**
 * Enumeration of plot rotations.
 */
export enum AcDbPlotRotation {
  /** 0 degrees rotation. */
  k0degrees = 0,
  /** 90 degrees rotation. */
  k90degrees = 1,
  /** 180 degrees rotation. */
  k180degrees = 2,
  /** 270 degrees rotation. */
  k270degrees = 3
}

/**
 * Enumeration of plot types that define which area to plot.
 */
export enum AcDbPlotType {
  /** Plot the current display. */
  kDisplay = 0,
  /** Plot the drawing extents. */
  kExtents = 1,
  /** Plot the drawing limits. */
  kLimits = 2,
  /** Plot a named view. */
  kView = 3,
  /** Plot a window area. */
  kWindow = 4,
  /** Plot the entire layout. */
  kLayout = 5
}

/**
 * Enumeration of shade plot resolution levels.
 */
export enum AcDbPlotShadePlotResLevel {
  /** Draft resolution (legacy wireframe behavior). */
  kDraft = 0,
  /** Preview resolution. */
  kPreview = 1,
  /** Normal resolution. */
  kNormal = 2,
  /** Presentation resolution. */
  kPresentation = 3,
  /** Maximum resolution. */
  kMaximum = 4,
  /** Custom resolution using shade plot custom DPI. */
  kCustom = 5
}

/**
 * Enumeration of shade plot types that control how viewports plot.
 */
export enum AcDbPlotShadePlotType {
  /** Plot the same way it is displayed. */
  kAsDisplayed = 0,
  /** Plot wireframe regardless of display. */
  kWireframe = 1,
  /** Plot hidden regardless of display. */
  kHidden = 2,
  /** Plot rendered regardless of display. */
  kRendered = 3,
  /** Plot using the referenced visual style. */
  kVisualStyle = 4,
  /** Plot using the referenced render preset. */
  kRenderPreset = 5
}

/**
 * Enumeration of standard plot scales.
 */
export enum AcDbPlotStdScaleType {
  /** Scale to fit the printable area. */
  kScaleToFit = 0,
  /** 1/128" = 1'-0" */
  k1_128in_1ft = 1,
  /** 1/64" = 1'-0" */
  k1_64in_1ft = 2,
  /** 1/32" = 1'-0" */
  k1_32in_1ft = 3,
  /** 1/16" = 1'-0" */
  k1_16in_1ft = 4,
  /** 3/32" = 1'-0" */
  k3_32in_1ft = 5,
  /** 1/8" = 1'-0" */
  k1_8in_1ft = 6,
  /** 3/16" = 1'-0" */
  k3_16in_1ft = 7,
  /** 1/4" = 1'-0" */
  k1_4in_1ft = 8,
  /** 3/8" = 1'-0" */
  k3_8in_1ft = 9,
  /** 1/2" = 1'-0" */
  k1_2in_1ft = 10,
  /** 3/4" = 1'-0" */
  k3_4in_1ft = 11,
  /** 1" = 1'-0" */
  k1in_1ft = 12,
  /** 3" = 1'-0" */
  k3in_1ft = 13,
  /** 6" = 1'-0" */
  k6in_1ft = 14,
  /** 1'-0" = 1'-0" */
  k1ft_1ft = 15,
  /** 1:1 */
  k1_1 = 16,
  /** 1:2 */
  k1_2 = 17,
  /** 1:4 */
  k1_4 = 18,
  /** 1:5 */
  k1_5 = 19,
  /** 1:8 */
  k1_8 = 20,
  /** 1:10 */
  k1_10 = 21,
  /** 1:16 */
  k1_16 = 22,
  /** 1:20 */
  k1_20 = 23,
  /** 1:30 */
  k1_30 = 24,
  /** 1:40 */
  k1_40 = 25,
  /** 1:50 */
  k1_50 = 26,
  /** 1:100 */
  k1_100 = 27,
  /** 2:1 */
  k2_1 = 28,
  /** 4:1 */
  k4_1 = 29,
  /** 8:1 */
  k8_1 = 30,
  /** 10:1 */
  k10_1 = 31,
  /** 100:1 */
  k100_1 = 32,
  /** 1000:1 */
  k1000_1 = 33,
  /** 1 1/2" = 1'-0" */
  k1and1_2in_1ft = 34
}

const STD_SCALE_VALUES: Record<AcDbPlotStdScaleType, number> = {
  [AcDbPlotStdScaleType.kScaleToFit]: 0,
  [AcDbPlotStdScaleType.k1_128in_1ft]: 1 / 1536,
  [AcDbPlotStdScaleType.k1_64in_1ft]: 1 / 768,
  [AcDbPlotStdScaleType.k1_32in_1ft]: 1 / 384,
  [AcDbPlotStdScaleType.k1_16in_1ft]: 1 / 192,
  [AcDbPlotStdScaleType.k3_32in_1ft]: 1 / 128,
  [AcDbPlotStdScaleType.k1_8in_1ft]: 1 / 96,
  [AcDbPlotStdScaleType.k3_16in_1ft]: 1 / 64,
  [AcDbPlotStdScaleType.k1_4in_1ft]: 1 / 48,
  [AcDbPlotStdScaleType.k3_8in_1ft]: 1 / 32,
  [AcDbPlotStdScaleType.k1_2in_1ft]: 1 / 24,
  [AcDbPlotStdScaleType.k3_4in_1ft]: 1 / 16,
  [AcDbPlotStdScaleType.k1in_1ft]: 1 / 12,
  [AcDbPlotStdScaleType.k3in_1ft]: 1 / 4,
  [AcDbPlotStdScaleType.k6in_1ft]: 1 / 2,
  [AcDbPlotStdScaleType.k1ft_1ft]: 1,
  [AcDbPlotStdScaleType.k1_1]: 1,
  [AcDbPlotStdScaleType.k1_2]: 1 / 2,
  [AcDbPlotStdScaleType.k1_4]: 1 / 4,
  [AcDbPlotStdScaleType.k1_5]: 1 / 5,
  [AcDbPlotStdScaleType.k1_8]: 1 / 8,
  [AcDbPlotStdScaleType.k1_10]: 1 / 10,
  [AcDbPlotStdScaleType.k1_16]: 1 / 16,
  [AcDbPlotStdScaleType.k1_20]: 1 / 20,
  [AcDbPlotStdScaleType.k1_30]: 1 / 30,
  [AcDbPlotStdScaleType.k1_40]: 1 / 40,
  [AcDbPlotStdScaleType.k1_50]: 1 / 50,
  [AcDbPlotStdScaleType.k1_100]: 1 / 100,
  [AcDbPlotStdScaleType.k2_1]: 2,
  [AcDbPlotStdScaleType.k4_1]: 4,
  [AcDbPlotStdScaleType.k8_1]: 8,
  [AcDbPlotStdScaleType.k10_1]: 10,
  [AcDbPlotStdScaleType.k100_1]: 100,
  [AcDbPlotStdScaleType.k1000_1]: 1000,
  [AcDbPlotStdScaleType.k1and1_2in_1ft]: 1 / 8
}

/**
 * Represents plot settings for a layout or named plot setup.
 *
 * This class mirrors the core responsibilities of ObjectARX `AcDbPlotSettings`,
 * encapsulating plot configuration, media selection, scale, and view settings.
 */
export class AcDbPlotSettings extends AcDbObject {
  /** Name of the plot settings (page setup name). */
  private _plotSettingsName: string
  /** PC3 plot configuration name. */
  private _plotCfgName: string
  /** Locale-independent canonical media name. */
  private _canonicalMediaName: string
  /** Plot style table name (CTB/STB). */
  private _currentStyleSheet: string
  /** Plot origin (paper offset) in paper units. */
  private _plotOrigin: AcGePoint2d
  /** Custom print scale as a ratio of paperspace to media units. */
  private _customPrintScale: AcDbPlotScale
  /** Physical paper size in millimeters (width, height). */
  private _plotPaperSize: AcGePoint2d
  /** Unprintable paper margins in millimeters. */
  private _plotPaperMargins: AcDbPlotPaperMargins
  /** Named view used when plot type is set to view. */
  private _plotViewName: string
  /** Plot window area used when plot type is set to window. */
  private _plotWindowArea: AcGeBox2d
  /** Whether this plot settings object is for model space. */
  private _modelType: boolean
  /** Whether the plot should be centered on the paper. */
  private _plotCentered: boolean
  /** Whether hidden line removal is enabled for paperspace objects. */
  private _plotHidden: boolean
  /** Units used for plot paper. */
  private _plotPaperUnits: AcDbPlotPaperUnits
  /** Whether plot styles are applied during plotting. */
  private _plotPlotStyles: boolean
  /** Rotation applied to the plot on the paper. */
  private _plotRotation: AcDbPlotRotation
  /** Which portion of the layout to plot. */
  private _plotType: AcDbPlotType
  /** Whether viewport borders are plotted. */
  private _plotViewportBorders: boolean
  /** Whether lineweights are printed. */
  private _printLineweights: boolean
  /** Whether lineweights are scaled with plot scale. */
  private _scaleLineweights: boolean
  /** Whether paperspace objects are plotted after viewports. */
  private _drawViewportsFirst: boolean
  /** Whether plot styles are shown in layout display. */
  private _showPlotStyles: boolean
  /** Shade plot type for viewports. */
  private _shadePlotType: AcDbPlotShadePlotType
  /** Shade plot resolution level. */
  private _shadePlotResLevel: AcDbPlotShadePlotResLevel
  /** Shade plot custom DPI value (used with kCustom resolution). */
  private _shadePlotCustomDpi: number
  /** Object ID for visual style or render preset referenced by shade plot. */
  private _shadePlotId?: AcDbObjectId
  /** Standard scale selection. */
  private _stdScaleType: AcDbPlotStdScaleType
  /** Whether standard scale is used to compute the current plot scale. */
  private _useStandardScale: boolean

  /**
   * Creates a new AcDbPlotSettings instance.
   *
   * @param modelType - True for model space plot settings; false for layout.
   *
   * @example
   * ```typescript
   * const plotSettings = new AcDbPlotSettings(false);
   * plotSettings.plotCfgName = 'DWG To PDF.pc3';
   * plotSettings.canonicalMediaName = 'ISO_A4_(210.00_x_297.00_MM)';
   * ```
   */
  constructor(modelType: boolean = false) {
    super()
    this._plotSettingsName = ''
    this._plotCfgName = ''
    this._canonicalMediaName = ''
    this._currentStyleSheet = ''
    this._plotOrigin = new AcGePoint2d()
    this._customPrintScale = { numerator: 1, denominator: 1 }
    this._plotPaperSize = new AcGePoint2d()
    this._plotPaperMargins = { left: 0, right: 0, top: 0, bottom: 0 }
    this._plotViewName = ''
    this._plotWindowArea = new AcGeBox2d()
    this._modelType = modelType
    this._plotCentered = false
    this._plotHidden = false
    this._plotPaperUnits = AcDbPlotPaperUnits.kMillimeters
    this._plotPlotStyles = true
    this._plotRotation = AcDbPlotRotation.k0degrees
    this._plotType = AcDbPlotType.kLayout
    this._plotViewportBorders = false
    this._printLineweights = true
    this._scaleLineweights = false
    this._drawViewportsFirst = false
    this._showPlotStyles = true
    this._shadePlotType = AcDbPlotShadePlotType.kAsDisplayed
    this._shadePlotResLevel = AcDbPlotShadePlotResLevel.kNormal
    this._shadePlotCustomDpi = 300
    this._shadePlotId = undefined
    this._stdScaleType = AcDbPlotStdScaleType.kScaleToFit
    this._useStandardScale = true
  }

  /**
   * Gets the plot settings name (page setup name).
   */
  get plotSettingsName() {
    return this._plotSettingsName
  }

  /**
   * Sets the plot settings name (page setup name).
   */
  set plotSettingsName(value: string) {
    this._plotSettingsName = value
  }

  /**
   * ObjectARX-style getter for the plot settings name.
   */
  getPlotSettingsName() {
    return this._plotSettingsName
  }

  /**
   * ObjectARX-style setter for the plot settings name.
   */
  setPlotSettingsName(value: string) {
    this._plotSettingsName = value
  }

  /**
   * Gets the plot configuration (PC3) name.
   */
  get plotCfgName() {
    return this._plotCfgName
  }

  /**
   * Sets the plot configuration (PC3) name.
   */
  set plotCfgName(value: string) {
    this._plotCfgName = value
  }

  /**
   * ObjectARX-style getter for the plot configuration name.
   */
  getPlotCfgName() {
    return this._plotCfgName
  }

  /**
   * Gets the canonical media name (locale-independent paper name).
   */
  get canonicalMediaName() {
    return this._canonicalMediaName
  }

  /**
   * Sets the canonical media name (locale-independent paper name).
   */
  set canonicalMediaName(value: string) {
    this._canonicalMediaName = value
  }

  /**
   * ObjectARX-style getter for the canonical media name.
   */
  getCanonicalMediaName() {
    return this._canonicalMediaName
  }

  /**
   * Gets the plot style table name (CTB/STB).
   */
  get currentStyleSheet() {
    return this._currentStyleSheet
  }

  /**
   * Sets the plot style table name (CTB/STB).
   */
  set currentStyleSheet(value: string) {
    this._currentStyleSheet = value
  }

  /**
   * ObjectARX-style getter for the current style sheet.
   */
  getCurrentStyleSheet() {
    return this._currentStyleSheet
  }

  /**
   * Gets the plot origin (paper offset).
   */
  get plotOrigin() {
    return this._plotOrigin
  }

  /**
   * Sets the plot origin (paper offset).
   */
  set plotOrigin(value: AcGePoint2d) {
    this._plotOrigin = value
  }

  /**
   * ObjectARX-style getter for the plot origin.
   */
  getPlotOrigin() {
    return this._plotOrigin
  }

  /**
   * Gets the custom print scale ratio.
   */
  get customPrintScale() {
    return this._customPrintScale
  }

  /**
   * Sets the custom print scale ratio.
   */
  set customPrintScale(value: AcDbPlotScale) {
    this._customPrintScale = value
  }

  /**
   * ObjectARX-style getter for the custom print scale.
   */
  getCustomPrintScale() {
    return this._customPrintScale
  }

  /**
   * Gets the plot paper size (physical size in millimeters).
   */
  get plotPaperSize() {
    return this._plotPaperSize
  }

  /**
   * Sets the plot paper size (physical size in millimeters).
   */
  set plotPaperSize(value: AcGePoint2d) {
    this._plotPaperSize = value
  }

  /**
   * ObjectARX-style getter for the plot paper size.
   */
  getPlotPaperSize() {
    return this._plotPaperSize
  }

  /**
   * Gets the plot paper margins (unprintable area in millimeters).
   */
  get plotPaperMargins() {
    return this._plotPaperMargins
  }

  /**
   * Sets the plot paper margins (unprintable area in millimeters).
   */
  set plotPaperMargins(value: AcDbPlotPaperMargins) {
    this._plotPaperMargins = value
  }

  /**
   * ObjectARX-style getter for the plot paper margins.
   */
  getPlotPaperMargins() {
    return this._plotPaperMargins
  }

  /**
   * Gets the plot view name used when plot type is kView.
   */
  get plotViewName() {
    return this._plotViewName
  }

  /**
   * Sets the plot view name used when plot type is kView.
   */
  set plotViewName(value: string) {
    this._plotViewName = value
  }

  /**
   * ObjectARX-style getter for the plot view name.
   */
  getPlotViewName() {
    return this._plotViewName
  }

  /**
   * Gets the plot window area used when plot type is kWindow.
   */
  get plotWindowArea() {
    return this._plotWindowArea
  }

  /**
   * Sets the plot window area used when plot type is kWindow.
   */
  set plotWindowArea(value: AcGeBox2d) {
    this._plotWindowArea = value
  }

  /**
   * ObjectARX-style getter for the plot window area.
   */
  getPlotWindowArea() {
    return this._plotWindowArea
  }

  /**
   * Gets whether this plot settings object is for model space.
   */
  get modelType() {
    return this._modelType
  }

  /**
   * Sets whether this plot settings object is for model space.
   */
  set modelType(value: boolean) {
    this._modelType = value
  }

  /**
   * ObjectARX-style getter for model type.
   */
  getModelType() {
    return this._modelType
  }

  /**
   * ObjectARX-style setter for model type.
   */
  setModelType(value: boolean) {
    this._modelType = value
  }

  /**
   * Gets whether viewports are plotted after paperspace objects.
   */
  get drawViewportsFirst() {
    return this._drawViewportsFirst
  }

  /**
   * Sets whether viewports are plotted after paperspace objects.
   */
  set drawViewportsFirst(value: boolean) {
    this._drawViewportsFirst = value
  }

  /**
   * ObjectARX-style setter for drawing viewports first.
   */
  setDrawViewportsFirst(value: boolean) {
    this._drawViewportsFirst = value
  }

  /**
   * Gets whether the plot is centered on the paper.
   */
  get plotCentered() {
    return this._plotCentered
  }

  /**
   * Sets whether the plot is centered on the paper.
   */
  set plotCentered(value: boolean) {
    this._plotCentered = value
  }

  /**
   * ObjectARX-style setter for plot centered.
   */
  setPlotCentered(value: boolean) {
    this._plotCentered = value
  }

  /**
   * Gets whether hidden line removal is applied to paperspace objects.
   */
  get plotHidden() {
    return this._plotHidden
  }

  /**
   * Sets whether hidden line removal is applied to paperspace objects.
   */
  set plotHidden(value: boolean) {
    this._plotHidden = value
  }

  /**
   * ObjectARX-style setter for plot hidden.
   */
  setPlotHidden(value: boolean) {
    this._plotHidden = value
  }

  /**
   * Gets the plot paper units.
   */
  get plotPaperUnits() {
    return this._plotPaperUnits
  }

  /**
   * Sets the plot paper units.
   */
  set plotPaperUnits(value: AcDbPlotPaperUnits) {
    this._plotPaperUnits = value
  }

  /**
   * Gets whether plot styles are applied during plotting.
   */
  get plotPlotStyles() {
    return this._plotPlotStyles
  }

  /**
   * Sets whether plot styles are applied during plotting.
   */
  set plotPlotStyles(value: boolean) {
    this._plotPlotStyles = value
  }

  /**
   * ObjectARX-style setter for plot plot styles.
   */
  setPlotPlotStyles(value: boolean) {
    this._plotPlotStyles = value
  }

  /**
   * Gets the plot rotation.
   */
  get plotRotation() {
    return this._plotRotation
  }

  /**
   * Sets the plot rotation.
   */
  set plotRotation(value: AcDbPlotRotation) {
    this._plotRotation = value
  }

  /**
   * Gets the plot type (display, extents, view, etc.).
   */
  get plotType() {
    return this._plotType
  }

  /**
   * Sets the plot type (display, extents, view, etc.).
   */
  set plotType(value: AcDbPlotType) {
    this._plotType = value
  }

  /**
   * Gets whether viewport borders are plotted.
   */
  get plotViewportBorders() {
    return this._plotViewportBorders
  }

  /**
   * Sets whether viewport borders are plotted.
   */
  set plotViewportBorders(value: boolean) {
    this._plotViewportBorders = value
  }

  /**
   * ObjectARX-style setter for plot viewport borders.
   */
  setPlotViewportBorders(value: boolean) {
    this._plotViewportBorders = value
  }

  /**
   * Gets whether lineweights are printed.
   */
  get printLineweights() {
    return this._printLineweights
  }

  /**
   * Sets whether lineweights are printed.
   */
  set printLineweights(value: boolean) {
    this._printLineweights = value
  }

  /**
   * ObjectARX-style setter for print lineweights.
   */
  setPrintLineweights(value: boolean) {
    this._printLineweights = value
  }

  /**
   * Gets whether lineweights are scaled by the plot scale.
   */
  get scaleLineweights() {
    return this._scaleLineweights
  }

  /**
   * Sets whether lineweights are scaled by the plot scale.
   */
  set scaleLineweights(value: boolean) {
    this._scaleLineweights = value
  }

  /**
   * ObjectARX-style setter for scale lineweights.
   */
  setScaleLineweights(value: boolean) {
    this._scaleLineweights = value
  }

  /**
   * Gets whether plot styles are shown in layout mode.
   */
  get showPlotStyles() {
    return this._showPlotStyles
  }

  /**
   * Sets whether plot styles are shown in layout mode.
   */
  set showPlotStyles(value: boolean) {
    this._showPlotStyles = value
  }

  /**
   * ObjectARX-style setter for show plot styles.
   */
  setShowPlotStyles(value: boolean) {
    this._showPlotStyles = value
  }

  /**
   * Gets the shade plot type for viewports.
   */
  get shadePlot() {
    return this._shadePlotType
  }

  /**
   * Sets the shade plot type for viewports.
   */
  set shadePlot(value: AcDbPlotShadePlotType) {
    this._shadePlotType = value
  }

  /**
   * ObjectARX-style setter for shade plot type.
   */
  setShadePlot(value: AcDbPlotShadePlotType) {
    this._shadePlotType = value
  }

  /**
   * Gets the shade plot resolution level.
   */
  get shadePlotResLevel() {
    return this._shadePlotResLevel
  }

  /**
   * Sets the shade plot resolution level.
   */
  set shadePlotResLevel(value: AcDbPlotShadePlotResLevel) {
    this._shadePlotResLevel = value
  }

  /**
   * ObjectARX-style setter for shade plot resolution level.
   */
  setShadePlotResLevel(value: AcDbPlotShadePlotResLevel) {
    this._shadePlotResLevel = value
  }

  /**
   * Gets the shade plot custom DPI (used with kCustom).
   */
  get shadePlotCustomDPI() {
    return this._shadePlotCustomDpi
  }

  /**
   * Sets the shade plot custom DPI (used with kCustom).
   */
  set shadePlotCustomDPI(value: number) {
    this._shadePlotCustomDpi = value
  }

  /**
   * ObjectARX-style setter for shade plot custom DPI.
   */
  setShadePlotCustomDPI(value: number) {
    this._shadePlotCustomDpi = value
  }

  /**
   * Gets the shade plot ID (visual style or render preset object ID).
   */
  get shadePlotId() {
    return this._shadePlotId
  }

  /**
   * Sets the shade plot ID (visual style or render preset object ID).
   */
  set shadePlotId(value: AcDbObjectId | undefined) {
    this._shadePlotId = value
  }

  /**
   * Gets whether viewports plot as wireframe based on shade plot settings.
   */
  get plotWireframe() {
    return this._shadePlotType === AcDbPlotShadePlotType.kWireframe
  }

  /**
   * Gets whether viewports plot as raster based on shade plot settings.
   */
  get plotAsRaster() {
    return (
      this._shadePlotType === AcDbPlotShadePlotType.kRendered ||
      this._shadePlotType === AcDbPlotShadePlotType.kVisualStyle ||
      this._shadePlotType === AcDbPlotShadePlotType.kRenderPreset
    )
  }

  /**
   * Gets the standard scale selection.
   */
  get stdScaleType() {
    return this._stdScaleType
  }

  /**
   * Sets the standard scale selection.
   */
  set stdScaleType(value: AcDbPlotStdScaleType) {
    this._stdScaleType = value
  }

  /**
   * ObjectARX-style getter for the standard scale as a numeric ratio.
   */
  get stdScale() {
    return STD_SCALE_VALUES[this._stdScaleType] ?? 1
  }

  /**
   * Gets whether the standard scale is used to compute the plot scale.
   */
  get useStandardScale() {
    return this._useStandardScale
  }

  /**
   * Sets whether the standard scale is used to compute the plot scale.
   */
  set useStandardScale(value: boolean) {
    this._useStandardScale = value
  }

  /**
   * Writes the plot settings DXF payload.
   *
   * This follows the PLOTSETTINGS group code specification and emits the
   * plot configuration, media, scale, and flag data for this settings object.
   *
   * @param filer - DXF filer that receives the group codes
   * @returns This plot settings instance for chaining
   */
  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbPlotSettings')

    filer.writeString(1, this.plotSettingsName)
    filer.writeString(2, this.plotCfgName)
    filer.writeString(4, this.canonicalMediaName)
    filer.writeString(6, this.plotViewName)

    filer.writeDouble(40, this.plotPaperMargins.left)
    filer.writeDouble(41, this.plotPaperMargins.bottom)
    filer.writeDouble(42, this.plotPaperMargins.right)
    filer.writeDouble(43, this.plotPaperMargins.top)

    filer.writeDouble(44, this.plotPaperSize.x)
    filer.writeDouble(45, this.plotPaperSize.y)

    filer.writeDouble(46, this.plotOrigin.x)
    filer.writeDouble(47, this.plotOrigin.y)

    filer.writeDouble(48, this.plotWindowArea.min.x)
    filer.writeDouble(49, this.plotWindowArea.min.y)
    filer.writeDouble(140, this.plotWindowArea.max.x)
    filer.writeDouble(141, this.plotWindowArea.max.y)

    filer.writeDouble(142, this.customPrintScale.numerator)
    filer.writeDouble(143, this.customPrintScale.denominator)

    let flags = 0
    if (this.plotViewportBorders) flags |= 1
    if (this.showPlotStyles) flags |= 2
    if (this.plotCentered) flags |= 4
    if (this.plotHidden) flags |= 8
    if (this.useStandardScale) flags |= 16
    if (this.plotPlotStyles) flags |= 32
    if (this.scaleLineweights) flags |= 64
    if (this.printLineweights) flags |= 128
    if (this.drawViewportsFirst) flags |= 512
    if (this.modelType) flags |= 1024

    filer.writeInt16(70, flags)
    filer.writeInt16(72, this.plotPaperUnits)
    filer.writeInt16(73, this.plotRotation)
    filer.writeInt16(74, this.plotType)
    filer.writeString(7, this.currentStyleSheet)
    filer.writeInt16(75, this.stdScaleType)
    filer.writeInt16(76, this.shadePlot)
    filer.writeInt16(77, this.shadePlotResLevel)
    filer.writeInt16(78, this.shadePlotCustomDPI)
    filer.writeDouble(147, this.stdScale)
    filer.writeObjectId(333, this.shadePlotId)
    return this
  }
}
