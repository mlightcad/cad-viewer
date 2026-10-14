// SPDX-License-Identifier: GPL-3.0-or-later
//
// Plugin `plugins/withLoopbackViewer.js` (spec M3-I5 §8 itens 2 e 5; card
// M4-I6): cleartext só para 127.0.0.1 (o Metro só no debug) e cópia do bundle
// REAL com manifesto exacto. O prebuild completo (manifesto Android, ATS iOS,
// referência de pasta no Xcode) é verificado na evidência M4-I6.
import assert from 'node:assert/strict'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { parseBundleManifest } from '../server/bundle.ts'

const require = createRequire(import.meta.url)
const plugin = require('../../plugins/withLoopbackViewer.js') as {
  networkSecurityXml(extra?: string[]): string
  bundleManifest(dir: string): { files: { path: string; bytes: number }[] }
  copyBundle(
    source: string,
    target: string
  ): { files: { path: string; bytes: number }[] }
  DEBUG_HOSTS: string[]
}

describe('withLoopbackViewer: cleartext só para 127.0.0.1', () => {
  it('release: base-config proíbe cleartext e só 127.0.0.1 (sem subdomínios) o permite', () => {
    const xml = plugin.networkSecurityXml()
    assert.match(xml, /<base-config cleartextTrafficPermitted="false" \/>/)
    const domains = [...xml.matchAll(/<domain [^>]*>([^<]+)<\/domain>/g)].map(
      m => m[1]
    )
    assert.deepEqual(domains, ['127.0.0.1'])
    assert.match(xml, /includeSubdomains="false"/)
    assert.doesNotMatch(xml, /trust-anchors|<certificates|overridePins/)
  })

  it('debug: acrescenta só os hosts do Metro, nunca um domínio público', () => {
    assert.deepEqual(plugin.DEBUG_HOSTS, ['localhost', '10.0.2.2'])
    const xml = plugin.networkSecurityXml(plugin.DEBUG_HOSTS)
    const domains = [...xml.matchAll(/<domain [^>]*>([^<]+)<\/domain>/g)].map(
      m => m[1]
    )
    assert.deepEqual(domains, ['127.0.0.1', 'localhost', '10.0.2.2'])
    assert.match(xml, /<base-config cleartextTrafficPermitted="false" \/>/)
  })

  it('o código do plugin nunca liga usesCleartextTraffic nem NSAllowsArbitraryLoads', () => {
    const src = readFileSync(
      new URL('../../plugins/withLoopbackViewer.js', import.meta.url),
      'utf8'
    )
    assert.match(src, /delete app\.\$\['android:usesCleartextTraffic'\]/)
    assert.match(src, /NSAllowsArbitraryLoads: false/)
    assert.match(src, /NSAllowsLocalNetworking: true/)
    assert.doesNotMatch(src, /usesCleartextTraffic'\] = /)
  })
})

describe('withLoopbackViewer: bundle e manifesto', () => {
  it('copia a árvore do bundle e escreve um manifesto que o app aceita', () => {
    const root = mkdtempSync(join(tmpdir(), 'loopback-plugin-'))
    try {
      const src = join(root, 'dist')
      mkdirSync(join(src, 'assets'), { recursive: true })
      writeFileSync(join(src, 'index.html'), '<!doctype html>')
      writeFileSync(join(src, 'assets/app.js'), 'export {}')
      writeFileSync(join(src, 'assets/x.wasm'), Buffer.alloc(1000))
      const manifest = plugin.copyBundle(src, join(root, 'out'))
      assert.deepEqual(manifest.files, [
        { path: 'assets/app.js', bytes: 9 },
        { path: 'assets/x.wasm', bytes: 1000 },
        { path: 'index.html', bytes: 15 }
      ])
      const out = join(root, 'out/viewer-bundle')
      const written = readFileSync(join(out, 'MANIFEST.json'), 'utf8')
      assert.deepEqual(parseBundleManifest(written), manifest)
      assert.equal(
        readFileSync(join(out, 'assets/app.js'), 'utf8'),
        'export {}'
      )
      // o manifesto não se lista a si próprio (nunca é servido)
      assert.ok(!manifest.files.some(f => f.path === 'MANIFEST.json'))
      // nova cópia apaga restos da anterior
      writeFileSync(join(out, 'assets/velho.js'), 'x')
      plugin.copyBundle(src, join(root, 'out'))
      assert.throws(() => readFileSync(join(out, 'assets/velho.js')))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
