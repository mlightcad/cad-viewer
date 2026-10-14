import {
  acdbDrawTessellateOptions,
  AcGeArea2d,
  AcGeGeometryUtil,
  AcGeIndexNode,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGiSubEntityTraits,
  log
} from '@mlightcad/data-model'
import { GeometryEpsilon, PolyBool, Segments } from '@velipso/polybool'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { resolveAnchorFromBox } from '../draw/AcTrBatchDrawPolicy'
import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import { AcTrEntity } from './AcTrEntity'

function toVector2(points: AcGePoint2dLike[]): THREE.Vector2[] {
  return points
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map(point => new THREE.Vector2(point.x, point.y))
}

function hasFillVertices(geometry: THREE.BufferGeometry | undefined): boolean {
  if (!geometry) {
    return false
  }
  const position = geometry.getAttribute('position')
  return !!position && position.count > 0
}

/**
 * Bounding-box center of tessellated hatch loops in float64 WCS.
 * Used as the origin-shift for patterned hatches so GPU float32 pattern math
 * (`fract` / `floor` on `v_pos`) stays precise at large survey coordinates.
 */
function computeLocalOriginFromLoops(
  loops: AcGePoint2dLike[][]
): THREE.Vector3 | undefined {
  const box = new THREE.Box3()
  let hasPoint = false
  for (const loop of loops) {
    for (const point of loop) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        continue
      }
      box.expandByPoint(_tmpPoint.set(point.x, point.y, 0))
      hasPoint = true
    }
  }
  if (!hasPoint || box.isEmpty()) {
    return undefined
  }
  return box.getCenter(new THREE.Vector3())
}

/** Returns hatch loops translated so `origin` becomes the local (0,0). */
function offsetLoops(
  loops: AcGePoint2d[][],
  origin: THREE.Vector3
): AcGePoint2d[][] {
  return loops.map(loop =>
    loop.map(
      point => new AcGePoint2d(point.x - origin.x, point.y - origin.y)
    )
  )
}

const _tmpPoint = /*@__PURE__*/ new THREE.Vector3()

export class AcTrPolygon extends AcTrEntity {
  private _traits: AcGiSubEntityTraits

  constructor(
    area: AcGeArea2d,
    traits: AcGiSubEntityTraits,
    context: AcTrRenderContext
  ) {
    super(context)
    this._traits = traits

    const tessellateOptions = acdbDrawTessellateOptions({ context })
    const pointBoundaries = area.tessellate(tessellateOptions)
    // Reuse sampled loops so buildHierarchy does not tessellate a second time.
    const hierarchy = (
      Object.create(area, {
        tessellate: { value: () => pointBoundaries }
      }) as AcGeArea2d
    ).buildHierarchy(tessellateOptions)
    const hasRenderableBoundaries = pointBoundaries.some(
      loop => loop.length >= 3
    )

    // Offset tessellated loops in float64 *before* THREE.ShapeGeometry writes
    // Float32Array positions. At |x| ≈ 3.85e7 the float32 ULP is ~4 drawing
    // units, so a wide-polyline half-width of 1.05 collapses if WCS is stored
    // first and rebased afterwards (cad-viewer#724). Patterned hatches also
    // sample object-space `position` in the fragment shader, so the same
    // origin-shift keeps `fract`/`floor` precise.
    const localOrigin = computeLocalOriginFromLoops(pointBoundaries)
    const boundariesForGeometry = localOrigin
      ? offsetLoops(pointBoundaries, localOrigin)
      : pointBoundaries

    const geometries: THREE.BufferGeometry[] = []
    this.buildHatchGeometry(boundariesForGeometry, hierarchy, geometries)

    let geometry: THREE.BufferGeometry | undefined
    if (geometries.length === 1) {
      geometry = geometries[0]
    } else if (geometries.length > 1) {
      geometry = mergeGeometries(geometries) ?? undefined
    }

    if (geometry && hasFillVertices(geometry)) {
      const boundingBox =
        AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (!boundingBox) {
        log.warn('Skipped hatch fill with invalid geometry coordinates')
        geometry.dispose()
        return
      }
      this.wcsBbox = localOrigin
        ? boundingBox.clone().translate(localOrigin)
        : boundingBox

      this.addGradientPositionAttribute(geometry, traits)

      const gradientBounds = {
        minX: this.wcsBbox.min.x,
        minY: this.wcsBbox.min.y,
        maxX: this.wcsBbox.max.x,
        maxY: this.wcsBbox.max.y
      }
      const rebaseOffset = localOrigin
        ? new THREE.Vector2(localOrigin.x, localOrigin.y)
        : undefined
      const material = this.styleManager.getFillMaterial(
        traits,
        rebaseOffset,
        gradientBounds
      )
      const mesh = new THREE.Mesh(geometry, material)
      if (localOrigin) {
        mesh.position.set(localOrigin.x, localOrigin.y, localOrigin.z)
      }
      this.add(mesh)
      this.finalizeLeafDrawables()
    } else if (hasRenderableBoundaries) {
      log.warn('Failed to convert hatch boundaries!')
    }
  }

