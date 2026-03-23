import { defaults } from '@mlightcad/common'

import { AcDbDxfFiler } from '../base'
import { DEFAULT_TEXT_STYLE } from '../misc'
import {
  AcDbSymbolTableRecord,
  AcDbSymbolTableRecordAttrs
} from './AcDbSymbolTableRecord'

/**
 * Controls the horizontal positioning of dimension text relative to the dimension line.
 * This setting affects how dimension text is aligned when it's placed outside the extension lines.
 */
export enum AcDbDimTextHorizontal {
  /** Centers the text between the extension lines */
  Center = 0,
  /** Positions text next to the first extension line */
  Left = 1,
  /** Positions text next to the second extension line */
  Right = 2,
  /** Positions text above and aligned with the first extension line */
  OverFirst = 3,
  /** Positions text above and aligned with the second extension line */
  OverSecond = 4
}

/**
 * Controls the vertical positioning of dimension text relative to the dimension line.
 * This setting determines whether text appears above, below, or centered on the dimension line.
 */
export enum AcDbDimTextVertical {
  /** Centers text between the extension lines */
  Center = 0,
  /** Places text above the dimension line */
  Above = 1,
  /** Places text on the side farthest from the defining points */
  Outside = 2,
  /** Places text according to Japanese Industrial Standards (JIS) */
  JIS = 3,
  /** Places text below the dimension line */
  Below = 4
}

/**
 * Controls the suppression of zeros in primary unit values for linear dimensions.
 * This setting affects how feet, inches, and decimal values are displayed.
 */
export enum AcDbDimZeroSuppression {
  /** Suppresses zero feet and precisely zero inches */
  Feet = 0,
  /** Includes zero feet and precisely zero inches */
  None = 1,
  /** Includes zero feet and suppresses zero inches */
  Inch = 2,
  /** Includes zero inches and suppresses zero feet */
  FeetAndInch = 3,
  /** Suppresses leading zeros in decimal dimensions */
  Leading = 4,
  /** Suppresses trailing zeros in decimal dimensions */
  Trailing = 8,
  /** Suppresses both leading and trailing zeros */
  LeadingAndTrailing = 12
}

/**
 * Controls the suppression of zeros in angular dimension values.
 * This setting affects how angular dimensions are displayed.
 */
export enum AcDbDimZeroSuppressionAngular {
  /** Displays all leading and trailing zeros */
  None = 0,
  /** Suppresses leading zeros in decimal dimensions */
  Leading = 1,
  /** Suppresses trailing zeros in decimal dimensions */
  Trailing = 2,
  /** Suppresses both leading and trailing zeros */
  LeadingAndTrailing = 3
}

/**
 * Controls the vertical justification of tolerance values relative to the nominal dimension text.
 * This setting only affects dimensions when tolerance is enabled.
 */
export enum AcDbDimVerticalJustification {
  /** Aligns tolerance text at the bottom */
  Bottom = 0,
  /** Centers tolerance text vertically */
  Middle = 1,
  /** Aligns tolerance text at the top */
  Top = 2
}

/**
 * Interface defining the attributes for a dimension style table record.
 * Contains all the properties that control the appearance and behavior of dimensions
 * that reference this style.
 */
export interface AcDbDimStyleTableRecordAttrs
  extends AcDbSymbolTableRecordAttrs {
  /** Dimension postfix for text prefix/suffix */
  dimpost: string
  /** Dimension append postfix for alternate units */
  dimapost: string
  /** Overall scale factor for dimensions */
  dimscale: number
  /** Arrow size for dimension lines */
  dimasz: number
  /** Extension line offset from origin */
  dimexo: number
  /** Dimension line increment for baseline dimensions */
  dimdli: number
  /** Extension line extension beyond dimension line */
  dimexe: number
  /** Rounding value for dimension distances */
  dimrnd: number
  /** Dimension line extension beyond extension lines */
  dimdle: number
  /** Plus tolerance value */
  dimtp: number
  /** Minus tolerance value */
  dimtm: number
  /** Text height for dimensions */
  dimtxt: number
  /** Center mark size for circles/arcs */
  dimcen: number
  /** Tick size (replaces arrows when > 0) */
  dimtsz: number
  /** Alternate unit scale factor */
  dimaltf: number
  /** Linear dimension scale factor */
  dimlfac: number
  /** Text vertical position offset */
  dimtvp: number
  /** Text height scale factor */
  dimtfac: number
  /** Gap between dimension line and text */
  dimgap: number
  /** Alternate unit rounding */
  dimaltrnd: number
  /** Enable/disable tolerance display */
  dimtol: 0 | 1
  /** Enable/disable dimension limits */
  dimlim: 0 | 1
  /** Text horizontal alignment inside extension lines */
  dimtih: 0 | 1
  /** Text horizontal alignment outside extension lines */
  dimtoh: 0 | 1
  /** Suppress first extension line */
  dimse1: 0 | 1
  /** Suppress second extension line */
  dimse2: 0 | 1
  /** Text vertical position relative to dimension line */
  dimtad: AcDbDimTextVertical
  /** Zero suppression for primary units */
  dimzin: AcDbDimZeroSuppression
  /** Zero suppression for angular dimensions */
  dimazin: AcDbDimZeroSuppressionAngular
  /** Enable/disable alternate units */
  dimalt: 0 | 1
  /** Decimal places for alternate units */
  dimaltd: number
  /** Force dimension line between extension lines */
  dimtofl: 0 | 1
  /** Use separate arrow blocks for each end */
  dimsah: 0 | 1
  /** Force text inside extension lines */
  dimtix: 0 | 1
  /** Suppress arrows when text doesn't fit */
  dimsoxd: 0 | 1
  /** Dimension line color */
  dimclrd: number
  /** Extension line color */
  dimclre: number
  /** Dimension text color */
  dimclrt: number
  /** Angular dimension decimal places */
  dimadec: number
  /** Linear dimension units format */
  dimunit: number
  /** Primary unit decimal places */
  dimdec: number
  /** Tolerance decimal places */
  dimtdec: number
  /** Alternate unit format */
  dimaltu: number
  /** Alternate tolerance decimal places */
  dimalttd: number
  /** Angular dimension units */
  dimaunit: number
  /** Fraction format for architectural units */
  dimfrac: number
  /** Linear dimension units */
  dimlunit: number
  /** Decimal separator character */
  dimdsep: string
  /** Text movement rules */
  dimtmove: number
  /** Text horizontal justification */
  dimjust: AcDbDimTextHorizontal
  /** Suppress first dimension line */
  dimsd1: 0 | 1
  /** Suppress second dimension line */
  dimsd2: 0 | 1
  /** Tolerance text vertical justification */
  dimtolj: AcDbDimVerticalJustification
  /** Tolerance zero suppression */
  dimtzin: AcDbDimZeroSuppression
  /** Alternate unit zero suppression */
  dimaltz: AcDbDimZeroSuppression
  /** Alternate tolerance zero suppression */
  dimalttz: AcDbDimZeroSuppression
  /** Text fitting behavior */
  dimfit: number
  /** User positioning control */
  dimupt: number
  /** Angular dimension text/arrow fitting */
  dimatfit: number
  /** Text style name */
  dimtxsty: string
  /** Leader arrow block name */
  dimldrblk: string
  /** Arrow block name */
  dimblk: string
  /** First arrow block name (when using separate arrows) */
  dimblk1: string
  /** Second arrow block name (when using separate arrows) */
  dimblk2: string
  /** Dimension line weight */
  dimlwd: number
  /** Extension line weight */
  dimlwe: number
}

