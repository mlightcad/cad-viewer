import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { writePackageDirectory } from '../src/writePackageDirectory'

describe('writePackageDirectory', () => {
  it('writes package members into a new folder', async () => {
    const root = await mkdtemp(join(tmpdir(), 'acex-pkg-'))
    const output = join(root, 'out')
    await writePackageDirectory(output, [
      { path: 'viewer.html', bytes: new TextEncoder().encode('<html></html>') },
      {
        path: 'chunks/L0-000.acex.gz',
        bytes: new Uint8Array([1, 2, 3])
      }
    ])
    const html = await readFile(join(output, 'viewer.html'), 'utf8')
    const chunk = await readFile(join(output, 'chunks', 'L0-000.acex.gz'))
    expect(html).toBe('<html></html>')
    expect(Array.from(chunk)).toEqual([1, 2, 3])
    expect((await stat(output)).isDirectory()).toBe(true)
  })

  it('rejects a file path and unsafe member names', async () => {
    const root = await mkdtemp(join(tmpdir(), 'acex-pkg-'))
    const filePath = join(root, 'not-a-folder')
    await writeFile(filePath, 'x')
    await expect(
      writePackageDirectory(filePath, [
        { path: 'viewer.html', bytes: new Uint8Array([1]) }
      ])
    ).rejects.toThrow('must be a folder')
    await expect(writePackageDirectory('   ', [])).rejects.toThrow(
      'requires an output folder'
    )
    const output = join(root, 'safe')
    await expect(
      writePackageDirectory(output, [
        { path: '../secret', bytes: new Uint8Array([1]) }
      ])
    ).rejects.toThrow('Unsafe package path')
  })
})
