/**
 * Canonical filenames for Web Worker JS bundles used by the viewer.
 *
 * Keep these in one place so rename/migration is a single-file change.
 * Build scripts mirror these in: `tools/worker-assets.mjs`
 *
 * LibreDWG constants below are naming helpers only: this MIT package does
 * **not** depend on, ship, or register `@mlightcad/libredwg-converter`. Hosts
 * that opt into DWG support can import these names when deploying that
 * package's worker + wasm.
 */

/**
 * LibreDWG (GPL) DWG parser worker from `@mlightcad/libredwg-converter`.
 * Not shipped or registered by this package — host opt-in only.
 */
export const LIBREDWG_PARSER_WORKER_FILE = 'libredwg-parser-worker.js'

/**
 * LibreDWG wasm sibling of {@link LIBREDWG_PARSER_WORKER_FILE}.
 * Must be deployed next to the worker (wasm is not inlined).
 */
export const LIBREDWG_PARSER_WASM_FILE = 'libredwg-web.wasm'

/** MTEXT layout/shaping worker from `@mlightcad/mtext-renderer`. */
export const MTEXT_RENDERER_WORKER_FILE = 'mtext-renderer-worker.js'

/**
 * Proprietary DWG parser worker from private package `@mlight-cad/dwg-converter`.
 * Not registered by default; used when the host app opts into that converter.
 */
export const DWG_PARSER_WORKER_FILE = 'dwg-parser-worker.js'

/**
 * Proprietary DWG parser main-thread module from `@mlight-cad/dwg-converter`.
 * Used when parsing DWG on the main thread instead of a Web Worker.
 */
export const DWG_PARSER_MAIN_FILE = 'dwg-parser-main.js'

/** npm package that ships {@link LIBREDWG_PARSER_WORKER_FILE}. */
export const LIBREDWG_CONVERTER_PACKAGE = '@mlightcad/libredwg-converter'

/** npm package that ships {@link MTEXT_RENDERER_WORKER_FILE}. */
export const MTEXT_RENDERER_PACKAGE = '@mlightcad/mtext-renderer'

/** Private npm package that ships {@link DWG_PARSER_WORKER_FILE} / {@link DWG_PARSER_MAIN_FILE}. */
export const DWG_CONVERTER_PACKAGE = '@mlight-cad/dwg-converter'
