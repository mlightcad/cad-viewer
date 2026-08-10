import { AcGePoint3dLike, AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { resolveAnchorFromBox } from '../draw/AcTrBatchDrawPolicy'
import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil, getSceneDrawableUserData } from '../util'
import { AcTrEntity } from './AcTrEntity'
import { buildLineGeometry } from './AcTrLineGeometryBuilder'

export class AcTrLine extends AcTrEntity {
  public geometry: THREE.BufferGeometry | LineSegmentsGeometry

  constructor(
    points: AcGePoint3dLike[],
    traits: AcGiSubEntityTraits,
    context: AcTrRenderContext,
    basicMaterialOnly: boolean = false
  ) {
    super(context)

    if (points.length < 2) {
      this.geometry = new THREE.BufferGeometry()
      return
    }

    const material = this.styleManager.getLineMaterial(
      traits,
      basicMaterialOnly
    )
    const built = buildLineGeometry(points, material)
    if (!built) {
      this.geometry = new THREE.BufferGeometry()
      return
    }

    this.geometry = built.geometry
    this.wcsBbox = built.wcsBbox

    if (built.kind === 'fat') {
      const line = new LineSegments2(
        built.geometry as LineSegmentsGeometry,
        material as LineMaterial
      )
      line.position.copy(built.worldOffset)
      getSceneDrawableUserData(line).styleMaterialId = material.id
      this.add(line)
      this.finalizeLeafDrawables()
      return
    }

    const line = new THREE.LineSegments(
      built.geometry as THREE.BufferGeometry,
      material
    )
    line.position.copy(built.worldOffset)
    AcTrBufferGeometryUtil.computeLineDistances(line)
    this.add(line)
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.wcsBbox)
    })
  }
}