  override resolveDrawMode(): AcTrDrawMode {
    if (this.isPatternedHatch(this._traits)) {
      return 'unbatch'
    }
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.wcsBbox)
    })
  }

  private isPatternedHatch(traits: AcGiSubEntityTraits) {
    const style = traits.fillType
    return !style.gradient && !!style.definitionLines?.length
  }

  private addGradientPositionAttribute(
    geometry: THREE.BufferGeometry,
    traits: AcGiSubEntityTraits
  ) {
    if (!traits.fillType.gradient || !geometry.boundingBox) {
      return
    }

    const position = geometry.getAttribute('position')
    if (!position) {
      return
    }

    const box = geometry.boundingBox
    const centerX = (box.min.x + box.max.x) * 0.5
    const centerY = (box.min.y + box.max.y) * 0.5
    const halfWidth = Math.max((box.max.x - box.min.x) * 0.5, 1e-9)
    const halfHeight = Math.max((box.max.y - box.min.y) * 0.5, 1e-9)
    const values = new Float32Array(position.count * 2)

    for (let index = 0; index < position.count; index++) {
      values[index * 2] = (position.getX(index) - centerX) / halfWidth
      values[index * 2 + 1] = (position.getY(index) - centerY) / halfHeight
    }

    geometry.setAttribute(
      'gradientPosition',
      new THREE.BufferAttribute(values, 2)
    )
  }

  private buildHatchGeometry(
    pointBoundaries: AcGePoint2d[][],
    node: AcGeIndexNode,
    geometries: THREE.BufferGeometry[]
  ) {
    if (node.children.length === 0) {
      return
    }
    const noHoles: number[] = []
    const holes = new Map<number, number[]>()
    node.children.forEach(child => {
      if (child.children.length === 0) {
        noHoles.push(child.index)
      } else {
        holes.set(
          child.index,
          child.children.map(child => child.index)
        )
      }
    })

    const createGeometry = (shape: THREE.Shape) => {
      try {
        const geom = new THREE.ShapeGeometry(shape)
        if (!AcTrBufferGeometryUtil.hasFinitePositions(geom)) {
          geom.dispose()
          return
        }
        if (geom.hasAttribute('uv')) {
          geom.deleteAttribute('uv')
        }
        if (geom.hasAttribute('normal')) {
          geom.deleteAttribute('normal')
        }
        geometries.push(geom)
      } catch (_error) {
        log.warn(
          `Triangulate shape error: ${shape
            .getPoints()
            .map(v => v.toArray())
            .toString()}`
        )
      }
    }

    noHoles.forEach(index => {
      const points = pointBoundaries[index]
      if (points.length < 3) {
        return
      }
      const shape = new THREE.Shape(toVector2(points))
      createGeometry(shape)
    })

    const vec2Array = (vecs: AcGePoint2d[]) =>
      vecs.map(p => p.toArray() as [number, number])

    for (const pair of holes) {
      const outerPoints = pointBoundaries[pair[0]]
      if (outerPoints.length < 3) {
        continue
      }
      const shape = new THREE.Shape(toVector2(outerPoints))
      // Merge overlapping holes into connected components so ShapeGeometry
      // (earcut) never receives overlapping hole paths (#744).
      const needMergeHolesArr = this.findIntersectHole(pointBoundaries, pair[1])
      needMergeHolesArr.forEach(mergeArr => {
        const validHoles = mergeArr.filter(
          index => pointBoundaries[index].length >= 3
        )
        let epsilon = 1e-6
        let mergedOk = false
        try {
          if (validHoles.length === 0) {
            // nothing to merge
          } else if (validHoles.length === 1) {
            shape.holes.push(
              new THREE.Path(toVector2(pointBoundaries[validHoles[0]]))
            )
            mergedOk = true
          } else {
            // One epsilon / PolyBool for the whole component — mixing
            // GeometryEpsilon across segment build and combine is unreliable.
            epsilon = Math.min(
              ...validHoles.map(index =>
                pointBoundaries[index][0].relativeEps()
              ),
              1e-6
            )
            const polybool = new PolyBool(new GeometryEpsilon(epsilon))
            let acc = polybool.segments({
              regions: [vec2Array(pointBoundaries[validHoles[0]])],
              inverted: false
            })
            for (let i = 1; i < validHoles.length; i++) {
              const next = polybool.segments({
                regions: [vec2Array(pointBoundaries[validHoles[i]])],
                inverted: false
              })
              // Fold into the running union, not only against the first loop.
              acc = polybool.selectUnion(polybool.combine(acc, next))
            }
            const mergedHoles = polybool.polygon(acc)
            if (mergedHoles.regions.length > 0) {
              mergedHoles.regions.forEach((ps: number[][]) => {
                if (ps.length === 0) {
                  return
                }
                const vec2s = ps.map(
                  (p: number[]) => new THREE.Vector2(p[0], p[1])
                )
                shape.holes.push(new THREE.Path(vec2s))
              })
              mergedOk = true
            } else {
              log.warn('mergedHoles.regions is empty!')
            }
          }
        } catch (error) {
          log.warn(`Polybool error: ${error}, epsilon is ${epsilon}`)
        }
        // Failed or empty union: keep openings open with the original loops
        // instead of dropping the whole component.
        if (!mergedOk) {
          for (const index of validHoles) {
            shape.holes.push(
              new THREE.Path(toVector2(pointBoundaries[index]))
            )
          }
        }
      })
      const ignoreHoleIndexArr = needMergeHolesArr.flat()
      // Non-overlapping holes stay as-is.
      for (let i = 0; i < pair[1].length; i++) {
        const idx = pair[1][i]
        if (!ignoreHoleIndexArr.includes(idx)) {
          const holePoints = pointBoundaries[idx]
          if (holePoints.length < 3) {
            continue
          }
          shape.holes.push(new THREE.Path(toVector2(holePoints)))
        }
      }
      createGeometry(shape)
    }

    node.children.forEach(child => {
      child.children.forEach(grandchild => {
        this.buildHatchGeometry(pointBoundaries, grandchild, geometries)
      })
    })
  }

  /**
   * Group hole indices into connected components under pairwise intersection.
   * Only components with two or more holes are returned (those need a boolean
   * union before triangulation).
   */
  private findIntersectHole(
    pointBoundaries: AcGePoint2dLike[][],
    indexArr: number[]
  ): number[][] {
    const len = indexArr.length
    if (len < 2) {
      return []
    }

    const parent = Array.from({ length: len }, (_, i) => i)
    const find = (i: number): number => {
      let root = i
      while (parent[root] !== root) {
        root = parent[root]
      }
      let cur = i
      while (parent[cur] !== root) {
        const next = parent[cur]
        parent[cur] = root
        cur = next
      }
      return root
    }
    const unite = (a: number, b: number) => {
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) {
        parent[rb] = ra
      }
    }

    for (let i = 0; i < len; i++) {
      const points1 = pointBoundaries[indexArr[i]]
      for (let j = i + 1; j < len; j++) {
        const points2 = pointBoundaries[indexArr[j]]
        if (AcGeGeometryUtil.isPolygonIntersect(points1, points2)) {
          unite(i, j)
        }
      }
    }

    const components = new Map<number, number[]>()
    for (let i = 0; i < len; i++) {
      const root = find(i)
      let group = components.get(root)
      if (!group) {
        group = []
        components.set(root, group)
      }
      group.push(indexArr[i])
    }

    return Array.from(components.values()).filter(group => group.length > 1)
  }
}
