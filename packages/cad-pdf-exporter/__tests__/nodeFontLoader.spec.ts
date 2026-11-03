import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createNodeTextFontResolver,
  type NodeFontLibrary,
  resolveLocalFontRoot
} from '../src/nodeFontLoader'

function fakeLibrary(
  faces: Record<string, { type: 'mesh' | 'shx'; bytes: Uint8Array }>
): NodeFontLibrary {
  return {
    loader: {} as NodeFontLibrary['loader'],
    async find(name) {
      const face = faces[name.toLowerCase()]
      if (!face) return undefined
      return {
        info: {
          name: [name],
          file: `${name}.${face.type === 'shx' ? 'shx' : 'ttf'}`,
          type: face.type,
          url: ''
        },
        read: async () => face.bytes
      }
    }
  }
}

describe('resolveLocalFontRoot', () => {
  it('uses a cad-data checkout fonts/ directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'acpd-fonts-'))
    const fonts = join(root, 'fonts')
    await mkdir(fonts)
    await writeFile(join(fonts, 'fonts.json'), '[]')
    await expect(resolveLocalFontRoot(root)).resolves.toBe(fonts)
  })
})

describe('createNodeTextFontResolver', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  afterAll(() => warn.mockRestore())

  const library = fakeLibrary({
    simsun: { type: 'mesh', bytes: new Uint8Array([1, 2, 3]) },
    txt: { type: 'shx', bytes: new Uint8Array([4]) },
    empty: { type: 'mesh', bytes: new Uint8Array(0) }
  })
  const resolve = createNodeTextFontResolver(library)

  it('returns embeddable font programs', async () => {
    await expect(resolve('SimSun')).resolves.toEqual(new Uint8Array([1, 2, 3]))
  })

  it('leaves SHX and empty faces to vector glyphs', async () => {
    await expect(resolve('txt')).resolves.toBeUndefined()
    await expect(resolve('empty')).resolves.toBeUndefined()
  })
})
