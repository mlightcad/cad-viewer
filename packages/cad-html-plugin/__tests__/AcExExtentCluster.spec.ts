import {
  splitDominantCluster,
  unionDominantCluster
} from '../src/AcExExtentCluster'

function box(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  return { minX, minY, maxX, maxY }
}

describe('AcExExtentCluster', () => {
  it('keeps small samples unchanged', () => {
    const boxes = [
      box(0, 0, 1, 1),
      box(2, 0, 3, 1),
      box(4, 0, 5, 1)
    ]
    expect(unionDominantCluster(boxes)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 5,
      maxY: 1
    })
  })

  it('peels a far outlier batch from the majority site cluster', () => {
    const site: ReturnType<typeof box>[] = []
    for (let i = 0; i < 10; i++) {
      site.push(box(490000 + i * 100, 3420000, 490050 + i * 100, 3420100))
    }
    const outlier = box(1e75, 1e63, 1e75 + 12, 1e63 + 12)
    const clustered = unionDominantCluster([...site, outlier])
    expect(clustered).not.toBeNull()
    expect(clustered!.maxX).toBeLessThan(1e10)
    expect(clustered!.minX).toBeGreaterThan(489000)
  })

  it('does not peel nearby columns with only a modest gap', () => {
    const boxes = [
      box(0, 0, 10, 10),
      box(20, 0, 30, 10),
      box(40, 0, 50, 10),
      box(60, 0, 70, 10),
      box(80, 0, 90, 10),
      box(100, 0, 110, 10),
      box(120, 0, 130, 10),
      box(140, 0, 150, 10)
    ]
    const afterX = splitDominantCluster(boxes, 'x')
    expect(afterX).toHaveLength(boxes.length)
  })
})
