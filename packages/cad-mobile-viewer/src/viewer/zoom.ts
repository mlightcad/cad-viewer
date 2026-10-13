// SPDX-License-Identifier: GPL-3.0-or-later
//
// Caixas de vista na fronteira com o renderer (spec M3-I4 §2.2): toda a caixa
// que chega a `zoomTo` passou por aqui — finita, ordenada, não degenerada e
// dentro de limites. Fora disso a operação falha com código explícito; nunca
// se envia NaN/Infinity ao renderer nem se «corrige» a caixa em silêncio.

import { MAX_ABS_COORD } from '../model/normalize'
import type { Point2, ViewBox } from '../model/types'
import type { ZoomOp } from './protocol'

/** Lado mínimo de uma vista em unidades do desenho [H até S2]. */
export const MIN_VIEW_SIZE = 1e-6
/** Coordenada máxima de uma vista (10× a de uma entidade) [H até S2]. */
export const MAX_VIEW_COORD = MAX_ABS_COORD * 10

/** Factor por omissão de §5.5 (meias dimensões ÷ factor). */
export const DEFAULT_ZOOM_FACTOR: Record<'in' | 'out', number> = {
  in: 2,
  out: 0.5
}

const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

function pointOf(p: unknown): Point2 | null {
  if (typeof p !== 'object' || p === null) return null
  let x: unknown
  let y: unknown
  try {
    x = (p as Point2).x
    y = (p as Point2).y
  } catch {
    return null
  }
  return finite(x) && finite(y) ? { x, y } : null
}

/**
 * Caixa utilizável pelo renderer, ou `null`. Devolve sempre uma cópia (nunca
 * a referência recebida).
 */
export function usableViewBox(box: unknown): ViewBox | null {
  if (typeof box !== 'object' || box === null) return null
  let rawMin: unknown
  let rawMax: unknown
  try {
    rawMin = (box as ViewBox).min
    rawMax = (box as ViewBox).max
  } catch {
    return null
  }
  const min = pointOf(rawMin)
  const max = pointOf(rawMax)
  if (!min || !max) return null
  if (max.x - min.x < MIN_VIEW_SIZE || max.y - min.y < MIN_VIEW_SIZE) {
    return null
  }
  if (
    [min.x, min.y, max.x, max.y].some(v => Math.abs(v) > MAX_VIEW_COORD) ||
    !finite(max.x - min.x) ||
    !finite(max.y - min.y)
  ) {
    return null
  }
  return { min, max }
}

/** Caixa a partir de dois cantos quaisquer (o eixo Y do ecrã é invertido). */
export function boxFromCorners(a: unknown, b: unknown): ViewBox | null {
  const p = pointOf(a)
  const q = pointOf(b)
  if (!p || !q) return null
  return usableViewBox({
    min: { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y) },
    max: { x: Math.max(p.x, q.x), y: Math.max(p.y, q.y) }
  })
}

export type ZoomStep =
  | { ok: true; box: ViewBox }
  | { ok: false; code: 'view-unavailable' | 'zoom-limit'; message: string }

/**
 * §5.5 literal: centro mantido, meias dimensões divididas por `factor` (por
 * omissão in=2, out=0.5). Caixa actual inválida → `view-unavailable`;
 * resultado fora de `[MIN_VIEW_SIZE, MAX_VIEW_COORD]` → `zoom-limit`.
 */
export function scaleViewBox(
  current: unknown,
  op: Exclude<ZoomOp, 'extents'>,
  factor?: number
): ZoomStep {
  const box = usableViewBox(current)
  if (!box) {
    return {
      ok: false,
      code: 'view-unavailable',
      message: 'caixa visível da vista indisponível ou inválida'
    }
  }
  const f = factor ?? DEFAULT_ZOOM_FACTOR[op]
  if (!finite(f) || f <= 0) {
    return { ok: false, code: 'zoom-limit', message: `factor inválido: ${f}` }
  }
  const cx = (box.min.x + box.max.x) / 2
  const cy = (box.min.y + box.max.y) / 2
  const halfW = (box.max.x - box.min.x) / 2 / f
  const halfH = (box.max.y - box.min.y) / 2 / f
  const next = usableViewBox({
    min: { x: cx - halfW, y: cy - halfH },
    max: { x: cx + halfW, y: cy + halfH }
  })
  if (!next) {
    return {
      ok: false,
      code: 'zoom-limit',
      message: `limite de zoom atingido (${op})`
    }
  }
  return { ok: true, box: next }
}
