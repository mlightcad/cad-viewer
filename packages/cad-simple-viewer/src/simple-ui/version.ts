/**
 * Semver for {@link AcApSimpleUiPlugin}.
 *
 * Kept as a TS constant (not `package.json`) so downstream `vue-tsc` can
 * typecheck this package without `resolveJsonModule`. Matches the
 * `@mlightcad/cad-simple-viewer` package version (workspace lockstep).
 */
export const ACUI_SIMPLE_UI_VERSION = '1.8.0-preview.3'
