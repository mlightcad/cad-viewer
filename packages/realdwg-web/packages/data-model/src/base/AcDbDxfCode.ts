/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
/**
 * DXF group codes used by AutoCAD for reading and writing DXF/DWG data.
 *
 * This enum mirrors Autodesk.AutoCAD.DatabaseServices.DxfCode exactly.
 * Values indicate both semantic meaning and expected data type.
 *
 * @remarks
 * - Group codes 0–9: string / symbol data
 * - Group codes 10–59: floating-point values
 * - Group codes 60–79: short integers
 * - Group codes 90–99: 32-bit integers
 * - Group codes 100–107: subclass / control strings
 * - Group codes 300–369: strings / handles
 * - Group codes 370–389: lineweight / plot style
 * - Group codes 400+   : extended data (XData)
 * - Negative values   : internal / structural markers
 */
export const enum AcDbDxfCode {
  /** Invalid DXF code */
  Invalid = -9999,

  /** Start of an entity or section */
  Start = 0,

  /** Primary text string */
  Text = 1,

  /** Attribute tag, block name, symbol name */
  AttributeTag = 2,
  BlockName = 2,
  ShapeName = 2,
  SymbolTableName = 2,
  SymbolTableRecordName = 2,
  MlineStyleName = 2,

  /** Attribute prompt, dimension post string, description */
  AttributePrompt = 3,
  Description = 3,
  DimPostString = 3,
  DimStyleName = 3,
  LinetypeProse = 3,
  TextFontFile = 3,

  /** CL shape name, dimension prefix/suffix, text bigfont file */
  CLShapeName = 4,
  DimensionAlternativePrefixSuffix = 4,
  SymbolTableRecordComments = 4,
  TextBigFontFile = 4,

  /** Handle or dimension block name */
  Handle = 5,
  DimensionBlock = 5,

  /** Linetype name or dimension block 1 */
  LinetypeName = 6,
  DimBlk1 = 6,

  /** Text style name or dimension block 2 */
  TextStyleName = 7,
  DimBlk2 = 7,

  /** Layer name */
  LayerName = 8,

  /** CL shape text */
  CLShapeText = 9,

  /** X coordinate (WCS / OCS depending on context) */
  XCoordinate = 10,

  /** Y coordinate */
  YCoordinate = 20,

  /** Z coordinate */
  ZCoordinate = 30,

  /** Real (double precision floating-point) */
  Real = 40,
  TxtSize = 40,
  ViewportHeight = 40,

  /** Angle in degrees */
  Angle = 50,
  ViewportSnapAngle = 50,

  /** Visibility flag */
  Visibility = 60,

  /** 16-bit integer */
  Int16 = 70,

  /** 32-bit integer */
  Int32 = 90,

  /** 64-bit integer */
  Int64 = 160,

  /** 8-bit integer */
  Int8 = 280,

  /** Thickness */
  Thickness = 0x27,

  /** Elevation */
  Elevation = 0x26,

  /** Line type scale */
  LinetypeScale = 0x30,

  /** Dash length or MLine offset */
  DashLength = 0x31,
  MlineOffset = 0x31,
  LinetypeElement = 0x31,

  /** Normal vector components */
  NormalX = 210,
  NormalY = 220,
  NormalZ = 230,

  /** UCS origin */
  UcsOrg = 110,

  /** UCS orientation vectors */
  UcsOrientationX = 0x6f,
  UcsOrientationY = 0x70,

  /** View parameters */
  ViewHeight = 0x2d,
  ViewWidth = 0x29,
  ViewLensLength = 0x2a,
  ViewFrontClip = 0x2b,
  ViewBackClip = 0x2c,
  ViewBrightness = 0x8d,
  ViewContrast = 0x8e,
  ViewMode = 0x47,

  /** Viewport parameters */
  ViewportActive = 0x44,
  ViewportAspect = 0x29,
  ViewportGrid = 0x4c,
  ViewportIcon = 0x4a,
  ViewportNumber = 0x45,
  ViewportSnap = 0x4b,
  ViewportSnapPair = 0x4e,
  ViewportSnapStyle = 0x4d,
  ViewportTwist = 0x33,
  ViewportVisibility = 0x43,
  ViewportZoom = 0x49,

  /** Color values */
  Color = 0x3e,
  ColorRgb = 420,
  ColorName = 430,

  /** Lineweight */
  LineWeight = 370,

  /** Plot style */
  PlotStyleNameType = 380,
  PlotStyleNameId = 390,

  /** Gradient fill parameters */
  GradientObjType = 450,
  GradientAngle = 460,
  GradientName = 470,
  GradientColCount = 0x1c5,
  GradientPatType = 0x1c3,
  GradientTintType = 0x1c4,
  GradientShift = 0x1cd,
  GradientColVal = 0x1cf,
  GradientTintVal = 0x1ce,

  /** Handles and object references */
  SoftPointerId = 330,
  HardPointerId = 340,
  SoftOwnershipId = 350,
  HardOwnershipId = 360,
  ArbitraryHandle = 320,

  /** Extended data (XData) */
  ExtendedDataAsciiString = 0x3e8,
  ExtendedDataRegAppName = 0x3e9,
  ExtendedDataControlString = 0x3ea,
  ExtendedDataLayerName = 0x3eb,
  ExtendedDataBinaryChunk = 0x3ec,
  ExtendedDataHandle = 0x3ed,
  ExtendedDataXCoordinate = 0x3f2,
  ExtendedDataWorldXCoordinate = 0x3f3,
  ExtendedDataWorldXDisp = 0x3f4,
  ExtendedDataWorldXDir = 0x3f5,
  ExtendedDataYCoordinate = 0x3fc,
  ExtendedDataWorldYCoordinate = 0x3fd,
  ExtendedDataWorldYDisp = 0x3fe,
  ExtendedDataWorldYDir = 0x3ff,
  ExtendedDataZCoordinate = 0x406,
  ExtendedDataWorldZCoordinate = 0x407,
  ExtendedDataWorldZDisp = 0x408,
  ExtendedDataWorldZDir = 0x409,
  ExtendedDataReal = 0x410,
  ExtendedDataDist = 0x411,
  ExtendedDataScale = 0x412,
  ExtendedDataInteger16 = 0x42e,
  ExtendedDataInteger32 = 0x42f,

  /** XData helpers */
  XTextString = 300,
  XReal = 140,
  XInt16 = 170,
  XXInt16 = 270,

  /** Control / structural markers */
  Subclass = 100,
  ControlString = 0x66,
  EmbeddedObjectStart = 0x65,

  /** Internal markers */
  End = -1,
  FirstEntityId = -2,
  HeaderId = -2,
  XDataStart = -3,
  Operator = -4,
  PReactors = -5,
  XDictionary = -6
}
