// SPDX-License-Identifier: GPL-3.0-or-later
//
// Índice FIND (spec M2-I3 §3.5): identidade, zoom consistente e projecção do
// protocolo, com a base de dados REAL do parser DXF e o FIND REAL
// (`acapFindText`). Fixtures de e2e lidas in-place (sem cópia).

import {
  type AcApFindDatabaseLike,
  acapFindText
} from '@mlightcad/cad-simple-viewer/find'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  OPEN_FAILED_CODES,
  parseViewerMessage
} from '../../../apps/freedom-mobile/src/contracts/protocol'
import type { ImportedDocument } from '../src/import/types'
import { mapDocument } from '../src/model/documentMap'
import { buildFindIndex } from '../src/model/findIndex'
import { containsPoint } from '../src/model/normalize'
import { openE2e, openText } from './helpers/openFixture'
import { buildDxf, rawEntity } from './helpers/syntheticDxf'

type FindDb = Parameters<typeof acapFindText>[0]

async function setup(fixture: string) {
  const doc = await openE2e(fixture)
  const out = mapDocument(doc)
  if (!out.ok) throw new Error('mapa devia abrir')
  return { doc, map: out.map, db: doc.database as unknown as FindDb }
}

function search(
  doc: ImportedDocument,
  query: string,
  extra: { matchCase?: boolean; maxResults?: number } = {}
) {
  return acapFindText(doc.database as unknown as FindDb, query, {
    currentLayoutId: doc.activeLayoutId,
    scope: 'drawing',
    ...extra
  })
}

/** mulberry32 (semente fixa → falhas reproduzíveis). */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const QUERIES = ['a', 'e', 'o', 'sala', 'qe-01', 'projeto', 'ç', '1', '0', 'x']

describe.each(['find-layouts.dxf', 'find-blocks.dxf', 'block-color.dxf'])(
  'invariantes de identidade e zoom em %s',
  fixture => {
    it('para toda a query: hit resolvido, na ordem do FIND, com caixa de zoom válida', async () => {
      const { doc, map, db } = await setup(fixture)
      let totalHits = 0
      for (const query of QUERIES) {
        const result = search(doc, query)
        const index = buildFindIndex(map, db as AcApFindDatabaseLike, result, {
          query
        })
        expect(index.entries).toHaveLength(result.hits.length)
        expect(index.unresolved).toBe(0)
        index.entries.forEach((e, i) => {
          totalHits++
          const hit = result.hits[i]
          expect(e.index).toBe(i)
          expect(e.entityId).toBe(hit.entityId)
          expect(e.textEntityId).toBe(hit.textEntityId)
          // identidade: a entidade seleccionada existe no mapa do MESMO layout
          expect(e.resolved).toBe(true)
          expect(e.entity?.layoutId).toBe(hit.layoutId)
          expect(e.entity?.id).toBe(hit.entityId)
          expect(e.entity?.searchable).toBe(true)
          expect(e.entity?.support).not.toBe('unsupported')
          // zoom: caixa finita e não degenerada que contém o texto do hit
          expect(e.zoomable).toBe(true)
          const target = hit.extents
            ? {
                x: (hit.extents.min.x + hit.extents.max.x) / 2,
                y: (hit.extents.min.y + hit.extents.max.y) / 2
              }
            : hit.position
          expect(containsPoint(e.box, target)).toBe(true)
          expect(containsPoint(e.box, hit.position)).toBe(true)
        })
        const layoutIds = new Set(result.hits.map(h => h.layoutId))
        expect(index.layoutCount).toBe(layoutIds.size)
      }
      expect(totalHits).toBeGreaterThan(0)
    })

    it('propriedade: qualquer substring do texto de um hit encontra esse hit (mesma entidade/layout)', async () => {
      const { doc, map, db } = await setup(fixture)
      const base = search(doc, 'a').hits.concat(search(doc, 'o').hits)
      const next = rng(104)
      for (let n = 0; n < 40 && base.length; n++) {
        const hit = base[Math.floor(next() * base.length)]
        const start = Math.floor(next() * hit.text.length)
        const len = 1 + Math.floor(next() * (hit.text.length - start))
        const query = hit.text.slice(start, start + len)
        if (!query.trim()) continue
        const result = search(doc, query, { matchCase: true })
        const index = buildFindIndex(map, db as AcApFindDatabaseLike, result, {
          query,
          matchCase: true
        })
        const found = index.entries.find(
          e =>
            e.textEntityId === hit.textEntityId && e.layoutId === hit.layoutId
        )
        expect(found).toBeDefined()
        expect(found?.entityId).toBe(hit.entityId)
        expect(found?.resolved).toBe(true)
        expect(found?.zoomable).toBe(true)
      }
    })
  }
)