/**
 * Objects of this class represent the records found in the dimension style table. Each of these
 * records contains the information necessary to generate a specific appearance (that is, text
 * above, in, or below the line; arrows, slashes, or dots at the end of the dimension line, and
 * so on) for dimensions that reference it.
 */
export class AcDbDimStyleTableRecord extends AcDbSymbolTableRecord<AcDbDimStyleTableRecordAttrs> {
  static DEFAULT_DIM_VALUES: AcDbDimStyleTableRecordAttrs = {
    name: '',
    dimpost: '',
    dimapost: '',
    dimscale: 1.0,
    dimasz: 2.5,
    dimexo: 0.625,
    dimdli: 0.38,
    dimexe: 0.18,
    dimrnd: 0.0,
    dimdle: 0.0,
    dimtp: 0.0,
    dimtm: 0.0,
    dimtxt: 2.5,
    dimcen: 2.5,
    dimtsz: 0.0,
    dimaltf: 0,
    dimlfac: 1.0,
    dimtvp: 0.0,
    dimtfac: 1.0,
    dimgap: 1.0,
    dimaltrnd: 0.0,
    dimtol: 0,
    dimlim: 0,
    // TODO: Its initial value is 1 (imperial) or 0 (metric)
    dimtih: 0,
    // TODO: Its initial value is 1 (imperial) or 0 (metric)
    dimtoh: 0,
    dimse1: 0,
    dimse2: 0,
    // TODO: Its initial value is 0 (imperial) or 1 (metric)
    dimtad: AcDbDimTextVertical.Center,
    // TODO: Its initial value is 0 (imperial) or 8 (metric)
    dimzin: AcDbDimZeroSuppression.Feet,
    dimazin: AcDbDimZeroSuppressionAngular.None,
    dimalt: 0,
    // TODO: Its initial value is 2 (imperial) or 3 (metric)
    dimaltd: 2,
    // TODO: Its initial value is 0 (imperial) or 1 (metric)
    dimtofl: 0,
    dimsah: 0,
    dimtix: 0,
    dimsoxd: 0,
    dimclrd: 0,
    dimclre: 0,
    dimclrt: 0,
    dimadec: 0,
    dimunit: 2,
    // TODO: Its initial value is 4 (imperial) or 2 (metric).
    dimdec: 4,
    // TODO: Its initial value is 4 (imperial) or 2 (metric).
    dimtdec: 4,
    dimaltu: 2,
    // TODO: Its initial value is 2 (imperial) or 3 (metric)
    dimalttd: 2,
    dimaunit: 0,
    dimfrac: 0,
    dimlunit: 2,
    // TODO: Its initial value is '.' (imperial) or ',' (metric)
    dimdsep: '.',
    dimtmove: 0,
    dimjust: AcDbDimTextHorizontal.Center,
    dimsd1: 0,
    dimsd2: 0,
    // TODO: Its initial value is 1 (imperial) or 0 (metric)
    dimtolj: AcDbDimVerticalJustification.Bottom,
    // TODO: Its initial value is 0 (imperial) or 8 (metric)
    dimtzin: AcDbDimZeroSuppression.Feet,
    dimaltz: AcDbDimZeroSuppression.Feet,
    dimalttz: AcDbDimZeroSuppression.Feet,
    dimfit: 0,
    dimupt: 0,
    dimatfit: 3,
    dimtxsty: DEFAULT_TEXT_STYLE,
    dimldrblk: '',
    dimblk: '',
    dimblk1: '',
    dimblk2: '',
    dimlwd: -2,
    dimlwe: -2
  }

