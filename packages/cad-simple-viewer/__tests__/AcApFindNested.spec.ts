import { acapFindHitBox, acapFindText } from '../src/find'

type Ent = Record<string, unknown>

/** Column-major 4x4: uniform scale `s`, then translation (tx, ty). */
const transform = (tx: number, ty: number, s = 1) => ({
  elements: [s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1]
})

const text = (id: string, textString: string, extra: Ent = {}): Ent => ({
  objectId: id,
  dxfTypeName: 'TEXT',
  textString,
  layer: '0',
  position: { x: 1, y: 2 },
  geometricExtents: { min: { x: 1, y: 2 }, max: { x: 5, y: 3 } },
  ...extra
})

const insert = (
  id: string,
  blockName: string,
  tx: number,
  ty: number,
  extra: Ent = {}
): Ent => ({
  objectId: id,
  dxfTypeName: 'INSERT',
  blockName,
  layer: 'BLOCKS',
  blockTransform: transform(tx, ty, (extra.scale as number) ?? 1),
  attributeIterator: () => [][Symbol.iterator](),
  ...extra
})

function createDb(
  model: Ent[],
  blocks: Record<string, Ent[]>,
  byId: Record<string, Ent[]> = {}
) {
  return {
    objects: {
      layout: {
        newIterator: () => [
          { layoutName: 'Model', tabOrder: 0, blockTableRecordId: 'btr-model' }
        ]
      }
    },
    tables: {
      layerTable: {
        getAt: (name: string) => (name === 'OFF' ? { isOff: true } : undefined)
      },
      blockTable: {
        getAt: (name: string) =>
          blocks[name] ? { newIterator: () => blocks[name] } : undefined,
        getIdAt: (id: string) => {
          const entities = id === 'btr-model' ? model : byId[id]
          return entities
            ? {
                newIterator: () => entities,
                getIdAt: (entityId: string) =>
                  entities.find(e => e.objectId === entityId)
              }
            : undefined
        }
      }
    }
  }
}

const find = (db: ReturnType<typeof createDb>, query: string) =>
  acapFindText(db, query, { currentLayoutId: 'btr-model' }).hits

