#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const cliPath = path.resolve(
  rootDir,
  'packages/cad-simple-viewer-cli/dist/cli.js'
)
const singleScriptPath = path.resolve(
  rootDir,
  'packages/cad-simple-viewer-cli/examples/export-html.scr'
)
const multiScriptPath = path.resolve(
  rootDir,
  'packages/cad-simple-viewer-cli/examples/export-html-multi.scr'
)
const outputDir = path.resolve(__dirname, './public/self-contained-html')
const singleHtmlPath = path.join(outputDir, 'canteen.html')
const multiZipPath = path.join(outputDir, 'canteen.zip')
const multiExtractDir = path.join(outputDir, 'canteen-progressive')
const multiViewerPath = path.join(multiExtractDir, 'viewer.html')
const dwgUrl =
  'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg'
const dwgPath = path.join(outputDir, 'canteen.dwg')

if (!fs.existsSync(cliPath)) {
  console.error(
    'cad-simple-viewer-cli is not built. Run "pnpm build" from the repo root first.'
  )
  process.exit(1)
}

for (const scriptPath of [singleScriptPath, multiScriptPath]) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`Export script not found: ${scriptPath}`)
    process.exit(1)
  }
}

await fs.promises.mkdir(outputDir, { recursive: true })

// Remove prior demo artifacts so the CLI does not write canteen-2.html / .zip
// when the expected names already exist.
for (const stale of [singleHtmlPath, multiZipPath, multiExtractDir]) {
  await fs.promises.rm(stale, { recursive: true, force: true })
}

if (!fs.existsSync(dwgPath)) {
  console.log(`Downloading sample drawing from ${dwgUrl}`)
  const response = await fetch(dwgUrl)
  if (!response.ok) {
    throw new Error(
      `Failed to download canteen.dwg (${response.status} ${response.statusText})`
    )
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  await fs.promises.writeFile(dwgPath, bytes)
}

function runExport(scriptPath, label) {
  console.log(`${label}…`)
  const { status, error } = spawnSync(
    process.execPath,
    [
      cliPath,
      '-i',
      dwgPath,
      '-s',
      scriptPath,
      '-o',
      outputDir,
      '--mode',
      'read',
      '--locale',
      'en'
    ],
    {
      stdio: 'inherit',
      env: process.env
    }
  )

  if (error) {
    console.error(error)
    process.exit(1)
  }

  if (status !== 0) {
    process.exit(status ?? 1)
  }
}

/**
 * Unzips an ACEX package archive into `destDir` so static hosts (GitHub Pages)
 * can serve viewer.html + progressive chunks without a zip download step.
 */
async function extractPackageZip(zipPath, destDir) {
  const zipBytes = new Uint8Array(await fs.promises.readFile(zipPath))
  const entries = unzipSync(zipBytes)

  await fs.promises.rm(destDir, { recursive: true, force: true })
  await fs.promises.mkdir(destDir, { recursive: true })

  for (const [entryPath, data] of Object.entries(entries)) {
    // Match cad-html-plugin isSafeZipPath: reject traversal, abs paths, and
    // non-[A-Za-z0-9._-] segments (also skips directory-only zip entries).
    const parts = entryPath.split('/')
    if (
      !entryPath ||
      entryPath.endsWith('/') ||
      entryPath.startsWith('/') ||
      entryPath.includes('\\') ||
      entryPath.includes('\0') ||
      !parts.every(
        part =>
          part.length > 0 &&
          part !== '.' &&
          part !== '..' &&
          /^[A-Za-z0-9._-]+$/.test(part)
      )
    ) {
      throw new Error(`Unsafe path in package archive: ${entryPath}`)
    }
    const destPath = path.join(destDir, entryPath)
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
    await fs.promises.writeFile(destPath, data)
  }
}

runExport(singleScriptPath, 'Exporting self-contained HTML demo')

if (!fs.existsSync(singleHtmlPath)) {
  console.error(`Expected output missing: ${singleHtmlPath}`)
  process.exit(1)
}
console.log(`Wrote ${singleHtmlPath}`)

runExport(multiScriptPath, 'Exporting multi-file progressive package zip')

if (!fs.existsSync(multiZipPath)) {
  console.error(`Expected output missing: ${multiZipPath}`)
  process.exit(1)
}
console.log(`Wrote ${multiZipPath}`)

console.log('Extracting progressive package for static hosting…')
await extractPackageZip(multiZipPath, multiExtractDir)

if (!fs.existsSync(multiViewerPath)) {
  console.error(`Expected output missing: ${multiViewerPath}`)
  process.exit(1)
}
console.log(`Wrote ${multiViewerPath}`)
