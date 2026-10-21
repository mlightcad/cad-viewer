import {
  type AcExSnapshot,
  buildAcExPackageAsync,
  encodeSnapshot,
  packHtml,
  packHtmlEmbeddedPackage,
  protectAcExHtmlEncodedSnapshot,
  resolveAcApHtmlExpiresAt,
  shouldEmbedAcExChunks
} from '@mlightcad/cad-html-core'

import {
  type AcExHtmlExporterOptions,
  type AcExHtmlExportResult,
  resolveAcExHtmlPackageBuildOptions
} from './exportOptions'
import { loadViewerRuntime } from './loadViewerRuntime'
import { installNodeSnapshotCompressor } from './nodeGzip'
import { zipPackageEntries } from './nodeZip'

/**
 * Packs a snapshot into HTML or a multi-file zip using the shared core APIs.
 *
 * @param previewJpeg - Optional drawing thumbnail JPEG for multi-file packages
 *   (`preview.jpg` next to `viewer.html`). Ignored for single-file HTML.
 */
export async function packSnapshot(
  snapshot: AcExSnapshot,
  options: AcExHtmlExporterOptions = {},
  baseName = 'drawing',
  previewJpeg?: Uint8Array
): Promise<AcExHtmlExportResult> {
  installNodeSnapshotCompressor()
  const viewerRuntime = await loadViewerRuntime(options.viewerRuntimePath)
  const exportFormat = options.exportFormat === 'multi' ? 'multi' : 'single'

  if (exportFormat === 'multi') {
    const packageBuild = resolveAcExHtmlPackageBuildOptions(options)
    const pkg = await buildAcExPackageAsync(snapshot, {
      viewerRuntime,
      baseName,
      ...packageBuild
    })
    const files =
      previewJpeg?.length
        ? [...pkg.files, { path: 'preview.jpg', bytes: previewJpeg }]
        : pkg.files
    if (options.zipPackage === false) {
      return {
        kind: 'directory',
        files,
        fileName: baseName
      }
    }
    const zipBytes = await zipPackageEntries(files)
    return {
      kind: 'zip',
      zipBytes,
      fileName: `${baseName}.zip`
    }
  }

  const expiresAt = resolveAcApHtmlExpiresAt(
    options.expiryDays ?? 'never',
    Date.now(),
    options.expiresAt
  )

  let html: string
  if (shouldEmbedAcExChunks(snapshot)) {
    html = await packHtmlEmbeddedPackage(snapshot, {
      title: snapshot.meta.title,
      viewerRuntime,
      expiresAt,
      password: options.password || undefined
    })
  } else {
    const protectedSnapshot = await protectAcExHtmlEncodedSnapshot(
      encodeSnapshot(snapshot),
      {
        expiresAt,
        password: options.password || undefined
      }
    )
    html = packHtml(snapshot, {
      title: snapshot.meta.title,
      viewerRuntime,
      encoded: protectedSnapshot.encoded,
      accessManifest: protectedSnapshot.manifest
    })
  }

  return {
    kind: 'html',
    html,
    fileName: `${baseName}.html`
  }
}
