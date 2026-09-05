import * as THREE from 'three'

import { copyFloat32Range } from './AcExBatchBuffers'
import type { AcExMeshTexture } from './AcExSnapshotTypes'

/**
 * Encodes a THREE texture image to PNG bytes for HTML snapshot embedding.
 * Returns `undefined` when the texture has no drawable image payload.
 */
export function encodeTextureForExport(
  texture: THREE.Texture
): AcExMeshTexture | undefined {
  const image = texture.image as unknown
  if (!image || typeof document === 'undefined') {
    return undefined
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return undefined
  }

  try {
    if (image instanceof ImageData) {
      canvas.width = image.width
      canvas.height = image.height
      ctx.putImageData(image, 0, 0)
    } else if (isDataTextureImage(image)) {
      canvas.width = image.width
      canvas.height = image.height
      const rgba = toUint8ClampedRgba(image.data, image.width * image.height)
      const imageData = new ImageData(
        new Uint8ClampedArray(rgba),
        image.width,
        image.height
      )
      ctx.putImageData(imageData, 0, 0)
    } else if (isCanvasImageSource(image)) {
      const size = readImageSourceSize(image)
      if (!size) {
        return undefined
      }
      canvas.width = size.width
      canvas.height = size.height
      // Draw without compensating texture.flipY — TextureLoader on playback
      // applies the same default flipY as the live viewer.
      ctx.drawImage(image, 0, 0)
    } else {
      return undefined
    }
  } catch {
    return undefined
  }

  const dataUrl = canvas.toDataURL('image/png')
  const comma = dataUrl.indexOf(',')
  if (comma < 0) {
    return undefined
  }
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return { mimeType: 'image/png', bytes }
}

function isCanvasImageSource(image: unknown): image is CanvasImageSource & {
  width: number
  height: number
} {
  return (
    image instanceof HTMLImageElement ||
    image instanceof HTMLCanvasElement ||
    (typeof OffscreenCanvas !== 'undefined' &&
      image instanceof OffscreenCanvas) ||
    (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) ||
    (typeof HTMLVideoElement !== 'undefined' &&
      image instanceof HTMLVideoElement)
  )
}

function isDataTextureImage(
  image: unknown
): image is { data: ArrayLike<number>; width: number; height: number } {
  if (!image || typeof image !== 'object') {
    return false
  }
  const record = image as {
    data?: unknown
    width?: unknown
    height?: unknown
  }
  return (
    record.data != null &&
    typeof record.width === 'number' &&
    typeof record.height === 'number' &&
    record.width >= 1 &&
    record.height >= 1
  )
}

function readImageSourceSize(
  image: CanvasImageSource & { width: number; height: number }
): { width: number; height: number } | undefined {
  let width = Number(image.width)
  let height = Number(image.height)
  if (image instanceof HTMLImageElement) {
    width = image.naturalWidth || image.width
    height = image.naturalHeight || image.height
  } else if (typeof HTMLVideoElement !== 'undefined' && image instanceof HTMLVideoElement) {
    width = image.videoWidth || image.width
    height = image.videoHeight || image.height
  }
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1
  ) {
    return undefined
  }
  return { width, height }
}

function toUint8ClampedRgba(
  data: ArrayLike<number>,
  pixelCount: number
): Uint8ClampedArray {
  const expected = pixelCount * 4
  if (data instanceof Uint8ClampedArray && data.length >= expected) {
    return data.length === expected ? data : data.subarray(0, expected)
  }
  const out = new Uint8ClampedArray(expected)
  const sourceLength = Math.min(expected, data.length)
  for (let i = 0; i < sourceLength; i++) {
    out[i] = data[i]!
  }
  // Expand RGB → RGBA when the source only stores 3 channels.
  if (data.length >= pixelCount * 3 && data.length < expected) {
    for (let p = pixelCount - 1; p >= 0; p--) {
      const src = p * 3
      const dst = p * 4
      out[dst] = data[src]!
      out[dst + 1] = data[src + 1]!
      out[dst + 2] = data[src + 2]!
      out[dst + 3] = 255
    }
  }
  return out
}

/**
 * Reads UV coordinates from a geometry so they stay aligned with an exported
 * position slice (same vertex count after compact/trim).
 */
export function exportUvsForPositionSlice(
  geometry: THREE.BufferGeometry,
  positions: Float32Array
): Float32Array | undefined {
  const attribute = geometry.getAttribute('uv') as
    | THREE.BufferAttribute
    | undefined
  if (!attribute || attribute.count === 0 || attribute.itemSize < 2) {
    return undefined
  }
  const vertexCount = Math.floor(positions.length / 3)
  const expected = vertexCount * 2
  if (expected <= 0) {
    return undefined
  }
  const array = attribute.array as ArrayLike<number>
  const available = attribute.count * attribute.itemSize
  if (available < expected) {
    return undefined
  }
  return copyFloat32Range(array, 0, expected)
}

/**
 * True when a mesh material is an unloaded IMAGE/OLE placeholder (transparent,
 * no map) that would otherwise export as a solid white fill.
 */
export function isTransparentImagePlaceholder(
  material: THREE.Material
): boolean {
  const meshMaterial = material as THREE.MeshBasicMaterial
  if (meshMaterial.map) {
    return false
  }
  return (
    meshMaterial.transparent === true &&
    typeof meshMaterial.opacity === 'number' &&
    meshMaterial.opacity < 0.01
  )
}

/**
 * Builds a THREE texture from exported PNG (or other) bytes.
 */
export function createTextureFromExportedBytes(
  texture: AcExMeshTexture,
  options: {
    onLoad?: (loaded: THREE.Texture) => void
    onError?: () => void
  } = {}
): THREE.Texture {
  const bytes = copyBytes(texture.bytes)
  const blob = new Blob([bytes as BlobPart], {
    type: texture.mimeType || 'image/png'
  })
  const url = URL.createObjectURL(blob)
  const result = new THREE.TextureLoader().load(
    url,
    loaded => {
      URL.revokeObjectURL(url)
      options.onLoad?.(loaded)
    },
    undefined,
    () => {
      URL.revokeObjectURL(url)
      options.onError?.()
    }
  )
  result.colorSpace = THREE.SRGBColorSpace
  result.needsUpdate = true
  return result
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}
