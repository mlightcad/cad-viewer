import { AcApEntityService } from '../src/service/AcApEntityService'

describe('AcApEntityService', () => {
  test('copyDisplayTraits copies visual properties', () => {
    const source = {
      layer: 'A',
      color: { clone: () => ({ cloned: true }) },
      lineType: 'Continuous',
      lineWeight: 1,
      linetypeScale: 1,
      transparency: 0,
      visibility: true
    }
    const target = {
      layer: '',
      color: null as unknown,
      lineType: '',
      lineWeight: 0,
      linetypeScale: 0,
      transparency: 0,
      visibility: false
    }

    AcApEntityService.copyDisplayTraits(source as never, target as never)

    expect(target.layer).toBe('A')
    expect(target.color).toEqual({ cloned: true })
  })

  test('eraseEntities returns the number of erased entities', () => {
    const erased = new Set<string>()
    const db = {
      openEntityForWrite: jest.fn((objectId: string) => {
        if (objectId === 'missing') return undefined
        return { erase: () => erased.add(objectId) }
      })
    }
    const service = new AcApEntityService(db as never)

    const count = service.eraseEntities(['a', 'b', 'missing'])

    expect(count).toBe(2)
    expect(erased).toEqual(new Set(['a', 'b']))
    expect(db.openEntityForWrite).toHaveBeenCalledTimes(3)
  })
})
