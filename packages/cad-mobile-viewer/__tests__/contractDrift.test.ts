// SPDX-License-Identifier: GPL-3.0-or-later
//
// Deriva entre a camada de importação e o contrato do app
// (apps/freedom-mobile/src/contracts/protocol.ts, só leitura): o pacote não
// depende do app, por isso as constantes duplicadas e as formas dos payloads
// são comparadas aqui, com o validador REAL do app (`parseViewerMessage`).

import { acapListFindLayouts } from '@mlightcad/cad-simple-viewer/find'

import {
  detectDocumentFormat,
  MAX_BASE64_BYTES as APP_MAX_BASE64_BYTES,
  MAX_DOCUMENT_BYTES as APP_MAX_DOCUMENT_BYTES,
  OPEN_FAILED_CODES,
  parseViewerMessage
} from '../../../apps/freedom-mobile/src/contracts/protocol'
import { IMPORT_MESSAGES, toOpenFailedPayload } from '../src/import/errors'
import { detectImportFormat } from '../src/import/format'
import {
  importDocument,
  listLayouts,
  toOpenedPayload
} from '../src/import/importer'
import { MAX_BASE64_BYTES, MAX_DOCUMENT_BYTES } from '../src/import/limits'
import { IMPORT_ERROR_CODES } from '../src/import/types'
import { buildDxf, toBuffer } from './helpers/syntheticDxf'

const envelope = (type: string, payload: unknown) =>
  JSON.stringify({ v: 1, id: 'w-1', type, replyTo: 'a-1', payload })

describe('constantes iguais às do app', () => {
  test('códigos de openFailed', () => {
    expect([...IMPORT_ERROR_CODES]).toEqual([...OPEN_FAILED_CODES])
  })

  test('limites de tamanho', () => {
    expect(MAX_DOCUMENT_BYTES).toEqual(APP_MAX_DOCUMENT_BYTES)
    expect(MAX_BASE64_BYTES).toBe(APP_MAX_BASE64_BYTES)
  })

  test.each([
    'a.dwg',
    'A.DWG',
    'a.dxf',
    'a.b.dxf',
    'a.pdf',
    'a',
    '.dwg',
    'a.dwg.txt',
    'a.dwg ',
    ''
  ])('detecção de formato por extensão coincide: %j', name => {
    expect(detectImportFormat(name)).toBe(detectDocumentFormat(name))
  })
})

describe('payloads aceites pelo validador real do app', () => {
  test('opened gerado de um DXF real', async () => {
    const out = await importDocument(
      {
        name: 'synthetic.dxf',
        bytes: toBuffer(buildDxf({ texts: [{ text: 'Parede norte' }] }))
      },
      { dwg: 'ok' }
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const parsed = parseViewerMessage(
      envelope('opened', toOpenedPayload(out.document))
    )
    expect(parsed.ok).toBe(true)
  })

  test.each(IMPORT_ERROR_CODES)('openFailed «%s»', code => {
    const parsed = parseViewerMessage(
      envelope('openFailed', {
        code,
        message: IMPORT_MESSAGES[code]
      })
    )
    expect(parsed.ok).toBe(true)
  })

  test('toOpenFailedPayload de uma falha real é aceite', async () => {
    const out = await importDocument(
      { name: 'x.pdf', bytes: new ArrayBuffer(4) },
      { dwg: 'ok' }
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(
      parseViewerMessage(
        envelope('openFailed', toOpenFailedPayload(out.failure))
      ).ok
    ).toBe(true)
  })

  test('o validador do app rejeita um payload deformado (a prova não é vácua)', () => {
    expect(
      parseViewerMessage(envelope('openFailed', { code: 'nope', message: 'x' }))
        .ok
    ).toBe(false)
  })
})

describe('layouts iguais a acapListFindLayouts', () => {
  test('mesma lista, ordem e campos sobre uma base real', async () => {
    const out = await importDocument(
      { name: 'l.dxf', bytes: toBuffer(buildDxf()) },
      { dwg: 'ok' }
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const db = out.document.database
    expect(listLayouts(db)).toEqual(acapListFindLayouts(db as never))
  })

  test('mesma regra de ordenação e filtro sobre uma base sintética', () => {
    const db = {
      objects: {
        layout: {
          newIterator: () => [
            { layoutName: 'Z', tabOrder: 1, blockTableRecordId: 'B3' },
            { layoutName: 'A', tabOrder: 1, blockTableRecordId: 'B2' },
            { layoutName: 'sem-btr', tabOrder: 0 },
            { layoutName: 'Model', tabOrder: 0, blockTableRecordId: 'B1' }
          ]
        }
      }
    }
    expect(listLayouts(db)).toEqual(acapListFindLayouts(db))
  })
})