describe('texto em bloco, atributos e truncagem', () => {
  it('hit em bloco selecciona o INSERT do layout e faz zoom ao texto aninhado', async () => {
    const { doc, map, db } = await setup('find-blocks.dxf')
    const result = search(doc, 'Projeto Escola Modelo')
    const index = buildFindIndex(map, db as AcApFindDatabaseLike, result, {
      query: 'Projeto Escola Modelo'
    })
    expect(index.entries).toHaveLength(1)
    const e = index.entries[0]
    expect(e).toMatchObject({
      entityId: 'F14',
      textEntityId: 'F14/F12',
      kind: 'block',
      layoutName: 'Model',
      resolved: true
    })
    expect(e.entity?.type).toBe('INSERT')
    // o zoom é ao texto (extents 920..1088 × −190..−182), não ao bloco inteiro
    const cx = e.box.min.x + (e.box.max.x - e.box.min.x) / 2
    const cy = e.box.min.y + (e.box.max.y - e.box.min.y) / 2
    expect(cx).toBeCloseTo((920 + 1088) / 2, 6)
    expect(cy).toBeCloseTo((-190 + -182) / 2, 6)
    expect(e.box.max.x - e.box.min.x).toBeLessThan(2000)
  })

  it('truncated e maxResults: índice acompanha o resultado e o contador de layouts', async () => {
    const { doc, map, db } = await setup('find-layouts.dxf')
    const result = search(doc, 'a', { maxResults: 1 })
    const index = buildFindIndex(map, db as AcApFindDatabaseLike, result, {
      query: 'a'
    })
    expect(index.truncated).toBe(result.truncated)
    expect(index.entries).toHaveLength(1)
    expect(index.layoutCount).toBe(1)
  })

  it('sem match → índice vazio válido', async () => {
    const { doc, map, db } = await setup('find-layouts.dxf')
    const index = buildFindIndex(
      map,
      db as AcApFindDatabaseLike,
      search(doc, 'zzzz-sem-match'),
      { query: 'zzzz-sem-match' }
    )
    expect(index.entries).toEqual([])
    expect(index.layoutCount).toBe(0)
    expect(index.toFindHits()).toEqual([])
    expect(index.truncated).toBe(false)
  })

  it('entry(): fora de intervalo, negativo, fraccionário e NaN → undefined', async () => {
    const { doc, map, db } = await setup('find-layouts.dxf')
    const result = search(doc, 'sala')
    const index = buildFindIndex(map, db as AcApFindDatabaseLike, result, {
      query: 'sala'
    })
    expect(index.entries.length).toBeGreaterThan(0)
    expect(index.entry(0)).toBe(index.entries[0])
    for (const bad of [-1, index.entries.length, 0.5, NaN, Infinity]) {
      expect(index.entry(bad)).toBeUndefined()
    }
  })
})

describe('hit sem entidade no mapa nunca é ignorado em silêncio', () => {
  it('mapa de OUTRO documento: todos os hits ficam resolved:false e contados', async () => {
    const { doc, db } = await setup('find-layouts.dxf')
    const other = await openText(
      'other.dxf',
      buildDxf({ rawEntities: [rawEntity('LINE', [10, 0], [11, 1])] })
    )
    const otherMap = mapDocument(other)
    if (!otherMap.ok) throw new Error('esperava ok')
    const result = search(doc, 'a')
    const index = buildFindIndex(
      otherMap.map,
      db as AcApFindDatabaseLike,
      result,
      { query: 'a' }
    )
    expect(index.entries).toHaveLength(result.hits.length)
    expect(result.hits.length).toBeGreaterThan(0)
    expect(index.unresolved).toBe(result.hits.length)
    expect(index.entries.every(e => !e.resolved && e.entity === null)).toBe(
      true
    )
    // a caixa de zoom continua disponível: o utilizador ainda chega ao texto
    expect(index.entries.every(e => e.zoomable)).toBe(true)
  })

  it('acapFindHitBox a lançar → caixa mínima na posição do hit (finita)', async () => {
    const { doc, map } = await setup('find-layouts.dxf')
    const result = search(doc, 'sala')
    const brokenDb = {
      tables: {
        blockTable: {
          getIdAt: () => {
            throw new Error('db fechada')
          }
        }
      }
    } as unknown as AcApFindDatabaseLike
    const index = buildFindIndex(map, brokenDb, result, { query: 'sala' })
    expect(index.entries.length).toBeGreaterThan(0)
    for (const e of index.entries) {
      expect(e.zoomable).toBe(true)
      expect(containsPoint(e.box, e.position)).toBe(true)
    }
  })
})