  constructor(
    attrs?: Partial<AcDbDimStyleTableRecordAttrs>,
    defaultAttrs?: Partial<AcDbDimStyleTableRecordAttrs>
  ) {
    attrs = attrs || {}
    defaults(attrs, AcDbDimStyleTableRecord.DEFAULT_DIM_VALUES)
    super(attrs, defaultAttrs)
  }

  /**
   * Dimension postfix. This property specifies a text prefix or suffix (or both) to the dimension
   * measurement.
   * For example, to establish a suffix for millimeters, set DIMPOST to mm; a distance of 19.2 units
   * would be displayed as 19.2 mm.
   * If tolerances are turned on, the suffix is applied to the tolerances as well as to the main
   * dimension. Use <> to indicate placement of the text in relation to the dimension value. For
   * example, enter <>mm to display a 5.0 millimeter radial dimension as "5.0mm". If you entered
   * mm <>, the dimension would be displayed as "mm 5.0". Use the <> mechanism for angular
   * dimensions.
   */
  get dimpost() {
    return this.getAttr('dimpost')
  }
  set dimpost(value: string) {
    this.setAttr('dimpost', value)
  }

  /**
   * Dimension append postfix. This property specifies a text prefix or suffix (or both) to the
   * alternate dimension measurement for all types of dimensions except angular.
   * For instance, if the current units are Architectural, DIMALT is on, DIMALTF is 25.4 (the
   * number of millimeters per inch), DIMALTD is 2, and DIMAPOST is set to "mm", a distance of 10
   * units would be displayed as 10"[254.00mm].
   * To turn off an established prefix or suffix (or both), set it to a single period (.).
   */
  get dimapost() {
    return this.getAttr('dimapost')
  }
  set dimapost(value: string) {
    this.setAttr('dimapost', value)
  }

  /**
   * Dimension scale. This property controls the scale factor for dimensioning objects. If you need
   * to adjust the scale of your dimensions, you can change this value to better fit your drawing's
   * scale.
   */
  get dimscale() {
    return this.getAttr('dimscale')
  }
  set dimscale(value: number) {
    this.setAttr('dimscale', value)
  }

  /**
   * Dimension arrow size. This property controls the size of the arrowheads used in dimensions. You
   * can modify this value to adjust the size of arrowheads based on your drawing's requirements.
   */
  get dimasz() {
    return this.getAttr('dimasz')
  }
  set dimasz(value: number) {
    this.setAttr('dimasz', value)
  }

  /**
   * Dimension extension line offset. This property controls the offset distance from the origin point
   * to where the extension line starts. You can adjust it to control how far the extension line is set
   * back from the object being dimensioned.
   */
  get dimexo() {
    return this.getAttr('dimexo')
  }
  set dimexo(value: number) {
    this.setAttr('dimexo', value)
  }

  /**
   * Dimension line Increment. This property controls the spacing between the dimension lines when you
   * create multiple parallel dimensions using the baseline dimensioning method.
   */
  get dimdli() {
    return this.getAttr('dimdli')
  }
  set dimdli(value: number) {
    this.setAttr('dimdli', value)
  }

  /**
   * Dimension extension line extension. This property controls how far beyond the dimension line the
   * extension lines extend. You can adjust this value to control the length of the extension line
   * past the dimension line.
   */
  get dimexe() {
    return this.getAttr('dimexe')
  }
  set dimexe(value: number) {
    this.setAttr('dimexe', value)
  }

  /**
   * Dimension rounding. This property controls the rounding of dimension distances to a specified value.
   * When set to 0.0, no rounding occurs, and the dimension is displayed with its exact value. You can
   * set it to a non-zero value to round dimensions to a specific increment.
   */
  get dimrnd() {
    return this.getAttr('dimrnd')
  }
  set dimrnd(value: number) {
    this.setAttr('dimrnd', value)
  }

  /**
   * Dimension line extension. This property controls how far the dimension line is extended beyond
   * the extension lines. By default, the dimension line ends at the extension lines, but you can
   * adjust this value to extend the dimension line beyond them.
   */
  get dimdle() {
    return this.getAttr('dimdle')
  }
  set dimdle(value: number) {
    this.setAttr('dimdle', value)
  }

  /**
   * Dimension text post. This property controls the tolerance value added after the dimension text,
   * typically used for specifying tolerance values in dimensions. The default setting of 0.0 means
   * that no additional tolerance is applied by default.
   */
  get dimtp() {
    return this.getAttr('dimtp')
  }
  set dimtp(value: number) {
    this.setAttr('dimtp', value)
  }

  /**
   * Dimension minus tolerance. This property controls the lower tolerance limit for dimensions. When
   * set to 0.0, no minus tolerance is applied by default. You can set this to a different value if
   * you need to specify a negative tolerance for your dimensions.
   */
  get dimtm() {
    return this.getAttr('dimtm')
  }
  set dimtm(value: number) {
    this.setAttr('dimtm', value)
  }

  /**
   * Dimension text height. This property controls the height of the dimension text. You can adjust
   * this value to change the size of the text in your dimensions to fit the scale and appearance of
   * your drawing.
   */
  get dimtxt() {
    return this.getAttr('dimtxt')
  }
  set dimtxt(value: number) {
    this.setAttr('dimtxt', value)
  }

