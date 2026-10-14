// SPDX-License-Identifier: GPL-3.0-or-later
//
// Mapa do documento: percorre os layouts da base de dados convertida e produz a
// representação intermédia (identidade + caixa + suporte) e o relatório de
// cobertura (OBJ-0104 M2-I3, spec §§3.2–3.4). Nunca lança para dados inválidos
// e nunca descarta entidades em silêncio.

import { makeFailure } from '../import/errors'
import type { ImportFailure, ImportLayout } from '../import/types'
import {
  DEFAULT_VIEW_BOX,
  type EntityLike,
  type LayerLookup,
  normalizeEntity,
  unionBoxes,
  viewBoxOf
} from './normalize'
import { totalOf } from './scan'
import type {
  CoverageReport,
  CoverageStatus,
  LayoutMap,
  MappedEntity,
  TypeCounts
} from './types'

/** Limite de entidades mapeadas por documento [H até S2]. */
export const DEFAULT_MAX_ENTITIES = 2_000_000

/** Mensagem (PT-PT, fixa) quando nada no desenho é desenhável. */
export const NO_RENDERABLE_MESSAGE =
  'O desenho não contém entidades que esta aplicação consiga desenhar.'

/** Mensagem (PT-PT, fixa) quando o limite de entidades deixou só o que não se desenha. */
export const NO_RENDERABLE_TRUNCATED_MESSAGE =
  'O desenho excede o limite de entidades e as que foram lidas não se conseguem desenhar.'

/** Nº máximo de `id`s duplicados listados por layout (a contagem total é exacta). */
export const MAX_REPORTED_DUPLICATE_IDS = 50

/** Forma mínima da base de dados usada pelo mapa (estrutural, como o FIND). */
export interface MapDatabaseLike {
  tables: {
    blockTable: {
      getIdAt(id: string): { newIterator(): Iterable<EntityLike> } | undefined
    }
    layerTable?: { getAt(name: string): LayerStateLike | undefined }
  }
}
interface LayerStateLike {
  isOff?: boolean
  isFrozen?: boolean
}

export interface MapSource {
  layouts: ImportLayout[]
  database: MapDatabaseLike
}

export interface MapDocumentOptions {
  /**
   * Tipos que o conversor/parser descartou antes de chegarem à base de dados
   * (`scanDxfEntityTypes` / `DwgCoverageSource.takeReport`).
   */
  dropped?: TypeCounts
  maxEntities?: number
  /** Margem das vistas (por omissão `DEFAULT_MARGIN`). */
  margin?: number
}

export interface DocumentMap {
  layouts: LayoutMap[]
  coverage: CoverageReport
  entityCount: number
  /** Layout por `btrId`. */
  layout(layoutId: string): LayoutMap | undefined
  /** Entidade por layout e `objectId` (a chave de `AcApFindHit.entityId`). */
  entity(layoutId: string, id: string): MappedEntity | undefined
}

export type MappingOutcome =
  | { ok: true; map: DocumentMap }
  | { ok: false; failure: ImportFailure; coverage: CoverageReport }

function bumpType(counts: TypeCounts, type: string): void {
  const key = type || '?'
  counts[key] = (counts[key] ?? 0) + 1
}

function statusOf(c: Omit<CoverageReport, 'status'>): CoverageStatus {
  const present = c.rendered + c.partial + c.unsupported
  if (present + c.dropped + c.truncated === 0) return 'empty'
  if (c.rendered + c.partial === 0) return 'nothing-renderable'
  return c.partial + c.unsupported + c.dropped + c.truncated > 0
    ? 'partial'
    : 'complete'
}

/**
 * Mapeia o documento. `ok:false` só quando há entidades (ou perdas) e NENHUMA é
 * desenhável (`nothing-renderable`); um desenho vazio é válido.
 */
