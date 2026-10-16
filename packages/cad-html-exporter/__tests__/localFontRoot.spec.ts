import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolveLocalFontRoot } from '../src/nodeFontLoader'

describe('resolveLocalFontRoot', () => {
  it('uses a cad-data checkout fonts/ directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'acex-fonts-'))
    const fonts = join(root, 'fonts')
    await mkdir(fonts)
    await writeFile(join(fonts, 'fonts.json'), '[]')
    await expect(resolveLocalFontRoot(root)).resolves.toBe(fonts)
  })

  it('uses a directory that already contains fonts.json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'acex-fonts-'))
    await writeFile(join(root, 'fonts.json'), '[]')
    await expect(resolveLocalFontRoot(root)).resolves.toBe(root)
  })
})
