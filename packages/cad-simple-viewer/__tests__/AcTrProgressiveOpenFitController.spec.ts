import { AcGeBox2d } from '@mlightcad/data-model'

import { AcTrProgressiveOpenFitController } from '../src/view/AcTrProgressiveOpenFitController'

describe('AcTrProgressiveOpenFitController', () => {
  it('refreshes pending threshold on re-begin without resetting fit state', () => {
    const zooms: AcGeBox2d[] = []
    const controller = new AcTrProgressiveOpenFitController(box => {
      zooms.push(box.clone())
    })

    controller.begin(0)
    expect(controller.isActive).toBe(true)

    // Simulate geometry landing before db.read finishes.
    for (let i = 0; i < 500; i++) {
      controller.afterGeometryBatch(
        () => new AcGeBox2d({ x: 0, y: 0 }, { x: 10 + i, y: 10 + i })
      )
    }

    const zoomsBeforeRefresh = zooms.length
    expect(zoomsBeforeRefresh).toBeGreaterThan(0)

    controller.begin(20000)
    expect(controller.isActive).toBe(true)

    // Re-begin must not clear prior fit / force an immediate re-zoom.
    expect(zooms.length).toBe(zoomsBeforeRefresh)
  })

  it('stops auto-fit after a user view change', () => {
    const zooms: AcGeBox2d[] = []
    const controller = new AcTrProgressiveOpenFitController(box => {
      zooms.push(box.clone())
    })

    controller.begin(1000)
    controller.afterGeometryBatch(
      () => new AcGeBox2d({ x: 0, y: 0 }, { x: 100, y: 100 })
    )
    const afterFirst = zooms.length

    controller.onLayoutViewChanged()
    expect(controller.isActive).toBe(false)

    controller.afterGeometryBatch(
      () => new AcGeBox2d({ x: 0, y: 0 }, { x: 1000, y: 1000 })
    )
    expect(zooms.length).toBe(afterFirst)
  })
})
