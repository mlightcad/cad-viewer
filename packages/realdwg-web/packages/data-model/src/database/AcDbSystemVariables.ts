/**
 * Supported application color themes exposed through UI-related system variables.
 *
 * - `light`: Light background and panel palette.
 * - `dark`: Dark background and panel palette.
 */
export type AcDbColorTheme = 'light' | 'dark'

/**
 * Canonical names of the system variables currently recognized by the database layer.
 *
 * The value of each field intentionally matches its key so callers can use this object as:
 * - a centralized source of truth for variable names
 * - a type-safe enum-like lookup table
 * - an iterable registry source via `Object.values(...)`
 */
export const AcDbSystemVariables = {
  /** Drawing version identifier, for example `AC1014`. */
  ACADVER: 'ACADVER',
  /** Base angle, in radians, used as the zero direction for angular input/output. */
  ANGBASE: 'ANGBASE',
  /** Positive angle direction flag: `0` for counterclockwise, `1` for clockwise. */
  ANGDIR: 'ANGDIR',
  /** Angular unit display mode, such as decimal degrees or degrees/minutes/seconds. */
  AUNITS: 'AUNITS',
  /** Current color applied to newly created entities. */
  CECOLOR: 'CECOLOR',
  /** Current entity linetype scale multiplier for newly created entities. */
  CELTSCALE: 'CELTSCALE',
  /** Current lineweight applied to newly created entities. */
  CELWEIGHT: 'CELWEIGHT',
  /** Current layer name used when creating new entities. */
  CLAYER: 'CLAYER',
  /** UI color theme selector used by the application shell or viewer integration. */
  COLORTHEME: 'COLORTHEME',
  /** Upper-right corner of the model-space drawing extents. */
  EXTMAX: 'EXTMAX',
  /** Lower-left corner of the model-space drawing extents. */
  EXTMIN: 'EXTMIN',
  /** Insertion units used for automatic scaling of inserted content. */
  INSUNITS: 'INSUNITS',
  /** Global linetype scale multiplier for the drawing database. */
  LTSCALE: 'LTSCALE',
  /** Flag indicating whether lineweights are displayed in the editor/viewer. */
  LWDISPLAY: 'LWDISPLAY',
  /** Color used for measurement tool overlays (distance, area, arc). */
  MEASUREMENTCOLOR: 'MEASUREMENTCOLOR',
  /** Running object snap mode bitmask (OSNAP settings). */
  OSMODE: 'OSMODE',
  /** Point display style bitmask that controls how POINT entities are drawn. */
  PDMODE: 'PDMODE',
  /** Point display size, expressed as an absolute value or viewport percentage. */
  PDSIZE: 'PDSIZE',
  /** Pickbox half-size, in pixels, used for selection hit testing in the UI. */
  PICKBOX: 'PICKBOX',
  /** Current text style name used when creating new text entities. */
  TEXTSTYLE: 'TEXTSTYLE',
  /** Flag indicating whether the drawing background should be rendered as white. */
  WHITEBKCOLOR: 'WHITEBKCOLOR'
} as const

/**
 * Union of all supported system variable names.
 *
 * Example: `'CLAYER' | 'LTSCALE' | ...`
 */
export type AcDbSystemVariableName =
  (typeof AcDbSystemVariables)[keyof typeof AcDbSystemVariables]

/**
 * Frozen list of all registered system variable names.
 *
 * This is primarily useful for validation, iteration, and building UI selectors.
 */
export const AC_DB_SYSTEM_VARIABLE_NAMES = Object.freeze(
  Object.values(AcDbSystemVariables)
)
