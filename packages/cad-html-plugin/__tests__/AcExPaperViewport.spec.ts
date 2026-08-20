import type { AcExViewportSnapshot } from '../src/AcExSnapshotTypes'
import {
  computeViewportCamera,
  findDrillThroughViewport,
  modelPointToPaper,
  paperPointToModel,
  snapshotHasPaperViewports,
  viewportContainsPaperPoint,
  viewportIsNearPaperBorder,
  viewportPaperToModelScale
} from '../src/AcExPaperViewport'

const viewport: AcExViewportSnapshot = {
  paper: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
  model: { minX: 100, minY: 200, maxX: 200, maxY: 400 }
}

describe('AcExPaperViewport', () => {
  it('maps paper points to model viewBox and back', () => {
    const model = paperPointToModel(viewport, 5, 5)
    expect(model).toEqual({ x: 150, y: 300 })
    expect(modelPointToPaper(viewport, model.x, model.y)).toEqual({
      x: 5,
      y: 5
    })
  })

  it('maps paper corners onto model corners', () => {
    expect(paperPointToModel(viewport, 0, 0)).toEqual({ x: 100, y: 200 })
    expect(paperPointToModel(viewport, 10, 10)).toEqual({ x: 200, y: 400 })
  })

  it('computes paper-to-model scale from width', () => {
    expect(viewportPaperToModelScale(viewport)).toBe(10)
  })

  it('detects interior vs border hits', () => {
    expect(viewportContainsPaperPoint(viewport, 5, 5)).toBe(true)
    expect(viewportContainsPaperPoint(viewport, -1, 5)).toBe(false)
    expect(viewportIsNearPaperBorder(viewport, 5, 5, 0.5)).toBe(false)
    expect(viewportIsNearPaperBorder(viewport, 0.2, 5, 0.5)).toBe(true)
  })

  it('picks the top-most interior viewport for drill-through', () => {
    const bottom: AcExViewportSnapshot = {
      paper: { minX: 0, minY: 0, maxX: 20, maxY: 20 },
      model: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
    }
    const top: AcExViewportSnapshot = {
      paper: { minX: 4, minY: 4, maxX: 8, maxY: 8 },
      model: { minX: 10, minY: 10, maxX: 20, maxY: 20 }
    }
    expect(findDrillThroughViewport([bottom, top], 6, 6, 0.1)).toBe(top)
    expect(findDrillThroughViewport([bottom, top], 4.05, 6, 0.1)).toBe(bottom)
  })

  it('fits a viewport camera so model extents fill the scissor rectangle', () => {
    const fitted = computeViewportCamera(
      { minX: 0, minY: 0, maxX: 100, maxY: 50 },
      200,
      100
    )
    expect(fitted.centerX).toBe(50)
    expect(fitted.centerY).toBe(25)
    expect(fitted.frustum).toBe(50)
    expect(fitted.aspect).toBe(2)
    expect(fitted.zoom).toBe(2)
  })

  it('detects paper layouts that carry viewports', () => {
    expect(
      snapshotHasPaperViewports([{ viewports: [viewport] }, { viewports: [] }])
    ).toBe(true)
    expect(snapshotHasPaperViewports([{ viewports: undefined }])).toBe(false)
  })
})
