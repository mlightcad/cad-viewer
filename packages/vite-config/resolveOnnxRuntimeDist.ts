/**
 * Locates the `onnxruntime-web/dist` directory that ships ORT WASM assets
 * (`ort-wasm-simd-threaded*.mjs` / `.wasm`) for Vite static-copy.
 *
 * `onnxruntime-web` does not export `package.json`, so `require.resolve` of
 * that subpath fails on Node 20+. Resolve the package entry instead, and fall
 * back to the workspace `cad-paddleocr-plugin` install.
 */

import { existsSync } from 'fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'path'

/** Marker file that PaddleOCR's wasm backend loads. */
const ORT_WASM_MARKER = 'ort-wasm-simd-threaded.jsep.mjs'

/**
 * @param fromDir - Absolute path of the demo package root (usually `__dirname`
 *   of its `vite.config.ts`).
 * @returns Absolute path to `onnxruntime-web/dist` with forward slashes, or
 *   `undefined` when missing. Callers build static-copy globs from it
 *   (`${dir}/ort-wasm*`); a Windows `D:\...` path would make the glob engine
 *   read the backslashes as escapes and match nothing.
 */
export function resolveOnnxRuntimeDist(fromDir: string): string | undefined {
  const require = createRequire(resolve(fromDir, 'package.json'))
  const paddleRoot = resolve(fromDir, '../cad-paddleocr-plugin')
  const candidates: string[] = []

  for (const paths of [[fromDir], [paddleRoot]] as string[][]) {
    try {
      candidates.push(dirname(require.resolve('onnxruntime-web', { paths })))
    } catch {
      // Optional peer / nested install.
    }
  }

  candidates.push(
    resolve(fromDir, 'node_modules/onnxruntime-web/dist'),
    resolve(paddleRoot, 'node_modules/onnxruntime-web/dist')
  )

  for (const dir of candidates) {
    if (existsSync(resolve(dir, ORT_WASM_MARKER))) {
      return dir.replace(/\\/g, '/')
    }
  }
  return undefined
}
