/**
 * @jest-environment jsdom
 */
import {
  ACEX_PACKAGE_PREVIEW_FILE,
  acexHtmlAppendPackagePreview,
  type AcExHtmlPackageFiles,
  acexHtmlUnzipPackageFiles,
  acexHtmlZipPackageFiles
} from '@mlightcad/cad-html-core'

import { acapHtmlThumbnailToJpeg } from '../src/AcApHtmlPreviewImage'

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xd9])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])

describe('acapHtmlThumbnailToJpeg', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    // jsdom has no `HTMLImageElement#decode`; drop the stub each test defines
    // so it cannot leak into later suites.
    delete (HTMLImageElement.prototype as { decode?: unknown }).decode
  })

  it('returns undefined when the drawing has no thumbnail', async () => {
    await expect(acapHtmlThumbnailToJpeg(undefined)).resolves.toBeUndefined()
    await expect(
      acapHtmlThumbnailToJpeg(new Uint8Array())
    ).resolves.toBeUndefined()
  })

  it('passes JPEG thumbnails through as a copy', async () => {
    const result = await acapHtmlThumbnailToJpeg(JPEG)
    expect(Array.from(result!)).toEqual(Array.from(JPEG))
    expect(result).not.toBe(JPEG)
  })

  it('re-encodes non-JPEG thumbnails through a canvas', async () => {
    const encoded = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined)
    })
    jest
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(4)
    jest
      .spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get')
      .mockReturnValue(3)
    const context = {
      fillStyle: '',
      fillRect: jest.fn(),
      drawImage: jest.fn()
    }
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as never)
    const toBlob = jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(callback =>
        callback({
          arrayBuffer: () => Promise.resolve(encoded.buffer)
        } as Blob)
      )

    const result = await acapHtmlThumbnailToJpeg(PNG)

    expect(Array.from(result!)).toEqual(Array.from(encoded))
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      expect.any(Number)
    )
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 4, 3)
  })

  it('returns undefined when the thumbnail cannot be decoded', async () => {
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: jest.fn().mockRejectedValue(new Error('bad image'))
    })
    await expect(acapHtmlThumbnailToJpeg(PNG)).resolves.toBeUndefined()
  })
})

describe('multi-file package preview', () => {
  const html = new TextEncoder().encode('<html></html>')
  const pkg = {
    files: [{ path: 'viewer.html', bytes: html }]
  } as AcExHtmlPackageFiles

  it('adds preview.jpg to the zipped package', () => {
    const files = acexHtmlAppendPackagePreview(pkg.files, JPEG)
    const unzipped = acexHtmlUnzipPackageFiles(
      acexHtmlZipPackageFiles({ ...pkg, files })
    )
    const preview = unzipped.find(f => f.path === ACEX_PACKAGE_PREVIEW_FILE)
    expect(ACEX_PACKAGE_PREVIEW_FILE).toBe('preview.jpg')
    expect(Array.from(preview!.bytes)).toEqual(Array.from(JPEG))
    expect(unzipped.map(f => f.path).sort()).toEqual([
      'preview.jpg',
      'viewer.html'
    ])
  })

  it('leaves files untouched without a preview', () => {
    expect(acexHtmlAppendPackagePreview(pkg.files, undefined)).toBe(pkg.files)
  })

  it('replaces an existing preview instead of duplicating it', () => {
    const first = acexHtmlAppendPackagePreview(pkg.files, PNG)
    const second = acexHtmlAppendPackagePreview(first, JPEG)
    const previews = second.filter(f => f.path === ACEX_PACKAGE_PREVIEW_FILE)
    expect(previews).toHaveLength(1)
    expect(previews[0]!.bytes).toBe(JPEG)
  })
})
