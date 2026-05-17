import { AcExOsnapIndex } from '../src/AcExOsnap'

describe('AcExOsnapIndex', () => {
  const layout = {
    btrId: 'model',
    name: 'Model',
    isModelSpace: true,
    lineBatches: [
      {
        layer: '0',
        color: 0xffffff,
        offset: [0, 0, 0] as [number, number, number],
        positions: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]
      }
    ],
    meshBatches: []
  }

  it('snaps to the nearest endpoint within threshold', () => {
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout, () => true)
    const snap = index.findSnap(0.4, 0.2, 1)
    expect(snap).toEqual({ x: 0, y: 0, mode: 'endpoint' })
  })

  it('snaps to segment midpoint', () => {
    const index = new AcExOsnapIndex(['midpoint'])
    index.rebuild(layout, () => true)
    const snap = index.findSnap(5.1, 0.1, 1)
    expect(snap).toEqual({ x: 5, y: 0, mode: 'midpoint' })
  })

  it('prefers endpoint over nearest on the same segment', () => {
    const index = new AcExOsnapIndex(['endpoint', 'nearest'])
    index.rebuild(layout, () => true)
    const snap = index.findSnap(0.2, 0.1, 1)
    expect(snap?.mode).toBe('endpoint')
  })

  it('ignores geometry on hidden layers', () => {
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout, name => name !== '0')
    expect(index.findSnap(0.1, 0.1, 1)).toBeUndefined()
  })

  it('uses analytic primitives instead of tessellated segments', () => {
    const primitiveLayout = {
      ...layout,
      osnap: {
        primitives: [
          {
            kind: 'circle' as const,
            layer: '0',
            cx: 50,
            cy: 0,
            r: 10,
            normalSign: 1 as const
          }
        ]
      }
    }
    const index = new AcExOsnapIndex(['center'])
    index.rebuild(primitiveLayout, () => true)
    const snap = index.findSnap(50.2, 0.1, 2)
    expect(snap).toEqual({ x: 50, y: 0, mode: 'center' })
  })

  it('prefers center over nearest on a circle primitive', () => {
    const primitiveLayout = {
      ...layout,
      osnap: {
        primitives: [
          {
            kind: 'circle' as const,
            layer: '0',
            cx: 0,
            cy: 0,
            r: 10,
            normalSign: 1 as const
          }
        ]
      }
    }
    const index = new AcExOsnapIndex(['center', 'nearest'])
    index.rebuild(primitiveLayout, () => true)
    const snap = index.findSnap(0.5, 0.5, 5)
    expect(snap?.mode).toBe('center')
  })
})
