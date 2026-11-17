/**
 * Host-tunable options for the PaddleOCR engine. Kept in the tiny `/register`
 * chunk so hosts can set `wasmPaths` before the main (and PaddleOCR.js) load.
 */

/** Options passed to {@link acapPaddleOcrConfigure}. */
export interface AcApPaddleOcrOptions {
  /**
   * Same-origin directory that serves ONNX Runtime Web WASM files
   * (`ort-wasm-simd-threaded.mjs` / `.wasm`, …), with a trailing slash.
   * Required for reliable worker-mode inference; demos typically use
   * `./vendor/onnxruntime/` (resolved against `document.baseURI` so it stays
   * correct when the page uses Vite `base: './'`).
   */
  wasmPaths?: string
}

let options: AcApPaddleOcrOptions = {}

/**
 * Sets PaddleOCR runtime options (for example ORT `wasmPaths`). Call from
 * {@link registerLazyPaddleOcrPlugin} or before the first OCR request.
 */
export function acapPaddleOcrConfigure(next: AcApPaddleOcrOptions): void {
  options = { ...options, ...next }
}

/** Current PaddleOCR runtime options. */
export function acapPaddleOcrGetOptions(): Readonly<AcApPaddleOcrOptions> {
  return options
}

/**
 * Absolute URL of {@link AcApPaddleOcrOptions.wasmPaths} for ORT.
 *
 * Relative paths (`./vendor/onnxruntime/`) are resolved against
 * `document.baseURI`. Without that, ORT would resolve them against the
 * importing module under `/assets/…` and look for
 * `/assets/vendor/onnxruntime/…`, which 404s.
 */
export function acapPaddleOcrResolvedWasmPaths(): string | undefined {
  const wasmPaths = options.wasmPaths?.trim()
  if (!wasmPaths) return undefined
  if (isAbsoluteUrlOrRootPath(wasmPaths)) return ensureTrailingSlash(wasmPaths)
  if (typeof document !== 'undefined' && document.baseURI) {
    return ensureTrailingSlash(new URL(wasmPaths, document.baseURI).href)
  }
  return ensureTrailingSlash(wasmPaths)
}

function isAbsoluteUrlOrRootPath(path: string): boolean {
  return (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path) ||
    /^[a-z][a-z0-9+.-]*:/i.test(path) ||
    path.startsWith('/')
  )
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`
}
