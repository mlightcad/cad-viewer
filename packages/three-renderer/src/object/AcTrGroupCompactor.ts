import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { canMergeIntoBatchOrigin } from '../draw/AcTrBatchDrawPolicy'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import {
  getObjectUserData,
  getSceneDrawableUserData
} from '../util/AcTrObjectUserData'
import { AcTrEntity } from './AcTrEntity'

/**
 * Drawable primitive family used as part of the compact merge key.
 *
 * Mirrors the separate batch maps in {@link AcTrBatchedGroup} so compacted
 * leaves still land in the same GPU batch containers after scene insert.
 */
type DrawableFamily = 'line' | 'line2' | 'mesh' | 'points'

/**
 * One merge bucket that accumulates leaves sharing the same batching key.
 *
 * @internal
 */
interface CompactBucket {
  /** Drawable primitive family for this bucket. */
  family: DrawableFamily
  /** Shared material instance (identity via {@link THREE.Material.id}). */
  material: THREE.Material
  /** Whether source geometries carry an index buffer. */
  hasIndex: boolean
  /** Sorted `name:itemSize:normalized` attribute signature. */
  attrSignature: string
  /** Effective layer name copied onto the merged leaf. */
  layerName: string
  /**
   * Authored layer before layer-0 inheritance, when present.
   * Preserved so INSERT material remapping still treats the leaf as layer 0.
   */
  authoredLayerName: string | undefined
  /** Whether raycasts should use the leaf bounding box. */
  bboxIntersectionCheck: boolean
  /** Style-manager material id for later layer remaps. */
  styleMaterialId: number | undefined
  /**
   * Shared world-space origin for this bucket.
   * Merged leaf `position` is set to this value; vertex data is relative to it.
   */
  origin: THREE.Vector3
  /**
   * Candidate leaves classified into this bucket (before baking).
   * Singletons are kept as-is; only buckets with 2+ candidates are baked.
   */
  candidates: THREE.Object3D[]
  /** Baked standard geometries waiting to be merged. */
  geometries: THREE.BufferGeometry[]
  /**
   * Raw segment positions for {@link LineSegments2}
   * (`x1,y1,z1,x2,y2,z2,...`), relative to {@link origin}.
   */
  line2Positions?: number[]
  /**
   * Original leaves that contributed successful bakes.
   * Disposed only after the merged leaf is created successfully.
   */
  sources: THREE.Object3D[]
}

const _worldOffset = /*@__PURE__*/ new THREE.Vector3()
const _matrixNoTranslation = /*@__PURE__*/ new THREE.Matrix4()
const _v1 = /*@__PURE__*/ new THREE.Vector3()
const _v2 = /*@__PURE__*/ new THREE.Vector3()
const _translation = /*@__PURE__*/ new THREE.Vector3()

/**
 * Merges flatten leaf drawables under an {@link AcTrGroup} that share the same
 * batching key into a small number of geometries.
 *
 * Used by block-reference template caching so each INSERT clones O(material)
 * leaves instead of O(source-entity) leaves. Spatial-index metadata
 * (`wcsChildBoxes`) is left untouched.
 *
 * Compaction must run while the group is still at identity (before the INSERT
 * transform is applied): baking uses each leaf's local `matrix`, while the
 * bucket origin is taken from `matrixWorld` translation.
 */
