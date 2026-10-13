// SPDX-License-Identifier: GPL-3.0-or-later
//
// Sessão do viewer (spec M3-I4 §2.2) com o parser DXF REAL, o FIND REAL e o
// contrato REAL do app nos dois sentidos. Fixtures de e2e lidas in-place.
// Cada regra da tabela §2.2 tem pelo menos um caso de falha explícita.

import { acapFindText } from '@mlightcad/cad-simple-viewer/find'
import { acdbGetWorkingDatabase } from '@mlightcad/data-model'

import { NO_RENDERABLE_MESSAGE } from '../src/model/documentMap'
import { DEFAULT_VIEW_BOX } from '../src/model/normalize'
import type { FindTextFn } from '../src/viewer/session'
import { MIN_VIEW_SIZE } from '../src/viewer/zoom'
import { e2eBytes, openE2e } from './helpers/openFixture'
import {
  buildDxf,
  fakeDwgHeader,
  rawEntity,
  toBuffer
} from './helpers/syntheticDxf'
import { deferred, FakeView, harness, only } from './helpers/viewerHarness'

const LAYOUTS = e2eBytes('find-layouts.dxf')
const BLOCKS = e2eBytes('find-blocks.dxf')

const find = (
  query: string,
  extra: {
    scope?: 'drawing' | 'layout'
    maxResults?: number
    matchCase?: boolean
  } = {}
) => ({
  query,
  matchCase: extra.matchCase ?? false,
  scope: extra.scope ?? ('drawing' as const),
  ...(extra.maxResults !== undefined ? { maxResults: extra.maxResults } : {})
})

async function openedHarness(
  bytes = LAYOUTS,
  name = 'find-layouts.dxf',
  deps = {}
) {
  const h = harness(deps)
  only(await h.open(name, bytes), 'opened')
  return h
}

async function search(
  h: ReturnType<typeof harness>,
  query: string,
  extra = {}
) {
  return only(await h.send('find', find(query, extra)), 'findResult').payload
}

// ---------------------------------------------------------------------------