  /**
   * Dimension center mark size. This property controls the size of the center marks or centerlines
   * for circles and arcs in dimensions. A positive value specifies the size of the center mark,
   * while a negative value specifies the size of the centerline. If set to 0, no center mark or
   * centerline is drawn.
   */
  get dimcen() {
    return this.getAttr('dimcen')
  }
  set dimcen(value: number) {
    this.setAttr('dimcen', value)
  }

  /**
   * Dimension tick size. When set to 0.0, no tick marks are displayed, and the default arrowheads are
   * used for dimension lines. If you set it to a positive value, it will display tick marks instead
   * of arrowheads, with the value controlling the size of the ticks.
   */
  get dimtsz() {
    return this.getAttr('dimtsz')
  }
  set dimtsz(value: number) {
    this.setAttr('dimtsz', value)
  }

  /**
   * Alternate dimensioning. The default value of DIMALT is set to 0 for DIMALTF (Dimension Alternate
   * Text Format), which means that alternate dimensions are not displayed by default.
   * When DIMALT is set to 1, it indicates that alternate dimensioning is enabled, and you can use
   * DIMALTF to specify the format of the alternate dimension text. You can set it to various values
   * depending on how you want the alternate dimensions to be displayed.
   */
  get dimaltf() {
    return this.getAttr('dimaltf')
  }
  set dimaltf(value: number) {
    this.setAttr('dimaltf', value)
  }

  /**
   * Dimension linear factor. This property controls the scaling factor for linear dimensions. If you
   * want to adjust the size of linear dimensions without changing the actual dimension text height or
   * other dimension settings, you can modify this value. A setting of 1.0 means that dimensions are
   * displayed at their actual size.
   */
  get dimlfac() {
    return this.getAttr('dimlfac')
  }
  set dimlfac(value: number) {
    this.setAttr('dimlfac', value)
  }

  /**
   * Dimension text vertical position. This property controls the vertical position of dimension text
   * relative to the dimension line. A value of 0.0 means that the dimension text is placed directly
   * on the dimension line. You can adjust this value to change the vertical offset of the dimension
   * text above or below the dimension line.
   */
  get dimtvp() {
    return this.getAttr('dimtvp')
  }
  set dimtvp(value: number) {
    this.setAttr('dimtvp', value)
  }

  /**
   * Dimension text factor. This property is used to scale the height of dimension text based on the
   * current DIMTXT value. If you set DIMTFAC to a value greater than 1.0, the dimension text will be
   * larger than the default height specified by DIMTXT. Conversely, setting it to a value less than
   * 1.0 will make the text smaller.
   */
  get dimtfac() {
    return this.getAttr('dimtfac')
  }
  set dimtfac(value: number) {
    this.setAttr('dimtfac', value)
  }

  /**
   * Dimension gap. This property controls the distance between the dimension line and the extension
   * lines. You can adjust this value to create more space or less space between these elements in
   * your dimensions.
   */
  get dimgap() {
    return this.getAttr('dimgap')
  }
  set dimgap(value: number) {
    this.setAttr('dimgap', value)
  }

  /**
   * Dimension alternate rounding. This property controls rounds off the alternate dimension units.
   */
  get dimaltrnd() {
    return this.getAttr('dimaltrnd')
  }
  set dimaltrnd(value: number) {
    this.setAttr('dimaltrnd', value)
  }

  /**
   * Dimension tolerance. This property determines whether to appends tolerances to dimension text.
   * Setting DIMTOL to on (1) turns DIMLIM off (0).
   */
  get dimtol() {
    return this.getAttr('dimtol')
  }
  set dimtol(value: 0 | 1) {
    this.setAttr('dimtol', value)
  }

  /**
   * Dimension limit. This property determines whether to generate dimension limits as the default
   * text. Setting DIMLIM to On turns DIMTOL off.
   * - 0: Dimension limits are not generated as default text
   * - 1: Dimension limits are generated as default text
   */
  get dimlim() {
    return this.getAttr('dimlim')
  }
  set dimlim(value: 0 | 1) {
    this.setAttr('dimlim', value)
  }

  /**
   * Dimension text inside horizontal. This property controls the position of dimension text inside the
   * extension lines for all dimension types except Ordinate.
   * - 0: Aligns text with the dimension line
   * - 1: Draws text horizontally
   */
  get dimtih() {
    return this.getAttr('dimtih')
  }
  set dimtih(value: 0 | 1) {
    this.setAttr('dimtih', value)
  }

  /**
   * Dimension text outside horizontal. This property controls the position of dimension text
   * outside the extension lines.
   * - 0: Aligns text with the dimension line
   * - 1: Draws text horizontally
   */
  get dimtoh() {
    return this.getAttr('dimtoh')
  }
  set dimtoh(value: 0 | 1) {
    this.setAttr('dimtoh', value)
  }

  /**
   * Dimension suppress extension line 1. This property controls whether to suppresses display of the
   * first extension line.
   * - 0: Extension line is not suppressed
   * - 1: Extension line is suppressed
   */
  get dimse1() {
    return this.getAttr('dimse1')
  }
  set dimse1(value: 0 | 1) {
    this.setAttr('dimse1', value)
  }

  /**
   * Dimension suppress extension line 2. This property controls whether to suppresses display of the
   * second extension line.
   * - 0: Extension line is not suppressed
   * - 1: Extension line is suppressed
   */
  get dimse2() {
    return this.getAttr('dimse2')
  }
  set dimse2(value: 0 | 1) {
    this.setAttr('dimse2', value)
  }

