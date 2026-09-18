import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { resolveAnchorFromBox } from '../draw/AcTrBatchDrawPolicy'
import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import {
  asyncComplexLineTypeGlyphs,
  buildComplexLineTypeGeometry,
  hasPendingComplexLineTypeGlyphs,
  isComplexLineType,
  syncComplexLineTypeGlyphs
} from '../linetype'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil, getSceneDrawableUserData } from '../util'
import { AcTrEntity } from './AcTrEntity'

export class AcTrLineSegments extends AcTrEntity {
  private _hasComplexGlyphs = false

  constructor(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    traits: AcGiSubEntityTraits,
    context: AcTrRenderContext
  ) {
    super(context)

    if (
      isComplexLineType(traits.lineType.pattern) &&
      this.buildComplexFromSegments(array, itemSize, indices, traits, context)
    ) {
      this._hasComplexGlyphs = hasPendingComplexLineTypeGlyphs(this)
      this.finalizeLeafDrawables()
      return
    }

    const material = this.styleManager.getLineMaterial(traits)
    const box = new THREE.Box3()

    for (let i = 0; i < array.length; i += itemSize) {
      box.expandByPoint(_point.set(array[i], array[i + 1], array[i + 2] ?? 0))
    }

    const localOrigin = box.getCenter(new THREE.Vector3())

    if (material instanceof LineMaterial) {
      const segmentCount = Math.floor(indices.length / 2)
      const segmentPositions = new Float32Array(segmentCount * 6)
      for (let i = 0, pos = 0; i < segmentCount; i++) {
        const i1 = indices[i * 2]
        const i2 = indices[i * 2 + 1]
        const base1 = i1 * itemSize
        const base2 = i2 * itemSize
        segmentPositions[pos++] = array[base1] - localOrigin.x
        segmentPositions[pos++] = array[base1 + 1] - localOrigin.y
        segmentPositions[pos++] = (array[base1 + 2] ?? 0) - localOrigin.z
        segmentPositions[pos++] = array[base2] - localOrigin.x
        segmentPositions[pos++] = array[base2 + 1] - localOrigin.y
        segmentPositions[pos++] = (array[base2 + 2] ?? 0) - localOrigin.z
      }

      const lineGeometry = new LineSegmentsGeometry()
      lineGeometry.setPositions(segmentPositions)
      AcTrBufferGeometryUtil.safeComputeBoundingBox(
        lineGeometry as unknown as THREE.BufferGeometry
      )
      AcTrBufferGeometryUtil.safeComputeBoundingSphere(
        lineGeometry as unknown as THREE.BufferGeometry
      )
      this.setBoundingBox(
        lineGeometry as unknown as THREE.BufferGeometry,
        localOrigin
      )

      const line = new LineSegments2(lineGeometry, material)
      line.position.set(localOrigin.x, localOrigin.y, localOrigin.z)
      getSceneDrawableUserData(line).styleMaterialId = material.id
      this.add(line)
      this.finalizeLeafDrawables()
      return
    }

    const rebased = new Float32Array(array.length)
    for (let i = 0; i < array.length; i += itemSize) {
      rebased[i] = array[i] - localOrigin.x
      rebased[i + 1] = array[i + 1] - localOrigin.y
      rebased[i + 2] = (array[i + 2] ?? 0) - localOrigin.z
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(rebased, itemSize)
    )
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    this.setBoundingBox(geometry, localOrigin)

    const line = new THREE.LineSegments(geometry, material)
    line.position.set(localOrigin.x, localOrigin.y, localOrigin.z)
    AcTrBufferGeometryUtil.computeLineDistances(line)
    this.add(line)
    this.finalizeLeafDrawables()
  }

  get hasComplexLinetypeGlyphs(): boolean {
    return this._hasComplexGlyphs || hasPendingComplexLineTypeGlyphs(this)
  }

  /**
   * Stroke children attach immediately while glyph shells stay empty until
   * sync/async draw. Report not-yet-drawable so {@link AcTrGroup} still
   * finalizes this entity (and refreshes bbox) instead of skipping it.
   */
  override hasDrawableGeometry(): boolean {
    if (hasPendingComplexLineTypeGlyphs(this)) {
      return false
    }
    return super.hasDrawableGeometry()
  }

  override syncDraw(): void {
    if (!this.hasComplexLinetypeGlyphs) {
      return
    }
    syncComplexLineTypeGlyphs(this)
  }

  override async asyncDraw(): Promise<void> {
    if (!this.hasComplexLinetypeGlyphs) {
      return
    }
    await asyncComplexLineTypeGlyphs(this)
  }

  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.wcsBbox)
    })
  }

  private buildComplexFromSegments(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    traits: AcGiSubEntityTraits,
    context: AcTrRenderContext
  ): boolean {
    // Each index pair is walked independently, so the dash phase restarts per
    // segment. Continuous polylines should use line strips (`lines()`), not
    // disjoint lineSegments, when complex linetype phase continuity matters.
    const segmentCount = Math.floor(indices.length / 2)
    let builtAny = false
    const unionBox = new THREE.Box3()

    for (let i = 0; i < segmentCount; i++) {
      const i1 = indices[i * 2]
      const i2 = indices[i * 2 + 1]
      const base1 = i1 * itemSize
      const base2 = i2 * itemSize
      const points = [
        {
          x: array[base1],
          y: array[base1 + 1],
          z: array[base1 + 2] ?? 0
        },
        {
          x: array[base2],
          y: array[base2 + 1],
          z: array[base2 + 2] ?? 0
        }
      ]
      const shell = new AcTrEntity(context)
      if (buildComplexLineTypeGeometry(shell, points, traits, context)) {
        builtAny = true
        while (shell.children.length > 0) {
          const child = shell.children[0]
          shell.remove(child)
          this.add(child)
        }
        if (!shell.wcsBbox.isEmpty()) {
          unionBox.union(shell.wcsBbox)
        }
      }
    }

    if (builtAny && !unionBox.isEmpty()) {
      this.wcsBbox = unionBox
    }
    return builtAny
  }

  private setBoundingBox(
    geometry: THREE.BufferGeometry,
    localOrigin: THREE.Vector3
  ) {
    const boundingBox = AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (!boundingBox) {
      return
    }
    const worldBox = boundingBox.clone()
    worldBox.translate(localOrigin)
    this.wcsBbox = worldBox
  }
}

const _point = /*@__PURE__*/ new THREE.Vector3()
