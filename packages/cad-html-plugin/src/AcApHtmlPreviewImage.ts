import { acdbThumbnailImageToDataUrl } from '@mlightcad/data-model'

/** JPEG quality for package `preview.jpg` thumbnails (matches cad-html-exporter). */
const PREVIEW_JPEG_QUALITY = 0.85

/**
 * Turns drawing thumbnail bytes (`AcDbDatabase.thumbnailImage`) into
 * JPEG bytes for the multi-file package `preview.jpg`, using the browser's
 * image decoder and a 2D canvas.
 *
 * JPEG thumbnails pass through unchanged; PNG, BMP and DIB payloads (DXF
 * `THUMBNAILIMAGE`, DWG preview bitmaps) are re-encoded. Returns `undefined`
 * when the drawing has no thumbnail or it cannot be decoded, so a broken
 * preview never fails the export.
 *
 * @param thumbnail - Raw drawing thumbnail bytes.
 * @returns JPEG bytes, or `undefined`.
 */
export async function acapHtmlThumbnailToJpeg(
  thumbnail: Uint8Array | undefined | null
): Promise<Uint8Array | undefined> {
  if (!thumbnail?.length) return undefined
  if (isJpeg(thumbnail)) return Uint8Array.from(thumbnail)

  try {
    const dataUrl = acdbThumbnailImageToDataUrl(thumbnail)
    if (!dataUrl) return undefined

    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (width <= 0 || height <= 0) return undefined

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return undefined
    // JPEG has no alpha; flatten transparent PNG thumbnails onto white
    // instead of the encoder's default black.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', PREVIEW_JPEG_QUALITY)
    )
    if (!blob) return undefined
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    return undefined
  }
}

function isJpeg(data: Uint8Array): boolean {
  return (
    data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  )
}