export class AcTrGroupCompactor {
  /**
   * Compacts direct drawable children of `group` in place.
   *
   * Skips {@link AcTrEntity} wrappers, `noBatch` / `isPoint` leaves, and
   * invisible objects. Leaves that cannot share a merge key remain as-is.
   *
   * Bake/merge is fail-soft: originals are kept until a merged leaf is
   * successfully created, so geometry is never silently dropped.
   *
   * @param group - Flattened group whose direct children should be compacted.
   */
  static compact(group: THREE.Object3D): void {
    group.updateMatrixWorld(true)

    const children = [...group.children]
    const kept: THREE.Object3D[] = []
    /** Buckets indexed by non-origin merge key for O(1) candidate lists. */
    const bucketsByKey = new Map<string, CompactBucket[]>()
    const buckets: CompactBucket[] = []

    // Pass 1: classify leaves into buckets without baking. Singletons stay
    // untouched so open-time compact skips useless clone/rebase work.
    for (const child of children) {
      if (!this.isMergeableLeaf(child)) {
        kept.push(child)
        continue
      }

      const family = this.resolveFamily(child)
      if (!family) {
        kept.push(child)
        continue
      }

      const material = (child as THREE.Mesh).material as THREE.Material
      if (!material || Array.isArray(material)) {
        kept.push(child)
        continue
      }

      const drawable = getSceneDrawableUserData(child)
      const objectData = getObjectUserData(child)
      const layerName = objectData.layerName ?? ''
      const authoredLayerName = objectData.authoredLayerName
      const bboxIntersectionCheck = !!drawable.bboxIntersectionCheck
      const styleMaterialId = drawable.styleMaterialId
      const hasIndex = this.hasIndex(child)
      const attrSignature = this.attributeSignature(child)
      _worldOffset.setFromMatrixPosition(child.matrixWorld)

      const key = this.bucketKey(
        family,
        material.id,
        hasIndex,
        attrSignature,
        layerName,
        authoredLayerName,
        bboxIntersectionCheck,
        styleMaterialId
      )
      let keyed = bucketsByKey.get(key)
      if (!keyed) {
        keyed = []
        bucketsByKey.set(key, keyed)
      }

      let bucket = this.findCompatibleBucket(
        keyed,
        family,
        material,
        child,
        layerName,
        authoredLayerName,
        bboxIntersectionCheck,
        styleMaterialId,
        _worldOffset
      )

      if (!bucket) {
        bucket = {
          family,
          material,
          hasIndex,
          attrSignature,
          layerName,
          authoredLayerName,
          bboxIntersectionCheck,
          styleMaterialId,
          origin: _worldOffset.clone(),
          candidates: [],
          geometries: [],
          line2Positions: family === 'line2' ? [] : undefined,
          sources: []
        }
        keyed.push(bucket)
        buckets.push(bucket)
      }

      bucket.candidates.push(child)
    }

    // Pass 2: bake/merge only buckets that actually reduce draw-call count.
    for (const bucket of buckets) {
      if (bucket.candidates.length < 2) {
        for (const child of bucket.candidates) {
          kept.push(child)
        }
        bucket.candidates.length = 0
        continue
      }

      for (const child of bucket.candidates) {
        let bakedOk = false
        if (bucket.family === 'line2') {
          const baked = this.bakeLine2Positions(
            child as LineSegments2,
            bucket.origin
          )
          if (baked && baked.length >= 6) {
            this.appendNumbers(bucket.line2Positions!, baked)
            bakedOk = true
          }
        } else {
          const baked = this.bakeStandardGeometry(
            child,
            bucket.family,
            bucket.origin
          )
          if (baked) {
            bucket.geometries.push(baked)
            bakedOk = true
          }
        }

        if (bakedOk) {
          // Keep the original until merge succeeds so failures can restore it.
          bucket.sources.push(child)
        } else {
          kept.push(child)
        }
      }
      bucket.candidates.length = 0
    }

    // Detach all children; re-add kept + merged (or restored sources).
    group.children = []
    for (const child of children) {
      child.parent = null
    }

    for (const child of kept) {
      group.add(child)
    }

    for (const bucket of buckets) {
      if (bucket.sources.length === 0) {
        continue
      }
      // A single successful bake after failed siblings is not worth rebuilding.
      if (bucket.sources.length < 2) {
        this.disposeBucketGeometries(bucket)
        bucket.line2Positions = undefined
        for (const source of bucket.sources) {
          group.add(source)
        }
        bucket.sources.length = 0
        continue
      }

      const merged = this.buildMergedLeaf(bucket)
      if (merged) {
        group.add(merged)
        for (const source of bucket.sources) {
          this.disposeLeafGeometry(source)
        }
        bucket.sources.length = 0
        continue
      }

      // Fail-soft: drop baked temps and put originals back.
      this.disposeBucketGeometries(bucket)
      bucket.line2Positions = undefined
      for (const source of bucket.sources) {
        group.add(source)
      }
      bucket.sources.length = 0
    }

    group.updateMatrixWorld(true)
  }

