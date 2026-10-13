// SPDX-License-Identifier: GPL-3.0-or-later
//
// Normalização de entidades e aritmética de caixas (spec M2-I3 §3.2). Inclui
// testes de propriedade com PRNG determinístico (sem dependências novas).

import {
  boxFromExtents,
  containsPoint,
  DEFAULT_MARGIN,
  type EntityLike,
  MAX_ABS_COORD,
  normalizeEntity,
  unionBoxes,
  viewBoxOf
} from '../src/model/normalize'
import type { Box2 } from '../src/model/types'

/** mulberry32: PRNG determinístico (a semente fixa torna as falhas reproduzíveis). */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomBox(next: () => number, span = 1e6): Box2 {
  const x = (next() - 0.5) * span
  const y = (next() - 0.5) * span
  const w = next() < 0.2 ? 0 : next() * span * 0.1
  const h = next() < 0.2 ? 0 : next() * span * 0.1
  return { min: { x, y }, max: { x: x + w, y: y + h } }
}

const entity = (over: Partial<EntityLike> = {}): EntityLike => ({
  objectId: 'A1',
  dxfTypeName: 'LINE',
  layer: '0',
  visibility: true,
  geometricExtents: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 0 } },
  ...over
})

describe('boxFromExtents', () => {
  it('caixa normal, ponto e ordem trocada', () => {
    expect(
      boxFromExtents({ min: { x: 1, y: 2 }, max: { x: 3, y: 4 } })
    ).toEqual({
      box: { min: { x: 1, y: 2 }, max: { x: 3, y: 4 } },
      status: 'ok'
    })
    expect(
      boxFromExtents({ min: { x: 5, y: 5 }, max: { x: 5, y: 5 } }).status
    ).toBe('point')
    expect(
      boxFromExtents({ min: { x: 3, y: 4 }, max: { x: 1, y: 2 } }).box
    ).toEqual({ min: { x: 1, y: 2 }, max: { x: 3, y: 4 } })
  })

  it('vazia/não-finita/ausente = none; absurda = unbounded', () => {
    const empty = {
      min: { x: Infinity, y: Infinity },
      max: { x: -Infinity, y: -Infinity }
    }
    expect(boxFromExtents(empty)).toEqual({ box: null, status: 'none' })
    expect(boxFromExtents(undefined).status).toBe('none')
    expect(boxFromExtents(null).status).toBe('none')
    expect(boxFromExtents({}).status).toBe('none')
    expect(
      boxFromExtents({ min: { x: NaN, y: 0 }, max: { x: 1, y: 1 } }).status
    ).toBe('none')
    expect(
      boxFromExtents({ min: { x: '1', y: 0 }, max: { x: 1, y: 1 } }).status
    ).toBe('none')
    expect(
      boxFromExtents({
        min: { x: 0, y: 0 },
        max: { x: MAX_ABS_COORD * 2, y: 1 }
      })
    ).toEqual({ box: null, status: 'unbounded' })
  })

  it('propriedade: o resultado é sempre finito e ordenado', () => {
    const next = rng(104)
    for (let i = 0; i < 500; i++) {
      const a = randomBox(next)
      // trocar min/max aleatoriamente não pode quebrar a invariante
      const swap = next() < 0.5
      const { box, status } = boxFromExtents(
        swap ? { min: a.max, max: a.min } : a
      )
      expect(status === 'ok' || status === 'point').toBe(true)
      expect(box).not.toBeNull()
      const b = box as Box2
      expect(b.min.x).toBeLessThanOrEqual(b.max.x)
      expect(b.min.y).toBeLessThanOrEqual(b.max.y)
      expect(Object.values({ ...b.min, ...b.max }).every(Number.isFinite)).toBe(
        true
      )
    }
  })
})

