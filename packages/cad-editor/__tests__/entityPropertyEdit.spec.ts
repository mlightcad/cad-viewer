import { mlResolvePropertyEditTargets } from '../src/component/palette/entityPropertyEdit'

describe('mlResolvePropertyEditTargets', () => {
  const ids = ['1A', '1B', '1C']

  it('targets every listed entity for a shared-property edit', () => {
    expect(mlResolvePropertyEditTargets(ids, { entityIndex: -1 })).toEqual(ids)
  })

  it('targets only the entity picked in the selector', () => {
    expect(mlResolvePropertyEditTargets(ids, { entityIndex: 1 })).toEqual([
      '1B'
    ])
  })

  it('targets nothing for an index outside the list', () => {
    expect(mlResolvePropertyEditTargets(ids, { entityIndex: 5 })).toEqual([])
  })
})
