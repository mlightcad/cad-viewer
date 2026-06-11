import { AcGiImageStyle } from '@mlightcad/data-model'
import * as THREE from 'three'

import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { getSceneDrawableUserData } from '../util'
import { AcTrEntity } from './AcTrEntity'

const _origin3 = /*@__PURE__*/ new THREE.Vector3()

export class AcTrImage extends AcTrEntity {
  constructor(
    blob: Blob,
    style: AcGiImageStyle,
    context: AcTrRenderContext
  ) {
    super(context)
    const blobUrl = URL.createObjectURL(blob)
    const textureLoader = new THREE.TextureLoader()
    const texture = textureLoader.load(
      blobUrl,
      () => URL.revokeObjectURL(blobUrl),
      undefined,
      () => URL.revokeObjectURL(blobUrl)
    )
    texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: texture
    })

    const boundary = style.boundary as unknown as THREE.Vector2[]
    const localOrigin = this.computeLocalOrigin(boundary)
    const localBoundary = boundary.map(
      point =>
        new THREE.Vector2(point.x - localOrigin.x, point.y - localOrigin.y)
    )
    const shape = new THREE.Shape(localBoundary)
    const geometry = new THREE.ShapeGeometry(shape)
    this.generateUVs(geometry)
    geometry.computeBoundingBox()
    if (geometry.boundingBox) {
      this.box = geometry.boundingBox
        .clone()
        .translate(_origin3.set(localOrigin.x, localOrigin.y, 0))
    }

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(localOrigin.x, localOrigin.y, 0)
    getSceneDrawableUserData(mesh).noBatch = true
    this.add(mesh)
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): AcTrDrawMode {
    return 'unbatch'
  }

  private computeLocalOrigin(boundary: THREE.Vector2[]) {
    const box = new THREE.Box2()
    boundary.forEach(point => box.expandByPoint(point))
    return box.isEmpty()
      ? new THREE.Vector2()
      : box.getCenter(new THREE.Vector2())
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
}
