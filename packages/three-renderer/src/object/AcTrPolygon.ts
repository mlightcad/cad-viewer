import {
  AcGeArea2d,
  AcGeGeometryUtil,
  AcGeIndexNode,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import { GeometryEpsilon, PolyBool, Segments } from '@velipso/polybool'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrEntity } from './AcTrEntity'

export class AcTrPolygon extends AcTrEntity {
  constructor(
    area: AcGeArea2d,
    traits: AcGiSubEntityTraits,
    styleManager: AcTrStyleManager
  ) {
    super(styleManager)

    const pointBoundaries = area.getPoints(100)
    const hierarchy = area.buildHierarchy()

    const geometries: THREE.BufferGeometry[] = []
    this.buildHatchGeometry(pointBoundaries, hierarchy, geometries)

    let geometry: THREE.BufferGeometry | undefined
    if (geometries.length > 0) {
      geometry = mergeGeometries(geometries)
    }

    if (!geometry || !geometry.getIndex() || geometry.getIndex()?.count === 0) {
      console.warn('Failed to convert hatch boundaries!')
    } else {
      geometry.computeBoundingBox()
      this.box = geometry.boundingBox!

      const material = this.styleManager.getFillMaterial(traits)
      this.add(new THREE.Mesh(geometry, material))
    }
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
        if (geom.hasAttribute('uv')) {
          geom.deleteAttribute('uv')
        }
        if (geom.hasAttribute('normal')) {
          geom.deleteAttribute('normal')
        }
        geometries.push(geom)
      } catch (_error) {
        console.warn(
          `Triangulate shape error: ${shape
            .getPoints()
            .map(v => v.toArray())
            .toString()}`
        )
      }
    }

    noHoles.forEach(index => {
      const points = pointBoundaries[index]
      if (points.length === 0) {
        return
      }
      const shape = new THREE.Shape(points as unknown as THREE.Vector2[])
      createGeometry(shape)
    })

    const vec2Array = (vecs: AcGePoint2d[]) =>
      vecs.map(p => p.toArray() as [number, number])

    for (const pair of holes) {
      const shape = new THREE.Shape(
        pointBoundaries[pair[0]] as unknown as THREE.Vector2[]
      )
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
                console.warn('mergedHoles.regions is empty!')
              }
            }
          })
        } catch (error) {
          console.warn(`Polybool error: ${error}, epsilon is ${epsilon}`)
        }
      })
      const ignoreHoleIndexArr = needMergeHolesArr.flat(2)
      // needn't be merged hole
      for (let i = 0; i < pair[1].length; i++) {
        const idx = pair[1][i]
        if (!ignoreHoleIndexArr.includes(idx)) {
          shape.holes.push(
            new THREE.Path(pointBoundaries[idx] as unknown as THREE.Vector2[])
          )
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