  /**
   * Dimension text above dimension line. This property the vertical position of text in relation to
   * the dimension line.
   * - 0: Centers the dimension text between the extension lines.
   * - 1: Places the dimension text above the dimension line except when the dimension line is not
   * horizontal and text inside the extension lines is forced horizontal ( DIMTIH = 1). The distance
   * from the dimension line to the baseline of the lowest line of text is the current DIMGAP value.
   * - 2: Places the dimension text on the side of the dimension line farthest away from the defining
   * points.
   * - 3: Places the dimension text to conform to Japanese Industrial Standards (JIS).
   * - 4: Places the dimension text below the dimension line.
   */
  get dimtad() {
    return this.getAttr('dimtad')
  }
  set dimtad(value: AcDbDimTextVertical) {
    this.setAttr('dimtad', value)
  }

  /**
   * Dimension zero-in. This property controls the suppression of zeros in the primary unit value.
   * - 0: Suppresses zero feet and precisely zero inches
   * - 1: Includes zero feet and precisely zero inches
   * - 2: Includes zero feet and suppresses zero inches
   * - 3: Includes zero inches and suppresses zero feet
   * - 4: Suppresses leading zeros in decimal dimensions (for example, 0.5000 becomes .5000)
   * - 8: Suppresses trailing zeros in decimal dimensions (for example, 12.5000 becomes 12.5)
   * - 12: Suppresses both leading and trailing zeros (for example, 0.5000 becomes .5)
   */
  get dimzin() {
    return this.getAttr('dimzin')
  }
  set dimzin(value: AcDbDimZeroSuppression) {
    this.setAttr('dimzin', value)
  }

  /**
   * Dimension zero-in for angular dimensions.
   * - 0: Displays all leading and trailing zeros
   * - 1: Suppresses leading zeros in decimal dimensions (for example, 0.5000 becomes .5000)
   * - 2: Suppresses trailing zeros in decimal dimensions (for example, 12.5000 becomes 12.5)
   * - 3: Suppresses leading and trailing zeros (for example, 0.5000 becomes .5)
   */
  get dimazin() {
    return this.getAttr('dimazin')
  }
  set dimazin(value: AcDbDimZeroSuppressionAngular) {
    this.setAttr('dimazin', value)
  }

  /**
   * Dimension angular zero-in. This property controls the display of alternate units in dimensions.
   * - 0: Disables alternate units
   * - 1: Enables alternate units
   */
  get dimalt() {
    return this.getAttr('dimalt')
  }
  set dimalt(value: 0 | 1) {
    this.setAttr('dimalt', value)
  }

  /**
   * Dimension alternate dimension. This property controls the number of decimal places in alternate
   * units. If DIMALT is turned on, DIMALTD sets the number of digits displayed to the right of the
   * decimal point in the alternate measurement.
   */
  get dimaltd() {
    return this.getAttr('dimaltd')
  }
  set dimaltd(value: number) {
    this.setAttr('dimaltd', value)
  }

  /**
   * Dimension to first extension line. This property controls whether a dimension line is drawn
   * between the extension lines even when the text is placed outside. For radius and diameter
   * dimensions, a dimension line is drawn inside the circle or arc when the text, arrowheads,
   * and leader are placed outside.
   * - 0: Does not draw dimension lines between the measured points when arrowheads are placed
   * outside the measured points
   * - 1: Draws dimension lines between the measured points even when arrowheads are placed
   * outside the measured points
   */
  get dimtofl() {
    return this.getAttr('dimtofl')
  }
  set dimtofl(value: 0 | 1) {
    this.setAttr('dimtofl', value)
  }

  /**
   * Dimension suppress arrowheads. This property controls the display of dimension line arrowhead blocks.
   * - 0: Use arrowhead blocks set by DIMBLK
   * - 1: Use arrowhead blocks set by DIMBLK1 and DIMBLK2
   */
  get dimsah() {
    return this.getAttr('dimsah')
  }
  set dimsah(value: 0 | 1) {
    this.setAttr('dimsah', value)
  }

  /**
   * Dimension text inside extension lines. This property controls the position of dimension text
   * relative to the extension lines.
   * - 0: For linear and angular dimensions, dimension text is placed inside the extension lines if
   * there is sufficient room.
   * - 1: Draws dimension text between the extension lines even if it would ordinarily be placed
   * outside those lines. For radius and diameter dimensions, DIMTIX on always forces the dimension
   * text outside the circle or arc.
   */
  get dimtix() {
    return this.getAttr('dimtix')
  }
  set dimtix(value: 0 | 1) {
    this.setAttr('dimtix', value)
  }

  /**
   * Dimension suppress offset x-direction. This property controls whether to suppresses arrowheads
   * if not enough space is available inside the extension lines.
   * If not enough space is available inside the extension lines and DIMTIX is on, setting DIMSOXD to
   * On suppresses the arrowheads. If DIMTIX is off, DIMSOXD has no effect.
   * - 0: Arrowheads are not suppressed
   * - 1: Arrowheads are suppressed
   */
  get dimsoxd() {
    return this.getAttr('dimsoxd')
  }
  set dimsoxd(value: 0 | 1) {
    this.setAttr('dimsoxd', value)
  }

  /**
   * Dimension color. This property controls colors to dimension lines, arrowheads, and dimension leader
   * lines. For BYBLOCK, enter 0. For BYLAYER, enter 256.
   */
  get dimclrd() {
    return this.getAttr('dimclrd')
  }
  set dimclrd(value: number) {
    this.setAttr('dimclrd', value)
  }

