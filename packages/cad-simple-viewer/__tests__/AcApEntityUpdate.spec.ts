import type { AcDbEntity } from '@mlightcad/data-model'

import {
  canApplyVisibilityOnlySceneUpdate,
  isVisibilityOnlyEntityChange
} from '../src/app/AcApEntityUpdate'

function createEntity(objectId: string, visibility: boolean): AcDbEntity {
  return { objectId, visibility } as AcDbEntity
}

describe('AcApEntityUpdate', () => {
  it('detects visibility-only modification payloads', () => {
    expect(isVisibilityOnlyEntityChange({ visibility: false })).toBe(true)
    expect(
      isVisibilityOnlyEntityChange({ visibility: true, color: '#fff' })
    ).toBe(false)
    expect(isVisibilityOnlyEntityChange(undefined)).toBe(false)
  })

  it('allows visibility-only updates for rendered entities', () => {
    const entity = createEntity('line-1', false)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity, changes: { visibility: false } },
        id => id === 'line-1',
        () => true
      )
    ).toBe(true)
  })

  it('allows hide-without-regen when scene visibility differs from entity', () => {
    const entity = createEntity('line-1', false)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity },
        id => id === 'line-1',
        () => true
      )
    ).toBe(true)
  })

  it('requires full update when showing an entity that is not rendered yet', () => {
    const entity = createEntity('line-1', true)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity, changes: { visibility: true } },
        () => false,
        () => undefined
      )
    ).toBe(false)
  })

  it('requires full update when showing an entity without scene visibility state', () => {
    const entity = createEntity('line-1', true)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity, changes: { visibility: true } },
        id => id === 'line-1',
        () => undefined
      )
    ).toBe(false)
  })

  it('allows visibility-only show when batched geometry already exists', () => {
    const entity = createEntity('line-1', true)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity, changes: { visibility: true } },
        id => id === 'line-1',
        () => false
      )
    ).toBe(true)
  })

  it('requires full update when a hidden entity is modified without visibility change', () => {
    const entity = createEntity('line-1', false)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity },
        id => id === 'line-1',
        () => false
      )
    ).toBe(false)
  })

  it('requires full update when scene is hidden but entity is visible with other changes', () => {
    const entity = createEntity('line-1', true)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity, changes: { color: '#fff' } },
        id => id === 'line-1',
        () => false
      )
    ).toBe(false)
  })

  it('requires full update when scene and entity visibility differ during a show sync', () => {
    const entity = createEntity('line-1', true)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity },
        id => id === 'line-1',
        () => false
      )
    ).toBe(false)
  })

  it('requires full update when hide sync includes non-visibility changes', () => {
    const entity = createEntity('line-1', false)

    expect(
      canApplyVisibilityOnlySceneUpdate(
        { entity, changes: { color: '#fff', visibility: false } },
        id => id === 'line-1',
        () => true
      )
    ).toBe(false)
  })
})
