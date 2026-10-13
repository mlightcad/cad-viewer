// SPDX-License-Identifier: GPL-3.0-or-later
//
// Tabela de suporte por tipo e listas de tipos do conversor/parser: deriva
// contra os pacotes REAIS instalados (spec M2-I3 §3.1/§3.3).

import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  classifyEntityType,
  DWG_CONVERTED_TYPES,
  DXF_PARSED_TYPES,
  ENTITY_SUPPORT
} from '../src/model/support'

const PKG = resolve(__dirname, '../node_modules/@mlightcad')
const read = (p: string) => readFileSync(resolve(PKG, p), 'utf8')

function literals(source: string, re: RegExp): string[] {
  return [...new Set([...source.matchAll(re)].map(m => m[1]))].sort()
}

describe('listas de tipos (deriva contra os pacotes instalados)', () => {
  it('DWG_CONVERTED_TYPES = tipos literais de AcDbEntityConverter.createEntity', () => {
    const source = read('libredwg-converter/lib/AcDbEntitiyConverter.js')
    const found = literals(source, /entity\.type ==+ '([A-Z0-9_]+)'/g)
    expect(found.length).toBeGreaterThan(30)
    expect([...DWG_CONVERTED_TYPES].sort()).toEqual(found)
  })

  it('DXF_PARSED_TYPES = `case` da fábrica DXF + POLYLINE/DIMENSION compostos', () => {
    const source = read('data-model/lib/dxf/AcDbDxfEntityFactory.js')
    const cases = literals(source, /case '([A-Z0-9_]+)'/g)
    expect(cases.length).toBeGreaterThan(30)
    expect(source).toMatch(/upper === 'POLYLINE'/)
    expect(source).toMatch(/upper === 'DIMENSION'/)
    expect([...DXF_PARSED_TYPES].sort()).toEqual(
      [...new Set([...cases, 'POLYLINE', 'DIMENSION'])].sort()
    )
  })

  it('sem duplicados', () => {
    expect(new Set(DWG_CONVERTED_TYPES).size).toBe(DWG_CONVERTED_TYPES.length)
    expect(new Set(DXF_PARSED_TYPES).size).toBe(DXF_PARSED_TYPES.length)
  })
})

describe('ENTITY_SUPPORT', () => {
  it('cada tipo que o parser DXF reconhece está classificado (nenhum cai em «desconhecido»)', () => {
    for (const type of DXF_PARSED_TYPES) {
      if (type === 'MLEADER') continue // alias de MULTILEADER (dxfTypeName da classe)
      expect(ENTITY_SUPPORT[type]).toBeDefined()
    }
  })

  it('cada tipo que o conversor DWG converte (com o nome da classe) está classificado', () => {
    const alias: Record<string, string> = {
      POLYLINE2D: 'POLYLINE',
      POLYLINE3D: 'POLYLINE',
      MLEADER: 'MULTILEADER'
    }
    for (const type of DWG_CONVERTED_TYPES) {
      expect(ENTITY_SUPPORT[alias[type] ?? type]).toBeDefined()
    }
  })

  it('fora de `rendered` há sempre motivo; `rendered` nunca leva nota', () => {
    for (const [type, info] of Object.entries(ENTITY_SUPPORT)) {
      if (info.support === 'rendered') expect(info.note).toBeUndefined()
      else expect(info.note && info.note.length > 5).toBe(true)
      expect(type).toBe(type.toUpperCase())
    }
  })

  it('searchable = exactamente os tipos que acapFindTextInLayout trata', () => {
    const searchable = Object.entries(ENTITY_SUPPORT)
      .filter(([, i]) => i.searchable)
      .map(([t]) => t)
      .sort()
    expect(searchable).toEqual(
      [
        'ACAD_TABLE',
        'ATTDEF',
        'ATTRIB',
        'DIMENSION',
        'INSERT',
        'MTEXT',
        'MULTILEADER',
        'TEXT'
      ].sort()
    )
    // o código do FIND discrimina estes mesmos `dxfTypeName`
    const find = readFileSync(
      resolve(__dirname, '../../cad-simple-viewer/src/find/findText.ts'),
      'utf8'
    )
    for (const type of searchable.filter(t => t !== 'ATTRIB')) {
      expect(find).toContain(`'${type}'`)
    }
  })

  it('classifyEntityType ignora a capitalização e marca desconhecidos como unsupported', () => {
    expect(classifyEntityType('line').support).toBe('rendered')
    expect(classifyEntityType('Text').searchable).toBe(true)
    expect(classifyEntityType('viewport').support).toBe('partial')
    expect(classifyEntityType('OLEFRAME').support).toBe('unsupported')
    const unknown = classifyEntityType('REGION')
    expect(unknown.support).toBe('unsupported')
    expect(unknown.searchable).toBe(false)
    expect(unknown.note).toMatch(/desconhecido/)
    expect(classifyEntityType('').support).toBe('unsupported')
  })

  it('3DSOLID e REGION: DXF reconhece 3DSOLID (parcial); DWG descarta-o (não converte)', () => {
    expect(DXF_PARSED_TYPES).toContain('3DSOLID')
    expect(DWG_CONVERTED_TYPES).not.toContain('3DSOLID')
    expect(classifyEntityType('3DSOLID').support).toBe('partial')
  })
})