describe('open: dados reais e falhas determinísticas', () => {
  test('find-layouts.dxf → opened (3 layouts) + log de cobertura; realce limpo', async () => {
    const h = harness()
    const out = await h.open('find-layouts.dxf', LAYOUTS)
    const opened = only(out, 'opened').payload
    expect(opened.format).toBe('dxf')
    expect(opened.layouts.map(l => l.name)).toEqual([
      'Model',
      'Planta',
      'Alçados'
    ])
    expect(only(out, 'log').payload.message).toMatch(/^cobertura /)
    expect(h.view.clears).toBe(1)
    expect(h.session.document?.name).toBe('find-layouts.dxf')
  })

  test('desenho vazio (empty.dxf) abre; zoom extents usa a vista por omissão com log explícito', async () => {
    const h = await openedHarness(e2eBytes('empty.dxf'), 'empty.dxf')
    const out = await h.send('zoom', { op: 'extents' })
    expect(h.view.zooms).toEqual([{ box: DEFAULT_VIEW_BOX, margin: 1 }])
    expect(only(out, 'log').payload).toMatchObject({ level: 'info' })
    expect(only(out, 'log').payload.message).toMatch(/vista por omissão/)
  })

  test('nada desenhável → openFailed{parse} fixo; documento, pesquisa e base de trabalho anteriores mantêm-se', async () => {
    const h = await openedHarness()
    const before = h.session.document
    const r = await search(h, 'Sala')
    const bad = toBuffer(
      buildDxf({ rawEntities: [rawEntity('REGION', [8, '0'])] })
    )
    const out = await h.open('so-region.dxf', bad)
    expect(only(out, 'openFailed').payload).toEqual({
      code: 'parse',
      message: NO_RENDERABLE_MESSAGE
    })
    expect(only(out, 'log').payload.message).toMatch(/REGION×1/)
    expect(h.session.document).toBe(before)
    expect(acdbGetWorkingDatabase()).toBe(before?.database)
    // a pesquisa anterior continua válida
    expect(
      only(await h.send('goto', { findId: r.findId, index: 0 }), 'findActive')
        .payload.outcome
    ).toBe('navigated')
  })

  test.each([
    [
      'extensão inválida',
      { name: 'a.pdf', size: 4, source: { kind: 'base64', data: 'QUJDRA==' } },
      'unsupported-ext'
    ],
    [
      'base64 inválido',
      { name: 'a.dxf', size: 4, source: { kind: 'base64', data: 'QUJ@RA==' } },
      'read-failed'
    ],
    [
      'url externo',
      {
        name: 'a.dxf',
        size: 4,
        source: { kind: 'url', url: 'https://example.com/a.dxf' }
      },
      'read-failed'
    ],
    [
      'url local sem servidor (I5)',
      {
        name: 'a.dxf',
        size: 4,
        source: { kind: 'url', url: 'http://127.0.0.1:8080/a.dxf' }
      },
      'read-failed'
    ],
    [
      'tamanho anunciado ≠ real',
      { name: 'a.dxf', size: 5, source: { kind: 'base64', data: 'QUJDRA==' } },
      'read-failed'
    ],
    [
      'DXF corrompido',
      { name: 'a.dxf', size: 4, source: { kind: 'base64', data: 'QUJDRA==' } },
      'parse'
    ]
  ])('%s → openFailed{%s} + log', async (_label, payload, code) => {
    const h = harness()
    const out = await h.receive(
      JSON.stringify({ v: 1, id: 'a-1', type: 'open', payload })
    )
    expect(only(out, 'openFailed').payload.code).toBe(code)
    expect(only(out, 'log').payload.level).toBe('warn')
    expect(h.session.document).toBeNull()
  })

  test('DWG com conversor indisponível → dwg-unavailable', async () => {
    const h = harness({ dwg: 'unavailable' })
    const out = await h.open('a.dwg', fakeDwgHeader())
    expect(only(out, 'openFailed').payload.code).toBe('dwg-unavailable')
  })

  test('DWG sem sonda de cobertura → abre com log{warn} «cobertura desconhecida» (nunca «completa» calada)', async () => {
    const db = (await openE2e('find-layouts.dxf')).database
    const h = harness({ dwg: 'ok', load: async () => db })
    const out = await h.open('a.dwg', fakeDwgHeader())
    only(out, 'opened')
    const logs = out
      .filter(m => m.type === 'log')
      .map(m => m.type === 'log' && m.payload)
    expect(logs).toContainEqual({
      level: 'warn',
      message: 'cobertura do conversor desconhecida (dwg)'
    })
  })

  test('sonda de cobertura que lança → abre com log{warn} e a causa', async () => {
    const h = harness({
      coverage: () => {
        throw new Error('sonda partida')
      }
    })
    const out = await h.open('find-layouts.dxf', LAYOUTS)
    only(out, 'opened')
    expect(
      out.some(m => m.type === 'log' && /sonda partida/.test(m.payload.message))
    ).toBe(true)
  })

  test('perdas reais do conversor → log de cobertura em warn', async () => {
    const h = harness({ coverage: () => ({ REGION: 2 }) })
    const out = await h.open('find-layouts.dxf', LAYOUTS)
    const log = out.find(m => m.type === 'log')
    expect(log?.type === 'log' && log.payload).toMatchObject({ level: 'warn' })
    expect(log?.type === 'log' && log.payload.message).toMatch(
      /descartadas pelo conversor 2/
    )
  })

  test('layouts fora do contrato (tabOrder negativo) → openFailed{parse}, nunca um opened que o app rejeitaria', async () => {
    const doc = await openE2e('find-layouts.dxf')
    for (const l of (
      doc.database.objects.layout as unknown as {
        newIterator(): Iterable<{ tabOrder: number }>
      }
    ).newIterator()) {
      l.tabOrder = -3
    }
    const discarded: unknown[] = []
    const h = harness({
      load: async () => doc.database,
      discard: f => discarded.push(f.database)
    })
    const out = await h.open('x.dxf', toBuffer(buildDxf()))
    expect(only(out, 'openFailed').payload.code).toBe('parse')
    expect(only(out, 'log').payload.message).toMatch(/tabOrder/)
    expect(discarded).toEqual([doc.database])
  })

  test('reposição que falha fica no detalhe do log', async () => {
    const bad = toBuffer(
      buildDxf({ rawEntities: [rawEntity('REGION', [8, '0'])] })
    )
    const h = harness({
      discard: () => {
        throw new Error('sem reposição')
      }
    })
    const out = await h.open('r.dxf', bad)
    expect(only(out, 'openFailed').payload.code).toBe('parse')
    expect(only(out, 'log').payload.message).toMatch(
      /reposição falhou: sem reposição/
    )
  })

  test('limpar o realce falha → abre na mesma, com log{warn}', async () => {
    const view = new FakeView()
    view.fail.clearSelection = new Error('vista ocupada')
    const h = harness({ view })
    const out = await h.open('find-layouts.dxf', LAYOUTS)
    only(out, 'opened')
    expect(
      out.some(
        m =>
          m.type === 'log' &&
          /realce não limpo.*vista ocupada/.test(m.payload.message)
      )
    ).toBe(true)
  })
})

