jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcTrView2d: class AcTrView2d {},
  yieldToMain: jest.fn(() => Promise.resolve())
}))

import { AcTrView2d } from '@mlightcad/cad-simple-viewer'

import { AcApHtmlConvertor } from '../src/AcApHtmlConvertor'

describe('AcApHtmlConvertor', () => {
  const convertor = new AcApHtmlConvertor()

  describe('prepareAcTrView2dForHtmlExport', () => {
    it('rejects views without a CAD scene', async () => {
      await expect(
        convertor.prepareAcTrView2dForHtmlExport({} as never)
      ).rejects.toThrow(
        'CAD scene is not available. Open a drawing before exporting to HTML.'
      )
    })

    it('rejects non-2D views', async () => {
      const view = {
        cadScene: {}
      }

      await expect(
        convertor.prepareAcTrView2dForHtmlExport(view as never)
      ).rejects.toThrow('HTML export requires a 2D CAD view.')
    })

    it('converts missing entities and yields before returning the view', async () => {
      const ensureEntitiesConvertedForExport = jest
        .fn()
        .mockResolvedValue(undefined)
      const view = Object.create(AcTrView2d.prototype) as AcTrView2d & {
        cadScene: object
        ensureEntitiesConvertedForExport: jest.Mock
      }
      Object.assign(view, {
        cadScene: {},
        ensureEntitiesConvertedForExport
      })

      const prepared = await convertor.prepareAcTrView2dForHtmlExport(view)

      expect(prepared).toBe(view)
      expect(ensureEntitiesConvertedForExport).toHaveBeenCalledTimes(1)
      expect(ensureEntitiesConvertedForExport).toHaveBeenCalledWith({
        includeInvisibleLayers: true
      })
    })
  })
})
