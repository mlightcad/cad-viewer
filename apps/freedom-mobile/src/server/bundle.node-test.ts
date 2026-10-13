// SPDX-License-Identifier: GPL-3.0-or-later
//
// Lista permitida do bundle (M3-I5, spec §4.1 / ameaça A3).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createManifestBundle,
  createMemoryBundle,
  MAX_BUNDLE_FILE_BYTES,
  MAX_BUNDLE_FILES
} from './bundle.ts'
import { LocalServerError } from './errors.ts'

const invalidConfig = (e: unknown): boolean =>
  e instanceof LocalServerError && e.code === 'invalid-config'

describe('createMemoryBundle', () => {
  it('consulta exacta: só existe o que foi listado', async () => {
    const b = createMemoryBundle({ 'index.html': '<p>ola</p>', 'x/y.js': 'y' })
    const entry = b.lookup('index.html')
    assert.ok(entry)
    assert.equal(entry.size, 10)
    assert.equal(new TextDecoder().decode(await entry.read()), '<p>ola</p>')
    assert.equal(b.lookup('x/y.js')?.size, 1)
    for (const missing of [
      'x',
      'x/',
      'X/y.js',
      'index.htm',
      '',
      '../index.html'
    ]) {
      assert.equal(b.lookup(missing), null, missing)
    }
  })

  it('nomes de protótipo não existem a menos que listados', () => {
    const b = createMemoryBundle({ 'index.html': 'x' })
    for (const k of [
      '__proto__',
      'constructor',
      'toString',
      'hasOwnProperty'
    ]) {
      assert.equal(b.lookup(k), null, k)
    }
  })

  it('um ficheiro chamado __proto__ é só um ficheiro', () => {
    const files = JSON.parse('{"__proto__":"x"}') as Record<string, string>
    const b = createMemoryBundle(files)
    assert.equal(b.lookup('__proto__')?.size, 1)
    assert.equal(({} as Record<string, unknown>).size, undefined)
  })

  it('o tamanho é o de bytes (UTF-8), não de caracteres', () => {
    assert.equal(createMemoryBundle({ 'a.txt': 'é' }).lookup('a.txt')?.size, 2)
  })

  for (const bad of [
    '',
    '/abs.js',
    '../x.js',
    'a/../b.js',
    'a//b.js',
    'dir/',
    'a b.js',
    'a%2fb.js',
    'ç.js',
    'a'
  ]) {
    it(`rejeita à construção o nome ${JSON.stringify(bad)}`, () => {
      assert.throws(() => createMemoryBundle({ [bad]: 'x' }), invalidConfig)
    })
  }

  it('a rota reservada de assets (a/…) não pode ser ficheiro do bundle', () => {
    assert.throws(() => createMemoryBundle({ 'a/x.js': 'x' }), invalidConfig)
    assert.throws(() => createMemoryBundle({ a: 'x' }), invalidConfig)
    assert.doesNotThrow(() =>
      createMemoryBundle({ 'ax/x.js': 'x', 'b/a': 'x' })
    )
  })

  it('o erro de configuração não ecoa o nome recusado', () => {
    try {
      createMemoryBundle({ '../../etc/passwd': 'x' })
      assert.fail('devia lançar')
    } catch (e) {
      assert.ok(e instanceof LocalServerError)
      assert.doesNotMatch(String(e.detail) + e.message, /passwd|etc/)
    }
  })

  it('tecto de ficheiro e de contagem', () => {
    assert.throws(
      () =>
        createMemoryBundle({
          'big.bin': new Uint8Array(MAX_BUNDLE_FILE_BYTES + 1)
        }),
      invalidConfig
    )
    const many: Record<string, string> = {}
    for (let i = 0; i <= MAX_BUNDLE_FILES; i++) many[`f${i}.js`] = ''
    assert.throws(() => createMemoryBundle(many), invalidConfig)
  })
})

describe('createManifestBundle', () => {
  const manifest = {
    files: [
      { path: 'index.html', bytes: 5 },
      { path: 'assets/libredwg-web.wasm', bytes: 3 }
    ]
  }

  it('só serve o listado e confirma o tamanho lido contra o manifesto', async () => {
    const reads: string[] = []
    const b = createManifestBundle(manifest, async path => {
      reads.push(path)
      return new Uint8Array(path === 'index.html' ? 5 : 3)
    })
    assert.equal(b.lookup('index.html')?.size, 5)
    assert.equal((await b.lookup('assets/libredwg-web.wasm')!.read()).length, 3)
    assert.equal(b.lookup('assets/outro.js'), null)
    assert.deepEqual(reads, ['assets/libredwg-web.wasm'])
  })

  it('um ficheiro trocado ou truncado em disco nunca é servido', async () => {
    const b = createManifestBundle(manifest, async () => new Uint8Array(4))
    await assert.rejects(() => b.lookup('index.html')!.read(), /manifesto/)
  })

  it('o erro de tamanho não revela caminhos', async () => {
    const b = createManifestBundle(manifest, async () => new Uint8Array(4))
    await b
      .lookup('index.html')!
      .read()
      .catch((e: Error) => {
        assert.doesNotMatch(e.message, /index|assets|\//)
      })
  })

  it('manifesto inválido: nomes repetidos, tamanhos inválidos, nomes inseguros', () => {
    const read = async () => new Uint8Array(0)
    assert.throws(
      () =>
        createManifestBundle(
          {
            files: [
              { path: 'a1.js', bytes: 1 },
              { path: 'a1.js', bytes: 1 }
            ]
          },
          read
        ),
      invalidConfig
    )
    for (const bytes of [
      -1,
      1.5,
      Number.NaN,
      Infinity,
      MAX_BUNDLE_FILE_BYTES + 1
    ]) {
      assert.throws(
        () => createManifestBundle({ files: [{ path: 'a1.js', bytes }] }, read),
        invalidConfig,
        String(bytes)
      )
    }
    assert.throws(
      () =>
        createManifestBundle({ files: [{ path: '../x.js', bytes: 1 }] }, read),
      invalidConfig
    )
  })

  it('o leitor injectado só recebe caminhos validados do manifesto', async () => {
    const seen: string[] = []
    const b = createManifestBundle(
      { files: [{ path: 'x1.js', bytes: 0 }] },
      async p => {
        seen.push(p)
        return new Uint8Array(0)
      }
    )
    assert.equal(b.lookup('../x1.js'), null)
    assert.equal(b.lookup('x1.js/')?.read, undefined)
    await b.lookup('x1.js')!.read()
    assert.deepEqual(seen, ['x1.js'])
  })
})
