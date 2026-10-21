/**
 * Nx runtime input fingerprint for pnpm-linked packages that live outside this
 * workspace (see `pnpm-workspace.yaml` overrides → sibling `realdwg-web`).
 *
 * Without this, editing/rebuilding `@mlightcad/data-model` (or
 * `@mlightcad/libredwg-converter`) does not change any Nx `inputs` hash, so
 * `pnpm build` restores stale cached `dist` and `pnpm preview` serves old
 * bundles until `pnpm clean` + `nx reset`.
 *
 * Resolves whatever is actually linked under a consumer's `node_modules`
 * (junction/symlink), then fingerprints `package.json` plus `lib/` and `dist/`
 * via size + mtime (fast; enough to detect rebuilds).
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Packages overridden to a local checkout outside this monorepo. */
const LINKED_PACKAGES = [
  '@mlightcad/data-model',
  '@mlightcad/libredwg-converter'
]

/**
 * Consumers known to depend on the linked packages; first existing link wins.
 * Paths are relative to the workspace root.
 */
const RESOLVE_FROM = [
  'packages/cad-viewer-example/node_modules',
  'packages/cad-viewer/node_modules',
  'packages/cad-simple-viewer/node_modules'
]

/**
 * Collects files under `dir`, skipping nested `node_modules`.
 *
 * @param {string} dir Directory to walk.
 * @param {string[]} [files] Accumulator.
 * @returns {string[]} Absolute file paths.
 */
function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walkFiles(path, files)
    } else {
      files.push(path)
    }
  }
  return files
}

/**
 * Resolves the on-disk install path for a linked package name.
 *
 * @param {string} packageName Package name (e.g. `@mlightcad/data-model`).
 * @returns {string | null} Absolute path to the package root, or null.
 */
function resolveLinkedPackage(packageName) {
  for (const base of RESOLVE_FROM) {
    const candidate = join(workspaceRoot, base, packageName)
    if (!existsSync(candidate)) continue
    try {
      return realpathSync(candidate)
    } catch {
      return candidate
    }
  }
  return null
}

const hash = createHash('sha256')

for (const packageName of LINKED_PACKAGES) {
  const root = resolveLinkedPackage(packageName)
  if (!root) {
    hash.update(`missing:${packageName}\n`)
    continue
  }

  hash.update(`${packageName}@${root}\n`)

  const packageJsonPath = join(root, 'package.json')
  if (existsSync(packageJsonPath)) {
    hash.update(readFileSync(packageJsonPath))
  }

  for (const subdir of ['lib', 'dist']) {
    for (const file of walkFiles(join(root, subdir))) {
      const { size, mtimeMs } = statSync(file)
      hash.update(`${file}\0${size}\0${mtimeMs}\n`)
    }
  }
}

process.stdout.write(hash.digest('hex'))
