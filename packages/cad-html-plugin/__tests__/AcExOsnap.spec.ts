import {
  AcExOsnapIndex,
  extractLineBatchSnapSegments,
  mergeConnectedSegments
} from '../src/AcExOsnap'

describe('mergeConnectedSegments', () => {
  it('merges indexed polyline edges into one logical segment', () => {
    const merged = mergeConnectedSegments([
      { x0: 0, y0: 0, x1: 5, y1: 0 },
      { x0: 5, y0: 0, x1: 10, y1: 0 }
    ])
    expect(merged).toEqual([{ x0: 0, y0: 0, x1: 10, y1: 0 }])
  })
})

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

function u32(values: number[]): Uint32Array {
  return Uint32Array.from(values)
}

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
        positions: f32([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0])
      }
    ],
    meshBatches: []
  }

  it('snaps to the nearest endpoint within threshold', () => {
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout)
    const snap = index.findSnap(0.4, 0.2, 1)
    expect(snap).toEqual({ x: 0, y: 0, mode: 'endpoint' })
  })

  it('snaps to segment midpoint', () => {
    const index = new AcExOsnapIndex(['midpoint'])
    index.rebuild(layout)
    const snap = index.findSnap(5.1, 0.1, 1)
    expect(snap).toEqual({ x: 5, y: 0, mode: 'midpoint' })
  })

  it('prefers endpoint over nearest on the same segment', () => {
    const index = new AcExOsnapIndex(['endpoint', 'nearest'])
    index.rebuild(layout)
    const snap = index.findSnap(0.2, 0.1, 1)
    expect(snap?.mode).toBe('endpoint')
  })

  it('ignores geometry on hidden layers', () => {
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout)
    index.setLayerHidden('0', true)
    expect(index.findSnap(0.1, 0.1, 1)).toBeUndefined()
  })

  it('toggles layer visibility without rebuilding the spatial index', () => {
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout)
    index.hideAllLayers(['0'])
    expect(index.findSnap(0.1, 0.1, 1)).toBeUndefined()
    index.showAllLayers()
    expect(index.findSnap(0.1, 0.1, 1)).toEqual({
      x: 0,
      y: 0,
      mode: 'endpoint'
    })
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
    index.rebuild(primitiveLayout)
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
    index.rebuild(primitiveLayout)
    const snap = index.findSnap(0.5, 0.5, 5)
    expect(snap?.mode).toBe('center')
  })

  it('merges patterned line batch segments before endpoint snap', () => {
    const batch = {
      layer: '0',
      color: 0xffffff,
      offset: [0, 0, 0] as [number, number, number],
      positions: f32([0, 0, 0, 5, 0, 0, 10, 0, 0]),
      indices: u32([0, 1, 1, 2]),
      linePattern: {
        pattern: [4, -2],
        patternLength: 6,
        viewportScale: 1
      }
    }
    expect(extractLineBatchSnapSegments(batch)).toEqual([
      { x0: 0, y0: 0, x1: 10, y1: 0 }
    ])

    const patternedLayout = {
      ...layout,
      lineBatches: [batch]
    }
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(patternedLayout)
    const snap = index.findSnap(9.8, 0.1, 1)
    expect(snap).toEqual({ x: 10, y: 0, mode: 'endpoint' })
  })

  it('prefers analytic line endpoints over patterned render segments', () => {
    const hybridLayout = {
      ...layout,
      lineBatches: [
        {
          layer: '0',
          color: 0xffffff,
          offset: [0, 0, 0] as [number, number, number],
          positions: f32([0, 0, 0, 2, 0, 0, 4, 0, 0]),
          indices: u32([0, 1, 1, 2]),
          linePattern: {
            pattern: [1, -1],
            patternLength: 2,
            viewportScale: 1
          }
        }
      ],
      osnap: {
        primitives: [
          {
            kind: 'line' as const,
            layer: '0',
            x0: 0,
            y0: 0,
            x1: 100,
            y1: 0
          }
        ]
      }
    }
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(hybridLayout)
    const snap = index.findSnap(1.5, 0.2, 2)
    expect(snap).toEqual({ x: 0, y: 0, mode: 'endpoint' })
  })

  it('rebuilds large tessellated layouts without blowing the call stack', () => {
    const positions = new Float32Array(200_000 * 6)
    for (let i = 0; i < 200_000; i++) {
      const base = i * 6
      positions[base] = i
      positions[base + 1] = 0
      positions[base + 3] = i + 1
      positions[base + 4] = 0
    }
    const largeLayout = {
      btrId: 'model',
      name: 'Model',
      isModelSpace: true,
      lineBatches: [
        {
          layer: '0',
          color: 0xffffff,
          offset: [0, 0, 0] as [number, number, number],
          positions
        }
      ],
      meshBatches: []
    }
    const index = new AcExOsnapIndex(['endpoint'])
    expect(() => index.rebuild(largeLayout)).not.toThrow()
    expect(index.findSnap(0.2, 0.1, 1)).toEqual({
      x: 0,
      y: 0,
      mode: 'endpoint'
    })
  })
})
