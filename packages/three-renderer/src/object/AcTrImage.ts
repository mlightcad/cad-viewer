import { AcGiImageStyle } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrEntity } from './AcTrEntity'

export class AcTrImage extends AcTrEntity {
  constructor(
    blob: Blob,
    style: AcGiImageStyle,
    styleManager: AcTrStyleManager
  ) {
    super(styleManager)
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

    const shape = new THREE.Shape(style.boundary as unknown as THREE.Vector2[])
    const geometry = new THREE.ShapeGeometry(shape)
    this.generateUVs(geometry)

    const mesh = new THREE.Mesh(geometry, material)
    this.add(mesh)
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
