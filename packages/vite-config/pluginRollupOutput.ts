import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

import type { ManualChunksOption, OutputOptions } from 'rollup'
import type { Alias } from 'vite'

function resolvePackageEntry(
  req: NodeRequire,
  name: string
): string | undefined {
  try {
    // `require.resolve` follows the Node "require"/"main" condition, which for
    // our libraries is often `*.umd.cjs`. Vite example apps import with ESM
    // named exports, so prefer the sibling ESM build when present.
    const resolved = req.resolve(name)
    if (resolved.endsWith('.umd.cjs')) {
      const esm = resolved.slice(0, -'.umd.cjs'.length) + '.js'
      if (existsSync(esm)) {
        return esm
      }
    }
    // three 0.186's require export is build/three.cjs. That file calls
    // process.emitWarning when loaded, which throws in the browser.
    if (resolved.endsWith('.cjs')) {
      const esm = resolved.slice(0, -'.cjs'.length) + '.module.js'
      if (existsSync(esm)) {
        return esm
      }
    }
    return resolved
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
  'cad-agent-plugin',
  'cad-script-plugin',
  'cad-onedrive-plugin',
  'cad-google-drive-plugin'
] as const

/** Core viewer libraries shipped from this monorepo. */
export const VIEWER_PACKAGE_IDS = [
  'cad-simple-viewer',
  'cad-diff-viewer',
  'cad-editor',
  'three-renderer',
  'cad-html-core',
  'cad-agent-core',
  'cad-script-core'
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
  const normalized = id.replace(/\\/g, '/')

  // Keep Vite's preload helper in a tiny dedicated chunk. If it lands inside a
  // fat package chunk (cad-simple-viewer / cad-html-plugin / …), the landing
  // entry statically imports that whole chunk just for `__vitePreload`.
  if (
    id.startsWith('\0') ||
    normalized.includes('vite/preload') ||
    normalized.includes('modulepreload-polyfill') ||
    normalized.includes('commonjsHelpers')
  ) {
    return 'vite-runtime'
  }

  // Keep Element Plus out of the cad-editor chunk so landing pages that use
  // el-* without MlCadViewer do not download the full editor bundle.
  if (
    normalized.includes('/element-plus/') ||
    normalized.includes('/@element-plus/') ||
    normalized.includes('/element-plus@') ||
    normalized.includes('/@element-plus@')
  ) {
    return 'element-plus'
  }

  if (
    matchMonorepoPackage(id, 'pdf-renderer') ||
    /(?:^|\/)pdf-lib(?:\/|$)/.test(normalized)
  ) {
    return 'cad-pdf-plugin'
  }

  // Shared ACEX codecs / packagers ship with the HTML plugin chunk.
  if (matchMonorepoPackage(id, 'cad-html-core')) {
    return 'cad-html-plugin'
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
    if (packageId === 'cad-simple-viewer') {
      if (!matchMonorepoPackage(id, packageId)) {
        continue
      }
      // Keep the `/file-open-panel` subgraph in its own chunk so demo landing
      // pages can load it without pulling DocManager / three-renderer.
      if (isCadSimpleViewerFileOpenPanelModule(id)) {
        return 'cad-simple-viewer-file-open-panel'
      }
      return packageId
    }
    if (packageId === 'cad-editor') {
      if (!matchMonorepoPackage(id, packageId)) {
        continue
      }
      // vue-i18n messages used on the landing page before MlCadViewer mounts.
      if (/\/cad-editor\/src\/locale\//.test(id.replace(/\\/g, '/'))) {
        return 'cad-editor-locale'
      }
      return packageId
    }
    if (matchMonorepoPackage(id, packageId)) {
      return packageId
    }
  }
}

/**
 * Modules that belong to `@mlightcad/cad-simple-viewer/file-open-panel`.
 * Matched before the fat `cad-simple-viewer` chunk so shared helpers (i18n,
 * theme, data-source registry) stay on the light side of the split.
 */
function isCadSimpleViewerFileOpenPanelModule(id: string): boolean {
  const normalized = id.replace(/\\/g, '/')
  if (!normalized.includes('/cad-simple-viewer/')) {
    return false
  }
  return (
    /\/file-open-panel\.ts$/.test(normalized) ||
    /\/ui\/AcUiFileOpen(?:Panel|Landing|Session)\.ts$/.test(normalized) ||
    /\/app\/dataSource\/(?:AcApDataSource(?:Ids|Manager)?|acapBuildDataSourceMenu|acapInvokeDataSourceMenuAction|acapOpenCenteredPopup)\.ts$/.test(
      normalized
    ) ||
    /\/app\/AcApOpenDatabaseOptions\.ts$/.test(normalized) ||
    /\/i18n\/AcApI18n\.ts$/.test(normalized) ||
    /\/i18n\/(?:en|zh|tr|cs|ar)\/main\.ts$/.test(normalized) ||
    /\/editor\/global\/AcEdUiTheme\.ts$/.test(normalized) ||
    /\/editor\/global\/AcEdUiLayout\.ts$/.test(normalized) ||
    /\/editor\/view\/AcEdOpenMode\.ts$/.test(normalized)
  )
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
  const base =
    entryName === 'index' || entryName === packageId
      ? packageId
      : `${packageId}-${entryName}`
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
