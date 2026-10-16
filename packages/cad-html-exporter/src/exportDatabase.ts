import type { AcDbDatabase } from '@mlightcad/data-model'

import { convertDatabaseToSnapshot } from './convertDatabase'
import type {
  AcExHtmlExporterOptions,
  AcExHtmlExportResult
} from './exportOptions'
import { packSnapshot } from './packSnapshot'

/**
 * Converts an already-open {@link AcDbDatabase} to offline HTML or a package zip.
 */
export async function exportDatabaseToHtml(
  database: AcDbDatabase,
  options: AcExHtmlExporterOptions = {}
): Promise<AcExHtmlExportResult> {
  const tConvert = performance.now()
  const snapshot = await convertDatabaseToSnapshot(database, options)
  const convertMs = performance.now() - tConvert

  const baseName = sanitizeBaseName(options.title ?? 'drawing')
  const tPack = performance.now()
  const result = await packSnapshot(snapshot, options, baseName)
  const packMs = performance.now() - tPack

  console.info(
    `[cad-html-exporter] export timings: convert=${convertMs.toFixed(0)}ms pack=${packMs.toFixed(0)}ms`
  )
  return result
}

function sanitizeBaseName(title: string): string {
  const stem = title.replace(/\.[^.]+$/, '')
  // eslint-disable-next-line no-control-regex -- strip Windows-illegal and C0 characters from filenames
  const cleaned = stem.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').trim()
  return cleaned || 'drawing'
}
