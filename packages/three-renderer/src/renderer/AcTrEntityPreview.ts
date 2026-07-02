import {
  AcGeBox2d,
  AcGePoint2d,
  AcGeVector2d
} from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { AcTrMaterialManager } from '../style/AcTrMaterialManager'
import { AcTrCamera } from '../viewport/AcTrCamera'
import type { AcTrRenderer } from './AcTrRenderer'

/** Options for {@link AcTrEntityPreview.capture}. */
export interface AcTrEntityPreviewOptions {
  /** Output width in pixels. */
  width: number
  /** Output height in pixels. */
  height: number
  /**
   * World-space bounds used to frame the preview.
   * When omitted, bounds are computed from drawable geometry in `object`.
   */
  bounds?: AcGeBox2d
  /** Margin multiplier applied around computed or supplied bounds. Default `1.1`. */
  margin?: number
  /** Background colour; defaults to {@link AcTrRenderer.currentBackgroundColor}. */
  backgroundColor?: number
  /** Background alpha; defaults to {@link AcTrRenderer.clearAlpha}. */
  backgroundAlpha?: number
  /** When true, only preview-cloned line materials receive export resolution. */
  localLineResolutionOnly?: boolean
  /**
   * Called after WebGL state is restored. Use this to repaint the interactive
   * view when capture temporarily adjusts renderer uniforms or canvas state.
   */
  onRestored?: () => void
  /**
   * Main viewport size to restore after capture.
   *
   * Required when sharing the interactive renderer so the canvas buffer and line
   * resolution match the live view again (same rule as PNG export).
   */
  viewportSize?: { width: number; height: number }
}

/** Result of {@link AcTrEntityPreview.capture}. */
export interface AcTrEntityPreviewResult {
  /** Canvas containing the rendered preview image. */
  canvas: HTMLCanvasElement
  /** World-space bounds used to frame the preview. */
  bounds: AcGeBox2d
}

/** Saved WebGL renderer state restored after offscreen preview capture. */
interface AcTrEntityPreviewRendererState {
  pixelRatio: number
  renderTarget: THREE.WebGLRenderTarget | null
  scissorTest: boolean
  viewport: THREE.Vector4
  size: THREE.Vector2
  clearColor: THREE.Color
  clearAlpha: number
  autoClear: boolean
  cameraZoom: number
  viewportSize?: { width: number; height: number }
  localLineResolutionOnly?: boolean
}

/**
 * Offscreen renderer for entity and block preview thumbnails.
 *
 * Stateless helpers are exposed as static methods. Capture requires one
 * instance bound to an {@link AcTrRenderer}.
 */
export class AcTrEntityPreview {
  private readonly _renderer: AcTrRenderer

  /**
   * Creates a preview capture bound to one renderer.
   *
   * @param renderer - Renderer used for offscreen capture
   */
  constructor(renderer: AcTrRenderer) {
    this._renderer = renderer
  }

  /**
   * Renders one standalone object subtree to an offscreen canvas.
   *
   * The input should be a detached preview root (for example from
   * {@link AcTrBatchedGroup.createPreviewSubset}) or any other THREE.js object
   * graph that is safe to reparent temporarily. When `object` already belongs to
   * another scene, a deep clone is rendered and disposed afterward.
   *
   * @param object - Entity, block, or preview subset root to render
   * @param options - Output size and optional framing overrides
   * @returns Rendered canvas and framing bounds, or `null` when bounds cannot be resolved
   */
  capture(
    object: THREE.Object3D,
    options: AcTrEntityPreviewOptions
  ): AcTrEntityPreviewResult | null {
    const width = Math.max(1, Math.round(options.width))
    const height = Math.max(1, Math.round(options.height))
    const margin = options.margin ?? 1.1

    const bounds = AcTrEntityPreview.resolvePreviewBounds(
      object,
      options.bounds,
      margin
    )
    if (!bounds) {
      return null
    }

    const renderer = this._renderer
    const webgl = renderer.internalRenderer
    const savedState = AcTrEntityPreview.saveRendererState(
      renderer,
      webgl,
      options
    )

    const backgroundColor =
      options.backgroundColor ?? renderer.currentBackgroundColor
    const backgroundAlpha = options.backgroundAlpha ?? renderer.clearAlpha

    const { drawable, ownsClone } = AcTrEntityPreview.prepareDrawable(object)

    const scene = new THREE.Scene()
    scene.add(drawable)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = 10
    AcTrEntityPreview.fitExportCamera(camera, bounds, width, height)

    let renderTarget: THREE.WebGLRenderTarget | undefined
    let canvas: HTMLCanvasElement | undefined

    try {
      // Match PNG export: force 1:1 pixels while reading from a render target.
      webgl.setPixelRatio(1)
      renderer.autoClear = true
      if (!options.localLineResolutionOnly) {
        renderer.updateLineResolution(width, height)
      }
      renderer.setClearColor(backgroundColor, backgroundAlpha)
      AcTrEntityPreview.syncDrawableLineResolution(drawable, width, height)

      renderTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType
      })

