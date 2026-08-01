/**
 * Canonical filenames for Web Worker JS bundles shipped with the viewer.
 *
 * Keep these in one place so rename/migration is a single-file change.
 * Runtime TypeScript mirrors these in:
 *   packages/cad-simple-viewer/src/app/AcApWorkerAssets.ts
 */

/** LibreDWG (GPL) DWG parser worker from `@mlightcad/libredwg-converter`. */
export const LIBREDWG_PARSER_WORKER_FILE = 'libredwg-parser-worker.js'

/** MTEXT layout/shaping worker from `@mlightcad/mtext-renderer`. */
export const MTEXT_RENDERER_WORKER_FILE = 'mtext-renderer-worker.js'

/**
 * Proprietary DWG parser worker from private package `@mlight-cad/dwg-converter`.
 * Optional — copied only when that package is resolvable (e.g. via local
 * pnpm-workspace override).
 */
export const DWG_PARSER_WORKER_FILE = 'dwg-parser-worker.js'

/**
 * Proprietary DWG parser main-thread module from `@mlight-cad/dwg-converter`.
 * Used when parsing DWG on the main thread instead of a Web Worker.
 */
export const DWG_PARSER_MAIN_FILE = 'dwg-parser-main.js'

export const LIBREDWG_CONVERTER_PACKAGE = '@mlightcad/libredwg-converter'
export const MTEXT_RENDERER_PACKAGE = '@mlightcad/mtext-renderer'
export const DWG_CONVERTER_PACKAGE = '@mlight-cad/dwg-converter'
