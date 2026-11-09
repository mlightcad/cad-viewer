import {
  acapPdfDefaultImportResourceUrls,
  acapPdfImportResourceUrls,
  acapPdfSetImportResourceUrls
} from '../src/AcApPdfImportResources'

describe('PDF import resource URLs', () => {
  afterEach(() => acapPdfSetImportResourceUrls(undefined))

  test('defaults to the CDN copy of the running pdfjs-dist version', () => {
    expect(acapPdfImportResourceUrls('5.7.284')).toEqual({
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/',
      standardFontDataUrl:
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/standard_fonts/'
    })
  })

  test('applies host overrides and restores defaults', () => {
    acapPdfSetImportResourceUrls({ cMapUrl: '/assets/cmaps' })
    expect(acapPdfImportResourceUrls('1.0.0')).toEqual({
      cMapUrl: '/assets/cmaps/',
      standardFontDataUrl:
        acapPdfDefaultImportResourceUrls('1.0.0').standardFontDataUrl
    })

    acapPdfSetImportResourceUrls(undefined)
    expect(acapPdfImportResourceUrls('1.0.0')).toEqual(
      acapPdfDefaultImportResourceUrls('1.0.0')
    )
  })
})
