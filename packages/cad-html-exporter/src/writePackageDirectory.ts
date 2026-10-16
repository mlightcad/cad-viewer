import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

import { isSafePackagePath } from './nodeZip'

/**
 * Writes multi-file package members into `outputDir`.
 *
 * `outputDir` must be a folder. It is created when missing. An existing file
 * at that path is rejected — unzipped export has no single output filename.
 */
export async function writePackageDirectory(
  outputDir: string,
  files: ReadonlyArray<{ path: string; bytes: Uint8Array }>
): Promise<void> {
  const folder = outputDir?.trim()
  if (!folder) {
    throw new Error(
      'Multi-file export without a zip requires an output folder'
    )
  }

  try {
    const info = await stat(folder)
    if (!info.isDirectory()) {
      throw new Error(
        `Output path must be a folder when zipPackage is false: ${folder}`
      )
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    await mkdir(folder, { recursive: true })
  }

  const root = resolve(folder)
  const destinations: { dest: string; bytes: Uint8Array }[] = []
  const parents = new Set<string>()

  for (const file of files) {
    if (!isSafePackagePath(file.path)) {
      throw new Error(`Unsafe package path: ${file.path}`)
    }
    const dest = resolve(root, ...file.path.split('/'))
    const rel = relative(root, dest)
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`Unsafe package path: ${file.path}`)
    }
    destinations.push({ dest, bytes: file.bytes })
    parents.add(dirname(dest))
  }

  await Promise.all([...parents].map(dir => mkdir(dir, { recursive: true })))
  await Promise.all(destinations.map(item => writeFile(item.dest, item.bytes)))
}
