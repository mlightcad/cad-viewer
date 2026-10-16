import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import {
  AcDbDatabase,
  AcDbFileType,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import { exportDatabaseToHtml } from './exportDatabase'
import type {
  AcExHtmlExporterOptions,
  AcExHtmlExportResult
} from './exportOptions'
import { ensureLibreDwgRegistered } from './registerDwg'
import { writePackageDirectory } from './writePackageDirectory'

/**
 * Reads a DXF/DWG from disk, converts it, and writes HTML, a zip package, or
 * an unzipped multi-file folder.
 *
 * For `exportFormat: 'multi'` with `zipPackage: false`, `outputPath` is the
 * output folder (created if missing). Otherwise it is the `.html` or `.zip` file.
 *
 * @returns The in-memory export result (also written to `outputPath`).
 */
export async function exportFileToHtml(
  inputPath: string,
  outputPath: string,
  options: AcExHtmlExporterOptions = {}
): Promise<AcExHtmlExportResult> {
  ensureLibreDwgRegistered()

  const tRead = performance.now()
  const bytes = await readFile(inputPath)
  const ext = extname(inputPath).toLowerCase()
  const fileType = ext === '.dwg' ? AcDbFileType.DWG : AcDbFileType.DXF

  // Node Buffer → standalone ArrayBuffer (matches browser FileReader payloads).
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )

  const database = new AcDbDatabase()
  // Hatch / entity conversion falls back to the host working database before
  // entities are bound — set it explicitly for Node (no viewer DocManager).
  const host = acdbHostApplicationServices()
  const previousDatabase = host.workingDatabase
  host.workingDatabase = database
  try {
    await database.read(buffer, { fileName: basename(inputPath) }, fileType)
    const readMs = performance.now() - tRead

    const title = options.title ?? basename(inputPath).replace(/\.[^.]+$/, '')
    const result = await exportDatabaseToHtml(database, {
      ...options,
      title
    })

    const tWrite = performance.now()
    if (result.kind === 'html' && result.html != null) {
      await writeFile(outputPath, result.html, 'utf8')
    } else if (result.kind === 'zip' && result.zipBytes != null) {
      await writeFile(outputPath, result.zipBytes)
    } else if (result.kind === 'directory' && result.files != null) {
      await writePackageDirectory(outputPath, result.files)
    } else {
      throw new Error('Export produced no output payload')
    }
    const writeMs = performance.now() - tWrite

    console.info(
      `[cad-html-exporter] file timings: read=${readMs.toFixed(0)}ms write=${writeMs.toFixed(0)}ms`
    )

    return result
  } finally {
    host.workingDatabase = previousDatabase
  }
}
