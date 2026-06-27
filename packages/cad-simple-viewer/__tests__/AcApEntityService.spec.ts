jest.mock('../src/app', () => ({
  AcApAnnotation: jest.fn().mockImplementation(() => ({
    filterAnnotationEntities: (ids: unknown[]) => ids
  })),
  AcApDocManager: {
    instance: {
      editor: {
        getSelection: jest.fn()
      }
    }
  }
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    sysCmdPrompt: (key: string) => key
  }
}))

jest.mock('../src/editor', () => ({
  AcEdOpenMode: { Review: 'Review' },
  AcEdPromptSelectionOptions: class {
    constructor(readonly message: string) {}
  },
  AcEdPromptStatus: { OK: 'OK' }
}))

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

  test('computeDisplacement returns vector from base to target', () => {
    const displacement = AcApEntityService.computeDisplacement(
      { x: 1, y: 2, z: 0 },
      { x: 4, y: 6, z: 0 }
    )

    expect(displacement.x).toBe(3)
    expect(displacement.y).toBe(4)
    expect(displacement.z).toBe(0)
  })

  test('eraseEntities returns the number of erased entities', () => {
    const erased = new Set<string>()
    const db = {
      openEntityForWrite: jest.fn((objectId: string) => {
        if (objectId === 'missing') return undefined
        return { erase: () => erased.add(objectId) }
      })
    }

    const count = AcApEntityService.eraseEntities(db as never, [
      'a',
      'b',
      'missing'
    ])

    expect(count).toBe(2)
    expect(erased).toEqual(new Set(['a', 'b']))
    expect(db.openEntityForWrite).toHaveBeenCalledTimes(3)
  })
})
