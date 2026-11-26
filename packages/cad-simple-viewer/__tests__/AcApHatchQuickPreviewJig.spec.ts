import {
  AcDbDatabase,
  AcDbHatch,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGeLoop2d
} from '@mlightcad/data-model'

import { AcApHatchQuickPreviewJig } from '../src/command/draw/AcApHatchQuickPreviewJig'

const createView = () => {
  const transient = new Map<string, AcDbHatch>()
  return {
    addTransientEntity: jest.fn((entity: AcDbHatch | AcDbHatch[]) => {
      const entities = Array.isArray(entity) ? entity : [entity]
      entities.forEach(item => {
        transient.set(String(item.objectId), item)
      })
    }),
    removeTransientEntity: jest.fn((objectId: string) => {
      transient.delete(String(objectId))
    }),
    transient
  }
}

const createPreviewHatch = (objectId: string) => {
  const hatch = new AcDbHatch()
  Object.defineProperty(hatch, 'objectId', {
    value: objectId,
    configurable: true
  })
  return hatch
}

describe('AcApHatchQuickPreviewJig', () => {
  const database = new AcDbDatabase()
  const loop = {} as AcGeLoop2d

  beforeEach(() => {
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPQUICKPREVIEW,
      1,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPQUICKPREVTIMEOUT,
      2,
      database
    )
  })

  test('renders a transient hatch when the cursor is inside a loop', () => {
    const view = createView()
    const hatch = createPreviewHatch('T1')
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database,
      resolveLoops: () => [loop],
      createHatch: () => hatch
    })

    jig.update({ x: 5, y: 5, z: 0 })
    jig.render()

    expect(view.addTransientEntity).toHaveBeenCalledWith(hatch)
    expect(view.transient.get('T1')).toBe(hatch)
  })

  test('clears the preview when HPQUICKPREVIEW is off', () => {
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPQUICKPREVIEW,
      0,
      database
    )
    const view = createView()
    const createHatch = jest.fn(() => createPreviewHatch('T1'))
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database,
      resolveLoops: () => [loop],
      createHatch
    })

    jig.update({ x: 5, y: 5, z: 0 })
    jig.render()

    expect(createHatch).not.toHaveBeenCalled()
    expect(view.addTransientEntity).not.toHaveBeenCalled()
  })

  test('clears the preview when the cursor leaves every loop', () => {
    const view = createView()
    let inside = true
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database,
      resolveLoops: () => (inside ? [loop] : []),
      createHatch: () => createPreviewHatch('T1')
    })

    jig.update({ x: 5, y: 5, z: 0 })
    jig.render()
    expect(view.transient.size).toBe(1)

    inside = false
    jig.update({ x: 100, y: 100, z: 0 })
    jig.render()

    expect(view.removeTransientEntity).toHaveBeenCalledWith('T1')
    expect(view.transient.size).toBe(0)
  })

  test('end removes the transient preview', () => {
    const view = createView()
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database,
      resolveLoops: () => [loop],
      createHatch: () => createPreviewHatch('T1')
    })

    jig.update({ x: 5, y: 5, z: 0 })
    jig.render()
    jig.end()

    expect(view.removeTransientEntity).toHaveBeenCalledWith('T1')
    expect(view.transient.size).toBe(0)
  })

  test('skips rebuild when the resolved loop set is unchanged', () => {
    const view = createView()
    const createHatch = jest.fn(() => createPreviewHatch('T1'))
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database,
      resolveLoops: () => [loop],
      createHatch
    })

    jig.update({ x: 5, y: 5, z: 0 })
    jig.render()
    jig.update({ x: 6, y: 6, z: 0 })
    jig.render()

    expect(createHatch).toHaveBeenCalledTimes(1)
    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
  })

  test('refresh rebuilds the preview even when the loop set is unchanged', () => {
    const view = createView()
    let n = 0
    const createHatch = jest.fn(() => createPreviewHatch(`T${++n}`))
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database,
      // Same loop set before and after the change (e.g. Normal -> Outer).
      resolveLoops: () => [loop],
      createHatch
    })

    jig.update({ x: 5, y: 5, z: 0 })
    jig.render()
    jig.refresh()

    expect(createHatch).toHaveBeenCalledTimes(2)
    expect(view.removeTransientEntity).toHaveBeenCalledWith('T1')
    expect([...view.transient.keys()]).toEqual(['T2'])
  })

  test('refresh is a no-op after end', () => {
    const view = createView()
    const createHatch = jest.fn(() => createPreviewHatch('T1'))
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database,
      resolveLoops: () => [loop],
      createHatch
    })

    jig.update({ x: 5, y: 5, z: 0 })
    jig.render()
    jig.end()
    jig.refresh()

    expect(createHatch).toHaveBeenCalledTimes(1)
    expect(view.transient.size).toBe(0)
  })
})
