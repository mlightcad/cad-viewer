#!/usr/bin/env node
/**
 * Recursively scan a directory for .dwg / .dxf files, export each to a
 * multi-file ACEX zip + zoom-extents PNG via export-html-multi-preview.scr,
 * then arrange outputs in the demo-drawings package layout:
 *
 *   <outputDir>/<folder>/
 *     drawing.acex.json
 *     chunks/
 *     preview.jpg
 *     drawing.dwg | drawing.dxf
 *
 * Folder names match demo-drawings: the path relative to <inputDir> without
 * extension, with path separators turned into underscores. Same-stem
 * `.dwg`/`.dxf` pairs get a `_dwg` / `_dxf` suffix so they do not collide.
 *
 * Usage (from packages/cad-simple-viewer-cli after build):
 *   node examples/batch-export-html-multi-preview.mjs <inputDir> <outputDir>
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const cliJs = path.join(packageRoot, 'dist', 'cli.js')
const scriptPath = path.join(__dirname, 'export-html-multi-preview.scr')

const DRAWING_EXT = new Set(['.dwg', '.dxf'])

/** True when `child` is `parent` or a path under it. */
function isPathInside(parent, child) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

async function collectDrawings(dir, out = [], excludeDir) {
  if (excludeDir && isPathInside(excludeDir, dir)) {
    return out
  }
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectDrawings(full, out, excludeDir)
    } else if (DRAWING_EXT.has(path.extname(entry.name).toLowerCase())) {
      if (!(excludeDir && isPathInside(excludeDir, full))) {
        out.push(full)
      }
    }
  }
  return out
}

/**
 * demo-drawings-style folder name from a path relative to inputDir.
 * `used` tracks claimed names so same-stem DWG/DXF pairs stay unique.
 */
function drawingFolderName(inputDir, drawingPath, used) {
  const rel = path.relative(inputDir, drawingPath)
  const ext = path.extname(rel).toLowerCase()
  const withoutExt = ext ? rel.slice(0, -ext.length) : rel
  const base = withoutExt
    .split(/[/\\]/)
    .filter(Boolean)
    .join('_')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
  const extTag = ext.replace(/^\./, '') || 'bin'

  let name = base
  if (used.has(name)) {
    name = `${base}_${extTag}`
  }
  let n = 2
  while (used.has(name)) {
    name = `${base}_${extTag}_${n++}`
  }
  used.add(name)
  return name
}

function runCli(input, outputDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        cliJs,
        '-i',
        input,
        '-s',
        scriptPath,
        '-o',
        outputDir,
        '--mode',
        'read'
      ],
      { stdio: 'inherit' }
    )
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `cad-simple-viewer-cli exited with code ${code} for ${input}`
          )
        )
    })
  })
}

function unzipWithTar(zipPath, destDir) {
  const result = spawnSync(
    'tar',
    ['-xf', zipPath, '-C', destDir],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) {
    throw new Error(
      `Failed to unzip ${zipPath}: ${result.stderr || result.stdout || 'tar error'}`
    )
  }
}

async function pngToJpeg(page, pngPath, jpegPath, quality = 0.85) {
  const pngBytes = await readFile(pngPath)
  const jpegB64 = await page.evaluate(
    async ({ b64, q }) => {
      const res = await fetch(`data:image/png;base64,${b64}`)
      const blob = await res.blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const dataUrl = canvas.toDataURL('image/jpeg', q)
      return dataUrl.slice(dataUrl.indexOf(',') + 1)
    },
    { b64: pngBytes.toString('base64'), q: quality }
  )
  await writeFile(jpegPath, Buffer.from(jpegB64, 'base64'))
}

async function packageDrawing(workDir, targetDir, sourceDrawing, page) {
  const entries = await readdir(workDir)
  const zipName = entries.find(name => name.toLowerCase().endsWith('.zip'))
  const pngName = entries.find(name => name.toLowerCase().endsWith('.png'))
  if (!zipName) {
    throw new Error(`No .zip produced in ${workDir}`)
  }
  if (!pngName) {
    throw new Error(`No .png preview produced in ${workDir}`)
  }

  // Stage under the same parent as targetDir so rename stays on one volume.
  const stageDir = await mkdtemp(
    path.join(path.dirname(targetDir), '.cad-cli-pack-')
  )
  try {
    unzipWithTar(path.join(workDir, zipName), stageDir)

    await pngToJpeg(
      page,
      path.join(workDir, pngName),
      path.join(stageDir, 'preview.jpg')
    )

    const ext = path.extname(sourceDrawing).toLowerCase()
    const destName = ext === '.dxf' ? 'drawing.dxf' : 'drawing.dwg'
    await copyFile(sourceDrawing, path.join(stageDir, destName))

    await rm(targetDir, { recursive: true, force: true })
    await rename(stageDir, targetDir)
  } catch (error) {
    await rm(stageDir, { recursive: true, force: true })
    throw error
  }
}

async function main() {
  const inputDir = path.resolve(process.argv[2] ?? '')
  const outputDir = path.resolve(process.argv[3] ?? '')

  if (!process.argv[2] || !process.argv[3] || !existsSync(inputDir)) {
    console.error(
      'Usage: node examples/batch-export-html-multi-preview.mjs <inputDir> <outputDir>'
    )
    process.exitCode = 1
    return
  }
  if (!existsSync(cliJs)) {
    console.error(
      'CLI not built. Run: pnpm --filter @mlightcad/cad-simple-viewer-cli build'
    )
    process.exitCode = 1
    return
  }
  if (!existsSync(scriptPath)) {
    console.error(`Missing script: ${scriptPath}`)
    process.exitCode = 1
    return
  }

  await mkdir(outputDir, { recursive: true })
  // Skip anything already under outputDir so a nested out/ does not re-scan
  // packaged drawing.dwg / drawing.dxf copies on later runs.
  const drawings = await collectDrawings(inputDir, [], outputDir)
  if (!drawings.length) {
    console.error(`No .dwg/.dxf files found under ${inputDir}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Found ${drawings.length} drawing(s). Output (demo-drawings layout): ${outputDir}`
  )

  const browser = await chromium.launch()
  const page = await browser.newPage()
  const usedFolders = new Set()
  let failed = 0

  try {
    for (const drawing of drawings) {
      const folder = drawingFolderName(inputDir, drawing, usedFolders)
      const targetDir = path.join(outputDir, folder)
      console.log(`\n=== ${drawing} → ${folder}/ ===`)

      const workDir = await mkdtemp(path.join(os.tmpdir(), 'cad-cli-demo-'))
      try {
        await runCli(drawing, workDir)
        await packageDrawing(workDir, targetDir, drawing, page)
        console.log(`Packaged ${targetDir}`)
      } catch (error) {
        failed++
        console.error(error instanceof Error ? error.message : String(error))
      } finally {
        await rm(workDir, { recursive: true, force: true })
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\nDone. success=${drawings.length - failed} failed=${failed}`)
  if (failed) process.exitCode = 1
}

await main()
