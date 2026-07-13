import { AcDbObjectId } from '@mlightcad/data-model'

import { hideObjects, unisolateObjects } from '../src/app/AcApObjectDisplay'
import { AcApDocument } from '../src/app/AcApDocument'
import { AcApContext } from '../src/app/AcApContext'

function createMockContext(options: {
  hidden?: Set<AcDbObjectId>
  entities?: Map<
    AcDbObjectId,
    { visibility: boolean; inScene: boolean; sceneVisible: boolean }
  >
}) {
  const hidden = options.hidden ?? new Set<AcDbObjectId>()
  const entities =
    options.entities ??
    new Map<
      AcDbObjectId,
      { visibility: boolean; inScene: boolean; sceneVisible: boolean }
    >()

  const doc = {
    isObjectHidden: (id: AcDbObjectId) => hidden.has(id),
    addHiddenObject: (id: AcDbObjectId) => hidden.add(id),
    takeHiddenObjects: () => {
      const ids = [...hidden]
      hidden.clear()
      return ids
    },
    database: {
      tables: {
        blockTable: {
          getEntityById: (id: AcDbObjectId) => {
            const entity = entities.get(id)
            return entity ? { visibility: entity.visibility } : undefined
          }
        }
      }
    }
  } as unknown as AcApDocument

  const selectionSet = {
    clear: jest.fn()
  }

  const view = {
    selectionSet,
    hasEntity: (id: AcDbObjectId) => entities.get(id)?.inScene ?? false,
    setEntitySceneVisible: (id: AcDbObjectId, visible: boolean) => {
      const entity = entities.get(id)
      if (!entity?.inScene) {
        return false
      }
      entity.sceneVisible = visible
      return true
    }
  }

  return {
    context: { doc, view } as unknown as AcApContext,
    hidden,
    entities,
    selectionSet
  }
}

describe('AcApObjectDisplay', () => {
  it('hides visible scene entities without changing database visibility', () => {
    const { context, hidden, entities, selectionSet } = createMockContext({
      entities: new Map([
        ['a', { visibility: true, inScene: true, sceneVisible: true }],
        ['b', { visibility: true, inScene: true, sceneVisible: true }]
      ])
    })

    const count = hideObjects(context, ['a'])

    expect(count).toBe(1)
    expect(hidden.has('a')).toBe(true)
    expect(entities.get('a')?.sceneVisible).toBe(false)
    expect(entities.get('a')?.visibility).toBe(true)
    expect(entities.get('b')?.sceneVisible).toBe(true)
    expect(selectionSet.clear).toHaveBeenCalledTimes(1)
  })

  it('restores session-hidden entities to their database visibility', () => {
    const hidden = new Set<AcDbObjectId>(['a', 'b'])
    const { context, entities, selectionSet } = createMockContext({
      hidden,
      entities: new Map([
        ['a', { visibility: true, inScene: true, sceneVisible: false }],
        ['b', { visibility: false, inScene: true, sceneVisible: false }]
      ])
    })

    const count = unisolateObjects(context)

    expect(count).toBe(2)
    expect(hidden.size).toBe(0)
    expect(entities.get('a')?.sceneVisible).toBe(true)
    expect(entities.get('b')?.sceneVisible).toBe(false)
    expect(selectionSet.clear).toHaveBeenCalledTimes(1)
  })
})
