#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const cliPath = path.resolve(
  rootDir,
  'packages/cad-html-exporter-cli/dist/cli.js'
)
const outputDir = path.resolve(__dirname, './public/self-contained-html')
const outputPath = path.join(outputDir, 'canteen.html')
const dwgUrl =
  'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg'
const dwgPath = path.join(outputDir, 'canteen.dwg')

if (!fs.existsSync(cliPath)) {
  console.error(
    'cad-html-exporter-cli is not built. Run "pnpm build" from the repo root first.'
  )
  process.exit(1)
}

await fs.promises.mkdir(outputDir, { recursive: true })

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

console.log('Exporting self-contained HTML demo…')
const { status, error } = spawnSync(
  process.execPath,
  [
    cliPath,
    dwgPath,
    '-o',
    outputPath,
    '--title',
    'Canteen (sample DWG)',
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

console.log(`Wrote ${outputPath}`)
