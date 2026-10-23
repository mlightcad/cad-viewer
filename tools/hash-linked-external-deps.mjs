/**
 * Nx runtime input fingerprint for pnpm-linked packages that live outside this
 * workspace (see `pnpm-workspace.yaml` overrides → sibling checkouts such as
 * `realdwg-web` / `mtext-input-box`).
 *
 * Without this, editing/rebuilding a path-overridden package does not change
 * any Nx file `inputs` hash, so `pnpm build` / `pnpm preview` restore stale
 * cached `dist` until `pnpm clean` + `nx reset`.
 *
 * Discovers path / `file:` overrides from `pnpm-workspace.yaml` automatically
 * (plus a small fallback list), resolves whatever is actually linked under a
 * consumer's `node_modules` (junction/symlink), then fingerprints
 * `package.json` plus `lib/` and `dist/` via size + mtime (fast; enough to
 * detect rebuilds).
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

/**
 * Fallback names when overrides are temporarily version-pinned but a manual
 * junction may still be present. Path overrides from pnpm-workspace.yaml are
 * always included.
 */
const FALLBACK_LINKED_PACKAGES = [
  '@mlightcad/data-model',
  '@mlightcad/libredwg-converter',
  '@mlightcad/mtext-input-box',
  '@mlightcad/mtext-renderer',
  '@mlightcad/mtext-parser'
]

/**
 * Consumers known to depend on the linked packages; first existing link wins.
 * Paths are relative to the workspace root.
 */
const RESOLVE_FROM = [
  'packages/cad-viewer-example/node_modules',
  'packages/cad-viewer/node_modules',
  'packages/cad-simple-viewer/node_modules',
  'packages/three-renderer/node_modules',
  'node_modules'
]

/**
 * @param {string} value Override value from pnpm-workspace.yaml.
 * @returns {boolean} True when the override points at a local path / file: URL.
 */
function isLocalPathOverride(value) {
  const v = value.trim()
  if (!v) return false
  if (v.startsWith('file:')) return true
  if (v.startsWith('.') || v.startsWith('/') || v.startsWith('~')) return true
  if (/^[A-Za-z]:[\\/]/.test(v)) return true
  return false
}

/**
 * Reads package names whose override is a local path from pnpm-workspace.yaml.
 *
 * @returns {string[]} Package names with path / file: overrides.
 */
function readPathOverridePackageNames() {
  const yamlPath = join(workspaceRoot, 'pnpm-workspace.yaml')
  if (!existsSync(yamlPath)) return []

  const text = readFileSync(yamlPath, 'utf8')
  const lines = text.split(/\r?\n/)
  const names = []
  let inOverrides = false

  for (const line of lines) {
    if (/^overrides:\s*$/.test(line)) {
      inOverrides = true
      continue
    }
    if (inOverrides) {
      if (/^[^\s#]/.test(line) && !/^\s*$/.test(line)) {
        // Next top-level key — end of overrides block.
        break
      }
      const match = line.match(
        /^\s*['"](@[^'"]+|[^'":]+)['"]\s*:\s*['"]([^'"]+)['"]\s*$/
      )
      if (match && isLocalPathOverride(match[2])) {
        names.push(match[1])
      }
    }
  }

  return names
}

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

/**
 * True when `root` is outside this monorepo (or a different drive), i.e. a
 * sibling checkout rather than the published copy under `.pnpm`.
 *
 * @param {string} root Absolute package root.
 * @returns {boolean}
 */
function isOutsideWorkspace(root) {
  const normalizedRoot = root.replace(/\\/g, '/').toLowerCase()
  const normalizedWorkspace = workspaceRoot.replace(/\\/g, '/').toLowerCase()
  return (
    normalizedRoot !== normalizedWorkspace &&
    !normalizedRoot.startsWith(`${normalizedWorkspace}/`)
  )
}

const linkedNames = [
  ...new Set([...readPathOverridePackageNames(), ...FALLBACK_LINKED_PACKAGES])
].sort()

const hash = createHash('sha256')
hash.update(`workspace:${workspaceRoot}\n`)

for (const packageName of linkedNames) {
  const root = resolveLinkedPackage(packageName)
  if (!root) {
    hash.update(`missing:${packageName}\n`)
    continue
  }

  // Version-pinned registry installs live under the workspace store; skip so
  // normal dependency bumps still go through pnpm-lock.yaml / package.json.
  // Path overrides resolve to sibling repos outside the workspace.
  if (!isOutsideWorkspace(root)) {
    hash.update(`in-workspace:${packageName}\n`)
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
