// SPDX-License-Identifier: GPL-3.0-or-later
//
// Sondas de cobertura (OBJ-0104 M2-I3, spec §3.3): o parser DXF e o conversor
// DWG descartam em silêncio os tipos que não conhecem — nunca chegam à base de
// dados. Estas funções contam-nos por tipo para a perda ser EXPLÍCITA.

import { DWG_CONVERTED_TYPES, DXF_PARSED_TYPES } from './support'
import type { TypeCounts } from './types'

/** Nº máximo de tipos distintos registados; o resto soma-se a `OTHER`. */
export const MAX_DISTINCT_TYPES = 100
const MAX_TYPE_LENGTH = 64

const DXF_KNOWN = new Set(DXF_PARSED_TYPES)
const DWG_KNOWN = new Set(DWG_CONVERTED_TYPES)

/** Marcadores estruturais que não são entidades de topo. */
const DXF_STRUCTURAL = new Set([
  'SECTION',
  'ENDSEC',
  'BLOCK',
  'ENDBLK',
  'VERTEX',
  'SEQEND',
  'EOF'
])

function bump(counts: TypeCounts, rawType: string): void {
  const type = rawType.slice(0, MAX_TYPE_LENGTH)
  if (type in counts) counts[type]++
  else if (Object.keys(counts).length < MAX_DISTINCT_TYPES) counts[type] = 1
  else counts.OTHER = (counts.OTHER ?? 0) + 1
}

/** Soma `TypeCounts` (para totais). */
export function totalOf(counts: TypeCounts): number {
  let n = 0
  for (const k of Object.keys(counts)) n += counts[k]
  return n
}

/**
 * Conta, em DXF ASCII, os tipos de entidade das secções `ENTITIES` e `BLOCKS`
 * que o parser NÃO reconhece (e, por isso, salta). Percurso linear sem
 * `split` (ficheiros até 20 MB). Blocos não referenciados contam na mesma
 * (sobre-estimativa possível, nunca sub-estimativa).
 */
export function scanDxfEntityTypes(
  input: ArrayBuffer | Uint8Array
): TypeCounts {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const text = new TextDecoder('latin1').decode(bytes)
  const counts: TypeCounts = {}
  let pos = 0
  let section = ''
  const next = (): string | null => {
    if (pos >= text.length) return null
    let end = text.indexOf('\n', pos)
    if (end === -1) end = text.length
    const line = text.slice(pos, end).trim()
    pos = end + 1
    return line
  }
  for (;;) {
    const code = next()
    const value = next()
    if (code === null || value === null) break
    if (code !== '0') {
      continue
    }
    const type = value.toUpperCase()
    if (type === 'SECTION') {
      const nameCode = next()
      const name = next()
      section = nameCode === '2' && name !== null ? name.toUpperCase() : ''
      continue
    }
    if (type === 'ENDSEC') {
      section = ''
      continue
    }
    if (section !== 'ENTITIES' && section !== 'BLOCKS') continue
    if (DXF_STRUCTURAL.has(type) || DXF_KNOWN.has(type)) continue
    bump(counts, type)
  }
  return counts
}

interface DwgEntityLike {
  type?: unknown
}
interface DwgBlockRecordLike {
  entities?: DwgEntityLike[]
}
/** Forma mínima de `DwgDatabase` (libredwg-web) usada pela sonda. */
export interface DwgModelLike {
  tables?: { BLOCK_RECORD?: { entries?: DwgBlockRecordLike[] } }
}

/**
 * Conta, num `DwgDatabase` já interpretado, os tipos de entidade que
 * `AcDbEntityConverter.createEntity` NÃO converte (todos os block records).
 */
export function tallyDwgModelTypes(
  model: DwgModelLike | null | undefined
): TypeCounts {
  const counts: TypeCounts = {}
  const records = model?.tables?.BLOCK_RECORD?.entries
  if (!Array.isArray(records)) return counts
  for (const record of records) {
    const entities = record?.entities
    if (!Array.isArray(entities)) continue
    for (const entity of entities) {
      const type =
        typeof entity?.type === 'string' ? entity.type.toUpperCase() : '?'
      if (!DWG_KNOWN.has(type)) bump(counts, type)
    }
  }
  return counts
}
