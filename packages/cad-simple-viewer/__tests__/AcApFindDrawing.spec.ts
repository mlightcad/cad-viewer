import {
  ACAP_FIND_MAX_RESULTS,
  acapFindHitBox,
  acapFindText,
  acapFindTextInLayout,
  acapListFindLayouts
} from '../src/find'

type Ent = Record<string, unknown>

function text(id: string, textString: string, extra: Ent = {}): Ent {
  return {
    objectId: id,
    dxfTypeName: 'TEXT',
    textString,
    layer: '0',
    position: { x: 1, y: 2 },
    ...extra
  }
}

interface FakeLayout {
  name: string
  tabOrder: number
  id: string
  entities: Ent[]
}

/** Database with the given layouts; `hideLayoutTable` drops `objects.layout`. */
function createDb(layouts: FakeLayout[], hideLayoutTable = false) {
  return {
    ...(hideLayoutTable
      ? {}
      : {
          objects: {
            layout: {
              newIterator: () =>
                layouts.map(l => ({
                  layoutName: l.name,
                  tabOrder: l.tabOrder,
                  blockTableRecordId: l.id
                }))
            }
          }
        }),
    tables: {
      layerTable: {
        getAt: (name: string) =>
          name === 'OFF'
            ? { isOff: true }
            : name === 'FROZEN'
              ? { isFrozen: true }
              : undefined
      },
      blockTable: {
        getIdAt: (id: string) => {
          const layout = layouts.find(l => l.id === id)
          return layout
            ? {
                newIterator: () => layout.entities,
                getIdAt: (entityId: string) =>
                  layout.entities.find(e => e.objectId === entityId)
              }
            : undefined
        }
      }
    }
  }
}

const model: FakeLayout = {
  name: 'Model',
  tabOrder: 0,
  id: 'btr-model',
  entities: [text('m1', 'Sala Técnica 01'), text('m2', 'Instalação AVAC')]
}
const planta: FakeLayout = {
  name: 'Planta',
  tabOrder: 1,
  id: 'btr-planta',
  entities: [text('p1', 'Legenda: sala técnica 01')]
}
const alcados: FakeLayout = {
  name: 'Alçados',
  tabOrder: 2,
  id: 'btr-alcados',
  entities: [
    text('a1', 'Alçado Norte'),
    text('a2', 'Sala Técnica 01 (vista lateral)'),
    text('a3', 'sala oculta', { layer: 'OFF' })
  ]
}

describe('acapListFindLayouts', () => {
  it('lists layouts sorted by tab order', () => {
    const db = createDb([alcados, model, planta])
    expect(acapListFindLayouts(db).map(l => [l.name, l.btrId])).toEqual([
      ['Model', 'btr-model'],
      ['Planta', 'btr-planta'],
      ['Alçados', 'btr-alcados']
    ])
  })

  it('returns an empty list without a layout table', () => {
    expect(acapListFindLayouts(createDb([model], true))).toEqual([])
  })

  it('ignores layouts without a block table record id', () => {
    const db = {
      objects: {
        layout: {
          newIterator: () => [{ layoutName: 'Broken', tabOrder: 3 }]
        }
      }
    }
    expect(acapListFindLayouts(db)).toEqual([])
  })
})

