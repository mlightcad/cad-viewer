import {
  acapBuildCompareChangeSets,
  acapChangeSetCloudRole,
  type AcApDiffEntityHit
} from '../src/compare'

function hit(
  kind: AcApDiffEntityHit['kind'],
  side: AcApDiffEntityHit['side'],
  objectId: string,
  box: { minX: number; minY: number; maxX: number; maxY: number }
): AcApDiffEntityHit {
  return {
    side,
    objectId,
    dxfType: 'LINE',
    layer: '0',
    kind,
    extents: box
  }
}

describe('acapChangeSetCloudRole', () => {
  it('uses the single kind when a set is homogeneous', () => {
    expect(acapChangeSetCloudRole({ kinds: ['deleted'] })).toBe('deleted')
    expect(acapChangeSetCloudRole({ kinds: ['added'] })).toBe('added')
    expect(acapChangeSetCloudRole({ kinds: ['modified'] })).toBe('modified')
    expect(acapChangeSetCloudRole({ kinds: ['modified', 'modified'] })).toBe(
      'modified'
    )
  })

  it('uses the modified color when a set mixes kinds', () => {
    expect(acapChangeSetCloudRole({ kinds: ['deleted', 'added'] })).toBe(
      'modified'
    )
    expect(acapChangeSetCloudRole({ kinds: ['deleted', 'modified'] })).toBe(
      'modified'
    )
    expect(acapChangeSetCloudRole({ kinds: ['added', 'modified'] })).toBe(
      'modified'
    )
    expect(
      acapChangeSetCloudRole({ kinds: ['deleted', 'added', 'modified'] })
    ).toBe('modified')
  })
})

describe('acapBuildCompareChangeSets kinds', () => {
  it('records a single kind for isolated differences', () => {
    const sets = acapBuildCompareChangeSets(
      [
        hit('deleted', 'left', 'A', {
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10
        }),
        hit('added', 'right', 'B', {
          minX: 1000,
          minY: 1000,
          maxX: 1010,
          maxY: 1010
        })
      ],
      2000,
      5
    )
    expect(sets).toHaveLength(2)
    const deleted = sets.find(s => s.kinds.includes('deleted'))
    const added = sets.find(s => s.kinds.includes('added'))
    expect(deleted?.kinds).toEqual(['deleted'])
    expect(added?.kinds).toEqual(['added'])
    expect(acapChangeSetCloudRole(deleted!)).toBe('deleted')
    expect(acapChangeSetCloudRole(added!)).toBe('added')
  })

  it('merges nearby mixed kinds into one set', () => {
    const sets = acapBuildCompareChangeSets(
      [
        hit('deleted', 'left', 'A', {
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10
        }),
        hit('added', 'right', 'B', {
          minX: 8,
          minY: 0,
          maxX: 18,
          maxY: 10
        })
      ],
      100,
      5
    )
    expect(sets).toHaveLength(1)
    expect(sets[0]?.kinds).toEqual(['deleted', 'added'])
    expect(acapChangeSetCloudRole(sets[0]!)).toBe('modified')
  })
})