describe('concorrência: open em curso', () => {
  test('find/goto/zoom durante open → error{busy}; setInsets e clearHighlight passam', async () => {
    const real = (await openE2e('find-layouts.dxf')).database
    const gate = deferred<void>()
    const h = harness({ load: async () => (await gate.promise, real) })
    const opening = h.open('find-layouts.dxf', LAYOUTS)
    await new Promise(r => setImmediate(r))
    for (const out of [
      await h.send('find', find('Sala')),
      await h.send('zoom', { op: 'in' }),
      await h.send('findNext', { findId: 1 })
    ]) {
      expect(only(out, 'error').payload.code).toBe('busy')
    }
    expect(
      await h.send('setInsets', { left: 0, right: 0, top: 0, bottom: 200 })
    ).toEqual([])
    expect(await h.send('clearHighlight', {})).toEqual([])
    gate.resolve()
    only(await opening, 'opened')
    expect((await search(h, 'Sala')).total).toBeGreaterThan(0)
  })

  test('dois opens seguidos são processados por ordem; fica o último', async () => {
    const h = harness()
    const [a, b] = await Promise.all([
      h.open('find-layouts.dxf', LAYOUTS),
      h.open('find-blocks.dxf', BLOCKS)
    ])
    expect(only(a, 'opened').payload.name).toBe('find-layouts.dxf')
    expect(only(b, 'opened').payload.name).toBe('find-blocks.dxf')
    expect(h.session.document?.name).toBe('find-blocks.dxf')
  })
})

