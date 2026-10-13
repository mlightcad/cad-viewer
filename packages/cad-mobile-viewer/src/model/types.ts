// SPDX-License-Identifier: GPL-3.0-or-later
//
// Representação intermédia de entidades (OBJ-0104 M2-I3,
// docs/OBJ-0104-m2-i3-entity-mapping-spec.md §3). Só leitura e leve: identidade
// + localização + estado de suporte; NÃO duplica geometria (o renderer desenha
// a partir da base de dados).

export interface Point2 {
  x: number
  y: number
}

/** Caixa alinhada aos eixos em WCS (2D). Sempre finita e com `min ≤ max`. */
export interface Box2 {
  min: Point2
  max: Point2
}

/** Caixa no formato que `view.zoomTo(box, margin)` aceita (§2.4/§5.5). */
export type ViewBox = Box2

/**
 * `rendered` = o renderer upstream desenha (`subWorldDraw` próprio);
 * `partial` = só desenha em certas condições por instância (documentado);
 * `unsupported` = não desenha (ou tipo desconhecido): falha explícita.
 */
export type SupportLevel = 'rendered' | 'partial' | 'unsupported'

export interface SupportInfo {
  support: SupportLevel
  /** O FIND (`acapFindTextInLayout`) procura texto neste tipo. */
  searchable: boolean
  /** Motivo/condição (PT-PT), obrigatório fora de `rendered`. */
  note?: string
}

/**
 * `ok` caixa normal; `point` largura e altura 0; `none` sem extensão válida
 * (lançou, vazia ou não-finita); `unbounded` ilimitada (RAY/XLINE) ou absurda.
 */
export type BboxStatus = 'ok' | 'point' | 'none' | 'unbounded'

export interface MappedEntity {
  /** `objectId` (handle): a mesma chave que `AcApFindHit.entityId`. */
  id: string
  /** `dxfTypeName` em maiúsculas. */
  type: string
  layer: string
  /** Block table record do layout que contém a entidade. */
  layoutId: string
  bbox: Box2 | null
  bboxStatus: BboxStatus
  /** `visibility` da entidade e camada ligada e descongelada. */
  visible: boolean
  support: SupportLevel
  searchable: boolean
}

export type ViewBoxReason = 'extents' | 'empty-layout'

export interface LayoutMap {
  layoutId: string
  name: string
  tabOrder: number
  entities: MappedEntity[]
  /** União das caixas `ok|point` das entidades visíveis; `null` se não houver. */
  extents: Box2 | null
  /** Caixa para `zoomToFit` do layout (extensão com margem ou fallback). */
  viewBox: ViewBox
  viewBoxReason: ViewBoxReason
}

export type CoverageStatus =
  | 'complete'
  | 'partial'
  | 'nothing-renderable'
  | 'empty'

export type TypeCounts = Record<string, number>

export interface CoverageReport {
  status: CoverageStatus
  /** Entidades na base de dados por estado de suporte. */
  rendered: number
  partial: number
  unsupported: number
  /** `unsupported`/`partial` por tipo (só o que existe na base de dados). */
  unsupportedByType: TypeCounts
  partialByType: TypeCounts
  /** Tipos descartados pelo conversor/parser antes de chegarem à base de dados. */
  droppedByType: TypeCounts
  dropped: number
  /** Total de entidades a mais que `maxEntities` (não mapeadas). */
  truncated: number
}