  /**
   * Dimension extension line color. This property controls colors to extension lines, center marks,
   * and centerlines. For BYBLOCK, enter 0. For BYLAYER, enter 256.
   */
  get dimclre() {
    return this.getAttr('dimclre')
  }
  set dimclre(value: number) {
    this.setAttr('dimclre', value)
  }

  /**
   * Dimension text color. This property controls colors to dimension text. For BYBLOCK, enter 0.
   * For BYLAYER, enter 256.
   */
  get dimclrt() {
    return this.getAttr('dimclrt')
  }
  set dimclrt(value: number) {
    this.setAttr('dimclrt', value)
  }

  /**
   * Dimension angular decimal places. This property controls the number of precision places displayed
   * in angular dimensions.
   * - 1: Angular dimensions display the number of decimal places specified by DIMDEC
   * - 0-8: Specifies the number of decimal places displayed in angular dimensions (independent of DIMDEC)
   */
  get dimadec() {
    return this.getAttr('dimadec')
  }
  set dimadec(value: number) {
    this.setAttr('dimadec', value)
  }

  /**
   * Dimension linear units. This property controls the format in which linear dimensions are displayed.
   * The value of this property include:
   * - 1: Scientific
   * - 2: Decimal
   * - 3: Engineering
   * - 4: Architectural (always displayed stacked)
   * - 5: Fractional (always displayed stacked)
   * - 6: Microsoft Windows Desktop (decimal format using Control Panel settings for decimal separator
   * and number grouping symbols)
   */
  get dimunit() {
    return this.getAttr('dimunit')
  }
  set dimunit(value: number) {
    this.setAttr('dimunit', value)
  }

  /**
   * Dimension decimal places. This property controls the number of decimal places displayed for the
   * primary units of a dimension. Its initial value is	4 for imperial unit or 2 for metric unit.
   * The precision is based on the units or angle format you have selected. Specified value is applied
   * to angular dimensions when DIMADEC is set to -1.
   */
  get dimdec() {
    return this.getAttr('dimdec')
  }
  set dimdec(value: number) {
    this.setAttr('dimdec', value)
  }

  /**
   * Dimension tolerance decimal places. This property controls the number of decimal places to display
   * in tolerance values for the primary units in a dimension. This property has no effect unless DIMTOL
   * is set to On. The default for DIMTOL is Off.
   */
  get dimtdec() {
    return this.getAttr('dimtdec')
  }
  set dimtdec(value: number) {
    this.setAttr('dimtdec', value)
  }

  /**
   * Dimension alternate unit format. This property controls the units format for alternate units of
   * all dimension substyles except Angular. The value of this property include:
   * - 1: Scientific
   * - 2: Decimal
   * - 3: Engineering
   * - 4: Architectural (stacked)
   * - 5: Fractional (stacked)
   * - 6: Architectural
   * - 7: Fractional
   * - 8: Microsoft Windows Desktop (decimal format using Control Panel settings for decimal separator
   * and number grouping symbols)
   */
  get dimaltu() {
    return this.getAttr('dimaltu')
  }
  set dimaltu(value: number) {
    this.setAttr('dimaltu', value)
  }

  /**
   * Dimension alternate tolerance decimal places. This property controls the number of decimal places
   * for the tolerance values in the alternate units of a dimension.
   */
  get dimalttd() {
    return this.getAttr('dimalttd')
  }
  set dimalttd(value: number) {
    this.setAttr('dimalttd', value)
  }

  /**
   * Dimension angular units. This property controls the units format for angular dimensions.
   * - 0: Decimal degrees
   * - 1: Degrees/minutes/seconds
   * - 2: Gradians
   * - 3: Radians
   */
  get dimaunit() {
    return this.getAttr('dimaunit')
  }
  set dimaunit(value: number) {
    this.setAttr('dimaunit', value)
  }

  /**
   * Dimension fraction format. This property controls the fraction format when DIMLUNIT is set to 4
   * (Architectural) or 5 (Fractional).
   * - 0: Horizontal stacking
   * - 1: Diagonal stacking
   * - 2: Not stacked (for example, 1/2)
   */
  get dimfrac() {
    return this.getAttr('dimfrac')
  }
  set dimfrac(value: number) {
    this.setAttr('dimfrac', value)
  }

  /**
   * Dimension linear units. This property controls units for all dimension types except angular.
   * The value of this property include:
   * - 1: Scientific
   * - 2: Decimal
   * - 3: Engineering
   * - 4: Architectural (always displayed stacked)
   * - 5: Fractional (always displayed stacked)
   * - 6: Microsoft Windows Desktop (decimal format using Control Panel settings for decimal separator
   * and number grouping symbols)
   */
  get dimlunit() {
    return this.getAttr('dimlunit')
  }
  set dimlunit(value: number) {
    this.setAttr('dimlunit', value)
  }

  /**
   * Dimension decimal separator. This property is used to specifies a single-character decimal separator
   * to use when creating dimensions whose unit format is decimal.
   */
  get dimdsep() {
    return this.getAttr('dimdsep')
  }
  set dimdsep(value: string) {
    this.setAttr('dimdsep', value)
  }

  /**
   * Dimension text movement. This property is used to set dimension text movement rules.
   * - 0: Moves the dimension line with dimension text
   * - 1: Adds a leader when dimension text is moved
   * - 2: Allows text to be moved freely without a leader
   */
  get dimtmove() {
    return this.getAttr('dimtmove')
  }
  set dimtmove(value: number) {
    this.setAttr('dimtmove', value)
  }