describe('FIND (D-4): sem fallback silencioso', () => {
  test('sem documento → error{no-document} (nunca findResult vazio)', async () => {
    const h = harness()
    expect(only(await h.send('find', find('Sala')), 'error').payload.code).toBe(
      'no-document'
    )
  })

  test('multi-layout: hits por tabOrder, layoutCount, mesma projecção que o FIND real', async () => {
    const h = await openedHarness()
    const r = await search(h, 'Sala Técnica')
    const doc = h.session.document!
    const real = acapFindText(doc.database as never, 'Sala Técnica', {
      scope: 'drawing',
      currentLayoutId: doc.activeLayoutId
    })
    expect(r.total).toBe(real.hits.length)
    expect(r.total).toBeGreaterThanOrEqual(2)
    expect(r.layoutCount).toBeGreaterThanOrEqual(2)
    expect(r.hits.map(x => x.layoutId)).toEqual(real.hits.map(x => x.layoutId))
    expect(h.session.activeFindId).toBe(r.findId)
  })

  test('scope layout com layout activo desconhecido → error{layout-missing}; com layout conhecido só esse layout', async () => {
    const h = await openedHarness()
    const model = h.view.layout
    h.view.layout = 'NAO-EXISTE'
    expect(
      only(await h.send('find', find('Sala', { scope: 'layout' })), 'error')
        .payload.code
    ).toBe('layout-missing')
    expect(h.session.activeFindId).toBeNull()
    h.view.layout = model
    const r = await search(h, 'Sala', { scope: 'layout' })
    expect(r.total).toBeGreaterThan(0)
    expect(new Set(r.hits.map(x => x.layoutId))).toEqual(new Set([model]))
  })

  test('sem match → total 0; findNext → findActive{-1, stale} sem navegar', async () => {
    const h = await openedHarness()
    const r = await search(h, 'zzz-nada')
    expect(r).toMatchObject({
      total: 0,
      hits: [],
      truncated: false,
      layoutCount: 0
    })
    const a = only(
      await h.send('findNext', { findId: r.findId }),
      'findActive'
    ).payload
    expect(a).toEqual({ findId: r.findId, index: -1, outcome: 'stale' })
    expect(h.view.navs).toHaveLength(0)
  })

  test('query com metacaracteres é literal (sem regex)', async () => {
    const h = await openedHarness()
    expect((await search(h, '.*')).total).toBe(0)
    expect((await search(h, 'QE-01')).total).toBeGreaterThan(0)
  })

  test('maxResults:1 → truncated e 1 hit', async () => {
    const h = await openedHarness()
    const r = await search(h, 'a', { maxResults: 1 })
    expect(r).toMatchObject({ total: 1, truncated: true })
  })

  test('FIND que lança → error{find-failed}; a pesquisa anterior fica anulada (stale-find)', async () => {
    let boom = false
    const findText: FindTextFn = (db, q, o) => {
      if (boom) throw new Error('falha no FIND')
      return acapFindText(db as never, q, o)
    }
    const h = await openedHarness(LAYOUTS, 'find-layouts.dxf', { findText })
    const r = await search(h, 'Sala')
    boom = true
    const e = only(await h.send('find', find('Quadro')), 'error').payload
    expect(e).toMatchObject({ code: 'find-failed', message: 'falha no FIND' })
    expect(
      only(await h.send('goto', { findId: r.findId, index: 0 }), 'error')
        .payload.code
    ).toBe('stale-find')
    expect(h.view.navs).toHaveLength(0)
  })

  test.each([
    ['hits não é array', () => ({ hits: null, truncated: false })],
    [
      'mais hits que maxResults',
      (real: ReturnType<typeof acapFindText>) => ({
        ...real,
        hits: [...real.hits, ...real.hits]
      })
    ],
    [
      'kind fora do contrato',
      (real: ReturnType<typeof acapFindText>) => ({
        ...real,
        hits: real.hits.map(x => ({ ...x, kind: 'xline' }))
      })
    ]
  ])('resultado inválido (%s) → error{find-failed}', async (_l, mutate) => {
    const findText: FindTextFn = (db, q, o) =>
      mutate(acapFindText(db as never, q, { ...o })) as never
    const h = await openedHarness(LAYOUTS, 'find-layouts.dxf', { findText })
    const out = await h.send('find', find('Sala', { maxResults: 2 }))
    expect(only(out, 'error').payload.code).toBe('find-failed')
    expect(h.session.activeFindId).toBeNull()
  })

  test('hit sem entidade no mapa → findResult + log{warn}; goto → error{hit-unresolved} sem tocar na vista', async () => {
    const findText: FindTextFn = (db, q, o) => {
      const real = acapFindText(db as never, q, o)
      return {
        ...real,
        hits: real.hits.map((x, i) =>
          i === 0 ? { ...x, entityId: 'FANTASMA' } : x
        )
      }
    }
    const h = await openedHarness(LAYOUTS, 'find-layouts.dxf', { findText })
    const out = await h.send('find', find('Sala'))
    const r = only(out, 'findResult').payload
    expect(
      out.some(
        m =>
          m.type === 'log' &&
          m.payload.level === 'warn' &&
          /1 hit\(s\) sem entidade/.test(m.payload.message)
      )
    ).toBe(true)
    expect(
      only(await h.send('goto', { findId: r.findId, index: 0 }), 'error')
        .payload.code
    ).toBe('hit-unresolved')
    expect(h.view.navs).toHaveLength(0)
    // os outros hits continuam navegáveis
    if (r.total > 1) {
      expect(
        only(await h.send('goto', { findId: r.findId, index: 1 }), 'findActive')
          .payload.outcome
      ).toBe('navigated')
    }
  })

  test('hit sem caixa finita → findResult + log{warn}; goto → error{hit-not-zoomable}', async () => {
    const findText: FindTextFn = (db, q, o) => {
      const real = acapFindText(db as never, q, o)
      return {
        ...real,
        hits: real.hits.map((x, i) =>
          i === 0
            ? {
                ...x,
                extents: { min: { x: 0, y: NaN }, max: { x: 1, y: NaN } }
              }
            : x
        )
      }
    }
    const h = await openedHarness(LAYOUTS, 'find-layouts.dxf', { findText })
    const out = await h.send('find', find('Sala'))
    const r = only(out, 'findResult').payload
    expect(
      out.some(
        m => m.type === 'log' && /1 sem caixa de zoom/.test(m.payload.message)
      )
    ).toBe(true)
    expect(
      only(await h.send('goto', { findId: r.findId, index: 0 }), 'error')
        .payload.code
    ).toBe('hit-not-zoomable')
    expect(h.view.navs).toHaveLength(0)
    expect(h.view.zooms).toHaveLength(0)
  })

  test('pesquisa nova limpa o realce e anula a anterior', async () => {
    const h = await openedHarness()
    const a = await search(h, 'Sala')
    const clears = h.view.clears
    const b = await search(h, 'Quadro')
    expect(b.findId).toBe(a.findId + 1)
    expect(h.view.clears).toBe(clears + 1)
    expect(
      only(await h.send('goto', { findId: a.findId, index: 0 }), 'error')
        .payload.code
    ).toBe('stale-find')
  })
})

