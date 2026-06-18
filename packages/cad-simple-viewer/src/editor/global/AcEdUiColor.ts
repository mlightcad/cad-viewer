/**
 * Canvas and drawing-display colours that are independent of {@link AcEdUiTheme}.
 *
 * `AcEdUiTheme` and the `COLORTHEME` sysvar drive chrome tokens (CSS
 * variables). This module holds helpers for the CAD viewport:
 *
 * - **Layout background** — `MODELBKCOLOR` / `PAPERBKCOLOR` control the
 *   canvas clear colour and ACI-7 foreground inversion.
 * - **UI colour theme** — `COLORTHEME` only affects viewer chrome, not
 *   canvas or ACI-7 rendering.
 *
 * Shared colour constants and luminance helpers are defined in
 * `@mlightcad/graphic-interface` (`AcGiContext.ts`) and re-exported here
 * for editor callers.
 */
export {
  ACGI_DARK_THEME_FOREGROUND,
  ACGI_LIGHT_THEME_FOREGROUND,
  ACGI_MODEL_SPACE_BACKGROUND,
  ACGI_PAPER_SPACE_BACKGROUND,
  acgiContrastingForegroundColor,
  acgiForegroundColorForBackground,
  acgiIsLightBackground
} from '@mlightcad/data-model'

import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager,
  ACGI_MODEL_SPACE_BACKGROUND,
  ACGI_PAPER_SPACE_BACKGROUND,
  acgiContrastingForegroundColor,
  acgiIsLightBackground
} from '@mlightcad/data-model'

/**
 * Returns the UI chrome foreground colour that matches `COLORTHEME`.
 *
 * This maps the UI light/dark theme flag to shared constants. It does
 * **not** drive ACI-7 drawing colours — use
 * {@link acgiForegroundColorForBackground} for canvas-linked inversion.
 *
 * @param isLightTheme - `true` when `COLORTHEME` indicates a light UI theme
 *   (value `1`); `false` for a dark UI theme (value `0`).
 * @returns Packed RGB: {@link ACGI_LIGHT_THEME_FOREGROUND} for light UI,
 *   {@link ACGI_DARK_THEME_FOREGROUND} for dark UI.
 *
 * @see {@link isLightColorTheme} — normalises raw `COLORTHEME` sysvar values
 * @see {@link acgiForegroundColorForBackground} — ACI-7 inversion from layout bg
 */
export function foregroundColorFromColorTheme(isLightTheme: boolean): number {
  return acgiContrastingForegroundColor(isLightTheme)
}

/**
 * Normalises a raw `COLORTHEME` system-variable value to a boolean light UI
 * theme flag.
 *
 * AutoCAD stores `COLORTHEME` as a number (`0` = dark, `1` = light), but the
 * value may arrive from the database or event payloads as a number, boolean,
 * or string. This helper accepts all common representations so callers do not
 * need to duplicate parsing logic.
 *
 * @param value - Raw sysvar value from {@link AcDbSysVarManager} or a
 *   `sysVarChanged` event. Recognised forms:
 *   - `number` — light when equal to `1`
 *   - `boolean` — returned as-is
 *   - `string` — light when `'light'`, `'1'`, or `'true'` (case-insensitive)
 * @returns `true` for a light colour theme; `false` for dark or any other value.
 *
 * @example
 * ```typescript
 * isLightColorTheme(1)        // true
 * isLightColorTheme(0)        // false
 * isLightColorTheme('light')  // true
 * isLightColorTheme('dark')   // false
 * ```
 */
export function isLightColorTheme(value: unknown): boolean {
  if (typeof value === 'number') {
    return value === 1
  }
  if (typeof value === 'boolean') {
    return value
  }
  const normalized = String(value).toLowerCase()
  return normalized === 'light' || normalized === '1' || normalized === 'true'
}

/**
 * Reports whether the given database's current space is model space.
 *
 * Compares `database.currentSpaceId` against the object id of the block table's
 * model-space record. Used when reacting to sysvar changes or reading layout
 * background colours so the correct sysvar (`MODELBKCOLOR` vs. `PAPERBKCOLOR`)
 * is consulted.
 *
 * @param database - Active drawing database whose current space is inspected.
 * @returns `true` when the database is in model space; `false` when it is in
 *   a paper-space layout.
 *
 * @see {@link layoutBackgroundSysVar} — picks the background sysvar name from
 *   this result
 */
export function isModelSpaceDatabase(database: AcDbDatabase): boolean {
  return (
    database.currentSpaceId === database.tables.blockTable.modelSpace.objectId
  )
}

/**
 * Returns the layout-background system-variable name for the active space.
 *
 * AutoCAD stores separate background colours for model space and paper space:
 *
 * - Model space — {@link AcDbSystemVariables.MODELBKCOLOR}
 * - Paper space — {@link AcDbSystemVariables.PAPERBKCOLOR}
 *
 * @param isModelSpace - `true` to target model space; `false` for the active
 *   paper-space layout.
 * @returns The sysvar name string passed to {@link AcDbSysVarManager}.
 *
 * @example
 * ```typescript
 * layoutBackgroundSysVar(true)  // MODELBKCOLOR
 * layoutBackgroundSysVar(false) // PAPERBKCOLOR
 * ```
 *
 * @see {@link readLayoutBackgroundColor} — reads and resolves the colour value
 * @see {@link AcApSwitchBgCmd} — toggles the sysvar via this helper
 */
