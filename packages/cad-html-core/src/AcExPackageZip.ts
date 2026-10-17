import { unzipSync, zipSync } from 'fflate'

import type { AcExPackageFile, AcExPackageFiles } from './AcExPackageTypes'

function isSafeZipPath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
    return false
  }
  const parts = path.split('/')
  return parts.every(
    part =>
      part.length > 0 &&
      part !== '.' &&
      part !== '..' &&
      /^[A-Za-z0-9._-]+$/.test(part)
  )
}

/**
 * True when the entry is already gzip-compressed (geometry / OSNAP chunks).
 * Re-deflating these in the outer zip wastes CPU for almost no size win.
 */
function isPrecompressedPackagePath(path: string): boolean {
  return path.endsWith('.gz')
}

/**
 * Zips multi-file package contents for a single browser download.
 * Paths inside the archive match the hosted directory layout.
 *
 * Pre-gzipped chunk payloads (`.acex.gz` / `.osnap.gz`) are stored
 * (deflate level 0). Small text entries such as `viewer.html` and the
 * manifest keep a modest compression level.
 */
export function zipAcExPackageFiles(pkg: AcExPackageFiles): Uint8Array {
  const entries: Record<
    string,
    Uint8Array | [Uint8Array, { level: 0 | 6 }]
  > = {}
  for (const file of pkg.files) {
    if (!isSafeZipPath(file.path)) {
      throw new Error(`Unsafe package path: ${file.path}`)
    }
    if (isPrecompressedPackagePath(file.path)) {
      entries[file.path] = [file.bytes, { level: 0 }]
    } else {
      entries[file.path] = [file.bytes, { level: 6 }]
    }
  }
  return zipSync(entries)
}

/**
 * Unzips a package archive produced by {@link zipAcExPackageFiles}.
 * Entries with path traversal or absolute paths are rejected.
 */
export function unzipAcExPackageFiles(bytes: Uint8Array): AcExPackageFile[] {
  const entries = unzipSync(bytes)
  const files: AcExPackageFile[] = []
  for (const [path, data] of Object.entries(entries)) {
    if (!isSafeZipPath(path)) {
      throw new Error('Unsafe path in package archive')
    }
    files.push({ path, bytes: data })
  }
  return files
}
