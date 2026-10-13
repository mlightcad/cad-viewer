// SPDX-License-Identifier: GPL-3.0-or-later
//
// Tabela de suporte por tipo (OBJ-0104 M2-I3, spec §3.1) e listas dos tipos que
// o conversor DWG e o parser DXF reconhecem (spec §3.3). Todas são constantes
// escritas à mão e guardadas por testes de deriva contra os pacotes instalados
// (`__tests__/support.test.ts`): um upgrade que as desactualize falha o teste.

import type { SupportInfo } from './types'

const RENDERED: SupportInfo = { support: 'rendered', searchable: false }
const SEARCHABLE: SupportInfo = { support: 'rendered', searchable: true }

function partial(note: string): SupportInfo {
  return { support: 'partial', searchable: false, note }
}

/**
 * Chave = `AcDbEntity.dxfTypeName`. `rendered` = a classe do data-model tem
 * `subWorldDraw` próprio; `searchable` = tipos tratados por
 * `acapFindTextInLayout` (packages/cad-simple-viewer/src/find/findText.ts).
 */
export const ENTITY_SUPPORT: Readonly<Record<string, SupportInfo>> = {
  LINE: RENDERED,
  CIRCLE: RENDERED,
  ARC: RENDERED,
  ELLIPSE: RENDERED,
  POINT: RENDERED,
  LWPOLYLINE: RENDERED,
  POLYLINE: RENDERED,
  SPLINE: RENDERED,
  TEXT: SEARCHABLE,
  MTEXT: SEARCHABLE,
  INSERT: SEARCHABLE,
  ATTRIB: SEARCHABLE,
  ATTDEF: SEARCHABLE,
  DIMENSION: SEARCHABLE,
  MULTILEADER: SEARCHABLE,
  ACAD_TABLE: SEARCHABLE,
  HATCH: RENDERED,
  SOLID: RENDERED,
  TRACE: RENDERED,
  '3DFACE': RENDERED,
  LEADER: RENDERED,
  MLINE: RENDERED,
  RAY: RENDERED,
  XLINE: RENDERED,
  IMAGE: RENDERED,
  WIPEOUT: RENDERED,
  SHAPE: RENDERED,
  TOLERANCE: RENDERED,
  ARCALIGNEDTEXT: RENDERED,
  VIEWPORT: partial(
    'só desenha o rectângulo em layouts de papel; o viewport de sistema não se desenha'
  ),
  ACAD_PROXY_ENTITY: partial('só desenha quando traz gráfico proxy'),
  '3DSOLID': partial('só desenha o wireframe quando existe'),
  OLE2FRAME: partial('só desenha quando a imagem OLE é resolvida'),
  OLEFRAME: {
    support: 'unsupported',
    searchable: false,
    note: 'objecto OLE sem representação desenhável'
  }
}

const UNKNOWN: SupportInfo = {
  support: 'unsupported',
  searchable: false,
  note: 'tipo de entidade desconhecido'
}

/** Tipo (qualquer capitalização) → suporte. Desconhecido = `unsupported`. */
export function classifyEntityType(type: string): SupportInfo {
  return ENTITY_SUPPORT[String(type).toUpperCase()] ?? UNKNOWN
}

/**
 * Tipos `type` do `DwgDatabase` que `AcDbEntityConverter.createEntity`
 * (@mlightcad/libredwg-converter) converte; tudo o resto é descartado em
 * silêncio (devolve `null`).
 */
export const DWG_CONVERTED_TYPES: readonly string[] = [
  '3DFACE',
  'ACAD_PROXY_ENTITY',
  'ACAD_TABLE',
  'ARC',
  'ARCALIGNEDTEXT',
  'ATTDEF',
  'ATTRIB',
  'CIRCLE',
  'DIMENSION',
  'ELLIPSE',
  'HATCH',
  'IMAGE',
  'INSERT',
  'LEADER',
  'LINE',
  'LWPOLYLINE',
  'MLEADER',
  'MLINE',
  'MTEXT',
  'MULTILEADER',
  'OLE2FRAME',
  'OLEFRAME',
  'POINT',
  'POLYLINE2D',
  'POLYLINE3D',
  'RAY',
  'SHAPE',
  'SOLID',
  'SPLINE',
  'TEXT',
  'TOLERANCE',
  'TRACE',
  'VIEWPORT',
  'WIPEOUT',
  'XLINE'
]

/**
 * Tipos que a fábrica do parser DXF (`acdbCreateEntityForDxfIn` +
 * `POLYLINE`/`DIMENSION` compostos, @mlightcad/data-model) reconhece; os
 * outros incrementam `unknownEntityCount` e são saltados.
 */
export const DXF_PARSED_TYPES: readonly string[] = [
  '3DFACE',
  '3DSOLID',
  'ACAD_PROXY_ENTITY',
  'ACAD_TABLE',
  'ARC',
  'ARCALIGNEDTEXT',
  'ATTDEF',
  'ATTRIB',
  'CIRCLE',
  'DIMENSION',
  'ELLIPSE',
  'HATCH',
  'IMAGE',
  'INSERT',
  'LEADER',
  'LINE',
  'LWPOLYLINE',
  'MLEADER',
  'MLINE',
  'MTEXT',
  'MULTILEADER',
  'OLE2FRAME',
  'OLEFRAME',
  'POINT',
  'POLYLINE',
  'RAY',
  'SHAPE',
  'SOLID',
  'SPLINE',
  'TEXT',
  'TOLERANCE',
  'TRACE',
  'VIEWPORT',
  'WIPEOUT',
  'XLINE'
]
