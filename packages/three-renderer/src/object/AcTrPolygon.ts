import {
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

export class AcTrPolygon extends AcTrEntity {
  private _traits: AcGiSubEntityTraits

  constructor(
    area: AcGeArea2d,
    traits: AcGiSubEntityTraits,
    context: AcTrRenderContext
  ) {
    super(context)
    this._traits = traits

    const pointBoundaries = area.getPoints(100)
    const hierarchy = area.buildHierarchy()
    const hasRenderableBoundaries = pointBoundaries.some(
      loop => loop.length >= 3
    )

    const geometries: THREE.BufferGeometry[] = []
    this.buildHatchGeometry(pointBoundaries, hierarchy, geometries)

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
      this.wcsBbox = boundingBox

      this.addGradientPositionAttribute(geometry, traits)

      const gradientBounds = {
        minX: this.wcsBbox.min.x,
        minY: this.wcsBbox.min.y,
        maxX: this.wcsBbox.max.x,
        maxY: this.wcsBbox.max.y
      }
      const material = this.styleManager.getFillMaterial(
        traits,
        undefined,
        gradientBounds
      )
      const mesh = new THREE.Mesh(geometry, material)
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
      // merge holes
      let mergedHoles: {
        regions: number[][][]
        inverted: boolean
      } = {
        regions: [],
        inverted: false
      }
      const needMergeHolesArr = this.findIntersectHole(pointBoundaries, pair[1])
      needMergeHolesArr.forEach(mergeArr => {
        let seg1: Segments = {
          segments: [],
          inverted: false
        }
        let epsilon = 1e-6
        try {
          // maybe mulit holes intersect
          mergeArr.forEach((index, ix) => {
            epsilon = Math.min(pointBoundaries[index][0].relativeEps(), 1e-6)
            const polybool = new PolyBool(new GeometryEpsilon(epsilon))

            if (ix === 0) {
              seg1 = polybool.segments({
                regions: [vec2Array(pointBoundaries[index])],
                inverted: false
              })
            } else {
              const seg2 = polybool.segments({
                regions: [vec2Array(pointBoundaries[index])],
                inverted: false
              })
              const comb = polybool.combine(seg1, seg2)
              mergedHoles = polybool.polygon(polybool.selectUnion(comb))

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
              } else {
                log.warn('mergedHoles.regions is empty!')
              }
            }
          })
        } catch (error) {
          log.warn(`Polybool error: ${error}, epsilon is ${epsilon}`)
        }
      })
      const ignoreHoleIndexArr = needMergeHolesArr.flat(2)
      // needn't be merged hole
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

  private findIntersectHole(
    pointBoundaries: AcGePoint2dLike[][],
    indexArr: number[]
  ) {
    const len = indexArr.length
    const holeIndexArr = []
    for (let i = 0; i < len; i++) {
      const points1 = pointBoundaries[indexArr[i]]
      let needMerge = false
      const mergeHoleIndexArr = []
      for (let j = i + 1; j < len; j++) {
        const points2 = pointBoundaries[indexArr[j]]
        const isPolygonIntersect = AcGeGeometryUtil.isPolygonIntersect(
          points1,
          points2
        )
        if (isPolygonIntersect) {
          needMerge = true
          mergeHoleIndexArr.push(indexArr[j])
        }
      }
      if (needMerge) {
        mergeHoleIndexArr.push(indexArr[i])
        holeIndexArr.push(mergeHoleIndexArr)
      }
    }
    return holeIndexArr
  }
}