      webgl.setRenderTarget(renderTarget)
      webgl.setViewport(0, 0, width, height)
      webgl.setScissorTest(false)

      renderer.render(scene, new AcTrCamera(camera))

      const pixels = new Uint8Array(width * height * 4)
      webgl.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels)

      canvas = AcTrEntityPreview.createCanvasFromPixels(
        AcTrEntityPreview.flipPixelsVertically(pixels, width, height),
        width,
        height
      )
    } finally {
      scene.remove(drawable)
      if (ownsClone) {
        AcTrEntityPreview.disposeObjectTree(drawable)
      }

      renderTarget?.dispose()
      AcTrEntityPreview.restoreRendererState(renderer, webgl, savedState)
      options.onRestored?.()
    }

    if (!canvas) {
      return null
    }

    return { canvas, bounds }
  }

  static box3ToBounds2d(box: THREE.Box3, margin = 1.1): AcGeBox2d | null {
    if (box.isEmpty() || !AcTrEntityPreview.isFiniteBox3(box)) {
      return null
    }
    return AcTrEntityPreview.expandBox3ToBox2d(box, margin)
  }

  /**
   * Computes a 2D axis-aligned bounding box from drawable geometry under `object`.
   *
   * @param object - Root object to measure (preview subset, {@link AcTrGroup}, etc.)
   * @param margin - Margin multiplier applied around the raw bounds
   * @returns Framed bounds, or `null` when no finite geometry is found
   */
  static computeObjectBounds2d(
    object: THREE.Object3D,
    margin = 1.1
  ): AcGeBox2d | null {
    object.updateMatrixWorld(true)

    const box3 = new THREE.Box3()
    const scratch = new THREE.Box3()

    object.traverse(child => {
      if (!AcTrEntityPreview.isLeafDrawable(child)) {
        return
      }
      const geometry = (child as THREE.Mesh).geometry as
        | THREE.BufferGeometry
        | undefined
      if (!geometry) {
        return
      }
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox()
      }
      if (
        !geometry.boundingBox ||
        !AcTrEntityPreview.isFiniteBox3(geometry.boundingBox)
      ) {
        return
      }
      scratch.copy(geometry.boundingBox).applyMatrix4(child.matrixWorld)
      box3.union(scratch)
    })

    if (box3.isEmpty() || !AcTrEntityPreview.isFiniteBox3(box3)) {
      return null
    }

    return AcTrEntityPreview.expandBox3ToBox2d(box3, margin)
  }

  /**
   * Computes a 2D axis-aligned bounding box from the full object hierarchy.
   *
   * Use as a fallback when {@link computeObjectBounds2d} finds no leaf drawables.
   *
   * @param object - Root object to measure
   * @param margin - Margin multiplier applied around the raw bounds
   * @returns Framed bounds, or `null` when no finite geometry is found
   */
  static computeObjectBounds2dFromObject(
    object: THREE.Object3D,
    margin = 1.1
  ): AcGeBox2d | null {
    object.updateMatrixWorld(true)
    const box3 = new THREE.Box3().setFromObject(object)
    if (box3.isEmpty() || !AcTrEntityPreview.isFiniteBox3(box3)) {
      return null
    }
    return AcTrEntityPreview.expandBox3ToBox2d(box3, margin)
  }

  /**
   * Fits an orthographic camera to a 2D world box using export pixel dimensions.
   *
   * Mirrors {@link AcTrBaseView.applyExportCamera} so offscreen previews use the
   * same framing rules as PNG export.
   *
   * @param camera - Orthographic camera to update in place
   * @param box - World-space bounds to fit
   * @param pixelWidth - Output width in pixels
   * @param pixelHeight - Output height in pixels
   */
  static fitExportCamera(
    camera: THREE.OrthographicCamera,
    box: AcGeBox2d,
    pixelWidth: number,
    pixelHeight: number
  ) {
    const size = new AcGeVector2d()
    box.getSize(size)

    const center = new AcGeVector2d()
    box.getCenter(center)

    const fitWidth = Math.max(Math.abs(size.x), Number.EPSILON)
    const fitHeight = Math.max(Math.abs(size.y), Number.EPSILON)
    const aspect = pixelWidth / Math.max(pixelHeight, 1)
    const frustum = pixelHeight / 2
    const scale = Math.min(
      (2 * aspect * frustum) / fitWidth,
      (2 * frustum) / fitHeight
    )

    camera.left = -aspect * frustum
    camera.right = aspect * frustum
    camera.top = frustum
    camera.bottom = -frustum
    camera.position.set(center.x, center.y, camera.position.z)
    camera.zoom = scale
    camera.updateProjectionMatrix()
  }

  /**
   * Resolves the world-space bounds used to frame one preview capture.
   *
   * @param object - Drawable root passed to {@link capture}
   * @param bounds - Optional caller-supplied bounds
   * @param margin - Margin multiplier applied around computed or supplied bounds
   * @returns Framed bounds, or `null` when no finite geometry is found
   */
  private static resolvePreviewBounds(
    object: THREE.Object3D,
    bounds: AcGeBox2d | undefined,
    margin: number
  ): AcGeBox2d | null {
    let resolved =
      bounds ?? AcTrEntityPreview.computeObjectBounds2d(object, margin)
    if (!resolved) {
      return null
    }
    if (bounds && margin !== 1) {
      resolved = AcTrEntityPreview.expandBox2d(bounds, margin)
    }
    return resolved
  }

  /**
   * Returns a drawable root that is safe to reparent into a temporary scene.
   *
   * @param object - Original drawable root supplied by the caller
   * @returns Drawable root and whether this capture owns a cloned copy
   */
  private static prepareDrawable(object: THREE.Object3D): {
    drawable: THREE.Object3D
    ownsClone: boolean
  } {
    const ownsClone = object.parent != null
    return {
      drawable: ownsClone ? object.clone(true) : object,
      ownsClone
    }
  }

  /**
   * Updates wide-line resolution uniforms on one preview drawable subtree.
   *
   * @param object - Preview drawable root rendered offscreen
   * @param width - Output width in pixels
   * @param height - Output height in pixels
   */
  static syncLineMaterialsResolution(
    object: THREE.Object3D,
    width: number,
    height: number
  ) {
    AcTrEntityPreview.syncDrawableLineResolution(object, width, height)
  }

  /**
   * Updates wide-line shader resolution on preview-cloned materials only.
   *
   * @param object - Preview drawable root rendered offscreen
   * @param width - Output width in pixels
   * @param height - Output height in pixels
   */
  private static syncDrawableLineResolution(
    object: THREE.Object3D,
    width: number,
    height: number
  ) {
    const resolution = new THREE.Vector2(width, height)
    object.traverse(child => {
      const materials = (child as THREE.Mesh).material
      if (!materials) {
        return
      }
      if (Array.isArray(materials)) {
        materials.forEach(material => {
          if (material instanceof LineMaterial) {
            material.resolution.copy(resolution)
          }
        })
        return
      }
      if (materials instanceof LineMaterial) {
        materials.resolution.copy(resolution)
      }
    })
  }

  /**
   * Captures renderer and WebGL state before offscreen preview rendering.
   *
   * @param renderer - CAD renderer wrapper whose flags must be restored later
   * @param webgl - Internal THREE.js renderer used for the capture pass
   * @returns Snapshot of values to pass to {@link restoreRendererState}
   */
  private static saveRendererState(
    renderer: AcTrRenderer,
    webgl: THREE.WebGLRenderer,
    options: AcTrEntityPreviewOptions
  ): AcTrEntityPreviewRendererState {
    const clearColor = new THREE.Color()
    webgl.getClearColor(clearColor)

    return {
      pixelRatio: webgl.getPixelRatio(),
      renderTarget: webgl.getRenderTarget(),
      scissorTest: webgl.getScissorTest(),
      viewport: webgl.getViewport(new THREE.Vector4()),
      size: webgl.getSize(new THREE.Vector2()),
      clearColor,
      clearAlpha: webgl.getClearAlpha(),
      autoClear: renderer.autoClear,
      cameraZoom: AcTrMaterialManager.CameraZoomUniform.value,
      viewportSize: options.viewportSize,
      localLineResolutionOnly: options.localLineResolutionOnly
    }
  }

  /**
   * Restores renderer and WebGL state after offscreen preview rendering.
   *
   * @param renderer - CAD renderer wrapper whose flags should be restored
   * @param webgl - Internal THREE.js renderer used for the capture pass
   * @param state - Snapshot previously returned by {@link saveRendererState}
   */
  private static restoreRendererState(
    renderer: AcTrRenderer,
    webgl: THREE.WebGLRenderer,
    state: AcTrEntityPreviewRendererState
  ) {
    webgl.setRenderTarget(state.renderTarget)
    renderer.setClearColor(state.clearColor.getHex(), state.clearAlpha)
    renderer.autoClear = state.autoClear
    webgl.setPixelRatio(state.pixelRatio)

    if (state.viewportSize) {
      renderer.setSize(state.viewportSize.width, state.viewportSize.height)
    } else if (!state.localLineResolutionOnly) {
      renderer.updateLineResolution(state.size.x, state.size.y)
    }

    renderer.syncCameraZoom(state.cameraZoom)
    webgl.setViewport(
      state.viewport.x,
      state.viewport.y,
      state.viewport.z,
      state.viewport.w
    )
    webgl.setScissorTest(state.scissorTest)
  }

  /**
   * Returns true for drawable leaf nodes that should contribute preview bounds.
   *
   * Container entities may also expose placeholder geometry; those are skipped
   * when they already own rendered child drawables.
   *
   * @param child - Candidate node encountered during bounds traversal
   */
  private static isLeafDrawable(child: THREE.Object3D) {
    const mesh = child as THREE.Mesh
    if (!mesh.geometry || !mesh.material) {
      return false
    }
    return !child.children.some(
      descendant => !!(descendant as THREE.Mesh).material
    )
  }

  /**
   * Returns true when all XY components of `box` are finite numbers.
   *
   * @param box - Candidate axis-aligned bounds in world space
   */
  private static isFiniteBox3(box: THREE.Box3) {
    return (
      Number.isFinite(box.min.x) &&
      Number.isFinite(box.min.y) &&
      Number.isFinite(box.max.x) &&
      Number.isFinite(box.max.y)
    )
  }

  /**
   * Expands one 3D axis-aligned box into a 2D world box with margin applied.
   *
   * @param box - Source bounds measured from drawable geometry
   * @param margin - Margin multiplier applied around the raw bounds
   */
  private static expandBox3ToBox2d(box: THREE.Box3, margin: number) {
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const halfWidth = (Math.max(Math.abs(size.x), Number.EPSILON) * margin) / 2
    const halfHeight = (Math.max(Math.abs(size.y), Number.EPSILON) * margin) / 2

    return new AcGeBox2d(
      new AcGePoint2d(center.x - halfWidth, center.y - halfHeight),
      new AcGePoint2d(center.x + halfWidth, center.y + halfHeight)
    )
  }

  /**
   * Expands one 2D world box by a margin multiplier around its center.
   *
   * @param box - Source bounds supplied by the caller
   * @param margin - Margin multiplier applied around the raw bounds
   */
  private static expandBox2d(box: AcGeBox2d, margin: number) {
    const size = new AcGeVector2d()
    box.getSize(size)
    const center = new AcGeVector2d()
    box.getCenter(center)

    const halfWidth = (Math.max(Math.abs(size.x), Number.EPSILON) * margin) / 2
    const halfHeight = (Math.max(Math.abs(size.y), Number.EPSILON) * margin) / 2

    return new AcGeBox2d(
      new AcGePoint2d(center.x - halfWidth, center.y - halfHeight),
      new AcGePoint2d(center.x + halfWidth, center.y + halfHeight)
    )
  }

  /**
   * Flips RGBA pixel rows vertically to match browser canvas coordinates.
   *
   * WebGL render targets use a bottom-left origin, while canvas image data uses
   * a top-left origin.
   *
   * @param pixels - Raw RGBA bytes read from a render target
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   */
  private static flipPixelsVertically(
    pixels: Uint8Array,
    width: number,
    height: number
  ) {
    const flippedPixels = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4
      const dstRow = y * width * 4
      flippedPixels.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow)
    }
    return flippedPixels
  }

  /**
   * Creates a canvas element from vertically oriented RGBA pixel data.
   *
   * @param pixels - RGBA bytes in top-left canvas order
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   */
  private static createCanvasFromPixels(
    pixels: Uint8Array,
    width: number,
    height: number
  ) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to acquire 2D canvas context for entity preview')
    }
    const imageData = ctx.createImageData(width, height)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  /**
   * Disposes cloned preview geometry and removes it from the scene graph.
   *
   * @param object - Cloned drawable root created by {@link prepareDrawable}
   */
  private static disposeObjectTree(object: THREE.Object3D) {
    object.traverse(child => {
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose()
    })
    object.removeFromParent()
  }
}
