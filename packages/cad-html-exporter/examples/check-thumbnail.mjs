#!/usr/bin/env node
/**
 * Check DWG thumbnail via LibreDWG bmp vs multi-export preview.jpg.
 *
 *   node examples/check-thumbnail.mjs drawing.dwg
 */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  ensureLibreDwgRegistered,
  exportFileToHtml
} from '../dist/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const umd = require.resolve('@mlightcad/libredwg-web', { paths: [join(here, '..')] })
const esm = join(dirname(umd), 'libredwg-web.js')
const mod = await import(pathToFileURL(esm).href)
const { Dwg_File_Type, LibreDwg } = mod.LibreDwg ? mod : mod.default

const input = process.argv[2]
if (!input) {
  console.error('Usage: node examples/check-thumbnail.mjs <file.dwg>')
  process.exit(1)
}
if (extname(input).toLowerCase() !== '.dwg') {
  console.error('This check currently supports .dwg only')
  process.exit(1)
}

const bytes = await readFile(input)
const buffer = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength
)

const libredwg = await LibreDwg.create()
const ptr = libredwg.dwg_read_data(buffer.slice(0), Dwg_File_Type.DWG)
try {
  const libreThumb = libredwg.dwg_bmp(ptr)?.data ?? null
  const converted = libredwg.convertEx(ptr)
  console.log(
    JSON.stringify(
      {
        file: basename(input),
        libreDwg_bmpBytes: libreThumb?.length ?? 0,
        convertExThumbnailBytes:
          converted.database?.thumbnailImage?.length ?? 0
      },
      null,
      2
    )
  )
} finally {
  libredwg.dwg_free(ptr)
}

ensureLibreDwgRegistered()
const outDir = await mkdtemp(join(tmpdir(), 'acex-preview-'))
try {
  const result = await exportFileToHtml(input, outDir, {
    exportFormat: 'multi',
    zipPackage: false,
    ...(process.env.CAD_FONTS_DIR
      ? { fontsDir: process.env.CAD_FONTS_DIR }
      : {})
  })
  const names = await readdir(outDir)
  console.log(
    JSON.stringify(
      {
        exportKind: result.kind,
        outputFiles: names,
        hasPreviewJpg: names.includes('preview.jpg')
      },
      null,
      2
    )
  )
} finally {
  await rm(outDir, { recursive: true, force: true })
}