  /**
   * Dimension text justification. This property controls the horizontal positioning of dimension text.
   * - 0: Positions the text above the dimension line and center-justifies it between the extension lines
   * - 1: Positions the text next to the first extension line
   * - 2: Positions the text next to the second extension line
   * - 3: Positions the text above and aligned with the first extension line
   * - 4: Positions the text above and aligned with the second extension line
   */
  get dimjust() {
    return this.getAttr('dimjust')
  }
  set dimjust(value: number) {
    this.setAttr('dimjust', value)
  }

  /**
   * Suppress first dimension line. This property controls suppression of the first dimension line
   * and arrowhead. When turned on, suppresses the display of the dimension line and arrowhead
   * between the first extension line and the text.
   * - 0: First dimension line is not suppressed
   * - 1: First dimension line is suppressed
   */
  get dimsd1() {
    return this.getAttr('dimsd1')
  }
  set dimsd1(value: 0 | 1) {
    this.setAttr('dimsd1', value)
  }

  /**
   * Suppress second dimension line. This property controls suppression of the second dimension line
   * and arrowhead. When turned on, suppresses the display of the dimension line and arrowhead
   * between the second extension line and the text.
   * - 0: Second dimension line is not suppressed
   * - 1: Second dimension line is suppressed
   */
  get dimsd2() {
    return this.getAttr('dimsd2')
  }
  set dimsd2(value: 0 | 1) {
    this.setAttr('dimsd2', value)
  }

  /**
   * Dimension tolerance justification. This property sets the vertical justification for tolerance
   * values relative to the nominal dimension text. This property has no effect unless DIMTOL is set
   * to On. The default for DIMTOL is Off.
   * - 0: Bottom
   * - 1: Middle
   * - 2: Top
   */
  get dimtolj() {
    return this.getAttr('dimtolj')
  }
  set dimtolj(value: AcDbDimVerticalJustification) {
    this.setAttr('dimtolj', value)
  }

  /**
   * Dimension tolerance zero suppress. This property controls the suppression of zeros in tolerance values.
   * Values 0-3 affect feet-and-inch dimensions only.
   * - 0: Suppresses zero feet and precisely zero inches
   * - 1: Includes zero feet and precisely zero inches
   * - 2: Includes zero feet and suppresses zero inches
   * - 3: Includes zero inches and suppresses zero feet
   * - 4: Suppresses leading zeros in decimal dimensions (for example, 0.5000 becomes .5000)
   * - 8: Suppresses trailing zeros in decimal dimensions (for example, 12.5000 becomes 12.5)
   * - 12: Suppresses both leading and trailing zeros (for example, 0.5000 becomes .5)
   */
  get dimtzin() {
    return this.getAttr('dimtzin')
  }
  set dimtzin(value: AcDbDimZeroSuppression) {
    this.setAttr('dimtzin', value)
  }

  /**
   * Dimension alternate unit zero suppress. This property controls the suppression of zeros for
   * alternate unit dimension values. DIMALTZ values 0-3 affect feet-and-inch dimensions only.
   * - 0: Suppresses zero feet and precisely zero inches
   * - 1: Includes zero feet and precisely zero inches
   * - 2: Includes zero feet and suppresses zero inches
   * - 3: Includes zero inches and suppresses zero feet
   * - 4: Suppresses leading zeros in decimal dimensions (for example, 0.5000 becomes .5000)
   * - 8: Suppresses trailing zeros in decimal dimensions (for example, 12.5000 becomes 12.5)
   * - 12: Suppresses both leading and trailing zeros (for example, 0.5000 becomes .5)
   */
  get dimaltz() {
    return this.getAttr('dimaltz')
  }
  set dimaltz(value: AcDbDimZeroSuppression) {
    this.setAttr('dimaltz', value)
  }

  /**
   * Dimension alternate tolerance zero suppress. This property controls suppression of zeros in
   * tolerance values.
   * - 0: Suppresses zero feet and precisely zero inches
   * - 1: Includes zero feet and precisely zero inches
   * - 2: Includes zero feet and suppresses zero inches
   * - 3: Includes zero inches and suppresses zero feet
   *
   * To suppress leading or trailing zeros, add the following values to one of the preceding values:
   * - 4: Suppresses leading zeros
   * - 8: Suppresses trailing zeros
   */
  get dimalttz() {
    return this.getAttr('dimalttz')
  }
  set dimalttz(value: AcDbDimZeroSuppression) {
    this.setAttr('dimalttz', value)
  }

  /**
   * Dimension fit. This property controls how dimension text fits within the dimension line.
   * The value of this property include:
   * - 0: Fit (default) – The dimension text is placed outside the dimension lines if it does not fit inside.
   * - 1: Above – The dimension text is placed above the dimension line.
   * - 2: Center – The dimension text is centered between the extension lines.
   * With the default setting of 0, the software automatically positions the dimension text based on
   * available space.
   */
  get dimfit() {
    return this.getAttr('dimfit')
  }
  set dimfit(value: number) {
    this.setAttr('dimfit', value)
  }

  /**
   * Dimension update. This property controls options for user-positioned text.
   * - 0: Cursor controls only the dimension line location
   * - 1: Cursor controls both the text position and the dimension line location
   */
  get dimupt() {
    return this.getAttr('dimupt')
  }
  set dimupt(value: number) {
    this.setAttr('dimupt', value)
  }

