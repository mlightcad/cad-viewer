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

function bump(counts: TypeCounts, rawType: string, n = 1): void {
  const type = rawType.slice(0, MAX_TYPE_LENGTH)
  if (type in counts) counts[type] += n
  else if (Object.keys(counts).length < MAX_DISTINCT_TYPES) counts[type] = n
  else counts.OTHER = (counts.OTHER ?? 0) + n
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
  subclassMarker?: unknown
  name?: unknown
  definitionPoint?: unknown
  arcPoint?: unknown
  subDefinitionPoint1?: unknown
  subDefinitionPoint2?: unknown
  centerPoint?: unknown
}
interface DwgBlockRecordLike {
  entities?: DwgEntityLike[]
}
/** Forma mínima de `DwgDatabase` (libredwg-web) usada pela sonda. */
export interface DwgModelLike {
  tables?: { BLOCK_RECORD?: { entries?: DwgBlockRecordLike[] } }
}

/**
 * `subclassMarker` de `DIMENSION` que `convertDimension` converte
 * (AcDbEntitiyConverter.js ≈ l.1000-1068, testado contra o texto instalado).
 * Qualquer outro marcador devolve `null` para um tipo CONHECIDO.
 */
export const DWG_DIMENSION_SUBCLASSES: readonly string[] = [
  'AcDbAlignedDimension',
  'AcDbRotatedDimension',
  'AcDb3PointAngularDimension',
  'AcDb2LineAngularDimension',
  'AcDbOrdinateDimension',
  'AcDbRadialDimension',
  'AcDbDiametricDimension'
]
const DWG_DIMENSION_KNOWN = new Set(DWG_DIMENSION_SUBCLASSES)

/** Resultado da sonda DWG com as duas classes de perda separadas. */
export interface DwgProbeResult {
  /** Entidades inspeccionadas (todos os block records). */
  inspected: number
  /**
   * Tipos que `createEntity` não trata (ramo final `return null`), por
   * `type` em maiúsculas. A comparação com `DWG_CONVERTED_TYPES` é EXACTA (o
   * conversor usa `==`): `line` minúsculo é descartado, não «conhecido».
   */
  unknownTypes: TypeCounts
  /**
   * Instâncias de tipo conhecido que o conversor também devolve `null`
   * (hoje só `DIMENSION` com `subclassMarker` não tratado, ou
   * `AcDb2LineAngularDimension` sem ponto de arco/nome). Chave
   * `TIPO[subclasse]`.
   */
  knownNull: TypeCounts
}

function dimensionConvertsToNull(entity: DwgEntityLike): string | null {
  const marker =
    typeof entity.subclassMarker === 'string' ? entity.subclassMarker : ''
  if (!DWG_DIMENSION_KNOWN.has(marker)) return marker || '?'
  if (marker === 'AcDb2LineAngularDimension') {
    const arc =
      entity.definitionPoint ??
      entity.arcPoint ??
      entity.subDefinitionPoint2 ??
      null
    if (!arc || !entity.name) return marker
  }
  return null
}

/**
 * Sonda do `DwgDatabase` já interpretado: separa os tipos que o conversor não
 * conhece (`unknownTypes`) das instâncias de tipos conhecidos que ele também
 * descarta com `null` (`knownNull`). Nunca lança.
 */
export function probeDwgModel(
  model: DwgModelLike | null | undefined
): DwgProbeResult {
  const result: DwgProbeResult = {
    inspected: 0,
    unknownTypes: {},
    knownNull: {}
  }
  const records = model?.tables?.BLOCK_RECORD?.entries
  if (!Array.isArray(records)) return result
  for (const record of records) {
    const entities = record?.entities
    if (!Array.isArray(entities)) continue
    for (const entity of entities) {
      result.inspected++
      const raw = typeof entity?.type === 'string' ? entity.type : null
      if (raw === null) {
        bump(result.unknownTypes, '?')
      } else if (!DWG_KNOWN.has(raw)) {
        bump(result.unknownTypes, raw.toUpperCase())
      } else if (raw === 'DIMENSION') {
        const sub = dimensionConvertsToNull(entity)
        if (sub !== null) bump(result.knownNull, `DIMENSION[${sub}]`)
      }
    }
  }
  return result
}

/**
 * Perdas do conversor DWG numa só tabela (`droppedByType`): tipos
 * desconhecidos (`REGION`) e instâncias conhecidas descartadas
 * (`DIMENSION[subclasse]`) — ambos NUNCA chegam à base de dados.
 */
export function tallyDwgModelTypes(
  model: DwgModelLike | null | undefined
): TypeCounts {
  const { unknownTypes, knownNull } = probeDwgModel(model)
  const counts: TypeCounts = {}
  for (const k of Object.keys(unknownTypes)) bump(counts, k, unknownTypes[k])
  for (const k of Object.keys(knownNull)) bump(counts, k, knownNull[k])
  return counts
}