  /**
   * Stable non-origin portion of the compact merge key used to index buckets.
   *
   * @param family - Drawable family.
   * @param materialId - {@link THREE.Material.id}.
   * @param hasIndex - Whether source geometries are indexed.
   * @param attrSignature - Attribute layout signature.
   * @param layerName - Effective layer name.
   * @param authoredLayerName - Authored layer before inheritance.
   * @param bboxIntersectionCheck - Pick-mode flag.
   * @param styleMaterialId - Style-manager material id.
   * @returns Map key shared by origin-compatible candidates.
   */
  private static bucketKey(
    family: DrawableFamily,
    materialId: number,
    hasIndex: boolean,
    attrSignature: string,
    layerName: string,
    authoredLayerName: string | undefined,
    bboxIntersectionCheck: boolean,
    styleMaterialId: number | undefined
  ): string {
    return `${family}|${materialId}|${hasIndex ? 1 : 0}|${attrSignature}|${layerName}|${authoredLayerName ?? ''}|${bboxIntersectionCheck ? 1 : 0}|${styleMaterialId ?? ''}`
  }

  /**
   * Appends `source` into `target` without `push(...source)`, which is slow
   * (and can overflow the argument limit) for large LineSegments2 bakes.
   *
   * @param target - Destination number array.
   * @param source - Values to append.
   */
  private static appendNumbers(target: number[], source: readonly number[]) {
    for (let i = 0; i < source.length; i++) {
      target.push(source[i])
    }
  }

  /**
   * Returns whether `object` is a mergeable flatten leaf drawable.
   *
   * @param object - Candidate direct child of the group.
   * @returns `true` when the object can enter a compact bucket.
   */
  private static isMergeableLeaf(object: THREE.Object3D): boolean {
    if (object instanceof AcTrEntity) {
      return false
    }
    if (object.visible === false) {
      return false
    }
    if (!('geometry' in object) || !('material' in object)) {
      return false
    }
    const drawable = getSceneDrawableUserData(object)
    if (drawable.noBatch || drawable.isPoint) {
      return false
    }
    return true
  }

  /**
   * Resolves the drawable family for one leaf, or `null` when unsupported.
   *
   * @param object - Candidate leaf drawable.
   * @returns Family key, or `null` when the object should stay unmerged.
   */
  private static resolveFamily(object: THREE.Object3D): DrawableFamily | null {
    if (object instanceof LineSegments2) {
      return 'line2'
    }
    if (object instanceof THREE.LineSegments) {
      return 'line'
    }
    if (object instanceof THREE.Mesh) {
      return 'mesh'
    }
    if (object instanceof THREE.Points) {
      return 'points'
    }
    return null
  }

  /**
   * Returns whether the leaf geometry carries an index buffer.
   *
   * @param object - Leaf drawable with a {@link THREE.BufferGeometry}.
   * @returns `true` when an index buffer is present.
   */
  private static hasIndex(object: THREE.Object3D): boolean {
    const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry
    return geometry?.getIndex() != null
  }

  /**
   * Builds a stable attribute-layout signature for merge compatibility.
   *
   * @param object - Leaf drawable whose geometry attributes are hashed.
   * @returns Sorted `name:itemSize:normalized` string.
   */
  private static attributeSignature(object: THREE.Object3D): string {
    const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry
    if (!geometry) {
      return ''
    }
    const names = Object.keys(geometry.attributes).sort()
    return names
      .map(name => {
        const attr = geometry.getAttribute(name)
        return `${name}:${attr.itemSize}:${attr.normalized ? 1 : 0}`
      })
      .join('|')
  }

