import {
  acdbOleBlobNeedsMetafileRasterization,
  acdbRasterizeOleMetafile,
  AcGiImageStyle} from '@mlightcad/data-model'
import * as THREE from 'three'

import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import { AcTrEntity } from './AcTrEntity'

/**
 * Textured image drawable for {@link AcDbRasterImage} / {@link AcDbOle2Frame}.
 *
 * Raster blobs (`image/png`, `image/bmp`, …) are textured immediately.
 * OLE metafile blobs (`image/wmf`, `image/emf`) are rasterized asynchronously
 * via {@link acdbRasterizeOleMetafile} before the texture is bound — otherwise
 * Three.js `TextureLoader` fails and the mesh stays an opaque white fill.
 *
 * Metafile loads participate in {@link asyncDraw} so export/`waitUntilIdle`
 * waits for the PNG texture before capturing the canvas.
 */
export class AcTrImage extends AcTrEntity {
  private _mesh?: THREE.Mesh
  private _material: THREE.MeshBasicMaterial
  private _textureReady = false
  private _texturePromise: Promise<void>

  constructor(blob: Blob, style: AcGiImageStyle, context: AcTrRenderContext) {
    super(context)

    const shape = new THREE.Shape(style.boundary as unknown as THREE.Vector2[])
    const geometry = new THREE.ShapeGeometry(shape)
    this.generateUVs(geometry)

    // Spatial pick / box selection index entities via wcsBbox. Without this,
    // filled RasterImage / Ole2Frame meshes never enter the pick candidates
    // even though their interior is raycastable.
    const boundingBox = AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (boundingBox) {
      this.wcsBbox = boundingBox
    }

    // Transparent until a real texture arrives — avoids the white OLE placeholder.
    this._material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })

    this._mesh = new THREE.Mesh(geometry, this._material)
    this.add(this._mesh)
    this.finalizeLeafDrawables()

    if (acdbOleBlobNeedsMetafileRasterization(blob)) {
      this._texturePromise = this.loadMetafileTexture(blob)
    } else {
      this._texturePromise = this.loadRasterTexture(blob)
    }
  }

  override resolveDrawMode(): AcTrDrawMode {
    return 'unbatch'
  }

  /**
   * Metafile textures are not drawable until rasterization finishes — keep
   * {@link asyncDraw} on the critical path for exports.
   */
  override hasDrawableGeometry(): boolean {
    return this._textureReady
  }

  override async asyncDraw(): Promise<void> {
    await this._texturePromise
  }

  /**
   * Generate UVs for the specified THREE.ShapeGeometry instance. THREE.ShapeGeometry does not automatically
   * generate UVs. To apply textures, we need to manually generate the UV coordinates for your shape.
   * @param geometry Input geometry to generate UVs
   */
  protected generateUVs(geometry: THREE.ShapeGeometry) {
    const position = geometry.attributes.position.array
    const uv = new Float32Array((position.length / 3) * 2)

    const minX = Math.min(...position.filter((_, i) => i % 3 === 0))
    const maxX = Math.max(...position.filter((_, i) => i % 3 === 0))
    const minY = Math.min(...position.filter((_, i) => i % 3 === 1))
    const maxY = Math.max(...position.filter((_, i) => i % 3 === 1))

    const width = maxX - minX
    const height = maxY - minY

    for (let i = 0; i < position.length; i += 3) {
      const x = position[i]
      const y = position[i + 1]
      uv[(i / 3) * 2] = (x - minX) / width
      uv[(i / 3) * 2 + 1] = (y - minY) / height
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  }

  private loadRasterTexture(blob: Blob): Promise<void> {
    return new Promise(resolve => {
      const blobUrl = URL.createObjectURL(blob)
      const textureLoader = new THREE.TextureLoader()
      const texture = textureLoader.load(
        blobUrl,
        () => {
          URL.revokeObjectURL(blobUrl)
          this.applyTexture(texture)
          resolve()
        },
        undefined,
        () => {
          URL.revokeObjectURL(blobUrl)
          this._textureReady = true
          resolve()
        }
      )
      texture.colorSpace = THREE.SRGBColorSpace
    })
  }

  private async loadMetafileTexture(blob: Blob): Promise<void> {
    try {
      const png = await acdbRasterizeOleMetafile(blob, {
        // Cap huge Excel tables so first paint stays responsive.
        maxWidth: 4096,
        maxHeight: 4096,
        dpiScale: 1
      })
      if (!png) {
        this._textureReady = true
        return
      }
      await this.loadRasterTexture(png)
    } catch {
      // Leave the transparent placeholder mesh; outline-only fallback is
      // handled by AcDbOle2Frame when extraction itself fails.
      this._textureReady = true
    }
  }

  private applyTexture(texture: THREE.Texture) {
    this._material.map = texture
    this._material.opacity = 1
    this._material.transparent = true
    this._material.depthWrite = true
    this._material.needsUpdate = true
    this._textureReady = true
  }
}
