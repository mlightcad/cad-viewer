import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Loads the offline HTML viewer IIFE as a UTF-8 string for embedding.
 */
export async function loadViewerRuntime(
  overridePath?: string
): Promise<string> {
  if (overridePath) {
    return readFile(overridePath, 'utf8')
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(here, '../runtime/viewer-runtime.iife.js'),
    resolve(here, '../../runtime/viewer-runtime.iife.js'),
    resolve(
      here,
      '../../cad-html-plugin/dist/viewer-runtime.iife.js'
    )
  ]

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8')
    } catch {
      // try next
    }
  }

  throw new Error(
    'viewer-runtime.iife.js not found. Build @mlightcad/cad-html-plugin ' +
      '(and @mlightcad/cad-html-exporter) or pass viewerRuntimePath.'
  )
}
