// SPDX-License-Identifier: GPL-3.0-or-later
import { detectImportFormat, sniffFormat } from '../src/import/format'
import { buildDxf, fakeDwgHeader, toBuffer } from './helpers/syntheticDxf'

describe('detectImportFormat', () => {
  test.each([
    ['planta.dwg', 'dwg'],
    ['PLANTA.DWG', 'dwg'],
    ['a.b.c.dxf', 'dxf'],
    ['Obra 42.DxF', 'dxf'],
    ['C:\\obras\\x.dwg', 'dwg'],
    ['/tmp/x/y.dxf', 'dxf']
  ])('%s → %s', (name, expected) => {
    expect(detectImportFormat(name)).toBe(expected)
  })

  test.each([
    'planta.pdf',
    'planta.dwf',
    'planta',
    '.dwg',
    'planta.dwg.txt',
    'planta.dwg ',
    '',
    'dir.dwg/'
  ])('%j → null (nunca cai em DXF por omissão)', name => {
    expect(detectImportFormat(name)).toBeNull()
  })
})

describe('sniffFormat DXF', () => {
  test('aceita DXF ASCII (LF, CRLF, BOM, comentários 999)', () => {
    for (const opts of [
      {},
      { crlf: true },
      { bom: true },
      { comment: 'gerado pela equipa' }
    ]) {
      expect(sniffFormat('dxf', toBuffer(buildDxf(opts)))).toEqual({ ok: true })
    }
  })

  test('rejeita texto que não é DXF (o parser MIT aceitá-lo-ia em silêncio)', () => {
    for (const text of [
      'not a dxf at all',
      '',
      '0\nENDSEC\n',
      '<html>0\nSECTION</html>',
      '  0  \n  EOF'
    ]) {
      expect(sniffFormat('dxf', toBuffer(text))).toEqual({
        ok: false,
        reason: 'not-dxf'
      })
    }
  })

  test('DXF binário é identificado e recusado explicitamente', () => {
    const sentinel = 'AutoCAD Binary DXF\r\n\u001a\u0000'
    expect(sniffFormat('dxf', toBuffer(sentinel))).toEqual({
      ok: false,
      reason: 'binary-dxf'
    })
  })

  test('um DWG com extensão .dxf não passa (cabeçalho AC10xx não é DXF)', () => {
    expect(sniffFormat('dxf', fakeDwgHeader())).toEqual({
      ok: false,
      reason: 'not-dxf'
    })
  })
})

describe('sniffFormat DWG', () => {
  test.each(['AC1015', 'AC1018', 'AC1021', 'AC1024', 'AC1027', 'AC1032'])(
    'aceita %s e devolve a versão',
    v => {
      expect(sniffFormat('dwg', fakeDwgHeader(v))).toEqual({
        ok: true,
        dwgVersion: v
      })
    }
  )

  test.each([
    'AC1.50',
    'AC2.10',
    'AC1002',
    'AC1009',
    'MC0.0',
    'AC10xx',
    '%PDF-1'
  ])('rejeita %s', v => {
    expect(sniffFormat('dwg', fakeDwgHeader(v))).toEqual({
      ok: false,
      reason: 'not-dwg'
    })
  })

  test('buffer curto/vazio é rejeitado sem lançar', () => {
    expect(sniffFormat('dwg', new ArrayBuffer(0))).toEqual({
      ok: false,
      reason: 'not-dwg'
    })
    expect(sniffFormat('dwg', new ArrayBuffer(3))).toEqual({
      ok: false,
      reason: 'not-dwg'
    })
  })

  test('um DXF com extensão .dwg não passa', () => {
    expect(sniffFormat('dwg', toBuffer(buildDxf()))).toEqual({
      ok: false,
      reason: 'not-dwg'
    })
  })
})
