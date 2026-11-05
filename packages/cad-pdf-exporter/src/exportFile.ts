import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import { AcDbDatabase, AcDbFileType } from '@mlightcad/data-model'

import { convertDatabaseToPdf } from './convertDatabase'
import type { AcPdfExporterOptions, AcPdfExportResult } from './exportOptions'
import { ensureDwgParserRegistered } from './registerDwg'
import { withWorkingDatabase } from './withWorkingDatabase'

/**
 * Reads a DXF/DWG from disk, converts it to PDF, and writes `outputPath`.
 *
 * DWG parsing defaults to LibreDWG. Pass `dwgParser: 'dwg'` to use the optional
 * commercial `@mlightcad/dwg-converter` (must be installed; see `dwgLicenseKey`).
 *
 * @param inputPath - `.dwg` or `.dxf` file
 * @param outputPath - `.pdf` file to write
 * @param options - Export options
 * @returns The PDF bytes and suggested file name
 */
export async function exportFileToPdf(
  inputPath: string,
  outputPath: string,
  options: AcPdfExporterOptions = {}
): Promise<AcPdfExportResult> {
  const tRead = performance.now()
  const bytes = await readFile(inputPath)
  const ext = extname(inputPath).toLowerCase()
  const fileType = ext === '.dwg' ? AcDbFileType.DWG : AcDbFileType.DXF

  // Only DWG needs a registered converter; DXF uses the built-in path.
  if (fileType === AcDbFileType.DWG) {
    await ensureDwgParserRegistered({
      dwgParser: options.dwgParser,
      dwgLicenseKey: options.dwgLicenseKey
    })
  }

  // Node Buffer → standalone ArrayBuffer (matches browser FileReader payloads).
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )

  const database = new AcDbDatabase()
  // Hatch / entity conversion falls back to the host working database before
  // entities are bound — set it explicitly for Node (no viewer DocManager).
  return withWorkingDatabase(database, async () => {
    // Match AcApDocManager / cad-editor: omit no-plot layers so PDF matches
    // what the viewer shows and what AutoCAD plots (not editor-screen extras).
    await database.read(
      buffer,
      {
        fileName: basename(inputPath),
        drawNoPlotLayers: options.drawNoPlotLayers === true
      },
      fileType
    )
    const readMs = performance.now() - tRead

    const title = options.title ?? basename(inputPath).replace(/\.[^.]+$/, '')
    const pdf = await convertDatabaseToPdf(database, { ...options, title })

    const tWrite = performance.now()
    await writeFile(outputPath, pdf)
    const writeMs = performance.now() - tWrite

    console.info(
      `[cad-pdf-exporter] file timings: read=${readMs.toFixed(0)}ms write=${writeMs.toFixed(0)}ms`
    )
    return { bytes: pdf, fileName: `${sanitizeBaseName(title)}.pdf` }
  })
}

function sanitizeBaseName(title: string): string {
  const stem = title.replace(/\.[^.]+$/, '')
  // eslint-disable-next-line no-control-regex -- strip Windows-illegal and C0 characters from filenames
  const cleaned = stem.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').trim()
  return cleaned || 'drawing'
}
