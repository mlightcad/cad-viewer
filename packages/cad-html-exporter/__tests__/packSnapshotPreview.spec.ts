import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { zipPackageEntries } from '../src/nodeZip'

const requireFromCore = createRequire(
  resolve(process.cwd(), 'packages/cad-html-core/package.json')
)
const { unzipSync } = requireFromCore('fflate') as {
  unzipSync: (data: Uint8Array) => Record<string, Uint8Array>
}

describe('multi-file package preview.jpg', () => {
  it('includes preview.jpg among zipped package members', async () => {
    const html = new TextEncoder().encode('<html>ok</html>')
    const preview = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const zip = await zipPackageEntries([
      { path: 'viewer.html', bytes: html },
      { path: 'preview.jpg', bytes: preview }
    ])
    const entries = unzipSync(zip)
    expect(Array.from(entries['preview.jpg']!)).toEqual(Array.from(preview))
    expect(Array.from(entries['viewer.html']!)).toEqual(Array.from(html))
  })
})
