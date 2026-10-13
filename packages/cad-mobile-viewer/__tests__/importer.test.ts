// SPDX-License-Identifier: GPL-3.0-or-later
//
// Importação com as bibliotecas REAIS: DXF pelo parser MIT de data-model;
// DWG só pelos caminhos de erro (sem fixture autorizada — EXT-3; o worker+wasm
// não corre em jest/node). Fixtures sintéticas: __tests__/PROVENANCE.md.

import {
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbFileType,
  AcDbOpenDatabaseError
} from '@mlightcad/data-model'

import { IMPORT_MESSAGES } from '../src/import/errors'
import {
  type DocumentLoader,
  importDocument,
  listLayouts,
  pickActiveLayout,
  toOpenedPayload
} from '../src/import/importer'
import { MAX_DOCUMENT_BYTES } from '../src/import/limits'
import { registerDwg } from '../src/import/registerDwg'
import { buildDxf, fakeDwgHeader, toBuffer } from './helpers/syntheticDxf'

const TEXTS = [
  { text: 'Parede norte', layer: 'A-WALL' },
  { text: 'Cobertura', layer: 'A-ROOF' },
  { text: 'Obra 42', layer: 'A-ANNO' }
]

function modelSpaceCount(db: AcDbDatabase): number {
  let n = 0
  for (const _e of db.tables.blockTable.modelSpace.newIterator()) n++
  return n
}

const neverLoader: DocumentLoader = jest.fn(async () => {
  throw new Error('o loader não devia ser chamado')
})

beforeEach(() => jest.clearAllMocks())
afterEach(() => {
  AcDbDatabaseConverterManager.instance.unregister(AcDbFileType.DWG)
})