describe('navegação e seleção', () => {
  test('goto: alvo = hit real + caixa do índice; insets de setInsets e do payload', async () => {
    const h = await openedHarness()
    const r = await search(h, 'Sala')
    await h.send('setInsets', { left: 0, right: 0, top: 0, bottom: 300 })
    const a = only(
      await h.send('goto', { findId: r.findId, index: 0 }),
      'findActive'
    ).payload
    expect(a).toEqual({ findId: r.findId, index: 0, outcome: 'navigated' })
    const t = h.view.navs[0]
    expect(t.hit.entityId).toBe(t.entry.entityId)
    expect(t.box).toEqual(t.entry.box)
    expect(t.insets).toEqual({ left: 0, right: 0, top: 0, bottom: 300 })
    await h.send('goto', {
      findId: r.findId,
      index: 0,
      insets: { left: 1, right: 2, top: 3, bottom: 4 }
    })
    expect(h.view.navs[1].insets).toEqual({
      left: 1,
      right: 2,
      top: 3,
      bottom: 4
    })
  })

  test('findNext/findPrev: de -1 vai a 0 nos dois sentidos; wrap módulo n', async () => {
    const h = await openedHarness()
    const r = await search(h, 'a')
    const n = r.total
    expect(n).toBeGreaterThan(2)
    const step = async (type: 'findNext' | 'findPrev') =>
      only(await h.send(type, { findId: r.findId }), 'findActive').payload.index
    expect(await step('findPrev')).toBe(0)
    expect(await step('findPrev')).toBe(n - 1)
    expect(await step('findNext')).toBe(0)
    expect(await step('findNext')).toBe(1)
  })

  test('goto fora de intervalo → error{index-out-of-range}', async () => {
    const h = await openedHarness()
    const r = await search(h, 'Sala')
    expect(
      only(await h.send('goto', { findId: r.findId, index: r.total }), 'error')
        .payload.code
    ).toBe('index-out-of-range')
  })

  test('navegação que lança → error{navigate-failed}; activeIndex inalterado', async () => {
    const h = await openedHarness()
    const r = await search(h, 'a')
    h.view.fail.navigate = new Error('webgl perdido')
    expect(
      only(await h.send('findNext', { findId: r.findId }), 'error').payload
    ).toMatchObject({ code: 'navigate-failed', message: 'webgl perdido' })
    delete h.view.fail.navigate
    expect(
      only(await h.send('findNext', { findId: r.findId }), 'findActive').payload
        .index
    ).toBe(0)
  })

  test('resultado de navegação desconhecido → error{navigate-failed}', async () => {
    const h = await openedHarness()
    const r = await search(h, 'Sala')
    h.view.outcome = 'teleported' as never
    expect(
      only(await h.send('goto', { findId: r.findId, index: 0 }), 'error')
        .payload.code
    ).toBe('navigate-failed')
  })

  test.each([
    'layout-missing',
    'layout-switch-failed',
    'layout-mismatch',
    'no-document'
  ] as const)(
    'navegação %s → findActive{-1, %s}; activeIndex inalterado',
    async outcome => {
      const h = await openedHarness()
      const r = await search(h, 'a')
      h.view.outcome = outcome
      expect(
        only(await h.send('findNext', { findId: r.findId }), 'findActive')
          .payload
      ).toEqual({ findId: r.findId, index: -1, outcome })
      h.view.outcome = 'navigated'
      expect(
        only(await h.send('findNext', { findId: r.findId }), 'findActive')
          .payload.index
      ).toBe(0)
    }
  )

  test.each([
    [
      'clearHighlight',
      async (h: ReturnType<typeof harness>) => h.send('clearHighlight', {})
    ],
    [
      'find novo',
      async (h: ReturnType<typeof harness>) => h.send('find', find('Quadro'))
    ],
    [
      'open novo',
      async (h: ReturnType<typeof harness>) => h.open('find-blocks.dxf', BLOCKS)
    ]
  ])(
    'navegação ultrapassada por %s → findActive{-1, stale}',
    async (_l, interrupt) => {
      const h = await openedHarness()
      const r = await search(h, 'Sala')
      const gate = deferred<'navigated'>()
      h.view.outcome = () => gate.promise
      const pending = h.send('goto', { findId: r.findId, index: 0 })
      await new Promise(res => setImmediate(res))
      await interrupt(h)
      gate.resolve('navigated')
      expect(only(await pending, 'findActive').payload).toEqual({
        findId: r.findId,
        index: -1,
        outcome: 'stale'
      })
    }
  )

  test('goto após open novo → stale-find', async () => {
    const h = await openedHarness()
    const r = await search(h, 'Sala')
    only(await h.open('find-blocks.dxf', BLOCKS), 'opened')
    expect(
      only(await h.send('goto', { findId: r.findId, index: 0 }), 'error')
        .payload.code
    ).toBe('stale-find')
  })

  test.each(['find-layouts.dxf', 'find-blocks.dxf'])(
    'propriedade (%s): todo o hit navega com caixa finita que contém a posição e entidade do layout do hit',
    async fixture => {
      const h = await openedHarness(e2eBytes(fixture), fixture)
      for (const q of ['a', 'e', 'Sala', 'QE', 'o']) {
        const r = await search(h, q)
        for (let i = 0; i < r.total; i++) {
          h.view.navs = []
          const a = only(
            await h.send('goto', { findId: r.findId, index: i }),
            'findActive'
          ).payload
          expect(a.outcome).toBe('navigated')
          const t = h.view.navs[0]
          expect(t.entry.layoutId).toBe(r.hits[i].layoutId)
          expect(
            h.session.documentMap?.entity(t.entry.layoutId, t.entry.entityId)
          ).toBeDefined()
          const { min, max } = t.box
          expect([min.x, min.y, max.x, max.y].every(Number.isFinite)).toBe(true)
          expect(t.hit.position.x).toBeGreaterThanOrEqual(min.x)
          expect(t.hit.position.x).toBeLessThanOrEqual(max.x)
        }
      }
    }
  )
})

