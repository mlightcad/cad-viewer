// SPDX-License-Identifier: GPL-3.0-or-later
//
// Sondas de cobertura DXF/DWG (spec M2-I3 §3.3): perdas silenciosas do parser
// e do conversor tornadas explícitas.

import {
  MAX_DISTINCT_TYPES,
  scanDxfEntityTypes,
  tallyDwgModelTypes,
  totalOf
} from '../src/model/scan'
import { openText } from './helpers/openFixture'
import { buildDxf, rawEntity, toBuffer } from './helpers/syntheticDxf'

const line = rawEntity('LINE', [8, '0'], [10, 0], [20, 0], [11, 5], [21, 5])

describe('scanDxfEntityTypes', () => {
  it('desenho só com tipos conhecidos → nada descartado', () => {
    const text = buildDxf({ texts: [{ text: 'a' }], rawEntities: [line] })
    expect(scanDxfEntityTypes(toBuffer(text))).toEqual({})
  })

  it('conta tipos desconhecidos em ENTITIES e em BLOCKS, ignora estruturais', () => {
    const text = buildDxf({
      rawEntities: [
        line,
        rawEntity('REGION', [8, '0']),
        rawEntity('BODY', [8, '0']),
        rawEntity('REGION', [8, '0']),
        rawEntity('VERTEX', [8, '0']),
        rawEntity('SEQEND')
      ],
      blocks: [{ name: 'B', entities: [rawEntity('SURFACE'), line] }]
    })
    expect(scanDxfEntityTypes(toBuffer(text))).toEqual({
      REGION: 2,
      BODY: 1,
      SURFACE: 1
    })
  })

  it('não conta o que está fora de ENTITIES/BLOCKS', () => {
    const lines = [
      ...['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '0', 'LAYER'],
      ...['0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'OBJECTS'],
      ...['0', 'DICTIONARY', '0', 'ENDSEC', '0', 'EOF']
    ]
    expect(scanDxfEntityTypes(toBuffer(lines.join('\n')))).toEqual({})
  })

  it('é insensível a maiúsculas, CRLF, BOM, espaços e a Uint8Array', () => {
    const text = buildDxf({
      crlf: true,
      bom: true,
      rawEntities: [rawEntity('region', [8, '0']), rawEntity('Line')]
    })
    expect(scanDxfEntityTypes(new Uint8Array(toBuffer(text)))).toEqual({
      REGION: 1
    })
    const padded = [
      ...['  0  ', 'SECTION', '  2', 'ENTITIES  '],
      ...['  0', ' BODY ', '0', 'LINE', '0', 'ENDSEC', '0', 'EOF']
    ].join('\r\n')
    expect(scanDxfEntityTypes(toBuffer(padded))).toEqual({ BODY: 1 })
  })

  it('entrada vazia, lixo e número ímpar de linhas não lançam', () => {
    expect(scanDxfEntityTypes(new ArrayBuffer(0))).toEqual({})
    expect(scanDxfEntityTypes(toBuffer('not a dxf at all'))).toEqual({})
    expect(scanDxfEntityTypes(toBuffer('0\nSECTION\n2\nENTITIES\n0'))).toEqual(
      {}
    )
  })

  it('limita os tipos distintos: o excesso soma-se a OTHER (sem perder contagem)', () => {
    const raws = Array.from({ length: MAX_DISTINCT_TYPES + 25 }, (_v, i) =>
      rawEntity(`X${i}`)
    )
    const counts = scanDxfEntityTypes(toBuffer(buildDxf({ rawEntities: raws })))
    expect(Object.keys(counts).length).toBeLessThanOrEqual(
      MAX_DISTINCT_TYPES + 1
    )
    expect(counts.OTHER).toBe(25)
    expect(totalOf(counts)).toBe(MAX_DISTINCT_TYPES + 25)
  })

  it('nomes de tipo hostis (`constructor`, `__proto__`) não poluem nem lançam', () => {
    const counts = scanDxfEntityTypes(
      toBuffer(
        buildDxf({
          rawEntities: [rawEntity('constructor'), rawEntity('__proto__')]
        })
      )
    )
    expect(totalOf(counts)).toBe(2)
    expect(({} as Record<string, unknown>).CONSTRUCTOR).toBeUndefined()
  })

  it('consistente com o parser REAL: o que a sonda conta é exactamente o que falta na base de dados', async () => {
    const text = buildDxf({
      rawEntities: [
        line,
        line,
        line,
        rawEntity('REGION', [8, '0']),
        rawEntity('BODY', [8, '0'])
      ]
    })
    const doc = await openText('probe.dxf', text)
    const model = doc.database.tables.blockTable.modelSpace
    let inDb = 0
    for (const _e of model.newIterator()) inDb++
    expect(inDb).toBe(3)
    expect(scanDxfEntityTypes(toBuffer(text))).toEqual({ REGION: 1, BODY: 1 })
  })

  it('é linear: 200 000 entidades em tempo curto (sem split nem regex por linha)', () => {
    const raws = Array.from({ length: 200_000 }, () => line)
    const bytes = toBuffer(buildDxf({ rawEntities: raws }))
    const t0 = Date.now()
    expect(scanDxfEntityTypes(bytes)).toEqual({})
    expect(Date.now() - t0).toBeLessThan(5000)
  })
})

describe('tallyDwgModelTypes', () => {
  const model = (...entityLists: unknown[][]) => ({
    tables: {
      BLOCK_RECORD: {
        entries: entityLists.map(entities => ({ entities }))
      }
    }
  })

  it('conta só os tipos que o conversor não converte, em todos os block records', () => {
    const counts = tallyDwgModelTypes(
      model(
        [{ type: 'LINE' }, { type: '3DSOLID' }, { type: 'REGION' }],
        [{ type: 'region' }, { type: 'POLYLINE2D' }, { type: 'MLEADER' }]
      ) as never
    )
    expect(counts).toEqual({ '3DSOLID': 1, REGION: 2 })
  })

  it('formas inválidas não lançam; entidade sem tipo conta como «?»', () => {
    expect(tallyDwgModelTypes(null)).toEqual({})
    expect(tallyDwgModelTypes(undefined)).toEqual({})
    expect(tallyDwgModelTypes({} as never)).toEqual({})
    expect(
      tallyDwgModelTypes({ tables: { BLOCK_RECORD: { entries: 5 } } } as never)
    ).toEqual({})
    expect(
      tallyDwgModelTypes(
        model(undefined as never, [null, { type: 7 }, {}]) as never
      )
    ).toEqual({ '?': 3 })
  })
})