describe('acapFindText inside blocks, dimensions, leaders and tables', () => {
  it('finds plain text inside a block definition and selects the INSERT', () => {
    const db = createDb([insert('i1', 'CARIMBO', 100, 200)], {
      CARIMBO: [text('t1', 'Projeto: Escola Básica')]
    })
    const [hit] = find(db, 'escola basica')
    expect(hit).toMatchObject({
      entityId: 'i1',
      textEntityId: 'i1/t1',
      kind: 'block',
      text: 'Projeto: Escola Básica',
      layer: 'BLOCKS',
      position: { x: 101, y: 202 },
      extents: { min: { x: 101, y: 202 }, max: { x: 105, y: 203 } }
    })
  })

  it('reports each insertion of the same block separately', () => {
    const db = createDb(
      [insert('i1', 'ETIQ', 0, 0), insert('i2', 'ETIQ', 50, 0)],
      { ETIQ: [text('t', 'Quadro QE-01')] }
    )
    const hits = find(db, 'qe-01')
    expect(hits.map(h => [h.entityId, h.textEntityId, h.position.x])).toEqual([
      ['i1', 'i1/t', 1],
      ['i2', 'i2/t', 51]
    ])
  })

  it('composes nested block transforms and stops on recursive blocks', () => {
    const db = createDb([insert('outer', 'A', 1000, 0, { scale: 2 })], {
      A: [insert('inner', 'B', 10, 10), insert('loop', 'A', 0, 0)],
      B: [text('deep', 'Sala Técnica')]
    })
    const hits = find(db, 'sala')
    expect(hits).toHaveLength(1)
    // inner: (1,2) + (10,10) = (11,12); outer: ×2 + (1000,0)
    expect(hits[0]).toMatchObject({
      entityId: 'outer',
      textEntityId: 'outer/inner/deep',
      position: { x: 1022, y: 24 }
    })
  })

  it('skips nested text on off layers but keeps layer 0 (inherits the insert)', () => {
    const db = createDb([insert('i1', 'B', 0, 0)], {
      B: [text('a', 'visivel'), text('b', 'visivel oculto', { layer: 'OFF' })]
    })
    expect(find(db, 'visivel').map(h => h.textEntityId)).toEqual(['i1/a'])
  })

  it('finds MTEXT and attributes of nested inserts', () => {
    const db = createDb([insert('i1', 'A', 0, 0)], {
      A: [
        {
          objectId: 'm',
          dxfTypeName: 'MTEXT',
          contents: '{\\fArial;Legenda:\\PÁrea útil}',
          layer: '0',
          location: { x: 0, y: 0 }
        },
        insert('n', 'B', 5, 5, {
          attributeIterator: () =>
            [
              {
                objectId: 'att',
                tag: 'NOME',
                textString: 'Área técnica',
                position: { x: 7, y: 7 }
              }
            ][Symbol.iterator]()
        })
      ],
      B: []
    })
    const hits = find(db, 'area')
    expect(hits.map(h => [h.textEntityId, h.text, h.tag])).toEqual([
      ['i1/m', 'Legenda: Área útil', undefined],
      ['i1/n/att', 'Área técnica', 'NOME']
    ])
  })

  it('finds constant ATTDEF values in a block, but not attribute templates', () => {
    const attdef = (id: string, tag: string, value: string, extra: Ent = {}) =>
      text(id, value, {
        dxfTypeName: 'ATTDEF',
        tag,
        isConst: false,
        isInvisible: false,
        ...extra
      })
    const db = createDb([insert('i1', 'CARIMBO', 100, 200)], {
      CARIMBO: [
        attdef('c', 'OBRA', 'Escola Modelo', { isConst: true }),
        attdef('cm', 'NOTA', 'ignorado', {
          isConstMTextAttribute: true,
          mtext: { contents: '{\\fArial;Nota:\\PEscola Norte}' }
        }),
        // Not drawn in a block: the INSERT's ATTRIB supplies the value.
        attdef('t', 'NOME', 'Escola Template'),
        attdef('inv', 'OCULTO', 'Escola Oculta', {
          isConst: true,
          isInvisible: true
        })
      ]
    })
    expect(
      find(db, 'escola').map(h => [h.entityId, h.textEntityId, h.kind, h.tag])
    ).toEqual([
      ['i1', 'i1/c', 'block', 'OBRA'],
      ['i1', 'i1/cm', 'block', 'NOTA']
    ])
    expect(find(db, 'norte')[0].text).toBe('Nota: Escola Norte')
    expect(find(db, 'modelo')[0]).toMatchObject({
      position: { x: 101, y: 202 },
      extents: { min: { x: 101, y: 202 }, max: { x: 105, y: 203 } }
    })
  })

  it('finds the displayed text of a dimension from its block', () => {
    const db = createDb(
      [
        {
          objectId: 'd1',
          dxfTypeName: 'DIMENSION',
          layer: 'COTAS',
          dimBlockId: 'blk-d1',
          dimensionText: null,
          textPosition: { x: 50, y: 5 }
        }
      ],
      {},
      {
        'blk-d1': [
          {
            objectId: 'dm',
            dxfTypeName: 'MTEXT',
            contents: '3,25 m',
            layer: '0',
            location: { x: 50, y: 5 }
          }
        ]
      }
    )
    expect(find(db, '3,25')).toEqual([
      expect.objectContaining({
        entityId: 'd1',
        kind: 'dimension',
        text: '3,25 m',
        layer: 'COTAS',
        position: { x: 50, y: 5 }
      })
    ])
  })

  it('falls back to the dimension override text without a block', () => {
    const db = createDb(
      [
        {
          objectId: 'd1',
          dxfTypeName: 'DIMENSION',
          layer: '0',
          dimensionText: 'VER DETALHE <>',
          textPosition: { x: 1, y: 1 }
        }
      ],
      {}
    )
    expect(find(db, 'detalhe').map(h => [h.kind, h.text])).toEqual([
      ['dimension', 'VER DETALHE']
    ])
  })

  it('falls back to the dimension override when its block has no matching text', () => {
    const dimension = (override: string) => [
      {
        objectId: 'd1',
        dxfTypeName: 'DIMENSION',
        layer: 'COTAS',
        dimBlockId: 'blk-d1',
        dimensionText: override,
        textPosition: { x: 50, y: 5 }
      }
    ]
    const db = createDb(
      dimension('ROOM A'),
      {},
      {
        'blk-d1': [
          {
            objectId: 'dm',
            dxfTypeName: 'MTEXT',
            contents: '3,25 m',
            layer: '0',
            location: { x: 50, y: 5 }
          }
        ]
      }
    )
    // Override is searched although the block exists...
    expect(find(db, 'room').map(h => [h.entityId, h.kind, h.text])).toEqual([
      ['d1', 'dimension', 'ROOM A']
    ])
    // ...and the block text is still found, once (no duplicate from override).
    expect(find(db, '3,25').map(h => h.textEntityId)).toEqual(['d1/dm'])
    const sameText = createDb(
      dimension('3,25 m'),
      {},
      {
        'blk-d1': [
          {
            objectId: 'dm',
            dxfTypeName: 'MTEXT',
            contents: '3,25 m',
            layer: '0',
            location: { x: 50, y: 5 }
          }
        ]
      }
    )
    expect(find(sameText, '3,25')).toHaveLength(1)
  })

  it('finds multileader contents', () => {
    const db = createDb(
      [
        {
          objectId: 'l1',
          dxfTypeName: 'MULTILEADER',
          layer: '0',
          contents: '\\A1;Caixa de visita CV1',
          textLocation: { x: 9, y: 8 }
        }
      ],
      {}
    )
    expect(find(db, 'caixa')).toEqual([
      expect.objectContaining({
        entityId: 'l1',
        kind: 'leader',
        text: 'Caixa de visita CV1',
        position: { x: 9, y: 8 }
      })
    ])
  })

  it('finds table cells through the table block, else the cell strings', () => {
    const withBlock = createDb(
      [
        {
          objectId: 'tb',
          dxfTypeName: 'ACAD_TABLE',
          layer: '0',
          position: { x: 0, y: 0 },
          blockTableRecord: {
            newIterator: () => [text('c1', 'Porta P1')]
          }
        }
      ],
      {}
    )
    expect(find(withBlock, 'porta').map(h => [h.kind, h.textEntityId])).toEqual(
      [['table', 'tb/c1']]
    )

    const cells = [
      ['Ref', 'Descrição'],
      ['J1', 'Janela basculante']
    ]
    const noBlock = createDb(
      [
        {
          objectId: 'tb',
          dxfTypeName: 'ACAD_TABLE',
          layer: '0',
          position: { x: 3, y: 4 },
          numRows: 2,
          numColumns: 2,
          textString: (r: number, c: number) => cells[r][c]
        }
      ],
      {}
    )
    expect(find(noBlock, 'janela').map(h => [h.kind, h.text])).toEqual([
      ['table', 'Janela basculante']
    ])
  })

  it('zooms to the nested text extents, not to the whole block', () => {
    const db = createDb(
      [
        insert('i1', 'CARIMBO', 100, 200, {
          geometricExtents: { min: { x: 0, y: 0 }, max: { x: 5000, y: 5000 } }
        })
      ],
      { CARIMBO: [text('t1', 'Folha 3')] }
    )
    const [hit] = find(db, 'folha')
    const box = acapFindHitBox(db, 'btr-model', hit)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(103)
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(202.5)
    expect(box.max.x - box.min.x).toBeLessThan(100)
  })

  it('still caps the number of results with nested text', () => {
    const db = createDb([insert('i1', 'B', 0, 0), insert('i2', 'B', 0, 0)], {
      B: [text('a', 'x'), text('b', 'x')]
    })
    const result = acapFindText(db, 'x', {
      currentLayoutId: 'btr-model',
      maxResults: 3
    })
    expect(result.hits).toHaveLength(3)
    expect(result.truncated).toBe(true)
  })
})
