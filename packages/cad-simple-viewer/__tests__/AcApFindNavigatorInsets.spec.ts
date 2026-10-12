jest.mock('@mlightcad/data-model', () => ({
  AcGePoint2d: class {
    constructor(
      public x: number,
      public y: number
    ) {}
  },
  AcGeBox2d: class {
    constructor(
      public min: { x: number; y: number },
      public max: { x: number; y: number }
    ) {}
  },
  acdbHostApplicationServices: () => ({
    layoutManager: { setCurrentLayoutBtrId: jest.fn() }
  })
}))

import { acapNavigateToFindHit } from '../src/find/AcApFindNavigator'
import type { AcApFindLayoutHit } from '../src/find/findDrawing'

/**
 * Minimal 2D camera: `zoomTo` fits the box (with margin) into the canvas and
 * centres it; screen y grows downwards.
 */
function createView(width: number, height: number) {
  const view = {
    width,
    height,
    activeLayoutBtrId: 'model',
    center: { x: 0, y: 0 },
    scale: 1, // world units per pixel
    selectionSet: { clear: jest.fn(), add: jest.fn() },
    isLayoutInitialized: () => true,
    markLayoutAsInitialized: jest.fn(),
    waitUntilIdle: jest.fn(() => Promise.resolve(true)),
    zoomTo(
      box: { min: { x: number; y: number }; max: { x: number; y: number } },
      margin = 1.1
    ) {
      const w = (box.max.x - box.min.x) * margin
      const h = (box.max.y - box.min.y) * margin
      view.scale = Math.max(w / width, h / height)
      view.center = {
        x: (box.min.x + box.max.x) / 2,
        y: (box.min.y + box.max.y) / 2
      }
    },
    worldToScreen(p: { x: number; y: number }) {
      return {
        x: width / 2 + (p.x - view.center.x) / view.scale,
        y: height / 2 - (p.y - view.center.y) / view.scale
      }
    },
    screenToWorld(p: { x: number; y: number }) {
      return {
        x: view.center.x + (p.x - width / 2) * view.scale,
        y: view.center.y - (p.y - height / 2) * view.scale
      }
    }
  }
  return view
}

function editorFor(view: ReturnType<typeof createView>) {
  return {
    curView: view,
    curDocument: {
      database: {
        tables: {
          blockTable: {
            getIdAt: () => ({
              getIdAt: () => ({
                geometricExtents: {
                  min: { x: 100, y: 50 },
                  max: { x: 140, y: 54 }
                }
              })
            })
          }
        }
      }
    }
  }
}

const hit: AcApFindLayoutHit = {
  entityId: 'e1',
  textEntityId: 'e1',
  kind: 'text',
  text: 'x',
  layer: '0',
  position: { x: 100, y: 50 },
  layoutId: 'model',
  layoutName: 'Model'
}

describe('acapNavigateToFindHit with insets', () => {
  it('centres the hit in the canvas area not covered by a left palette', async () => {
    const view = createView(1400, 750)
    const result = await acapNavigateToFindHit(editorFor(view) as never, hit, {
      insets: { left: 520 }
    })
    expect(result).toBe('navigated')
    const centre = view.worldToScreen({ x: 120, y: 52 })
    // Middle of the visible part: 520 + (1400 - 520) / 2 = 960.
    expect(centre.x).toBeCloseTo(960)
    expect(centre.y).toBeCloseTo(375)
    // The whole text stays to the right of the palette.
    expect(view.worldToScreen({ x: 100, y: 50 }).x).toBeGreaterThan(520)
  })

  it('handles a palette docked on the right', async () => {
    const view = createView(1000, 600)
    await acapNavigateToFindHit(editorFor(view) as never, hit, {
      insets: { right: 400 }
    })
    expect(view.worldToScreen({ x: 120, y: 52 }).x).toBeCloseTo(300)
    expect(view.worldToScreen({ x: 140, y: 54 }).x).toBeLessThan(600)
  })

  it('frames on the whole canvas without insets', async () => {
    const view = createView(1000, 600)
    await acapNavigateToFindHit(editorFor(view) as never, hit)
    expect(view.worldToScreen({ x: 120, y: 52 }).x).toBeCloseTo(500)
  })

  it('ignores insets that would leave almost nothing visible', async () => {
    const view = createView(1000, 600)
    await acapNavigateToFindHit(editorFor(view) as never, hit, {
      insets: { left: 950 }
    })
    expect(view.worldToScreen({ x: 120, y: 52 }).x).toBeCloseTo(500)
  })
})
