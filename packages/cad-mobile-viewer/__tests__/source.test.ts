// SPDX-License-Identifier: GPL-3.0-or-later
import { MAX_BASE64_BYTES } from '../src/import/limits'
import {
  decodeBase64,
  isLocalAssetUrl,
  readOpenSource
} from '../src/import/source'

const b64 = (s: string) => Buffer.from(s, 'latin1').toString('base64')

describe('isLocalAssetUrl', () => {
  test.each([
    'http://127.0.0.1:8080/f1a2b3c4',
    'http://localhost:5000/asset/abc-123',
    'http://[::1]:9000/x.dxf'
  ])('aceita %s', url => expect(isLocalAssetUrl(url)).toBe(true))

  test.each([
    'https://127.0.0.1:8080/x',
    'http://example.com/x.dwg',
    'http://127.0.0.1/x',
    'http://u:p@127.0.0.1:80/x',
    'http://127.0.0.1:80/x?a=1',
    'http://127.0.0.1:80/x#f',
    'http://127.0.0.1:80/../x',
    'http://127.0.0.1:80/a/./b',
    'http://127.0.0.1:80/a b',
    'http://127.0.0.1:80/',
    'file:///x.dwg',
    'content://x/y',
    'not a url',
    ''
  ])('rejeita %j', url => expect(isLocalAssetUrl(url)).toBe(false))
})

describe('decodeBase64 (estrito)', () => {
  test('round-trip de bytes arbitrários', () => {
    const raw = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i))
    const out = decodeBase64(b64(raw))
    expect(out).not.toBeNull()
    expect(Array.from(new Uint8Array(out as ArrayBuffer))).toEqual(
      Array.from({ length: 256 }, (_, i) => i)
    )
  })

  test.each(['abc', 'ab=c', 'a b c d', 'YWJj\n', 'YW-j', 'YWJjZA', '===='])(
    'rejeita %j',
    s => expect(decodeBase64(s)).toBeNull()
  )
})

describe('readOpenSource', () => {
  test('base64 válido → bytes', async () => {
    const r = await readOpenSource({
      kind: 'base64',
      data: b64('0\nSECTION\n')
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(new Uint8Array(r.bytes)).toHaveLength(10)
  })

  test('base64 vazio / inválido → read-failed', async () => {
    for (const data of ['', 'não é base64!']) {
      const r = await readOpenSource({ kind: 'base64', data })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.failure.code).toBe('read-failed')
        expect(r.failure.stage).toBe('source')
      }
    }
  })

  test('base64 acima de 8 MB → too-large ANTES de decodificar', async () => {
    const data = 'A'.repeat(Math.ceil(((MAX_BASE64_BYTES + 4) * 4) / 3 / 4) * 4)
    const spy = jest.spyOn(globalThis, 'atob')
    const r = await readOpenSource({ kind: 'base64', data })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.failure.code).toBe('too-large')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('url loopback usa o porto injectado (e só ele)', async () => {
    const fetchBytes = jest.fn(async () => new ArrayBuffer(4))
    const r = await readOpenSource(
      { kind: 'url', url: 'http://127.0.0.1:8080/f123' },
      { fetchBytes }
    )
    expect(r.ok).toBe(true)
    expect(fetchBytes).toHaveBeenCalledWith('http://127.0.0.1:8080/f123')
  })

  test('url externo nunca chega ao porto (zero rede)', async () => {
    const fetchBytes = jest.fn(async () => new ArrayBuffer(4))
    const r = await readOpenSource(
      { kind: 'url', url: 'https://cdn.jsdelivr.net/gh/x.dwg' },
      { fetchBytes }
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.failure.code).toBe('read-failed')
    expect(fetchBytes).not.toHaveBeenCalled()
  })

  test('sem porto (I5 ainda não existe) → read-failed explícito', async () => {
    const r = await readOpenSource({
      kind: 'url',
      url: 'http://127.0.0.1:8080/f1'
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.failure.code).toBe('read-failed')
  })

  test('excepção do porto → read-failed com detalhe redigido', async () => {
    const fetchBytes = async () => {
      throw new Error('falhou http://127.0.0.1:8080/f1 em /data/x')
    }
    const r = await readOpenSource(
      { kind: 'url', url: 'http://127.0.0.1:8080/f1' },
      { fetchBytes }
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.failure.code).toBe('read-failed')
      expect(r.failure.detail).not.toMatch(/127\.0\.0\.1|\/data/)
    }
  })

  test('fonte desconhecida → read-failed (nunca lança)', async () => {
    const r = await readOpenSource({ kind: 'ftp' } as never)
    expect(r.ok).toBe(false)
  })
})
