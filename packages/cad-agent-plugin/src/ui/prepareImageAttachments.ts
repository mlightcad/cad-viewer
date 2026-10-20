import type { FileUIPart } from 'ai'

/** Longest edge for user-attached reference images sent to the vision model. */
export const ATTACHMENT_IMAGE_LONG_SIDE_PX = 1536

/** JPEG quality when re-encoding non-PNG attachments. */
const JPEG_QUALITY = 0.85

/**
 * Reads a {@link File} as a data URL without resizing (fallback path).
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image attachment'))
        return
      }
      resolve(result)
    }
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read image attachment'))
    reader.readAsDataURL(file)
  })
}

/**
 * Resizes one image file and returns an AI SDK {@link FileUIPart}.
 *
 * Large phone photos otherwise produce multi-MB base64 bodies that keep the
 * chat stuck in `submitted` while the SDK re-fetches / re-serializes the
 * payload. Shrinking the long edge keeps vision quality and speeds the round trip.
 */
async function prepareOneImage(file: File): Promise<FileUIPart> {
  const filename = file.name || 'image'
  const fallbackMediaType =
    file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'

  if (typeof createImageBitmap !== 'function') {
    const url = await readFileAsDataUrl(file)
    return {
      type: 'file',
      mediaType: fallbackMediaType,
      filename,
      url
    }
  }

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(
      1,
      ATTACHMENT_IMAGE_LONG_SIDE_PX / Math.max(bitmap.width, bitmap.height)
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas unavailable for image resize')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)

    // Keep PNG when the source is PNG (sketches / screenshots with sharp edges).
    const mediaType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const url =
      mediaType === 'image/png'
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', JPEG_QUALITY)

    return { type: 'file', mediaType, filename, url }
  } catch {
    const url = await readFileAsDataUrl(file)
    return {
      type: 'file',
      mediaType: fallbackMediaType,
      filename,
      url
    }
  } finally {
    bitmap?.close()
  }
}

/**
 * Converts pending image {@link File}s into resized {@link FileUIPart}s for chat.
 *
 * Passing an array of parts avoids AI SDK `FileList` / `instanceof` quirks and
 * lets us control media types before `sendMessage`.
 */
export async function prepareImageAttachments(
  files: File[]
): Promise<FileUIPart[]> {
  return Promise.all(files.map(file => prepareOneImage(file)))
}
