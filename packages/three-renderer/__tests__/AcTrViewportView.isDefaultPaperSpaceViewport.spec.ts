import { AcGePoint3d, AcGiViewport } from '@mlightcad/data-model'

import { AcTrRenderer } from '../src/renderer'
import { AcTrBaseView } from '../src/viewport/AcTrBaseView'
import { AcTrViewportView } from '../src/viewport/AcTrViewportView'

function createMockRenderer(): AcTrRenderer {
  return {
    domElement: {} as HTMLCanvasElement,
    render: jest.fn()
  } as unknown as AcTrRenderer
}

function createViewport(twist: number): AcGiViewport {
  const gi = new AcGiViewport()
  gi.centerPoint = new AcGePoint3d(5, 5, 0)
  gi.width = 10
  gi.height = 10
  gi.viewCenter = new AcGePoint3d(0, 0, 0)
  gi.viewTarget = new AcGePoint3d(150, 300, 0)
  gi.viewHeight = 200
  gi.viewTwistAngle = twist
  return gi
}

describe('AcTrViewportView twist', () => {
  it('maps paper points through viewTwistAngle and orients the camera', () => {
    const parent = new AcTrBaseView(createMockRenderer(), 800, 600)
    const view = new AcTrViewportView(
      parent,
      createViewport(Math.PI / 2),
      createMockRenderer()
    )

    const center = view.paperPointToModel({ x: 5, y: 5 })
    expect(center.x).toBeCloseTo(150)
    expect(center.y).toBeCloseTo(300)

    const right = view.paperPointToModel({ x: 10, y: 5 })
    expect(right.x).toBeCloseTo(150)
    expect(right.y).toBeCloseTo(400)

    expect(view.internalCamera.rotation.z).toBeCloseTo(Math.PI / 2)
  })

  it('keeps axis-aligned mapping when twist is zero', () => {
    const parent = new AcTrBaseView(createMockRenderer(), 800, 600)
    const view = new AcTrViewportView(
      parent,
      createViewport(0),
      createMockRenderer()
    )
    const corner = view.paperPointToModel({ x: 0, y: 0 })
    expect(corner.x).toBeCloseTo(50)
    expect(corner.y).toBeCloseTo(200)
    expect(view.internalCamera.rotation.z).toBeCloseTo(0)
  })
})

describe('AcTrViewportView.isDefaultPaperSpaceViewport', () => {
  it('detects the classic looks-at-itself default', () => {
    expect(
      AcTrViewportView.isDefaultPaperSpaceViewport({
        number: 2,
        centerPoint: { x: 6, y: 4.5 },
        viewCenter: { x: 6, y: 4.5 }
      })
    ).toBe(true)
  })

  it('detects LibreDWG defaults with collapsed paper center at origin', () => {
    // Reproduced from layout-bugs.dwg 製品図(5) / 製品図(11):
    // paper center parsed as (0,0), but viewHeight == height and target is 0.
    expect(
      AcTrViewportView.isDefaultPaperSpaceViewport({
        number: 37,
        centerPoint: { x: 0, y: 0 },
        viewCenter: { x: 725.1528110291506, y: -87.18816194503466 },
        height: 388.39780069959994,
        viewHeight: 388.39780069959994,
        viewTarget: { x: 0, y: 0 }
      })
    ).toBe(true)
  })

  it('treats missing viewTarget as zero for origin-centered 1:1 defaults', () => {
    expect(
      AcTrViewportView.isDefaultPaperSpaceViewport({
        number: 49,
        centerPoint: { x: 0, y: 0 },
        viewCenter: { x: 3345.564071149263, y: -200.5486403191827 },
        height: 473.2194251814754,
        viewHeight: 473.2194251814754
      })
    ).toBe(true)
  })

  it('does not flag a real viewport that happens to have a paper center near origin', () => {
    expect(
      AcTrViewportView.isDefaultPaperSpaceViewport({
        number: 38,
        centerPoint: { x: 0, y: 0 },
        viewCenter: { x: -1106528.2173647524, y: -337785.3063487748 },
        height: 296.64684898929556,
        viewHeight: 11865.87395957182,
        viewTarget: { x: 1111867.66380098, y: 300645.9460363481 }
      })
    ).toBe(false)
  })

  it('does not flag a real viewport with nonzero paper center', () => {
    expect(
      AcTrViewportView.isDefaultPaperSpaceViewport({
        number: 30,
        centerPoint: { x: 287.48355637404165, y: 404.4357034532701 },
        viewCenter: { x: -1108628.2173647524, y: -318503.2611644705 },
        height: 296.64684898929727,
        viewHeight: 8899.405469678917,
        viewTarget: { x: 1111867.66380098, y: 300645.9460363481 }
      })
    ).toBe(false)
  })
})
