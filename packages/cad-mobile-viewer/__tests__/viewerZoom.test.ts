// SPDX-License-Identifier: GPL-3.0-or-later
//
// Caixas de vista na fronteira com o renderer (spec M3-I4 §2.2).

import {
  boxFromCorners,
  MAX_VIEW_COORD,
  MIN_VIEW_SIZE,
  scaleViewBox,
  usableViewBox
} from '../src/viewer/zoom'

const BOX = { min: { x: 0, y: 0 }, max: { x: 100, y: 50 } }

describe('usableViewBox', () => {
  test('caixa normal → cópia', () => {
    const out = usableViewBox(BOX)
    expect(out).toEqual(BOX)
    expect(out).not.toBe(BOX)
    expect(out?.min).not.toBe(BOX.min)
  })

  test.each([
    [null],
    [undefined],
    [{}],
    [{ min: { x: 0, y: 0 } }],
    [{ min: { x: 0, y: 0 }, max: { x: NaN, y: 1 } }],
    [{ min: { x: 0, y: 0 }, max: { x: Infinity, y: 1 } }],
    [{ min: { x: 0, y: 0 }, max: { x: '1', y: 1 } }],
    [{ min: { x: 5, y: 0 }, max: { x: 1, y: 1 } }],
    [{ min: { x: 0, y: 0 }, max: { x: 0, y: 1 } }],
    [{ min: { x: 0, y: 0 }, max: { x: MIN_VIEW_SIZE / 2, y: 1 } }],
    [{ min: { x: 0, y: 0 }, max: { x: MAX_VIEW_COORD * 2, y: 1 } }],
    [
      {
        min: { x: -Number.MAX_VALUE, y: 0 },
        max: { x: Number.MAX_VALUE, y: 1 }
      }
    ]
  ])('caixa inválida %j → null', box => {
    expect(usableViewBox(box)).toBeNull()
  })

  test('getter hostil → null (nunca lança)', () => {
    const box = Object.defineProperty({}, 'min', {
      get() {
        throw new Error('boom')
      }
    })
    expect(usableViewBox(box)).toBeNull()
  })
})

describe('boxFromCorners', () => {
  test('ordena cantos com Y do ecrã invertido', () => {
    expect(boxFromCorners({ x: 0, y: 50 }, { x: 100, y: 0 })).toEqual(BOX)
  })
  test('canto não-finito → null', () => {
    expect(boxFromCorners({ x: 0, y: NaN }, { x: 1, y: 1 })).toBeNull()
  })
})

describe('scaleViewBox (§5.5 literal)', () => {
  test('in por omissão: meias dimensões ÷ 2, centro mantido', () => {
    expect(scaleViewBox(BOX, 'in')).toEqual({
      ok: true,
      box: { min: { x: 25, y: 12.5 }, max: { x: 75, y: 37.5 } }
    })
  })

  test('out por omissão: meias dimensões ÷ 0.5', () => {
    expect(scaleViewBox(BOX, 'out')).toEqual({
      ok: true,
      box: { min: { x: -50, y: -25 }, max: { x: 150, y: 75 } }
    })
  })

  test('factor explícito é usado tal como vem (contrato literal, [H] S1)', () => {
    const out = scaleViewBox(BOX, 'out', 2)
    expect(out.ok && out.box).toEqual({
      min: { x: 25, y: 12.5 },
      max: { x: 75, y: 37.5 }
    })
  })

  test('caixa actual inválida → view-unavailable', () => {
    expect(
      scaleViewBox({ min: { x: 0, y: 0 }, max: { x: NaN, y: 1 } }, 'in')
    ).toMatchObject({
      ok: false,
      code: 'view-unavailable'
    })
  })

  test('aproximar abaixo do lado mínimo → zoom-limit (sem caixa)', () => {
    const tiny = { min: { x: 0, y: 0 }, max: { x: MIN_VIEW_SIZE * 1.5, y: 1 } }
    expect(scaleViewBox(tiny, 'in')).toMatchObject({
      ok: false,
      code: 'zoom-limit'
    })
  })

  test('afastar para lá de MAX_VIEW_COORD → zoom-limit (sem caixa)', () => {
    const huge = {
      min: { x: -MAX_VIEW_COORD * 0.75, y: -1 },
      max: { x: MAX_VIEW_COORD * 0.75, y: 1 }
    }
    expect(scaleViewBox(huge, 'out')).toMatchObject({
      ok: false,
      code: 'zoom-limit'
    })
  })

  test('factor não positivo → zoom-limit', () => {
    expect(scaleViewBox(BOX, 'in', 0)).toMatchObject({
      ok: false,
      code: 'zoom-limit'
    })
    expect(scaleViewBox(BOX, 'in', NaN)).toMatchObject({
      ok: false,
      code: 'zoom-limit'
    })
  })

  test('propriedade: in seguido de out repõe a caixa (factores por omissão)', () => {
    for (let i = 1; i < 50; i++) {
      const box = { min: { x: -i * 3, y: i }, max: { x: i * 7, y: i * 2 + 1 } }
      const a = scaleViewBox(box, 'in')
      expect(a.ok).toBe(true)
      if (!a.ok) continue
      const b = scaleViewBox(a.box, 'out')
      expect(b.ok).toBe(true)
      if (!b.ok) continue
      expect(b.box.min.x).toBeCloseTo(box.min.x, 9)
      expect(b.box.max.y).toBeCloseTo(box.max.y, 9)
    }
  })
})