describe('unionBoxes / viewBoxOf', () => {
  it('vazio → null; união contém todas as caixas', () => {
    expect(unionBoxes([])).toBeNull()
    const next = rng(7)
    for (let n = 1; n < 40; n++) {
      const boxes = Array.from({ length: n }, () => randomBox(next))
      const u = unionBoxes(boxes) as Box2
      for (const b of boxes) {
        expect(containsPoint(u, b.min)).toBe(true)
        expect(containsPoint(u, b.max)).toBe(true)
      }
    }
  })

  it('não altera as caixas de entrada', () => {
    const a: Box2 = { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } }
    const u = unionBoxes([a]) as Box2
    u.min.x = -99
    expect(a.min.x).toBe(0)
  })

  it('propriedade: a vista contém a caixa, é finita e preserva o centro', () => {
    const next = rng(2026)
    for (let i = 0; i < 500; i++) {
      const b = randomBox(next)
      const v = viewBoxOf(b)
      expect(containsPoint(v, b.min)).toBe(true)
      expect(containsPoint(v, b.max)).toBe(true)
      expect(v.max.x).toBeGreaterThan(v.min.x)
      expect(v.max.y).toBeGreaterThan(v.min.y)
      const cx = (b.min.x + b.max.x) / 2
      expect((v.min.x + v.max.x) / 2).toBeCloseTo(cx, 3)
    }
  })

  it('ponto e margem inválida não degeneram', () => {
    const p: Box2 = { min: { x: 5, y: 5 }, max: { x: 5, y: 5 } }
    const v = viewBoxOf(p, -3)
    expect(v.max.x - v.min.x).toBeGreaterThan(0)
    expect(viewBoxOf(p, NaN)).toEqual(viewBoxOf(p, DEFAULT_MARGIN))
    expect(viewBoxOf(p, 0)).toEqual(viewBoxOf(p, DEFAULT_MARGIN))
  })
})

describe('normalizeEntity', () => {
  const ctx = { layoutId: '1F' }

  it('preserva identidade, tipo, camada, layout, caixa e estado de suporte', () => {
    const m = normalizeEntity(
      entity({ dxfTypeName: 'mtext', layer: 'NOTES' }),
      ctx
    )
    expect(m).toEqual({
      id: 'A1',
      type: 'MTEXT',
      layer: 'NOTES',
      layoutId: '1F',
      bbox: { min: { x: 0, y: 0 }, max: { x: 10, y: 5 } },
      bboxStatus: 'ok',
      visible: true,
      support: 'rendered',
      searchable: true
    })
  })

  it('RAY/XLINE são ilimitadas (sem bbox) mesmo com extents finitos', () => {
    for (const t of ['RAY', 'XLINE']) {
      const m = normalizeEntity(entity({ dxfTypeName: t }), ctx)
      expect(m.bbox).toBeNull()
      expect(m.bboxStatus).toBe('unbounded')
      expect(m.support).toBe('rendered')
    }
  })

  it('tipo desconhecido e OLEFRAME ficam unsupported; viewport parcial', () => {
    expect(
      normalizeEntity(entity({ dxfTypeName: 'REGION' }), ctx).support
    ).toBe('unsupported')
    expect(
      normalizeEntity(entity({ dxfTypeName: 'OLEFRAME' }), ctx).support
    ).toBe('unsupported')
    expect(
      normalizeEntity(entity({ dxfTypeName: 'VIEWPORT' }), ctx).support
    ).toBe('partial')
  })

  it('visibilidade: entidade oculta, camada desligada ou congelada', () => {
    expect(normalizeEntity(entity({ visibility: false }), ctx).visible).toBe(
      false
    )
    const lookup = (n: string) =>
      n === 'OFF'
        ? { isOff: true }
        : n === 'ICE'
          ? { isFrozen: true }
          : undefined
    expect(
      normalizeEntity(entity({ layer: 'OFF' }), { ...ctx, layer: lookup })
        .visible
    ).toBe(false)
    expect(
      normalizeEntity(entity({ layer: 'ICE' }), { ...ctx, layer: lookup })
        .visible
    ).toBe(false)
    expect(
      normalizeEntity(entity({ layer: 'ON' }), { ...ctx, layer: lookup })
        .visible
    ).toBe(true)
  })

  it('excepções em campos não derrubam: a identidade preserva-se, bbox = none', () => {
    const boom = new Proxy(entity(), {
      get(target, prop) {
        if (prop === 'geometricExtents' || prop === 'layer')
          throw new Error('x')
        return Reflect.get(target, prop)
      }
    })
    const m = normalizeEntity(boom, ctx)
    expect(m.id).toBe('A1')
    expect(m.type).toBe('LINE')
    expect(m.layer).toBe('0')
    expect(m.bbox).toBeNull()
    expect(m.bboxStatus).toBe('none')
  })

  it('a cache de camadas evita consultas repetidas', () => {
    let calls = 0
    const lookup = () => {
      calls++
      return { isOff: false }
    }
    const layerCache = new Map<string, boolean>()
    for (let i = 0; i < 10; i++) {
      normalizeEntity(entity({ layer: 'L' }), {
        ...ctx,
        layer: lookup,
        layerCache
      })
    }
    expect(calls).toBe(1)
  })

  it('a excepção do lookup de camada conta como visível (não esconde entidades)', () => {
    const m = normalizeEntity(entity(), {
      ...ctx,
      layer: () => {
        throw new Error('x')
      }
    })
    expect(m.visible).toBe(true)
  })
})