  /**
   * Dimension angular tolerance fit. This property determines how dimension text and arrows are
   * arranged when space is not sufficient to place both within the extension lines.
   * - 0: Places both text and arrows outside extension lines
   * - 1: Moves arrows first, then text
   * - 2: Moves text first, then arrows
   * - 3: Moves either text or arrows, whichever fits best
   * A leader is added to moved dimension text when DIMTMOVE is set to 1.
   */
  get dimatfit() {
    return this.getAttr('dimatfit')
  }
  set dimatfit(value: number) {
    this.setAttr('dimatfit', value)
  }

  /**
   * Dimension text style. This property specifies the text style of the dimension.
   */
  get dimtxsty() {
    return this.getAttr('dimtxsty')
  }
  set dimtxsty(value: string) {
    this.setAttr('dimtxsty', value)
  }

  /**
   * Dimension leader block. This property specifies the arrow type for leaders. To return to the
   * default, closed-filled arrowhead display, enter a single period (.). For a list of arrowhead
   * entries, see DIMBLK.
   * Note: Annotative blocks cannot be used as custom arrowheads for dimensions or leaders.
   */
  get dimldrblk() {
    return this.getAttr('dimldrblk')
  }
  set dimldrblk(value: string) {
    this.setAttr('dimldrblk', value)
  }

  /**
   * Dimension arrowhead block. This property controls the arrowhead block displayed at the ends of
   * dimension lines.
   */
  get dimblk() {
    return this.getAttr('dimblk')
  }
  set dimblk(value: string) {
    this.setAttr('dimblk', value)
  }

  /**
   * Dimension arrowhead block for the first arrow. This property controls the arrowhead for the
   * first end of the dimension line when DIMSAH is on.
   */
  get dimblk1() {
    return this.getAttr('dimblk1')
  }
  set dimblk1(value: string) {
    this.setAttr('dimblk1', value)
  }

  /**
   * Dimension arrowhead block for the second arrow. This property controls the arrowhead for the
   * second end of the dimension line when DIMSAH is on.
   */
  get dimblk2() {
    return this.getAttr('dimblk2')
  }
  set dimblk2(value: string) {
    this.setAttr('dimblk2', value)
  }

  /**
   * Dimension line weight. This property controls lineweight to dimension lines.
   * - -1: Sets the lineweight to "BYLAYER."
   * - -2: Sets the lineweight to "BYBLOCK."
   * - -3: Sets the lineweight to "DEFAULT." "DEFAULT" is controlled by the LWDEFAULT system variable.
   * Other valid values entered in hundredths of millimeters include 0, 5, 9, 13, 15, 18, 20, 25, 30,
   * 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, and 211.
   * All values must be entered in hundredths of millimeters. (Multiply a value by 2540 to convert
   * values from inches to hundredths of millimeters.)
   */
  get dimlwd() {
    return this.getAttr('dimlwd')
  }
  set dimlwd(value: number) {
    this.setAttr('dimlwd', value)
  }

  /**
   * Dimension line weight for extension lines. This property controls lineweight to extension lines.
   * - -1: Sets the lineweight to "BYLAYER."
   * - -2: Sets the lineweight to "BYBLOCK."
   * - -3: Sets the lineweight to "DEFAULT." "DEFAULT" is controlled by the LWDEFAULT system variable.
   * Other valid values entered in hundredths of millimeters include 0, 5, 9, 13, 15, 18, 20, 25, 30,
   * 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, and 211.
   * All values must be entered in hundredths of millimeters. (Multiply a value by 2540 to convert
   * values from inches to hundredths of millimeters.)
   */
  get dimlwe() {
    return this.getAttr('dimlwe')
  }
  set dimlwe(value: number) {
    this.setAttr('dimlwe', value)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    const textStyle = this.database.tables.textStyleTable.getAt(this.dimtxsty)
    const dimldrblk = this.database.tables.blockTable.getAt(this.dimldrblk)
    const dimblk = this.database.tables.blockTable.getAt(this.dimblk)
    const dimblk1 = this.database.tables.blockTable.getAt(this.dimblk1)
    const dimblk2 = this.database.tables.blockTable.getAt(this.dimblk2)
    filer.writeSubclassMarker('AcDbDimStyleTableRecord')
    filer.writeString(2, this.name)
    filer.writeInt16(70, 0)
    filer.writeString(3, this.dimpost)
    filer.writeString(4, this.dimapost)
    filer.writeDouble(40, this.dimscale)
    filer.writeDouble(41, this.dimasz)
    filer.writeDouble(42, this.dimexo)
    filer.writeDouble(43, this.dimdli)
    filer.writeDouble(44, this.dimexe)
    filer.writeDouble(140, this.dimtxt)
    filer.writeDouble(147, this.dimgap)
    filer.writeInt16(170, this.dimalt)
    filer.writeInt16(171, this.dimtol)
    filer.writeInt16(172, this.dimlim)
    filer.writeInt16(173, this.dimtih)
    filer.writeInt16(174, this.dimtoh)
    filer.writeObjectId(340, textStyle?.objectId)
    filer.writeObjectId(341, dimldrblk?.objectId)
    filer.writeObjectId(342, dimblk?.objectId)
    filer.writeObjectId(343, dimblk1?.objectId)
    filer.writeObjectId(344, dimblk2?.objectId)
    filer.writeInt16(371, this.dimlwd)
    filer.writeInt16(372, this.dimlwe)
    return this
  }
}