describe('zoom e realce', () => {
  test('sem documento → error{no-document}', async () => {
    const h = harness()
    expect(
      only(await h.send('zoom', { op: 'extents' }), 'error').payload.code
    ).toBe('no-document')
  })

  test('extents → viewBox do layout activo (margem 1)', async () => {
    const h = await openedHarness()
    expect(await h.send('zoom', { op: 'extents' })).toEqual([])
    const layout = h.session.documentMap!.layout(h.view.layout!)!
    expect(h.view.zooms).toEqual([{ box: layout.viewBox, margin: 1 }])
  })

  test('extents com layout activo desconhecido → error{layout-missing}, sem zoom', async () => {
    const h = await openedHarness()
    h.view.layout = null
    expect(
      only(await h.send('zoom', { op: 'extents' }), 'error').payload.code
    ).toBe('layout-missing')
    expect(h.view.zooms).toHaveLength(0)
  })

  test('in → caixa visível ÷ 2 à volta do centro', async () => {
    const h = await openedHarness()
    await h.send('zoom', { op: 'in' })
    expect(h.view.zooms[0].box).toEqual({
      min: { x: 25, y: 12.5 },
      max: { x: 75, y: 37.5 }
    })
  })

  test.each([
    ['nula', (v: FakeView) => (v.box = null)],
    [
      'não-finita',
      (v: FakeView) => (v.box = { min: { x: 0, y: 0 }, max: { x: NaN, y: 1 } })
    ],
    ['que lança', (v: FakeView) => (v.fail.visibleBox = new Error('x'))]
  ])(
    'caixa visível %s → error{view-unavailable}, sem zoom',
    async (_l, breakView) => {
      const h = await openedHarness()
      breakView(h.view)
      expect(
        only(await h.send('zoom', { op: 'out' }), 'error').payload.code
      ).toBe('view-unavailable')
      expect(h.view.zooms).toHaveLength(0)
    }
  )

  test('limite de zoom → error{zoom-limit}, sem zoom', async () => {
    const h = await openedHarness()
    h.view.box = { min: { x: 0, y: 0 }, max: { x: MIN_VIEW_SIZE * 1.5, y: 1 } }
    expect(
      only(await h.send('zoom', { op: 'in', factor: 10 }), 'error').payload.code
    ).toBe('zoom-limit')
    expect(h.view.zooms).toHaveLength(0)
  })

  test('zoomTo que lança → error{view-failed}', async () => {
    const h = await openedHarness()
    h.view.fail.zoomTo = new Error('contexto WebGL perdido')
    expect(
      only(await h.send('zoom', { op: 'extents' }), 'error').payload
    ).toMatchObject({ code: 'view-failed', message: 'contexto WebGL perdido' })
  })

  test('clearHighlight limpa; sem documento é no-op; vista que lança → error{view-failed}', async () => {
    const empty = harness()
    expect(await empty.send('clearHighlight', {})).toEqual([])
    expect(empty.view.clears).toBe(0)
    const h = await openedHarness()
    const clears = h.view.clears
    expect(await h.send('clearHighlight', {})).toEqual([])
    expect(h.view.clears).toBe(clears + 1)
    h.view.fail.clearSelection = new Error('x')
    expect(only(await h.send('clearHighlight', {}), 'error').payload.code).toBe(
      'view-failed'
    )
  })

  test('clearHighlight mantém a posição: findNext continua de onde estava', async () => {
    const h = await openedHarness()
    const r = await search(h, 'a')
    await h.send('findNext', { findId: r.findId })
    await h.send('clearHighlight', {})
    expect(
      only(await h.send('findNext', { findId: r.findId }), 'findActive').payload
        .index
    ).toBe(1)
  })
})