describe('DXF real (parser MIT)', () => {
  test('converte um DXF sintético e devolve o formato intermédio', async () => {
    const bytes = toBuffer(buildDxf({ texts: TEXTS }))
    const out = await importDocument(
      { name: 'synthetic-layouts.dxf', bytes, declaredSize: bytes.byteLength },
      { dwg: 'unavailable' }
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const doc = out.document
    expect(doc.format).toBe('dxf')
    expect(doc.name).toBe('synthetic-layouts.dxf')
    expect(doc.byteLength).toBe(bytes.byteLength)
    expect(doc.dwgVersion).toBeUndefined()
    expect(doc.layouts.map(l => l.name)).toEqual(['Model'])
    expect(doc.activeLayoutId).toBe(doc.layouts[0].btrId)
    expect(doc.database).toBeInstanceOf(AcDbDatabase)
    expect(modelSpaceCount(doc.database)).toBe(TEXTS.length)
  })

  test('DXF não depende do estado DWG (unavailable não afecta DXF — §6.4)', async () => {
    const bytes = toBuffer(buildDxf({ texts: TEXTS }))
    for (const dwg of ['ok', 'unavailable'] as const) {
      const out = await importDocument({ name: 'a.DXF', bytes }, { dwg })
      expect(out.ok).toBe(true)
    }
  })

  test.each([
    ['CRLF', { crlf: true }],
    ['BOM UTF-8', { bom: true }],
    ['comentário 999', { comment: 'gerado pela equipa' }],
    ['versão AC1027', { version: 'AC1027' }]
  ])('variante %s', async (_n, opts) => {
    const out = await importDocument(
      { name: 'v.dxf', bytes: toBuffer(buildDxf({ texts: TEXTS, ...opts })) },
      { dwg: 'ok' }
    )
    expect(out.ok).toBe(true)
    if (out.ok)
      expect(modelSpaceCount(out.document.database)).toBe(TEXTS.length)
  })

  test('toOpenedPayload é serializável, sem a base de dados, e igual a OpenedPayload', async () => {
    const out = await importDocument(
      { name: 'p.dxf', bytes: toBuffer(buildDxf({ texts: TEXTS })) },
      { dwg: 'ok' }
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const payload = toOpenedPayload(out.document)
    expect(Object.keys(payload).sort()).toEqual([
      'activeLayoutId',
      'format',
      'layouts',
      'name'
    ])
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload)
    expect(payload.layouts).not.toBe(out.document.layouts)
  })

  test('texto que não é DXF → parse no sniff, sem chamar o conversor (o parser MIT aceitá-lo-ia)', async () => {
    const out = await importDocument(
      { name: 'lixo.dxf', bytes: toBuffer('not a dxf at all') },
      { dwg: 'ok', load: neverLoader }
    )
    expect(out).toMatchObject({
      ok: false,
      failure: { code: 'parse', stage: 'sniff' }
    })
    expect(neverLoader).not.toHaveBeenCalled()
  })

  test('DXF binário → parse explícito (não suportado em v1)', async () => {
    const out = await importDocument(
      {
        name: 'b.dxf',
        bytes: toBuffer('AutoCAD Binary DXF\r\n\u001a\u0000xxxx')
      },
      { dwg: 'ok', load: neverLoader }
    )
    expect(out).toMatchObject({
      ok: false,
      failure: { code: 'parse', stage: 'sniff' }
    })
    expect(neverLoader).not.toHaveBeenCalled()
  })
})

describe('validação antes de converter (nunca chega ao conversor)', () => {
  const run = (name: string, bytes: ArrayBuffer, declaredSize?: number) =>
    importDocument(
      { name, bytes, declaredSize },
      { dwg: 'ok', load: neverLoader }
    )

  test.each(['x.pdf', 'x', '.dwg', 'x.dwg.bak', ''])(
    'extensão %j → unsupported-ext',
    async name => {
      const out = await run(name, toBuffer(buildDxf()))
      expect(out).toMatchObject({
        ok: false,
        failure: { code: 'unsupported-ext', stage: 'validate' }
      })
    }
  )

  test('vazio → read-failed', async () => {
    expect(await run('x.dxf', new ArrayBuffer(0))).toMatchObject({
      ok: false,
      failure: { code: 'read-failed' }
    })
  })

  test('tamanho real ≠ anunciado → read-failed (TOCTOU)', async () => {
    const bytes = toBuffer(buildDxf())
    expect(await run('x.dxf', bytes, bytes.byteLength + 1)).toMatchObject({
      ok: false,
      failure: { code: 'read-failed', stage: 'validate' }
    })
  })

  test('limites por formato sobre os bytes REAIS (DXF 20 MB, DWG 10 MB)', async () => {
    const over = (n: number) => new ArrayBuffer(n)
    expect(await run('x.dxf', over(MAX_DOCUMENT_BYTES.dxf + 1))).toMatchObject({
      ok: false,
      failure: { code: 'too-large' }
    })
    expect(await run('x.dwg', over(MAX_DOCUMENT_BYTES.dwg + 1))).toMatchObject({
      ok: false,
      failure: { code: 'too-large' }
    })
    // 12 MB é aceitável em DXF (passa o limite; falha no sniff por ser zeros)
    expect(await run('x.dxf', over(12 * 1024 * 1024))).toMatchObject({
      ok: false,
      failure: { code: 'parse', stage: 'sniff' }
    })
  })

  test('um .dwg com cabeçalho inválido → parse (não é DWG)', async () => {
    expect(await run('x.dwg', toBuffer(buildDxf()))).toMatchObject({
      ok: false,
      failure: { code: 'parse', stage: 'sniff' }
    })
  })

  test('entradas absurdas nunca lançam', async () => {
    for (const req of [
      { name: undefined, bytes: new ArrayBuffer(4) },
      { name: 'x.dxf', bytes: null },
      { name: 'x.dxf', bytes: 'texto' },
      undefined
    ]) {
      const out = await importDocument(req as never, { dwg: 'ok' })
      expect(out.ok).toBe(false)
    }
  })
})

describe('DWG: caminhos de erro com o conversor LibreDWG real', () => {
  const dwg = () => ({ name: 'planta.dwg', bytes: fakeDwgHeader('AC1027') })

  test('estado unavailable → dwg-unavailable sem tentar converter (mensagem §6.4)', async () => {
    const out = await importDocument(dwg(), {
      dwg: 'unavailable',
      load: neverLoader
    })
    expect(out).toMatchObject({
      ok: false,
      failure: {
        code: 'dwg-unavailable',
        message: IMPORT_MESSAGES['dwg-unavailable'],
        stage: 'validate'
      }
    })
    expect(neverLoader).not.toHaveBeenCalled()
  })

  test('estado ok mas nenhum conversor registado (F3) → dwg-unavailable', async () => {
    const out = await importDocument(dwg(), { dwg: 'ok' })
    expect(out).toMatchObject({
      ok: false,
      failure: { code: 'dwg-unavailable', stage: 'convert' }
    })
  })

  test('conversor REAL registado mas sem Worker (F4) → dwg-unavailable, nunca DXF por engano', async () => {
    expect(
      registerDwg('./assets/libredwg-parser-worker.js', {
        workerSupported: true
      }).status
    ).toBe('ok')
    const out = await importDocument(dwg(), { dwg: 'ok' })
    expect(out).toMatchObject({
      ok: false,
      failure: { code: 'dwg-unavailable', stage: 'convert' }
    })
    if (!out.ok) {
      expect(out.failure.detail).toMatch(/Worker is not defined/)
      expect(out.failure.message).toBe(IMPORT_MESSAGES['dwg-unavailable'])
    }
  })

  test('versão AC1027 é lida do cabeçalho e chega ao documento (loader fake)', async () => {
    const fake = {
      objects: {
        layout: {
          newIterator: () => [
            { layoutName: 'Model', tabOrder: 0, blockTableRecordId: 'B1' }
          ]
        }
      }
    } as unknown as AcDbDatabase
    const out = await importDocument(dwg(), {
      dwg: 'ok',
      load: async () => fake
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.document.format).toBe('dwg')
      expect(out.document.dwgVersion).toBe('AC1027')
      expect(out.document.database).toBe(fake)
    }
  })
})

describe('falhas do conversor, timeout e inspecção', () => {
  const dxfReq = () => ({
    name: 'x.dxf',
    bytes: toBuffer(buildDxf({ texts: TEXTS }))
  })

  test.each([
    ['worker_oom', 'oom'],
    ['worker_timeout', 'timeout'],
    ['parse_failed', 'parse'],
    ['fetch_failed', 'read-failed']
  ] as const)(
    'AcDbOpenDatabaseError %s → %s (stage convert)',
    async (code, expected) => {
      const load: DocumentLoader = async () => {
        throw new AcDbOpenDatabaseError('falhou', code, { stage: 'PARSE' })
      }
      expect(await importDocument(dxfReq(), { dwg: 'ok', load })).toMatchObject(
        {
          ok: false,
          failure: { code: expected, stage: 'convert' }
        }
      )
    }
  )

  test('loader que nunca resolve → timeout (timer limpo)', async () => {
    const load: DocumentLoader = () => new Promise(() => undefined)
    const out = await importDocument(dxfReq(), {
      dwg: 'ok',
      load,
      timeoutMs: 25
    })
    expect(out).toMatchObject({
      ok: false,
      failure: { code: 'timeout', stage: 'convert' }
    })
  })

  test('loader rápido não deixa timer pendente (sem handles abertos)', async () => {
    const spy = jest.spyOn(globalThis, 'clearTimeout')
    const out = await importDocument(dxfReq(), { dwg: 'ok', timeoutMs: 60_000 })
    expect(out.ok).toBe(true)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('documento sem layouts → parse na inspecção', async () => {
    const empty = {
      objects: { layout: { newIterator: () => [] } }
    } as unknown as AcDbDatabase
    expect(
      await importDocument(dxfReq(), { dwg: 'ok', load: async () => empty })
    ).toMatchObject({ ok: false, failure: { code: 'parse', stage: 'inspect' } })
  })

  test('a mensagem ao utilizador nunca contém o texto cru da excepção', async () => {
    const load: DocumentLoader = async () => {
      throw new Error('falhou /home/kevin/obra.dxf em http://127.0.0.1:8080/f1')
    }
    const out = await importDocument(dxfReq(), { dwg: 'ok', load })
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.failure.message).toBe(IMPORT_MESSAGES.parse)
      expect(JSON.stringify(out.failure)).not.toMatch(/kevin|127\.0\.0\.1/)
    }
  })
})

describe('layouts', () => {
  test('ordena por tabOrder, ignora layouts sem btr e escolhe Model', () => {
    const layouts = listLayouts({
      objects: {
        layout: {
          newIterator: () => [
            { layoutName: 'Alçados', tabOrder: 2, blockTableRecordId: 'B3' },
            { layoutName: 'sem-btr', tabOrder: 1 },
            { layoutName: 'Planta', tabOrder: 1, blockTableRecordId: 'B2' },
            { layoutName: 'Model', tabOrder: 0, blockTableRecordId: 'B1' }
          ]
        }
      }
    })
    expect(layouts.map(l => l.name)).toEqual(['Model', 'Planta', 'Alçados'])
    expect(pickActiveLayout(layouts)?.btrId).toBe('B1')
  })

  test('sem «Model» usa o primeiro; vazio → null; sem tabela → []', () => {
    expect(
      pickActiveLayout([{ name: 'A', btrId: 'X', tabOrder: 0 }])?.btrId
    ).toBe('X')
    expect(pickActiveLayout([])).toBeNull()
    expect(listLayouts({})).toEqual([])
  })
})

describe('zero rede durante a importação', () => {
  test('fetch/XMLHttpRequest/WebSocket armadilhados: DXF real e erros DWG não os tocam', async () => {
    const trap = jest.fn(() => {
      throw new Error('REDE PROIBIDA')
    })
    const g = globalThis as Record<string, unknown>
    const saved = {
      fetch: g.fetch,
      XMLHttpRequest: g.XMLHttpRequest,
      WebSocket: g.WebSocket
    }
    g.fetch = trap
    g.XMLHttpRequest = trap
    g.WebSocket = trap
    try {
      const ok = await importDocument(
        { name: 'x.dxf', bytes: toBuffer(buildDxf({ texts: TEXTS })) },
        { dwg: 'ok' }
      )
      expect(ok.ok).toBe(true)
      registerDwg('./assets/w.js', { workerSupported: true })
      const bad = await importDocument(
        { name: 'x.dwg', bytes: fakeDwgHeader() },
        { dwg: 'ok' }
      )
      expect(bad.ok).toBe(false)
      expect(trap).not.toHaveBeenCalled()
    } finally {
      Object.assign(g, saved)
    }
  })
})