describe('acapFindText', () => {
  const db = createDb([model, planta, alcados])

  it('searches the whole drawing by default, in tab order', () => {
    const result = acapFindText(db, 'SALA', { currentLayoutId: 'btr-planta' })
    expect(result.truncated).toBe(false)
    expect(
      result.hits.map(h => [h.layoutName, h.layoutId, h.entityId])
    ).toEqual([
      ['Model', 'btr-model', 'm1'],
      ['Planta', 'btr-planta', 'p1'],
      ['Alçados', 'btr-alcados', 'a2']
    ])
  })

  it('keeps all single-layout hit fields and adds the layout', () => {
    const [hit] = acapFindText(db, 'avac', {
      currentLayoutId: 'btr-model'
    }).hits
    expect(hit).toMatchObject({
      entityId: 'm2',
      kind: 'text',
      text: 'Instalação AVAC',
      layer: '0',
      layoutName: 'Model'
    })
  })

  it('matches accents and case-insensitively across layouts by default', () => {
    const result = acapFindText(db, 'alcado norte', {
      currentLayoutId: 'btr-model'
    })
    expect(result.hits.map(h => h.entityId)).toEqual(['a1'])
  })

  it('honours matchCase in every layout', () => {
    const result = acapFindText(db, 'sala', {
      currentLayoutId: 'btr-model',
      matchCase: true
    })
    expect(result.hits.map(h => h.entityId)).toEqual(['p1'])
  })

  it('searches only the current layout with scope "layout"', () => {
    const planta1 = acapFindText(db, 'sala', {
      scope: 'layout',
      currentLayoutId: 'btr-planta'
    })
    expect(planta1.hits.map(h => [h.layoutName, h.entityId])).toEqual([
      ['Planta', 'p1']
    ])
    const alc = acapFindText(db, 'sala', {
      scope: 'layout',
      currentLayoutId: 'btr-alcados'
    })
    expect(alc.hits.map(h => h.entityId)).toEqual(['a2'])
  })

  it('skips entities on off layers in every layout', () => {
    const result = acapFindText(db, 'oculta', { currentLayoutId: 'btr-model' })
    expect(result.hits).toEqual([])
  })

  it('returns nothing for a blank query', () => {
    expect(
      acapFindText(db, '   ', { currentLayoutId: 'btr-model' }).hits
    ).toEqual([])
  })

  it('falls back to the current layout when the drawing has no layout table', () => {
    const noTable = createDb([model, planta], true)
    const result = acapFindText(noTable, 'sala', {
      currentLayoutId: 'btr-planta'
    })
    expect(
      result.hits.map(h => [h.layoutId, h.layoutName, h.entityId])
    ).toEqual([['btr-planta', '', 'p1']])
  })

  it('shares the result cap across layouts and reports truncation', () => {
    const many = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, i) => text(`${prefix}${i}`, 'needle'))
    const big = createDb([
      { ...model, entities: many('m', 3) },
      { ...planta, entities: many('p', 3) },
      { ...alcados, entities: many('a', 3) }
    ])
    const capped = acapFindText(big, 'needle', {
      currentLayoutId: 'btr-model',
      maxResults: 4
    })
    expect(capped.hits.map(h => h.entityId)).toEqual(['m0', 'm1', 'm2', 'p0'])
    expect(capped.truncated).toBe(true)

    const exact = acapFindText(big, 'needle', {
      currentLayoutId: 'btr-model',
      maxResults: 9
    })
    expect(exact.hits).toHaveLength(9)
    expect(exact.truncated).toBe(false)
  })

  it('flags truncation when the cap is reached exactly at a layout boundary', () => {
    const one = (id: string) => [text(id, 'needle')]
    const db2 = createDb([
      { ...model, entities: one('m') },
      { ...planta, entities: one('p') }
    ])
    const result = acapFindText(db2, 'needle', {
      currentLayoutId: 'btr-model',
      maxResults: 1
    })
    expect(result.hits.map(h => h.entityId)).toEqual(['m'])
    expect(result.truncated).toBe(true)
  })

  it('defaults to the documented maximum', () => {
    expect(ACAP_FIND_MAX_RESULTS).toBe(500)
  })

  it('does not change what a single-layout search returns', () => {
    const single = acapFindTextInLayout(db, 'btr-planta', 'sala')
    const viaDrawing = acapFindText(db, 'sala', {
      scope: 'layout',
      currentLayoutId: 'btr-planta'
    })
    expect(
      viaDrawing.hits.map(({ layoutId, layoutName, ...hit }) => hit)
    ).toEqual(single.hits)
  })
})

describe('acapFindHitBox', () => {
  it('widens a short text so the zoom is not absurdly close', () => {
    const entity = text('t', 'x', {
      geometricExtents: { min: { x: 10, y: 0 }, max: { x: 14, y: 1 } }
    })
    const db = createDb([{ ...model, entities: [entity] }])
    const [hit] = acapFindText(db, 'x', { currentLayoutId: 'btr-model' }).hits
    const box = acapFindHitBox(db, 'btr-model', hit)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(12)
    expect(box.max.x - box.min.x).toBeGreaterThanOrEqual(10)
  })

  it('uses the attribute extents for attribute hits', () => {
    const attribute = {
      objectId: 'att',
      tag: 'T',
      textString: 'valor',
      position: { x: 100, y: 100 },
      geometricExtents: { min: { x: 100, y: 100 }, max: { x: 120, y: 105 } }
    }
    const insert = {
      objectId: 'ins',
      dxfTypeName: 'INSERT',
      blockName: 'B',
      layer: '0',
      geometricExtents: { min: { x: 0, y: 0 }, max: { x: 500, y: 500 } },
      attributeIterator: () => [attribute][Symbol.iterator]()
    }
    const db = createDb([{ ...model, entities: [insert] }])
    const [hit] = acapFindText(db, 'valor', {
      currentLayoutId: 'btr-model'
    }).hits
    const box = acapFindHitBox(db, 'btr-model', hit)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(110)
  })

  it('falls back to the hit position without usable extents', () => {
    const db = createDb([{ ...model, entities: [text('t', 'x')] }])
    const [hit] = acapFindText(db, 'x', { currentLayoutId: 'btr-model' }).hits
    const box = acapFindHitBox(db, 'btr-model', hit)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(1)
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(2)
  })
})
