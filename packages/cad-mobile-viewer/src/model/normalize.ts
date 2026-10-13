// SPDX-License-Identifier: GPL-3.0-or-later
//
// Normalização de uma entidade da base de dados para `MappedEntity` e
// aritmética de caixas (OBJ-0104 M2-I3, spec §3.2). Estrutural (sem
// `instanceof`) para ser testável com objectos simples, como o FIND.

import { classifyEntityType } from './support'
import type { BboxStatus, Box2, MappedEntity, ViewBox } from './types'

/** Acima disto uma coordenada é tratada como ilimitada [H até S2]. */
export const MAX_ABS_COORD = 1e12

/** Tipos cujas extensões não são utilizáveis para enquadrar (semirrectas/rectas). */
export const UNBOUNDED_TYPES: readonly string[] = ['RAY', 'XLINE']

/** Vista usada quando um layout não tem nenhuma extensão. */
export const DEFAULT_VIEW_BOX: ViewBox = {
  min: { x: 0, y: 0 },
  max: { x: 100, y: 100 }
}

/** Margem do `zoomTo` (§5.5). */
export const DEFAULT_MARGIN = 1.1

/** Forma mínima de uma entidade do data-model usada aqui. */
export interface EntityLike {
  objectId: string
  dxfTypeName: string
  layer: string
  visibility?: boolean
  geometricExtents?: unknown
}

export interface LayerState {
  isOff?: boolean
  isFrozen?: boolean
}

/** Procura o estado de uma camada pelo nome; `undefined` = desconhecida. */
export type LayerLookup = (name: string) => LayerState | undefined

interface XY {
  x: unknown
  y: unknown
}
interface ExtentsLike {
  min?: XY
  max?: XY
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** `geometricExtents` → caixa 2D normalizada, ou o motivo pelo qual não há. */
export function boxFromExtents(extents: unknown): {
  box: Box2 | null
  status: BboxStatus
} {
  const e = extents as ExtentsLike | null | undefined
  const a = e?.min
  const b = e?.max
  if (!a || !b) return { box: null, status: 'none' }
  const { x: ax, y: ay } = a
  const { x: bx, y: by } = b
  if (!finite(ax) || !finite(ay) || !finite(bx) || !finite(by)) {
    return { box: null, status: 'none' }
  }
  if ([ax, ay, bx, by].some(v => Math.abs(v) > MAX_ABS_COORD)) {
    return { box: null, status: 'unbounded' }
  }
  const box: Box2 = {
    min: { x: Math.min(ax, bx), y: Math.min(ay, by) },
    max: { x: Math.max(ax, bx), y: Math.max(ay, by) }
  }
  const isPoint = box.min.x === box.max.x && box.min.y === box.max.y
  return { box, status: isPoint ? 'point' : 'ok' }
}

/** União de caixas; `null` se não houver nenhuma. */
export function unionBoxes(boxes: Iterable<Box2>): Box2 | null {
  let result: Box2 | null = null
  for (const box of boxes) {
    result = result
      ? {
          min: {
            x: Math.min(result.min.x, box.min.x),
            y: Math.min(result.min.y, box.min.y)
          },
          max: {
            x: Math.max(result.max.x, box.max.x),
            y: Math.max(result.max.y, box.max.y)
          }
        }
      : { min: { ...box.min }, max: { ...box.max } }
  }
  return result
}

/**
 * Caixa de vista: a caixa com margem multiplicativa em torno do centro;
 * dimensão nula (ponto, linha recta) ganha uma largura mínima para o zoom não
 * degenerar. Nunca devolve valores não-finitos.
 */
export function viewBoxOf(box: Box2, margin = DEFAULT_MARGIN): ViewBox {
  const m = finite(margin) && margin > 0 ? margin : DEFAULT_MARGIN
  const cx = (box.min.x + box.max.x) / 2
  const cy = (box.min.y + box.max.y) / 2
  const w = box.max.x - box.min.x
  const h = box.max.y - box.min.y
  const size = Math.max(w, h)
  const minSize = Math.max(size * 1e-3, 1e-3)
  const halfW = (Math.max(w, minSize) * m) / 2
  const halfH = (Math.max(h, minSize) * m) / 2
  return {
    min: { x: cx - halfW, y: cy - halfH },
    max: { x: cx + halfW, y: cy + halfH }
  }
}

export function containsPoint(box: Box2, p: { x: number; y: number }): boolean {
  return (
    p.x >= box.min.x && p.x <= box.max.x && p.y >= box.min.y && p.y <= box.max.y
  )
}

function layerVisible(
  name: string,
  lookup: LayerLookup | undefined,
  cache: Map<string, boolean>
): boolean {
  const cached = cache.get(name)
  if (cached !== undefined) return cached
  let visible = true
  try {
    const layer = lookup?.(name)
    visible = !(layer?.isOff || layer?.isFrozen)
  } catch {
    visible = true
  }
  cache.set(name, visible)
  return visible
}

export interface NormalizeContext {
  layoutId: string
  layer?: LayerLookup
  /** Cache de visibilidade de camadas (partilhável por todo o documento). */
  layerCache?: Map<string, boolean>
}

/**
 * Normaliza uma entidade. Nunca lança: uma excepção ao ler qualquer campo deixa
 * a entidade no mapa com `bboxStatus: 'none'` (a identidade é preservada).
 */
export function normalizeEntity(
  entity: EntityLike,
  ctx: NormalizeContext
): MappedEntity {
  let type = ''
  let layer = '0'
  let id = ''
  let entityVisible = true
  try {
    type = String(entity.dxfTypeName ?? '').toUpperCase()
  } catch {
    type = ''
  }
  try {
    layer = String(entity.layer ?? '0')
  } catch {
    layer = '0'
  }
  try {
    id = String(entity.objectId ?? '')
  } catch {
    id = ''
  }
  try {
    entityVisible = entity.visibility !== false
  } catch {
    entityVisible = true
  }

  let bbox: Box2 | null = null
  let bboxStatus: BboxStatus = 'none'
  if (UNBOUNDED_TYPES.includes(type)) {
    bboxStatus = 'unbounded'
  } else {
    try {
      const r = boxFromExtents(entity.geometricExtents)
      bbox = r.box
      bboxStatus = r.status
    } catch {
      bbox = null
      bboxStatus = 'none'
    }
  }

  const info = classifyEntityType(type)
  const visible =
    entityVisible &&
    layerVisible(layer, ctx.layer, ctx.layerCache ?? new Map<string, boolean>())
  return {
    id,
    type,
    layer,
    layoutId: ctx.layoutId,
    bbox,
    bboxStatus,
    visible,
    support: info.support,
    searchable: info.searchable
  }
}
