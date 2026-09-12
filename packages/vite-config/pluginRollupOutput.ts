import { createRequire } from 'node:module'

import type { ManualChunksOption, OutputOptions } from 'rollup'
import type { Alias } from 'vite'

function resolvePackageEntry(
  req: NodeRequire,
  name: string
): string | undefined {
  try {
    return req.resolve(name)
  } catch {
    return undefined
  }
}

/**
 * Resolves peer packages from the example app so nested imports inside
 * `cad-pdf-plugin/dist` (pnpm isolation) still bundle.
 *
 * Resolve the package entry (`require.resolve(name)`), not `name/package.json`:
 * many `@mlightcad/*` packages omit `package.json` from `exports`.
 */
export function examplePeerPackageAliases(fromPackageDir: string): Alias[] {
  const require = createRequire(fromPackageDir + '/package.json')
  const fallbackRequire = createRequire(
    fromPackageDir + '/../cad-simple-viewer/package.json'
  )
  const names = [
    '@mlightcad/mtext-renderer',
    '@mlightcad/three-renderer',
    'three'
  ] as const
  const aliases: Alias[] = []
  for (const name of names) {
    const direct = resolvePackageEntry(require, name)
    const fallback = direct
      ? undefined
      : resolvePackageEntry(fallbackRequire, name)
    const replacement = direct ?? fallback
    if (!replacement) {
      continue
    }
    aliases.push({
      find: name === 'three' ? /^three$/ : name,
      replacement
    })
  }
  return aliases
}

/** Export plugins with a separate lazy `/register` entry. */
export const PLUGIN_PACKAGE_IDS = [
  'cad-pdf-plugin',
  'cad-html-plugin',
  'cad-svg-plugin',
  'cad-simple-ui-plugin',
  'cad-agent-plugin'
] as const

/** Core viewer libraries shipped from this monorepo. */
export const VIEWER_PACKAGE_IDS = [
  'cad-simple-viewer',
  'cad-diff-viewer',
  'cad-viewer',
  'three-renderer'
] as const

/**
 * data-model and its tightly coupled packages — keep together to avoid
 * cross-chunk "extends undefined" for class hierarchies.
 */
export const DATA_MODEL_PACKAGE_IDS = [
  'data-model',
  'geometry-engine',
  'graphic-interface',
  'common'
] as const

/**
 * Packages that stay with the three-renderer chunk (text/rendering stack).
 * three and data-model are split out separately for clearer caching.
 */
export const THREE_RENDERER_STACK_IDS = [
  'three-renderer',
  'mtext-renderer',
  'mtext-parser',
  'shx-parser'
] as const

function isPluginRegisterModule(id: string, pluginId: string): boolean {
  return (
    id.includes(`${pluginId}/register`) ||
    id.includes(`${pluginId}\\register`) ||
    id.includes(`${pluginId}/dist/register.`) ||
    id.includes(`${pluginId}\\dist\\register.`) ||
    id.includes(`${pluginId}-register`)
  )
}

function matchMonorepoPackage(id: string, packageId: string): boolean {
  const normalized = id.replace(/\\/g, '/')
  return (
    normalized.includes(`/packages/${packageId}/`) ||
    normalized.includes(`/node_modules/@mlightcad/${packageId}/`) ||
    normalized.includes(`@mlightcad/${packageId}/`) ||
    normalized.includes(`@mlightcad/${packageId}`)
  )
}

/** Match the `three` package without catching `three-renderer` / `@types/three`. */
function matchThreePackage(id: string): boolean {
  const normalized = id.replace(/\\/g, '/')
  if (
    normalized.includes('three-renderer') ||
    normalized.includes('@types/three')
  ) {
    return false
  }
  return (
    normalized.includes('/node_modules/three/') ||
    normalized.includes('/node_modules/.pnpm/three@') ||
    /(?:^|\/)three\/(?:build|examples)\//.test(normalized)
  )
}

/**
 * Groups monorepo packages into predictable Rollup chunks for example app builds.
 */
export const exampleManualChunks: ManualChunksOption = (id: string) => {
  if (
    matchMonorepoPackage(id, 'pdf-renderer') ||
    /(?:^|\/)pdf-lib(?:\/|$)/.test(id.replace(/\\/g, '/'))
  ) {
    return 'cad-pdf-plugin'
  }

  for (const pluginId of PLUGIN_PACKAGE_IDS) {
    if (!matchMonorepoPackage(id, pluginId)) {
      continue
    }
    // Register stubs are tiny; keep them in the app entry to avoid circular chunks
    // with cad-simple-viewer (register imports plugin manager types from it).
    if (isPluginRegisterModule(id, pluginId)) {
      return undefined
    }
    return pluginId
  }

  if (matchThreePackage(id)) {
    return 'three'
  }

  for (const packageId of DATA_MODEL_PACKAGE_IDS) {
    if (matchMonorepoPackage(id, packageId)) {
      return 'data-model'
    }
  }

  for (const packageId of THREE_RENDERER_STACK_IDS) {
    if (matchMonorepoPackage(id, packageId)) {
      return 'three-renderer'
    }
  }

  for (const packageId of VIEWER_PACKAGE_IDS) {
    if (packageId === 'three-renderer') {
      continue
    }
    if (matchMonorepoPackage(id, packageId)) {
      return packageId
    }
  }
}

/** Rollup output options shared by cad-*-viewer-example apps. */
export const exampleRollupOutput: OutputOptions = {
  manualChunks: exampleManualChunks,
  chunkFileNames: 'assets/[name]-[hash].js',
  entryFileNames: 'assets/[name]-[hash].js',
  assetFileNames: 'assets/[name]-[hash][extname]'
}

export function createLibEntryFileName(
  packageId: string,
  format: string,
  entryName = 'index'
): string {
  const base = entryName === 'register' ? `${packageId}-register` : packageId
  return format === 'es' ? `${base}.js` : `${base}.umd.cjs`
}

export function createLibChunkFileName(packageId: string): string {
  return `${packageId}-[name]-[hash].js`
}

/**
 * Merges all code for a library entry into a single `{packageId}` chunk
 * (optional `{packageId}-register` when a register entry exists).
 */
export function createLibManualChunks(packageId: string): ManualChunksOption {
  return (id: string) => {
    if (/[\\/]register\.ts$/.test(id)) {
      return `${packageId}-register`
    }
    return packageId
  }
}

export function createLibRollupOutput(packageId: string): OutputOptions {
  return {
    manualChunks: createLibManualChunks(packageId),
    chunkFileNames: createLibChunkFileName(packageId)
  }
}
