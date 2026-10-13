// SPDX-License-Identifier: GPL-3.0-or-later
//
// Mapa do documento e falha explícita (spec M2-I3 §§3.2–3.4), com a base de
// dados REAL do parser DXF (fixtures de e2e lidas in-place) e com bases
// estruturais para os casos extremos.

import { toOpenFailedPayload } from '../src/import/errors'
import {
  DEFAULT_MAX_ENTITIES,
  describeCoverage,
  type MapDatabaseLike,
  mapDocument,
  NO_RENDERABLE_MESSAGE
} from '../src/model/documentMap'
import { DEFAULT_VIEW_BOX } from '../src/model/normalize'
import { containsPoint } from '../src/model/normalize'
import { openE2e, openText } from './helpers/openFixture'
import { buildDxf, rawEntity } from './helpers/syntheticDxf'

const ext = (x0: number, y0: number, x1: number, y1: number) => ({
  min: { x: x0, y: y0 },
  max: { x: x1, y: y1 }
})

function fakeDb(
  layouts: Record<string, Record<string, unknown>[]>,
  layers: Record<string, { isOff?: boolean; isFrozen?: boolean }> = {}
): MapDatabaseLike {
  return {
    tables: {
      blockTable: {
        getIdAt: id =>
          layouts[id] ? { newIterator: () => layouts[id] as never } : undefined
      },
      layerTable: { getAt: n => layers[n] }
    }
  }
}
const ent = (id: string, type: string, over: Record<string, unknown> = {}) => ({
  objectId: id,
  dxfTypeName: type,
  layer: '0',
  visibility: true,
  geometricExtents: ext(0, 0, 10, 10),
  ...over
})
const L = (id: string, name = id, tabOrder = 0) => ({
  btrId: id,
  name,
  tabOrder
})

describe('mapDocument com fixtures reais', () => {
  it('find-layouts.dxf: 3 layouts com identidade, tipos, caixas e extensões', async () => {
    const doc = await openE2e('find-layouts.dxf')
    const out = mapDocument(doc)
    if (!out.ok) throw new Error('esperava ok')
    const { map } = out
    expect(
      map.layouts.map(l => [l.name, l.layoutId, l.entities.length])
    ).toEqual([
      ['Model', '1F', 5],
      ['Planta', '21', 7],
      ['Alçados', '23', 7]
    ])
    expect(map.entityCount).toBe(19)
    expect(map.coverage).toMatchObject({
      status: 'complete',
      rendered: 19,
      partial: 0,
      unsupported: 0,
      dropped: 0
    })
    const b1 = map.entity('1F', 'B1')
    expect(b1).toMatchObject({
      id: 'B1',
      type: 'TEXT',
      layer: 'NOTES',
      layoutId: '1F',
      searchable: true,
      support: 'rendered',
      bboxStatus: 'ok',
      bbox: ext(0, 0, 300, 20)
    })
    // uma entidade de um layout não resolve noutro
    expect(map.entity('21', 'B1')).toBeUndefined()
    expect(map.entity('nope', 'B1')).toBeUndefined()
    expect(map.layout('21')?.name).toBe('Planta')
  })

  it('a extensão do layout contém todas as caixas visíveis e a vista contém a extensão', async () => {
    const doc = await openE2e('find-layouts.dxf')
    const out = mapDocument(doc)
    if (!out.ok) throw new Error('esperava ok')
    for (const layout of out.map.layouts) {
      expect(layout.extents).not.toBeNull()
      expect(layout.viewBoxReason).toBe('extents')
      for (const e of layout.entities) {
        if (e.bbox && e.visible) {
          expect(containsPoint(layout.extents!, e.bbox.min)).toBe(true)
          expect(containsPoint(layout.extents!, e.bbox.max)).toBe(true)
        }
      }
      expect(containsPoint(layout.viewBox, layout.extents!.min)).toBe(true)
      expect(containsPoint(layout.viewBox, layout.extents!.max)).toBe(true)
    }
    // Planta = rectângulo 800×600 + textos
    expect(out.map.layout('21')?.extents?.max).toMatchObject({ x: 800 })
  })

  it('a camada OCULTA (desligada) mantém a entidade no mapa mas fora da extensão', async () => {
    const doc = await openE2e('find-layouts.dxf')
    const out = mapDocument(doc)
    if (!out.ok) throw new Error('esperava ok')
    const b5 = out.map.entity('1F', 'B5')!
    expect(b5.layer).toBe('OCULTA')
    expect(b5.visible).toBe(false)
    const model = out.map.layout('1F')!
    // B5 está em [300,-300,940,-280]; sem ele a extensão não desce a -300
    expect(model.extents!.min.y).toBeGreaterThan(-300)
  })

  it('find-blocks.dxf: INSERT na lista do layout com identidade do bloco', async () => {
    const doc = await openE2e('find-blocks.dxf')
    const out = mapDocument(doc)
    if (!out.ok) throw new Error('esperava ok')
    expect(out.map.entity('1F', 'F14')).toMatchObject({
      type: 'INSERT',
      searchable: true,
      support: 'rendered'
    })
  })

  it('block-color.dxf: layout vazio e layout só com VIEWPORT (parcial) são válidos', async () => {
    const doc = await openE2e('block-color.dxf')
    const out = mapDocument(doc)
    if (!out.ok) throw new Error('esperava ok')
    const names = out.map.layouts.map(l => l.name)
    expect(names).toContain('布局1')
    const empty = out.map.layouts.find(l => l.name === '布局1')!
    expect(empty.entities).toEqual([])
    expect(empty.extents).toBeNull()
    expect(empty.viewBoxReason).toBe('empty-layout')
    expect(empty.viewBox).toEqual(DEFAULT_VIEW_BOX)
    expect(out.map.coverage.partialByType).toEqual({ VIEWPORT: 1 })
    expect(out.map.coverage.status).toBe('partial')
  })

  it('DXF com tipo desconhecido: perda explícita (dropped) e estado partial', async () => {
    const text = buildDxf({
      texts: [{ text: 'olá' }],
      rawEntities: [rawEntity('REGION', [8, '0'])]
    })
    const doc = await openText('p.dxf', text)
    const out = mapDocument(doc, { dropped: { REGION: 1 } })
    if (!out.ok) throw new Error('esperava ok')
    expect(out.map.coverage).toMatchObject({
      status: 'partial',
      rendered: 1,
      dropped: 1,
      droppedByType: { REGION: 1 }
    })
    expect(describeCoverage(out.map.coverage)).toMatch(/REGION×1/)
    expect(describeCoverage(out.map.coverage)).not.toMatch(/completa/)
  })
})

