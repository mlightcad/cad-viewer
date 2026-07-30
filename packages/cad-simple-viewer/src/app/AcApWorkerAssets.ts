/**
 * Canonical filenames for Web Worker JS bundles used by the viewer.
 *
 * Keep these in one place so rename/migration is a single-file change.
 * Build scripts mirror these in: `tools/worker-assets.mjs`
 */

/** LibreDWG (GPL) DWG parser worker from `@mlightcad/libredwg-converter`. */
export const LIBREDWG_PARSER_WORKER_FILE = 'libredwg-parser-worker.js'

/** MTEXT layout/shaping worker from `@mlightcad/mtext-renderer`. */
export const MTEXT_RENDERER_WORKER_FILE = 'mtext-renderer-worker.js'

/**
 * Proprietary DWG parser worker from private package `@mlight-cad/dwg-converter`.
 * Not registered by default; used when the host app opts into that converter.
 */
export const DWG_PARSER_WORKER_FILE = 'dwg-parser-worker.js'

/** npm package that ships {@link LIBREDWG_PARSER_WORKER_FILE}. */
export const LIBREDWG_CONVERTER_PACKAGE = '@mlightcad/libredwg-converter'

/** npm package that ships {@link MTEXT_RENDERER_WORKER_FILE}. */
export const MTEXT_RENDERER_PACKAGE = '@mlightcad/mtext-renderer'

/** Private npm package that ships {@link DWG_PARSER_WORKER_FILE}. */
export const DWG_CONVERTER_PACKAGE = '@mlight-cad/dwg-converter'
