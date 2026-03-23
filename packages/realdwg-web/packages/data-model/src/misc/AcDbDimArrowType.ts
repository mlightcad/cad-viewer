/**
 * Enumeration of arrowhead types used in dimension lines.
 *
 * This enum defines the various arrowhead styles that can be displayed
 * at the ends of dimension lines in AutoCAD drawings.
 */
export enum AcDbDimArrowType {
  /**
   * Closed filled arrowhead - solid triangular arrow
   */
  ClosedFilled = '',
  /**
   * Dot arrowhead - small filled circle
   */
  Dot = '_DOT',
  /**
   * Small dot arrowhead - smaller filled circle
   */
  DotSmall = '_DOTSMALL',
  /**
   * Blank dot arrowhead - unfilled circle
   */
  DotBlank = '_DOTBLANK',
  /**
   * Origin indicator arrowhead - cross mark
   */
  Origin = '_ORIGIN',
  /**
   * Origin indicator 2 arrowhead - alternative cross mark
   */
  Origin2 = '_ORIGIN2',
  /**
   * Open arrowhead - unfilled triangular arrow
   */
  Open = '_OPEN',
  /**
   * Right angle arrowhead - 90-degree open arrow
   */
  Open90 = '_OPEN90',
  /**
   * Open 30 arrowhead - 30-degree open arrow
   */
  Open30 = '_OPEN30',
  /**
   * Closed arrowhead - filled triangular arrow
   */
  Closed = '_CLOSED',
  /**
   * Small arrowhead - smaller triangular arrow
   */
  Small = '_SMALL',
  /**
   * None - no arrowhead displayed
   */
  None = '_NONE',
  /**
   * Oblique arrowhead - slanted arrow
   */
  Oblique = '_OBLIQUE',
  /**
   * Box filled arrowhead - filled square
   */
  BoxFilled = '_BOXFILLED',
  /**
   * Box blank arrowhead - unfilled square
   */
  Box = '_BOXBLANK',
  /**
   * Closed blank arrowhead - unfilled triangular arrow
   */
  ClosedBlank = '_CLOSEDBLANK',
  /**
   * Datum triangle blank - unfilled datum triangle
   */
  DatumBlank = '_DATUMBLANK',
  /**
   * Datum triangle filled - filled datum triangle
   */
  DatumFilled = '_DATUMFILLED',
  /**
   * Integral arrowhead - integral symbol
   */
  Integral = '_INTEGRAL',
  /**
   * Architectural tick - architectural tick mark
   */
  ArchTick = '_ARCHTICK'
}
