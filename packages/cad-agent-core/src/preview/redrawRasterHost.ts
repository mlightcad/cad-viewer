import type {
  CadRasterImage,
  CadRedrawRasterHost
} from '@mlightcad/cad-script-core'
import {
  AcApDocManager,
  AcApRasterImageConvertor,
  AcTrView2d
} from '@mlightcad/cad-simple-viewer'
import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

import { waitForDrawingSceneReady } from './captureDrawingPreview.js'

/**
 * Supplies the reference images a viewer-side `cad.redraw.compare` reads.
 *
 * The chat host (e.g. `cad-agent-plugin`) knows which images the user
 * attached; scripts only see them through this provider.
 */
export type CadReferenceImageProvider = () => readonly string[]

let referenceImageProvider: CadReferenceImageProvider | undefined

/**
 * Registers where `cad.redraw.compare` finds the user's reference images
 * (data URLs, in attachment order). Pass `undefined` to clear.
 *
 * @param provider - Returns the current conversation's reference images.
 */
export function acapSetRedrawReferenceImages(
  provider: CadReferenceImageProvider | undefined
): void {
  referenceImageProvider = provider
}

/** Decodes a data URL (or any image URL) to RGBA through a canvas. */
export async function acapDecodeImageToRaster(
  url: string
): Promise<CadRasterImage | undefined> {
  if (typeof document === 'undefined') return undefined
  const response = await fetch(url)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return undefined
    ctx.drawImage(bitmap, 0, 0)
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    return { width: bitmap.width, height: bitmap.height, data }
  } finally {
    bitmap.close()
  }
}

/** Encodes RGBA to a PNG data URL through a canvas. */
export async function acapEncodeRasterPng(
  image: CadRasterImage
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
    0,
    0
  )
  return canvas.toDataURL('image/png')
}

/**
 * Renders model space framed exactly to `box`. The capture is decoded back to
 * RGBA because the pixel comparison works on raw pixels.
 */
async function renderDrawingBox(
  box: { min: { x: number; y: number }; max: { x: number; y: number } },
  width: number,
  height: number
): Promise<CadRasterImage | undefined> {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) return undefined
  const previousLayout = view.activeLayoutBtrId
  const modelSpace = view.modelSpaceBtrId
  const switched =
    !!modelSpace && !!previousLayout && previousLayout !== modelSpace
  try {
    if (switched) view.activeLayoutBtrId = modelSpace
    if (!(await waitForDrawingSceneReady())) return undefined
    const bounds = new AcGeBox2d(
      new AcGePoint2d(box.min.x, box.min.y),
      new AcGePoint2d(box.max.x, box.max.y)
    )
    // Bounds share the requested aspect, so the capture spans the box exactly.
    const dataUrl = await new AcApRasterImageConvertor(
      'png'
    ).captureToDataUrl(bounds, Math.max(width, height))
    return dataUrl ? acapDecodeImageToRaster(dataUrl) : undefined
  } finally {
    if (switched && view.activeLayoutBtrId !== previousLayout) {
      view.activeLayoutBtrId = previousLayout
    }
  }
}

/**
 * Viewer implementation of {@link CadRedrawRasterHost}: reference images come
 * from {@link acapSetRedrawReferenceImages}, the drawing renders through the
 * live WebGL scene, and PNGs are encoded with a canvas.
 */
export function createViewerRedrawRasterHost(): CadRedrawRasterHost {
  return {
    async getReferenceImage(index) {
      const url = referenceImageProvider?.()[index]
      return url ? acapDecodeImageToRaster(url) : undefined
    },
    renderDrawing: renderDrawingBox,
    encodePng: acapEncodeRasterPng
  }
}