describe('projecção para o protocolo (findResult)', () => {
  const envelope = (payload: unknown) =>
    JSON.stringify({
      v: 1,
      id: 'w-1',
      type: 'findResult',
      replyTo: 'a-1',
      payload
    })

  it('toFindHits passa o validador REAL do app e não vaza entityId/extents/position', async () => {
    const { doc, map, db } = await setup('find-blocks.dxf')
    for (const query of ['a', 'projeto', 'carimbo']) {
      const result = search(doc, query)
      const index = buildFindIndex(map, db as AcApFindDatabaseLike, result, {
        query
      })
      const hits = index.toFindHits()
      const parsed = parseViewerMessage(
        envelope({
          findId: 1,
          total: hits.length,
          truncated: index.truncated,
          layoutCount: index.layoutCount,
          hits
        })
      )
      expect(parsed).toMatchObject({ ok: true })
      hits.forEach((h, i) => {
        expect(h.index).toBe(i)
        expect(Object.keys(h)).not.toEqual(expect.arrayContaining(['entityId']))
        expect(h).not.toHaveProperty('extents')
        expect(h).not.toHaveProperty('position')
        expect(h).not.toHaveProperty('textEntityId')
      })
    }
  })

  it('excerpt: texto curto intacto; texto longo cortado com reticências e contém a query', async () => {
    const long = `${'lorem ipsum '.repeat(12)}AGULHA${' dolor sit '.repeat(12)}`
    const doc = await openText(
      'long.dxf',
      buildDxf({ texts: [{ text: 'curto' }, { text: long }] })
    )
    const out = mapDocument(doc)
    if (!out.ok) throw new Error('esperava ok')
    const db = doc.database as unknown as FindDb
    const result = search(doc, 'agulha')
    const index = buildFindIndex(out.map, db as AcApFindDatabaseLike, result, {
      query: 'agulha'
    })
    const [hit] = index.toFindHits()
    expect(hit.excerpt.length).toBeLessThan(long.length)
    expect(hit.excerpt).toMatch(/…/)
    expect(hit.excerpt.toLowerCase()).toContain('agulha')
    const short = buildFindIndex(
      out.map,
      db as AcApFindDatabaseLike,
      search(doc, 'curto'),
      { query: 'curto' }
    ).toFindHits()[0]
    expect(short.excerpt).toBe('curto')
  })

  it('o `kind` dos hits pertence ao vocabulário do protocolo', async () => {
    const protocol = readFileSync(
      resolve(
        __dirname,
        '../../../apps/freedom-mobile/src/contracts/protocol.ts'
      ),
      'utf8'
    )
    const { doc, map, db } = await setup('find-blocks.dxf')
    const index = buildFindIndex(
      map,
      db as AcApFindDatabaseLike,
      search(doc, 'a'),
      { query: 'a' }
    )
    for (const h of index.toFindHits()) {
      expect(protocol).toContain(`'${h.kind}'`)
    }
    // sanidade do import do contrato (o validador real está ligado)
    expect(OPEN_FAILED_CODES).toContain('parse')
  })
})

describe('coerência com a navegação do FIND', () => {
  it('acapNavigateToFindHit enquadra com acapFindHitBox (a caixa do índice)', () => {
    const navigator = readFileSync(
      resolve(
        __dirname,
        '../../cad-simple-viewer/src/find/AcApFindNavigator.ts'
      ),
      'utf8'
    )
    expect(navigator).toMatch(/acapFindHitBox\(/)
    // selecciona a entidade de topo do hit (a mesma que o índice resolve)
    expect(navigator).toMatch(/selectionSet\.add\(hit\.entityId\)/)
  })
})