  /**
   * Finds an existing bucket that can accept `object`, preferring the closest
   * compatible origin.
   *
   * @param buckets - Buckets already created for this compact pass.
   * @param family - Drawable family of the candidate.
   * @param material - Material of the candidate.
   * @param object - Candidate leaf (used for index / attribute signature).
   * @param layerName - Effective layer name.
   * @param authoredLayerName - Authored layer before inheritance, if any.
   * @param bboxIntersectionCheck - Pick-mode flag.
   * @param styleMaterialId - Style-manager material id.
   * @param worldOffset - World-space translation of the candidate.
   * @returns Compatible bucket, or `undefined` when a new one is required.
   */
  private static findCompatibleBucket(
    buckets: CompactBucket[],
    family: DrawableFamily,
    material: THREE.Material,
    object: THREE.Object3D,
    layerName: string,
    authoredLayerName: string | undefined,
    bboxIntersectionCheck: boolean,
    styleMaterialId: number | undefined,
    worldOffset: THREE.Vector3
  ): CompactBucket | undefined {
    const hasIndex = this.hasIndex(object)
    const attrSignature = this.attributeSignature(object)
    let best: CompactBucket | undefined
    let bestDistance = Infinity

    for (const bucket of buckets) {
      if (bucket.family !== family) continue
      if (bucket.material.id !== material.id) continue
      if (bucket.hasIndex !== hasIndex) continue
      if (bucket.attrSignature !== attrSignature) continue
      if (bucket.layerName !== layerName) continue
      if (bucket.authoredLayerName !== authoredLayerName) continue
      if (bucket.bboxIntersectionCheck !== bboxIntersectionCheck) continue
      if (bucket.styleMaterialId !== styleMaterialId) continue
      if (!canMergeIntoBatchOrigin(bucket.origin, worldOffset)) continue

      const distance = Math.max(
        Math.abs(worldOffset.x - bucket.origin.x),
        Math.abs(worldOffset.y - bucket.origin.y),
        Math.abs(worldOffset.z - bucket.origin.z)
      )
      if (distance < bestDistance) {
        bestDistance = distance
        best = bucket
      }
    }
    return best
  }

  /**
   * Clones a standard leaf geometry, bakes its local matrix into vertices, and
   * rebases positions relative to `origin`.
   *
   * @param object - Source leaf (`LineSegments` / `Mesh` / `Points`).
   * @param family - Drawable family (selects index stride for sanitizing).
   * @param origin - Bucket origin to subtract from baked positions.
   * @returns Baked geometry, or `null` when the source cannot be sanitized.
   */
  private static bakeStandardGeometry(
    object: THREE.Object3D,
    family: DrawableFamily,
    origin: THREE.Vector3
  ): THREE.BufferGeometry | null {
    const source = (object as THREE.Mesh).geometry as THREE.BufferGeometry
    if (!source) {
      return null
    }

    const geometry = source.clone()
    AcTrBufferGeometryUtil.tryConvertInterleavedBufferAttributes(geometry)
    const indexStride: 2 | 3 = family === 'mesh' ? 3 : 2

    // Bake full local transform into vertices, then rebase to the bucket origin.
    // Compact runs before INSERT applyMatrix, so matrix matches matrixWorld.
    if (
      !AcTrBufferGeometryUtil.safeApplyMatrix4(
        geometry,
        object.matrix,
        indexStride
      )
    ) {
      geometry.dispose()
      return null
    }

    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    if (!position) {
      geometry.dispose()
      return null
    }
    for (let i = 0; i < position.count; i++) {
      position.setXYZ(
        i,
        position.getX(i) - origin.x,
        position.getY(i) - origin.y,
        position.getZ(i) - origin.z
      )
    }
    position.needsUpdate = true

    if (geometry.hasAttribute('lineDistance')) {
      // Recompute per leaf before merge so dash phase stays entity-local.
      AcTrBufferGeometryUtil.recomputeLineDistanceForLineSegments(geometry)
    }

    return geometry
  }

  /**
   * Bakes {@link LineSegments2} segment endpoints into a flat position array
   * relative to `origin`.
   *
   * @param object - Wide-line leaf.
   * @param origin - Bucket origin to subtract from baked endpoints.
   * @returns Flat `x1,y1,z1,x2,y2,z2,...` array, or `null` when empty/invalid.
   */
  private static bakeLine2Positions(
    object: LineSegments2,
    origin: THREE.Vector3
  ): number[] | null {
    const source = object.geometry as LineSegmentsGeometry
    const instanceStart = source.getAttribute('instanceStart')
    const instanceEnd = source.getAttribute('instanceEnd')
    if (!instanceStart || !instanceEnd) {
      return null
    }

    _matrixNoTranslation.copy(object.matrix)
    _matrixNoTranslation.setPosition(0, 0, 0)
    _translation.setFromMatrixPosition(object.matrix)

    const segmentPositions: number[] = []
    for (let i = 0; i < instanceStart.count; i++) {
      _v1
        .fromBufferAttribute(instanceStart, i)
        .applyMatrix4(_matrixNoTranslation)
      _v2
        .fromBufferAttribute(instanceEnd, i)
        .applyMatrix4(_matrixNoTranslation)
      _v1.add(_translation).sub(origin)
      _v2.add(_translation).sub(origin)
      if (
        !Number.isFinite(_v1.x) ||
        !Number.isFinite(_v1.y) ||
        !Number.isFinite(_v1.z) ||
        !Number.isFinite(_v2.x) ||
        !Number.isFinite(_v2.y) ||
        !Number.isFinite(_v2.z)
      ) {
        continue
      }
      segmentPositions.push(_v1.x, _v1.y, _v1.z, _v2.x, _v2.y, _v2.z)
    }
    return segmentPositions.length >= 6 ? segmentPositions : null
  }

