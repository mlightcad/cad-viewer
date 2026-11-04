/**
 * Shared PDF export logic for MLightCAD: option model, glyph provider and the
 * database → PDF pipeline. No dependency on `@mlightcad/cad-simple-viewer` or
 * the DOM, so both the browser plugin and the Node exporter consume it.
 *
 * @packageDocumentation
 */

export {
  acexPdfBuildRendererOptions,
  type AcExPdfDatabaseExportOptions,
  acexPdfExportDatabase,
  type AcExPdfFitBox
} from './AcExPdfDatabaseExport'
export {
  type AcExPdfColorMode,
  ACEXPDF_DEFAULT_EXPORT_OPTIONS,
  type AcExPdfExportOptions,
  type AcExPdfModelSpaceFit,
  acexPdfResolveExportOptions,
  type AcExPdfTextMode
} from './AcExPdfExportOptions'
export { acexPdfCreateGlyphProvider } from './AcExPdfGlyphProvider'