describe('mapDocument — falha explícita', () => {
  it('só entidades não suportadas → ok:false parse/inspect com mensagem própria', () => {
    const db = fakeDb({ A: [ent('1', 'OLEFRAME'), ent('2', 'REGION')] })
    const out = mapDocument({ layouts: [L('A')], database: db })
    if (out.ok) throw new Error('esperava falha')
    expect(out.failure.code).toBe('parse')
    expect(out.failure.stage).toBe('inspect')
    expect(out.failure.message).toBe(NO_RENDERABLE_MESSAGE)
    expect(out.failure.detail).toMatch(/OLEFRAME×1/)
    expect(out.failure.detail).toMatch(/REGION×1/)
    expect(out.coverage.status).toBe('nothing-renderable')
    // serializa para o protocolo (OpenFailedPayload)
    expect(toOpenFailedPayload(out.failure)).toEqual({
      code: 'parse',
      message: NO_RENDERABLE_MESSAGE
    })
  })

  it('só perdas do conversor (nada na base de dados) → falha; nenhuma perda e nenhuma entidade → vazio válido', () => {
    const db = fakeDb({ A: [] })
    const failed = mapDocument(
      { layouts: [L('A')], database: db },
      { dropped: { '3DSOLID': 4 } }
    )
    expect(failed.ok).toBe(false)
    const empty = mapDocument({ layouts: [L('A')], database: db })
    if (!empty.ok) throw new Error('desenho vazio devia abrir')
    expect(empty.map.coverage.status).toBe('empty')
  })

  it('um parcial (VIEWPORT) conta como desenhável: não falha', () => {
    const db = fakeDb({ A: [ent('1', 'VIEWPORT')] })
    expect(mapDocument({ layouts: [L('A')], database: db }).ok).toBe(true)
  })

  it('misto: unsupported + rendered → ok, partial, e reporta os tipos', () => {
    const db = fakeDb({ A: [ent('1', 'LINE'), ent('2', 'OLEFRAME')] })
    const out = mapDocument({ layouts: [L('A')], database: db })
    if (!out.ok) throw new Error('esperava ok')
    expect(out.map.coverage).toMatchObject({
      status: 'partial',
      rendered: 1,
      unsupported: 1,
      unsupportedByType: { OLEFRAME: 1 }
    })
  })

  it('complete só quando nada foi parcial, perdido, não suportado ou truncado', () => {
    const db = fakeDb({ A: [ent('1', 'LINE')] })
    const ok = mapDocument({ layouts: [L('A')], database: db })
    expect(ok.ok && ok.map.coverage.status).toBe('complete')
    const lost = mapDocument(
      { layouts: [L('A')], database: db },
      { dropped: { X: 1 } }
    )
    expect(lost.ok && lost.map.coverage.status).toBe('partial')
  })
})

