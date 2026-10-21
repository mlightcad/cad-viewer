import type { AcDbDatabase } from '@mlightcad/data-model'

import { convertDatabaseToSnapshot } from './convertDatabase'
import type {
  AcExHtmlExporterOptions,
  AcExHtmlExportResult
} from './exportOptions'
import { extractDrawingPreviewJpeg } from './extractPreviewJpeg'
import { packSnapshot } from './packSnapshot'

/**
 * Converts an already-open {@link AcDbDatabase} to offline HTML or a package zip.
 *
 * For multi-file packages, when the drawing provides a thumbnail
 * ({@link AcDbDatabase.thumbnailImage}), a `preview.jpg` is included next to
 * `viewer.html` (and inside the zip when {@link AcExHtmlExporterOptions.zipPackage}
 * is enabled).
 */
export async function exportDatabaseToHtml(
  database: AcDbDatabase,
  options: AcExHtmlExporterOptions = {}
): Promise<AcExHtmlExportResult> {
  const tConvert = performance.now()
  const snapshot = await convertDatabaseToSnapshot(database, options)
  const convertMs = performance.now() - tConvert

  const exportFormat = options.exportFormat === 'multi' ? 'multi' : 'single'
  const previewJpeg =
    exportFormat === 'multi'
      ? extractDrawingPreviewJpeg(database.thumbnailImage)
      : undefined
  if (exportFormat === 'multi') {
    if (previewJpeg?.length) {
      console.info(
        `[cad-html-exporter] preview.jpg: ${previewJpeg.byteLength} bytes (from drawing thumbnail)`
      )
    } else {
      console.info(
        '[cad-html-exporter] preview.jpg: skipped (drawing has no usable thumbnailImage)'
      )
    }
  }

  const baseName = sanitizeBaseName(options.title ?? 'drawing')
  const tPack = performance.now()
  const result = await packSnapshot(snapshot, options, baseName, previewJpeg)
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