export function mapDocument(
  source: MapSource,
  options: MapDocumentOptions = {}
): MappingOutcome {
  const max = options.maxEntities ?? DEFAULT_MAX_ENTITIES
  const layerTable = source.database.tables.layerTable
  const layer: LayerLookup | undefined = layerTable
    ? name => layerTable.getAt(name)
    : undefined
  const layerCache = new Map<string, boolean>()

  const counts = {
    rendered: 0,
    partial: 0,
    unsupported: 0,
    unsupportedByType: {} as TypeCounts,
    partialByType: {} as TypeCounts,
    truncated: 0,
    duplicateIds: 0
  }
  let mapped = 0
  const layouts: LayoutMap[] = []
  const index = new Map<string, Map<string, MappedEntity>>()

  for (const info of source.layouts) {
    const entities: MappedEntity[] = []
    const byId = new Map<string, MappedEntity>()
    const duplicates = new Set<string>()
    let layoutTruncated = 0
    let records: Iterable<EntityLike> = []
    try {
      records =
        source.database.tables.blockTable.getIdAt(info.btrId)?.newIterator() ??
        []
    } catch {
      records = []
    }
    try {
      for (const raw of records) {
        if (mapped >= max) {
          counts.truncated++
          layoutTruncated++
          continue
        }
        const entity = normalizeEntity(raw, {
          layoutId: info.btrId,
          layer,
          layerCache
        })
        mapped++
        entities.push(entity)
        if (entity.id) {
          // política determinística: a PRIMEIRA ocorrência fica indexada; as
          // repetidas continuam em `entities` e ficam reportadas
          if (byId.has(entity.id)) {
            counts.duplicateIds++
            duplicates.add(entity.id)
          } else byId.set(entity.id, entity)
        }
        if (entity.support === 'rendered') counts.rendered++
        else if (entity.support === 'partial') {
          counts.partial++
          bumpType(counts.partialByType, entity.type)
        } else {
          counts.unsupported++
          bumpType(counts.unsupportedByType, entity.type)
        }
      }
    } catch {
      // iterador que lança a meio: o que já foi mapeado fica (não é silencioso:
      // o layout reporta o seu `entities.length`)
    }
    const extents = unionBoxes(
      entities
        .filter(
          e =>
            e.visible &&
            e.bbox !== null &&
            (e.bboxStatus === 'ok' || e.bboxStatus === 'point')
        )
        .map(e => e.bbox as NonNullable<MappedEntity['bbox']>)
    )
    layouts.push({
      layoutId: info.btrId,
      name: info.name,
      tabOrder: info.tabOrder,
      entities,
      extents,
      viewBox: extents ? viewBoxOf(extents, options.margin) : DEFAULT_VIEW_BOX,
      viewBoxReason: extents
        ? 'extents'
        : entities.length > 0
          ? 'no-renderable-extents'
          : layoutTruncated > 0
            ? 'truncated-layout'
            : 'empty-layout',
      truncated: layoutTruncated,
      duplicateIds: [...duplicates].sort().slice(0, MAX_REPORTED_DUPLICATE_IDS)
    })
    index.set(info.btrId, byId)
  }

  const droppedByType = { ...(options.dropped ?? {}) }
  const base = {
    ...counts,
    droppedByType,
    dropped: totalOf(droppedByType)
  }
  const coverage: CoverageReport = { ...base, status: statusOf(base) }

  if (coverage.status === 'nothing-renderable') {
    const failure = makeFailure('parse', 'inspect', describeCoverage(coverage))
    failure.message =
      coverage.truncated > 0
        ? NO_RENDERABLE_TRUNCATED_MESSAGE
        : NO_RENDERABLE_MESSAGE
    return { ok: false, failure, coverage }
  }

  return {
    ok: true,
    map: {
      layouts,
      coverage,
      entityCount: mapped,
      layout: id => layouts.find(l => l.layoutId === id),
      entity: (layoutId, id) => index.get(layoutId)?.get(id)
    }
  }
}

function describeTypes(counts: TypeCounts): string {
  return Object.keys(counts)
    .sort()
    .map(k => `${k}×${counts[k]}`)
    .join(', ')
}

/**
 * Resumo (PT-PT, para o canal `log` e para `ImportFailure.detail`): nunca
 * afirma «completo» quando houve perdas.
 */
export function describeCoverage(c: CoverageReport): string {
  const parts = [`cobertura ${c.status}`]
  parts.push(`desenhadas ${c.rendered}`)
  if (c.partial) {
    parts.push(`parciais ${c.partial} (${describeTypes(c.partialByType)})`)
  }
  if (c.unsupported) {
    parts.push(
      `não suportadas ${c.unsupported} (${describeTypes(c.unsupportedByType)})`
    )
  }
  if (c.dropped) {
    parts.push(
      `descartadas pelo conversor ${c.dropped} (${describeTypes(c.droppedByType)})`
    )
  }
  if (c.truncated) parts.push(`não mapeadas (limite) ${c.truncated}`)
  if (c.duplicateIds) parts.push(`ids duplicados ${c.duplicateIds}`)
  return parts.join('; ')
}
