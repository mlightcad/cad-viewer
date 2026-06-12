import type { ManualChunksOption, OutputOptions } from 'rollup'

/** Export plugins with a separate lazy `/register` entry. */
export const PLUGIN_PACKAGE_IDS = [
  'cad-pdf-plugin',
  'cad-html-plugin',
  'cad-svg-plugin'
] as const

/** Core viewer libraries shipped from this monorepo. */
export const VIEWER_PACKAGE_IDS = [
  'cad-simple-viewer',
  'cad-viewer',
  'three-renderer'
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

/**
 * Groups monorepo packages into predictable Rollup chunks for example app builds.
 */
export const exampleManualChunks: ManualChunksOption = (id: string) => {
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

  for (const packageId of VIEWER_PACKAGE_IDS) {
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

/** @deprecated Use {@link createLibEntryFileName}. */
export const createPluginEntryFileName = createLibEntryFileName

export function createLibChunkFileName(packageId: string): string {
  return `${packageId}-[name]-[hash].js`
}

/** @deprecated Use {@link createLibChunkFileName}. */
export const createPluginChunkFileName = createLibChunkFileName

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

/** @deprecated Use {@link createLibManualChunks}. */
export const createPluginLibManualChunks = createLibManualChunks

export function createLibRollupOutput(packageId: string): OutputOptions {
  return {
    manualChunks: createLibManualChunks(packageId),
    chunkFileNames: createLibChunkFileName(packageId)
  }
}

/** @deprecated Use {@link createLibRollupOutput}. */
export const createPluginLibRollupOutput = createLibRollupOutput
