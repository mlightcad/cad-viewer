/**
 * Shared PDF export logic for MLightCAD: option model, glyph provider and the
 * database → PDF pipeline. No dependency on `@mlightcad/cad-simple-viewer` or
 * the DOM, so both the browser plugin and the Node exporter consume it.
 *
 * @packageDocumentation
 */

export {
  acPdBuildRendererOptions,
  type AcPdDatabaseExportOptions,
  acPdExportDatabase,
  type AcPdFitBox
} from './AcPdDatabaseExport'
export {
  type AcPdColorMode,
  ACPD_DEFAULT_EXPORT_OPTIONS,
  type AcPdExportOptions,
  type AcPdModelSpaceFit,
  acPdResolveExportOptions,
  type AcPdTextMode
} from './AcPdExportOptions'
export { acPdCreateGlyphProvider } from './AcPdGlyphProvider'