export function layoutBackgroundSysVar(isModelSpace: boolean): string {
  return isModelSpace
    ? AcDbSystemVariables.MODELBKCOLOR
    : AcDbSystemVariables.PAPERBKCOLOR
}

/**
 * Resolves a packed RGB canvas background from an {@link AcCmColor} sysvar
 * value, with space-specific defaults as fallback.
 *
 * When the sysvar holds a concrete RGB colour (`color.RGB` is defined), that
 * value is returned directly. Otherwise the AutoCAD defaults are used:
 * {@link ACGI_MODEL_SPACE_BACKGROUND} (`0x000000`) for model space or
 * {@link ACGI_PAPER_SPACE_BACKGROUND} (`0xffffff`) for paper space.
 *
 * @param color - Layout background colour from `MODELBKCOLOR` or
 *   `PAPERBKCOLOR`, or `undefined` when the sysvar is unset.
 * @param isModelSpace - `true` when resolving for model space; `false` for
 *   paper space (selects the default fallback).
 * @returns Packed 24-bit RGB suitable for the renderer clear colour.
 *
 * @see {@link readLayoutBackgroundColor} — reads the sysvar then calls this
 */
export function canvasBackgroundFromColor(
  color: AcCmColor | undefined,
  isModelSpace: boolean
): number {
  const rgb = color?.RGB
  if (rgb != null) {
    return rgb
  }
  return isModelSpace
    ? ACGI_MODEL_SPACE_BACKGROUND
    : ACGI_PAPER_SPACE_BACKGROUND
}

/**
 * Reads the layout background colour from the database for the given space.
 *
 * Looks up `MODELBKCOLOR` or `PAPERBKCOLOR` (via
 * {@link layoutBackgroundSysVar}) through {@link AcDbSysVarManager}, then
 * converts the {@link AcCmColor} result to a packed RGB value with
 * {@link canvasBackgroundFromColor}.
 *
 * @param database - Drawing database whose sysvars are read.
 * @param isModelSpace - `true` to read model-space background; `false` to read
 *   paper-space background.
 * @returns Packed 24-bit RGB canvas background colour.
 *
 * @example
 * ```typescript
 * const bg = readLayoutBackgroundColor(database, true)
 * renderer.setClearColor(bg)
 * ```
 *
 * @see {@link AcTrView2d.syncDisplaySysVars} — applies this on document open
 */
export function readLayoutBackgroundColor(
  database: AcDbDatabase,
  isModelSpace: boolean
): number {
  const sysVar = layoutBackgroundSysVar(isModelSpace)
  const color = AcDbSysVarManager.instance().getVar(
    sysVar,
    database
  ) as AcCmColor
  return canvasBackgroundFromColor(color, isModelSpace)
}

/**
 * Toggles a layout background colour between black and white.
 *
 * Inspects the current colour's perceived luminance via
 * {@link acgiIsLightBackground} and returns a new {@link AcCmColor} set to pure
 * black (`RGB 0, 0, 0`) when the input is light, or pure white
 * (`RGB 255, 255, 255`) when the input is dark. If the source colour has no
 * RGB component, {@link ACGI_MODEL_SPACE_BACKGROUND} is used as the luminance
 * reference.
 *
 * Used by {@link AcApSwitchBgCmd} to flip `MODELBKCOLOR` / `PAPERBKCOLOR`
 * without disturbing other colour fields on the sysvar.
 *
 * @param color - Current layout background colour from the database sysvar.
 * @returns New `AcCmColor` with `AcCmColorMethod.ByColor` and inverted
 *   black/white RGB.
 *
 * @example
 * ```typescript
 * const next = toggleBlackWhiteBackgroundColor(currentColor)
 * sysVarManager.setVar(variableName, next, database)
 * ```
 *
 * @see {@link AcApSwitchBgCmd}
 */
export function toggleBlackWhiteBackgroundColor(color: AcCmColor): AcCmColor {
  const rgb = color.RGB ?? ACGI_MODEL_SPACE_BACKGROUND
  const next = new AcCmColor(AcCmColorMethod.ByColor)
  if (acgiIsLightBackground(rgb)) {
    next.setRGB(0, 0, 0)
  } else {
    next.setRGB(255, 255, 255)
  }
  return next
}

/**
 * Chooses a CSS cursor colour that contrasts with the canvas background.
 *
 * Returns `'black'` on light backgrounds and `'white'` on dark backgrounds so
 * the crosshair and other SVG/CSS cursors remain visible. The decision is
 * delegated to {@link acgiIsLightBackground}.
 *
 * @param backgroundColor - Current renderer clear colour as packed
 *   `0xRRGGBB` RGB.
 * @returns `'black'` or `'white'` for use as a CSS colour keyword.
 *
 * @example
 * ```typescript
 * const cursor = cursorColorForBackground(view.backgroundColor)
 * editor.setCursorColor(cursor)
 * ```
 *
 * @see {@link AcEdCursorManager.syncCursorBackground}
 */
export function cursorColorForBackground(
  backgroundColor: number
): 'white' | 'black' {
  return acgiIsLightBackground(backgroundColor) ? 'black' : 'white'
}