  /**
   * Builds one merged leaf drawable from a filled bucket.
   *
   * @param bucket - Filled compact bucket.
   * @returns Merged leaf, or `null` when the bucket has no usable geometry
   *   or {@link mergeGeometries} fails.
   */
  private static buildMergedLeaf(bucket: CompactBucket): THREE.Object3D | null {
    if (bucket.family === 'line2') {
      const positions = bucket.line2Positions
      if (!positions || positions.length < 6) {
        return null
      }
      const geometry = new LineSegmentsGeometry()
      geometry.setPositions(new Float32Array(positions))
      AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      AcTrBufferGeometryUtil.safeComputeBoundingSphere(geometry)
      const line = new LineSegments2(geometry, bucket.material as never)
      this.applyMergedLeafMetadata(line, bucket)
      return line
    }

    if (bucket.geometries.length === 0) {
      return null
    }

    let geometry: THREE.BufferGeometry | null = null
    if (bucket.geometries.length === 1) {
      geometry = bucket.geometries[0]
      bucket.geometries.length = 0
    } else {
      for (const entry of bucket.geometries) {
        AcTrBufferGeometryUtil.tryConvertInterleavedBufferAttributes(entry)
      }
      geometry = mergeGeometries(bucket.geometries, false)
      // Always release the pre-merge clones; mergeGeometries copies attributes.
      this.disposeBucketGeometries(bucket)
      if (!geometry) {
        return null
      }
    }

    AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    AcTrBufferGeometryUtil.safeComputeBoundingSphere(geometry)

    let object: THREE.Object3D
    if (bucket.family === 'line') {
      object = new THREE.LineSegments(geometry, bucket.material)
    } else if (bucket.family === 'mesh') {
      object = new THREE.Mesh(geometry, bucket.material)
    } else {
      object = new THREE.Points(geometry, bucket.material)
    }
    this.applyMergedLeafMetadata(object, bucket)
    return object
  }

  /**
   * Copies layer / pick / style metadata onto a newly created merged leaf and
   * places it at the bucket origin.
   *
   * @param object - Merged leaf drawable.
   * @param bucket - Source bucket providing metadata and origin.
   */
  private static applyMergedLeafMetadata(
    object: THREE.Object3D,
    bucket: CompactBucket
  ) {
    object.position.copy(bucket.origin)
    object.updateMatrix()

    const objectData = getObjectUserData(object)
    objectData.layerName = bucket.layerName
    if (bucket.authoredLayerName != null) {
      objectData.authoredLayerName = bucket.authoredLayerName
    }

    const drawable = getSceneDrawableUserData(object)
    if (bucket.bboxIntersectionCheck) {
      drawable.bboxIntersectionCheck = true
    }
    if (bucket.styleMaterialId != null) {
      drawable.styleMaterialId = bucket.styleMaterialId
    } else {
      drawable.styleMaterialId = bucket.material.id
    }
  }

  /**
   * Disposes baked geometries owned by `bucket` and clears the list.
   *
   * @param bucket - Bucket whose temporary geometries should be released.
   */
  private static disposeBucketGeometries(bucket: CompactBucket) {
    for (const geometry of bucket.geometries) {
      geometry.dispose()
    }
    bucket.geometries.length = 0
  }

  /**
   * Disposes the geometry buffer on one leaf without touching its material
   * (materials are shared with the style cache and merged leaves).
   *
   * @param object - Leaf whose geometry should be released.
   */
  private static disposeLeafGeometry(object: THREE.Object3D) {
    if ('geometry' in object) {
      const geometry = (object as THREE.Mesh).geometry as
        | THREE.BufferGeometry
        | undefined
      geometry?.dispose()
      ;(object as THREE.Mesh).geometry =
        undefined as unknown as THREE.BufferGeometry
    }
  }
}
