import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { zipPackageEntries } from '../src/nodeZip'

const requireFromCore = createRequire(
  resolve(process.cwd(), 'packages/cad-html-core/package.json')
)
const { unzipSync } = requireFromCore('fflate') as {
  unzipSync: (data: Uint8Array) => Record<string, Uint8Array>
}

describe('zipPackageEntries', () => {
  it('deflates text and stores pre-gzipped chunks', async () => {
    const html = new TextEncoder().encode('<html>ok</html>')
    const chunk = new Uint8Array([0x1f, 0x8b, 1, 2, 3, 4, 5, 6, 7, 8])
    const zip = await zipPackageEntries([
      { path: 'viewer.html', bytes: html },
      { path: 'chunks/L0-000.acex.gz', bytes: chunk }
    ])
    const entries = unzipSync(zip)
    expect(Array.from(entries['viewer.html']!)).toEqual(Array.from(html))
    expect(Array.from(entries['chunks/L0-000.acex.gz']!)).toEqual(
      Array.from(chunk)
    )
    expect(methodOf(zip, 'chunks/L0-000.acex.gz')).toBe(0)
    expect(methodOf(zip, 'viewer.html')).toBe(8)
  })

  it('rejects unsafe paths', async () => {
    await expect(
      zipPackageEntries([{ path: '../secret', bytes: new Uint8Array([1]) }])
    ).rejects.toThrow('Unsafe package path')
  })
})

function methodOf(zip: Uint8Array, path: string): number {
  const name = new TextEncoder().encode(path)
  for (let i = 0; i + 30 + name.length <= zip.length; i++) {
    if (
      zip[i] !== 0x50 ||
      zip[i + 1] !== 0x4b ||
      zip[i + 2] !== 0x03 ||
      zip[i + 3] !== 0x04
    ) {
      continue
    }
    const nameLength = zip[i + 26]! | (zip[i + 27]! << 8)
    if (nameLength !== name.length) continue
    let match = true
    for (let n = 0; n < name.length; n++) {
      if (zip[i + 30 + n] !== name[n]) {
        match = false
        break
      }
    }
    if (match) return zip[i + 8]! | (zip[i + 9]! << 8)
  }
  throw new Error(`missing local header for ${path}`)
}
