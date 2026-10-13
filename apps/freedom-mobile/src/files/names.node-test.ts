// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createAssetIdGenerator,
  isAssetId,
  isLocalAssetUrl,
  MAX_NAME_LENGTH,
  redactPaths,
  sanitizeDocumentName
} from './names.ts'

describe('sanitizeDocumentName', () => {
  it('mantém nomes normais e normaliza a extensão por detectDocumentFormat', () => {
    assert.equal(sanitizeDocumentName('Planta final.DXF'), 'Planta final.DXF')
    assert.equal(sanitizeDocumentName('a.dwg'), 'a.dwg')
  })

  it('devolve só o basename (POSIX e Windows) — nunca caminhos', () => {
    assert.equal(
      sanitizeDocumentName('/data/user/0/app/cache/x/obra.dxf'),
      'obra.dxf'
    )
    assert.equal(sanitizeDocumentName('C:\\Users\\kevin\\obra.dwg'), 'obra.dwg')
    assert.equal(sanitizeDocumentName('../../etc/passwd.dxf'), 'passwd.dxf')
    assert.equal(sanitizeDocumentName('a/b\\c.dxf'), 'c.dxf')
  })

  it('remove controlos e caracteres inválidos', () => {
    assert.equal(sanitizeDocumentName('ob\u0000ra\n\u202e.dxf'), 'obra.dxf')
    assert.equal(sanitizeDocumentName('a<b>:"|?*c.dxf'), 'abc.dxf')
  })

  it('rejeita (null) sem extensão válida ou sem nome', () => {
    for (const bad of [
      'obra.pdf',
      'obra',
      '.dxf',
      '   .dwg',
      'obra.dxf.exe',
      'dir/.dxf',
      '',
      '/',
      'obra.dxf/',
      42,
      null,
      undefined
    ]) {
      assert.equal(sanitizeDocumentName(bad), null, String(bad))
    }
  })

  it('limita o tamanho preservando a extensão (e não parte pares substitutos)', () => {
    const long = `${'a'.repeat(300)}.dwg`
    const out = sanitizeDocumentName(long)
    assert.ok(out !== null)
    assert.equal(Array.from(out).length, MAX_NAME_LENGTH)
    assert.ok(out.endsWith('.dwg'))
    const emoji = sanitizeDocumentName(`${'😀'.repeat(200)}.dxf`)
    assert.ok(emoji !== null && emoji.endsWith('.dxf'))
    assert.ok(!emoji.includes('\ufffd'))
  })

  it('normaliza para NFC', () => {
    const nfd = 'Alc\u0327ados.dxf'
    assert.equal(sanitizeDocumentName(nfd), 'Alçados.dxf')
  })
})

describe('redactPaths', () => {
  it('remove URIs, caminhos POSIX e Windows', () => {
    const out = redactPaths(
      'falhou file:///data/user/0/app/cache/a.dxf e /mnt/d/obra/b.dwg e C:\\Users\\k\\c.dxf e content://x/y'
    )
    assert.ok(!/data\/user|\/mnt|Users|content:|file:/.test(out), out)
    assert.ok(out.includes('[caminho]'))
  })

  it('remove cadeias sensíveis conhecidas, também percent-decoded', () => {
    const known = 'file:///storage/emulated/0/Obra%20Cliente/x.dxf'
    const decoded = 'file:///storage/emulated/0/Obra Cliente/x.dxf'
    const out = redactPaths(`erro em ${known} e depois ${decoded}!`, [known])
    assert.ok(!out.includes('Obra') && !out.includes('storage'), out)
  })

  it('deixa texto sem caminhos intacto', () => {
    assert.equal(
      redactPaths('ficheiro vazio ou tamanho inválido'),
      'ficheiro vazio ou tamanho inválido'
    )
    assert.equal(redactPaths('acima do limite 10/20'), 'acima do limite 10/20')
  })
})

describe('asset ids', () => {
  it('são opacos, únicos e cumprem o padrão', () => {
    let k = 0
    const gen = createAssetIdGenerator(() => ((k += 7) % 36) / 36)
    const ids = Array.from({ length: 50 }, gen)
    assert.equal(new Set(ids).size, 50)
    for (const id of ids) assert.ok(isAssetId(id), id)
  })

  it('o gerador por omissão também produz ids válidos', () => {
    const gen = createAssetIdGenerator()
    const a = gen()
    const b = gen()
    assert.ok(isAssetId(a) && isAssetId(b))
    assert.notEqual(a, b)
  })

  it('isAssetId recusa travessia de caminho e maiúsculas', () => {
    for (const bad of [
      '../x',
      'a/b',
      'ABCDEFGH',
      'short',
      'a'.repeat(65),
      'f1-abc.def',
      '',
      3
    ]) {
      assert.equal(isAssetId(bad), false, String(bad))
    }
  })
})

describe('isLocalAssetUrl', () => {
  it('aceita só loopback http com caminho simples', () => {
    for (const ok of [
      'http://127.0.0.1:43123/f/f1-abcd1234.dxf',
      'http://localhost:8080/a',
      'http://[::1]:9000/f/x.dwg'
    ]) {
      assert.equal(isLocalAssetUrl(ok), true, ok)
    }
  })

  it('recusa rede externa, esquemas, userinfo, query, fragmento e travessia', () => {
    for (const bad of [
      'https://127.0.0.1:43123/f/x.dxf',
      'http://example.com/f/x.dxf',
      'http://cdn.jsdelivr.net/gh/mlightcad/cad-data/x',
      'http://127.0.0.1.evil.com:80/x',
      'http://user:pw@127.0.0.1:80/x',
      'http://127.0.0.1/x',
      'http://127.0.0.1:0/x',
      'http://127.0.0.1:70000/x',
      'http://127.0.0.1:80/x?token=1',
      'http://127.0.0.1:80/x#frag',
      'http://127.0.0.1:80/../x',
      'http://127.0.0.1:80/a/./b',
      'http://127.0.0.1:80/',
      'file:///data/x.dxf',
      '',
      null,
      undefined
    ]) {
      assert.equal(isLocalAssetUrl(bad), false, String(bad))
    }
  })
})