describe('mapDocument — robustez', () => {
  it('maxEntities: o excesso fica contado em `truncated` e torna o estado partial', () => {
    const many = Array.from({ length: 10 }, (_v, i) => ent(`e${i}`, 'LINE'))
    const out = mapDocument(
      { layouts: [L('A')], database: fakeDb({ A: many }) },
      { maxEntities: 4 }
    )
    if (!out.ok) throw new Error('esperava ok')
    expect(out.map.entityCount).toBe(4)
    expect(out.map.coverage.truncated).toBe(6)
    expect(out.map.coverage.status).toBe('partial')
    expect(DEFAULT_MAX_ENTITIES).toBeGreaterThan(1_000_000)
  })

  it('layout sem registo, iterador que lança a meio e entidades com excepções não derrubam', () => {
    function* boom() {
      yield ent('1', 'LINE')
      throw new Error('iterador estragado')
    }
    const db: MapDatabaseLike = {
      tables: {
        blockTable: {
          getIdAt: id =>
            id === 'A'
              ? { newIterator: () => boom() as never }
              : id === 'B'
                ? undefined
                : {
                    newIterator: () => {
                      throw new Error('sem iterador')
                    }
                  }
        }
      }
    }
    const out = mapDocument({
      layouts: [L('A'), L('B', 'B', 1), L('C', 'C', 2)],
      database: db
    })
    if (!out.ok) throw new Error('esperava ok')
    expect(out.map.layouts.map(l => l.entities.length)).toEqual([1, 0, 0])
  })

  it('RAY/XLINE não entram na extensão (não arruínam o zoom) mas ficam no mapa', () => {
    const db = fakeDb({
      A: [
        ent('1', 'LINE', { geometricExtents: ext(0, 0, 10, 10) }),
        ent('2', 'XLINE', { geometricExtents: ext(-1e7, -1e7, 1e7, 1e7) }),
        ent('3', 'LINE', { geometricExtents: ext(Infinity, 0, -Infinity, 0) })
      ]
    })
    const out = mapDocument({ layouts: [L('A')], database: db })
    if (!out.ok) throw new Error('esperava ok')
    const layout = out.map.layouts[0]
    expect(layout.entities).toHaveLength(3)
    expect(layout.extents).toEqual(ext(0, 0, 10, 10))
    expect(out.map.entity('A', '2')?.bboxStatus).toBe('unbounded')
    expect(out.map.entity('A', '3')?.bboxStatus).toBe('none')
  })

  it('camada congelada ou desligada sai da extensão; sem layerTable tudo é visível', () => {
    const entities = [
      ent('1', 'LINE', { layer: 'F', geometricExtents: ext(0, 0, 1, 1) }),
      ent('2', 'LINE', { layer: 'O', geometricExtents: ext(50, 50, 60, 60) }),
      ent('3', 'LINE', { layer: 'ON', geometricExtents: ext(2, 2, 3, 3) })
    ]
    const withLayers = mapDocument({
      layouts: [L('A')],
      database: fakeDb(
        { A: entities },
        { F: { isFrozen: true }, O: { isOff: true } }
      )
    })
    if (!withLayers.ok) throw new Error('esperava ok')
    expect(withLayers.map.layouts[0].extents).toEqual(ext(2, 2, 3, 3))
    const db = fakeDb({ A: entities })
    delete db.tables.layerTable
    const without = mapDocument({ layouts: [L('A')], database: db })
    if (!without.ok) throw new Error('esperava ok')
    expect(without.map.layouts[0].extents).toEqual(ext(0, 0, 60, 60))
  })

  it('o mapa é determinístico (mesma entrada → mesmo resultado)', async () => {
    const doc = await openE2e('find-blocks.dxf')
    const a = mapDocument(doc)
    const b = mapDocument(doc)
    if (!a.ok || !b.ok) throw new Error('esperava ok')
    expect(a.map.layouts).toEqual(b.map.layouts)
    expect(a.map.coverage).toEqual(b.map.coverage)
  })
})
