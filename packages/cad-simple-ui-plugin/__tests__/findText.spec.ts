import {
  ACUI_FIND_MAX_RESULTS,
  acuiFindExcerpt,
  acuiFindTextInLayout,
  acuiMTextToPlainText,
  acuiNormalizeFindText
} from '../src/find/findText'

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

function mtext(id: string, contents: string, extra: Ent = {}): Ent {
  return {
    objectId: id,
    dxfTypeName: 'MTEXT',
    contents,
    layer: '0',
    location: { x: 5, y: 6 },
    ...extra
  }
}

function insert(id: string, attrs: Ent[], extra: Ent = {}): Ent {
  return {
    objectId: id,
    dxfTypeName: 'INSERT',
    blockName: 'TITLE',
    layer: '0',
    attributeIterator: () => attrs[Symbol.iterator](),
    ...extra
  }
}

function attrib(id: string, tag: string, value: string, extra: Ent = {}): Ent {
  return {
    objectId: id,
    dxfTypeName: 'ATTRIB',
    tag,
    textString: value,
    position: { x: 9, y: 9 },
    ...extra
  }
}

function db(
  entities: Ent[],
  layers: Record<string, { isOff?: boolean; isFrozen?: boolean }> = {}
) {
  return {
    tables: {
      blockTable: {
        getIdAt: (id: string) =>
          id === 'layout' ? { newIterator: () => entities } : undefined
      },
      layerTable: { getAt: (name: string) => layers[name] }
    }
  }
}

describe('acuiNormalizeFindText', () => {
  it('ignores case, accents and whitespace runs by default', () => {
    expect(acuiNormalizeFindText('  Instalação \n  Elétrica ')).toBe(
      'instalacao eletrica'
    )
  })

  it('keeps case and accents when matchCase is set', () => {
    expect(acuiNormalizeFindText(' Instalação  X ', true)).toBe('Instalação X')
  })
})

describe('acuiMTextToPlainText', () => {
  it('removes formatting and converts paragraph breaks to spaces', () => {
    expect(
      acuiMTextToPlainText('{\\fArial|b1;Sala\\P\\H2x;Técnica} \\C1;A\\~B')
    ).toBe('Sala Técnica A B')
  })

  it('decodes unicode escapes, stacks and special characters', () => {
    expect(acuiMTextToPlainText('\\U+00E7 \\S1^2; %%c20%%d')).toBe('ç 1/2 Ø20°')
  })

  it('unescapes literal braces and backslashes', () => {
    expect(acuiMTextToPlainText('a\\{b\\}\\\\c')).toBe('a{b}\\c')
  })
})

describe('acuiFindTextInLayout', () => {
  it('matches TEXT, MTEXT and attribute values partially and case-insensitively', () => {
    const database = db([
      text('t1', 'Quadro ELÉTRICO'),
      mtext('m1', '{\\fArial;Sala do quadro}\\Pnorte'),
      insert('i1', [
        attrib('a1', 'ROOM', 'Quadro geral'),
        attrib('a2', 'N', '12')
      ]),
      text('t2', 'Outro')
    ])
    const { hits, truncated } = acuiFindTextInLayout(
      database,
      'layout',
      'QUADRO'
    )
    expect(truncated).toBe(false)
    expect(hits.map(h => [h.kind, h.entityId, h.textEntityId])).toEqual([
      ['text', 't1', 't1'],
      ['mtext', 'm1', 'm1'],
      ['attribute', 'i1', 'a1']
    ])
    expect(hits[1].text).toBe('Sala do quadro norte')
    expect(hits[2]).toMatchObject({ tag: 'ROOM', blockName: 'TITLE' })
    expect(hits[0].position).toEqual({ x: 1, y: 2 })
    expect(hits[1].position).toEqual({ x: 5, y: 6 })
  })

  it('matches accents-insensitively unless matchCase is on', () => {
    const database = db([text('t1', 'Instalação')])
    expect(
      acuiFindTextInLayout(database, 'layout', 'instalacao').hits
    ).toHaveLength(1)
    expect(
      acuiFindTextInLayout(database, 'layout', 'instalacao', {
        matchCase: true
      }).hits
    ).toHaveLength(0)
    expect(
      acuiFindTextInLayout(database, 'layout', 'Instalação', {
        matchCase: true
      }).hits
    ).toHaveLength(1)
  })

  it('returns no hits for blank queries, unknown layouts and misses', () => {
    const database = db([text('t1', 'abc')])
    expect(acuiFindTextInLayout(database, 'layout', '   ').hits).toEqual([])
    expect(acuiFindTextInLayout(database, 'missing', 'abc').hits).toEqual([])
    expect(acuiFindTextInLayout(database, 'layout', 'zzz').hits).toEqual([])
  })

  it('skips hidden entities, off/frozen layers and invisible attributes', () => {
    const database = db(
      [
        text('t1', 'alvo', { visibility: false }),
        text('t2', 'alvo', { layer: 'OFF' }),
        text('t3', 'alvo', { layer: 'FROZEN' }),
        text('t4', 'alvo', { layer: 'ON' }),
        insert('i1', [attrib('a1', 'T', 'alvo', { isInvisible: true })])
      ],
      { OFF: { isOff: true }, FROZEN: { isFrozen: true }, ON: {} }
    )
    expect(
      acuiFindTextInLayout(database, 'layout', 'alvo').hits.map(h => h.entityId)
    ).toEqual(['t4'])
  })

  it('ignores other entity types and inserts without attributes', () => {
    const database = db([
      { objectId: 'l1', dxfTypeName: 'LINE', layer: '0', textString: 'alvo' },
      { objectId: 'i0', dxfTypeName: 'INSERT', layer: '0' }
    ])
    expect(acuiFindTextInLayout(database, 'layout', 'alvo').hits).toEqual([])
  })

  it('caps the result count and flags truncation', () => {
    const entities = Array.from({ length: 7 }, (_, i) => text(`t${i}`, 'x'))
    const result = acuiFindTextInLayout(db(entities), 'layout', 'x', {
      maxResults: 3
    })
    expect(result.hits).toHaveLength(3)
    expect(result.truncated).toBe(true)
    expect(ACUI_FIND_MAX_RESULTS).toBe(500)
  })

  it('does not flag truncation when hits equal the cap exactly', () => {
    const entities = Array.from({ length: 3 }, (_, i) => text(`t${i}`, 'x'))
    const result = acuiFindTextInLayout(db(entities), 'layout', 'x', {
      maxResults: 3
    })
    expect(result.truncated).toBe(false)
  })
})

describe('acuiFindExcerpt', () => {
  it('returns short text unchanged and centres long text on the match', () => {
    expect(acuiFindExcerpt('curto', 'cur')).toBe('curto')
    const long = `${'a'.repeat(80)}ALVO${'b'.repeat(80)}`
    const excerpt = acuiFindExcerpt(long, 'alvo')
    expect(excerpt).toContain('ALVO')
    expect(excerpt.startsWith('…')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
