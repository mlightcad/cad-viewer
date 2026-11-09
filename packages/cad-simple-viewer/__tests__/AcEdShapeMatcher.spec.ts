import {
  type AcEdAffine2d,
  acedApplyAffine2d,
  acedFindShapeMatches,
  type AcEdShapeFeature
} from '../src/smartBlock/AcEdShapeMatcher'

type P = { x: number; y: number }

/** A door-like symbol: a frame line, a leaf line and a swing marker circle. */
function symbol(t: AcEdAffine2d, idBase: number): AcEdShapeFeature<number>[] {
  const map = (p: P) => acedApplyAffine2d(t, p)
  const line = (a: P, b: P, id: number): AcEdShapeFeature<number> => {
    const pa = map(a)
    const pb = map(b)
    return {
      id,
      kind: 'line',
      center: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
      size: Math.hypot(pb.x - pa.x, pb.y - pa.y),
      points: [pa, pb]
    }
  }
  const scale = Math.hypot(t.a, t.b)
  return [
    line({ x: 0, y: 0 }, { x: 10, y: 0 }, idBase),
    line({ x: 0, y: 0 }, { x: 0, y: 4 }, idBase + 1),
    {
      id: idBase + 2,
      kind: 'circle',
      center: map({ x: 8, y: 3 }),
      size: 1 * scale,
      points: []
    }
  ]
}

function similarity(
  angle: number,
  tx: number,
  ty: number,
  scale = 1,
  mirror = false
): AcEdAffine2d {
  const sign = mirror ? -1 : 1
  const cos = Math.cos(angle) * scale
  const sin = Math.sin(angle) * scale
  return { a: cos, b: sin, c: -sin * sign, d: cos * sign, e: tx, f: ty }
}

const identity = similarity(0, 0, 0)

describe('acedFindShapeMatches', () => {
  it('finds translated and rotated copies and reports their transforms', () => {
    const template = symbol(identity, 0)
    const copies = [
      ...symbol(similarity(0, 50, 0), 10),
      ...symbol(similarity(Math.PI / 2, 0, 50), 20)
    ]
    const matches = acedFindShapeMatches(template, [...template, ...copies])
    expect(matches).toHaveLength(2)
    const byFirst = new Map(matches.map(m => [m.ids[0], m]))
    expect(byFirst.get(10)?.rotation).toBeCloseTo(0, 6)
    expect(byFirst.get(10)?.transform.e).toBeCloseTo(50, 6)
    expect(byFirst.get(20)?.rotation).toBeCloseTo(Math.PI / 2, 6)
    expect(byFirst.get(20)?.ids).toEqual([20, 21, 22])
  })

  it('finds mirrored copies only when mirroring is allowed', () => {
    const template = symbol(identity, 0)
    const mirrored = symbol(similarity(0, 0, 40, 1, true), 10)
    const matches = acedFindShapeMatches(template, mirrored)
    expect(matches).toHaveLength(1)
    expect(matches[0].mirrored).toBe(true)
    expect(
      acedFindShapeMatches(template, mirrored, { allowMirror: false })
    ).toHaveLength(0)
  })

  it('ignores scaled copies unless scaling is allowed', () => {
    const template = symbol(identity, 0)
    const scaled = symbol(similarity(0.3, 100, 100, 2), 10)
    expect(acedFindShapeMatches(template, scaled)).toHaveLength(0)
    const matches = acedFindShapeMatches(template, scaled, { allowScale: true })
    expect(matches).toHaveLength(1)
    expect(matches[0].scale).toBeCloseTo(2, 6)
    expect(matches[0].rotation).toBeCloseTo(0.3, 6)
  })

  it('rejects incomplete or altered copies', () => {
    const template = symbol(identity, 0)
    const partial = symbol(similarity(0, 50, 0), 10).slice(0, 2)
    const altered = symbol(similarity(0, 0, 50), 20)
    altered[2] = { ...altered[2], size: 1.5 }
    expect(
      acedFindShapeMatches(template, [...partial, ...altered])
    ).toHaveLength(0)
  })

  it('does not reuse shapes between overlapping matches', () => {
    const template = symbol(identity, 0)
    const copy = symbol(similarity(0, 50, 0), 10)
    // The same copy listed twice under other ids must not count twice.
    const matches = acedFindShapeMatches(template, [...copy, ...copy])
    expect(matches).toHaveLength(1)
  })

  it('maps every template point onto the copy', () => {
    const template = symbol(identity, 0)
    const t = similarity(1.1, -20, 7, 1, true)
    const [match] = acedFindShapeMatches(template, symbol(t, 10))
    const p = acedApplyAffine2d(match.transform, { x: 10, y: 0 })
    const expected = acedApplyAffine2d(t, { x: 10, y: 0 })
    expect(p.x).toBeCloseTo(expected.x, 6)
    expect(p.y).toBeCloseTo(expected.y, 6)
  })
})
