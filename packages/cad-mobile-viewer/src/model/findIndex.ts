// SPDX-License-Identifier: GPL-3.0-or-later
//
// Índice FIND (OBJ-0104 M2-I3, spec §3.5): liga cada hit de `acapFindText` à
// entidade do mapa (identidade), à caixa de zoom (a MESMA que
// `acapNavigateToFindHit` usa, `acapFindHitBox`) e à projecção do protocolo
// (`FindHit`, §5.2). Um hit cuja entidade não está no mapa nunca é ignorado em
// silêncio: fica com `resolved: false`.

import {
  type AcApFindDatabaseLike,
  type AcApFindDrawingResult,
  acapFindExcerpt,
  acapFindHitBox,
  type AcApFindHitKind,
  type AcApFindLayoutHit
} from '@mlightcad/cad-simple-viewer/find'

import type { DocumentMap } from './documentMap'
import type { MappedEntity, Point2, ViewBox } from './types'

/** Mesma forma que `FindHit` de apps/freedom-mobile/src/contracts/protocol.ts. */
export interface FindHitShape {
  index: number
  text: string
  excerpt: string
  layoutName: string
  layoutId: string
  layer: string
  kind: AcApFindHitKind
  tag?: string
  blockName?: string
}

export interface FindIndexEntry {
  /** Posição no resultado: 0..n−1 (a chave do protocolo). */
  index: number
  /** Entidade de topo seleccionada (o `INSERT` para texto em bloco). */
  entityId: string
  /** Chave do texto que fez match (`<entityId>/<aninhado>` em blocos). */
  textEntityId: string
  layoutId: string
  layoutName: string
  kind: AcApFindHitKind
  text: string
  layer: string
  tag?: string
  blockName?: string
  position: Point2
  /** Entidade resolvida no mapa do layout do hit; `null` se não existir. */
  entity: MappedEntity | null
  resolved: boolean
  /** Caixa de zoom (`acapFindHitBox`); finita e não degenerada se `zoomable`. */
  box: ViewBox
  zoomable: boolean
}

export interface FindIndex {
  entries: FindIndexEntry[]
  truncated: boolean
  /** Layouts com ≥ 1 hit (semântica de `findResult.layoutCount`). */
  layoutCount: number
  /** Nº de hits cuja entidade não existe no mapa (deve ser 0). */
  unresolved: number
  /** Entrada por índice; fora de intervalo/não inteiro → `undefined`. */
  entry(index: number): FindIndexEntry | undefined
  /** Projecção para `findResult.hits` (sem `entityId`/`extents`/`position`). */
  toFindHits(): FindHitShape[]
}

export interface BuildFindIndexOptions {
  query: string
  matchCase?: boolean
}

function finiteBox(b: ViewBox): boolean {
  return (
    Number.isFinite(b.min.x) &&
    Number.isFinite(b.min.y) &&
    Number.isFinite(b.max.x) &&
    Number.isFinite(b.max.y) &&
    b.max.x > b.min.x &&
    b.max.y > b.min.y
  )
}

function boxOfHit(db: AcApFindDatabaseLike, hit: AcApFindLayoutHit): ViewBox {
  try {
    return acapFindHitBox(db, hit.layoutId, hit)
  } catch {
    // mesmo fallback de acapFindHitBox: a posição do hit
    const p = hit.position
    const half = 0.5e-3
    return {
      min: { x: p.x - half, y: p.y - half },
      max: { x: p.x + half, y: p.y + half }
    }
  }
}

export function buildFindIndex(
  map: DocumentMap,
  db: AcApFindDatabaseLike,
  result: AcApFindDrawingResult,
  options: BuildFindIndexOptions
): FindIndex {
  const matchCase = options.matchCase === true
  const entries: FindIndexEntry[] = result.hits.map((hit, index) => {
    const entity = map.entity(hit.layoutId, hit.entityId) ?? null
    const box = boxOfHit(db, hit)
    const entry: FindIndexEntry = {
      index,
      entityId: hit.entityId,
      textEntityId: hit.textEntityId,
      layoutId: hit.layoutId,
      layoutName: hit.layoutName,
      kind: hit.kind,
      text: hit.text,
      layer: hit.layer,
      position: { x: hit.position.x, y: hit.position.y },
      entity,
      resolved: entity !== null,
      box,
      zoomable: finiteBox(box)
    }
    if (hit.tag !== undefined) entry.tag = hit.tag
    if (hit.blockName !== undefined) entry.blockName = hit.blockName
    return entry
  })

  return {
    entries,
    truncated: result.truncated,
    layoutCount: new Set(entries.map(e => e.layoutId)).size,
    unresolved: entries.filter(e => !e.resolved).length,
    entry: index =>
      Number.isInteger(index) && index >= 0 ? entries[index] : undefined,
    toFindHits: () =>
      entries.map(e => {
        const hit: FindHitShape = {
          index: e.index,
          text: e.text,
          excerpt: acapFindExcerpt(e.text, options.query, matchCase),
          layoutName: e.layoutName,
          layoutId: e.layoutId,
          layer: e.layer,
          kind: e.kind
        }
        if (e.tag !== undefined) hit.tag = e.tag
        if (e.blockName !== undefined) hit.blockName = e.blockName
        return hit
      })
  }
}
