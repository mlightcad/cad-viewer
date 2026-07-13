import { AcGePoint3dLike } from '@mlightcad/data-model'
import * as THREE from 'three'

/**
 * The coordinates of the 25 points tessellating the circle with center (0,0) and radius 0.5
 */
const circlePointData = [
  0.5, 0, 0, 0.48429158056431554, -0.1243449435824274, 0, 0.4381533400219318,
  -0.24087683705085766, 0, 0.3644843137107058, -0.3422735529643443, 0,
  0.2679133974894983, -0.42216396275100754, 0, 0.15450849718747373,
  -0.47552825814757677, 0, 0.03139525976465676, -0.4990133642141358, 0,
  -0.09369065729286241, -0.4911436253643443, 0, -0.21288964578253636,
  -0.45241352623300973, 0, -0.3187119948743449, -0.3852566213878946, 0,
  -0.40450849718747367, -0.2938926261462366, 0, -0.4648882429441257,
  -0.18406227634233907, 0, -0.4960573506572389, -0.06266661678215227, 0,
  -0.49605735065723894, 0.06266661678215214, 0, -0.4648882429441256,
  0.18406227634233915, 0, -0.4045084971874738, 0.2938926261462365, 0,
  -0.31871199487434476, 0.3852566213878947, 0, -0.21288964578253608,
  0.4524135262330099, 0, -0.09369065729286231, 0.49114362536434436, 0,
  0.031395259764656416, 0.4990133642141358, 0, 0.15450849718747361,
  0.4755282581475768, 0, 0.267913397489498, 0.42216396275100776, 0,
  0.3644843137107056, 0.3422735529643445, 0, 0.4381533400219318,
  0.24087683705085766, 0, 0.4842915805643155, 0.12434494358242767, 0, 0.5, 0, 0
]

const circlePointIndexData = [
  0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12,
  12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21,
  22, 22, 23, 23, 24, 24, 25
]

type AcTrPointSymbolData = Map<
  number,
  { position: Float32Array; indices: Uint16Array }
>
type AcTrPointSymbolGeometries = Map<number, THREE.BufferGeometry>

/**
 * Please read the following page to get point type picture.
 * https://help.autodesk.com/view/ACDLT/2022/ENU/?guid=GUID-82F9BB52-D026-4D6A-ABA6-BF29641F459B
 */
const pointTypeData: AcTrPointSymbolData = new Map([
  [
    2,
    {
      position: new Float32Array([-1, 0, 0, 1, 0, 0, 0, -1, 0, 0, 1, 0]),
      indices: new Uint16Array([0, 1, 2, 3])
    }
  ],
  [
    3,
    {
      position: new Float32Array([
        -Math.SQRT1_2,
        Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        -Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        Math.SQRT1_2,
        0
      ]),
      indices: new Uint16Array([0, 1, 2, 3])
    }
  ],
  [
    4,
    {
      position: new Float32Array([0, 0, 0, 0, 0.5, 0]),
      indices: new Uint16Array([0, 1, 2, 3])
    }
  ],
  [
    32,
    {
      position: new Float32Array(circlePointData),
      indices: new Uint16Array(circlePointIndexData)
    }
  ],
  [
    33,
    {
      position: new Float32Array(circlePointData),
      indices: new Uint16Array(circlePointIndexData)
    }
  ],
  [
    34,
    {
      position: new Float32Array([
        ...circlePointData,
        -1,
        0,
        0,
        1,
        0,
        0,
        0,
        -1,
        0,
        0,
        1,
        0
      ]),
      indices: new Uint16Array([...circlePointIndexData, 26, 27, 28, 29])
    }
  ],
  [
    35,
    {
      position: new Float32Array([
        ...circlePointData,
        -Math.SQRT1_2,
        Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        -Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        Math.SQRT1_2,
        0
      ]),
      indices: new Uint16Array([...circlePointIndexData, 26, 27, 28, 29])
    }
  ],
  [
    36,
    {
      position: new Float32Array([...circlePointData, 0, 0, 0, 0, 0.5, 0]),
      indices: new Uint16Array([...circlePointIndexData, 26, 27])
    }
  ],
  [
    64,
    {
      position: new Float32Array([
        -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0, -0.5, 0.5, 0
      ]),
      indices: new Uint16Array([0, 1, 1, 2, 2, 3, 3, 4])
    }
  ],
  [
    65,
    {
      position: new Float32Array([
        -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0, -0.5, 0.5, 0
      ]),
      indices: new Uint16Array([0, 1, 1, 2, 2, 3, 3, 4])
    }
  ],
  [
    66,
    {
      position: new Float32Array([
        -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0, -0.5, 0.5, 0,
        -1, 0, 0, 1, 0, 0, 0, -1, 0, 0, 1, 0
      ]),
      indices: new Uint16Array([0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8])
    }
  ],
  [
    67,
    {
      position: new Float32Array([
        -0.5,
        0.5,
        0,
        0.5,
        0.5,
        0,
        0.5,
        -0.5,
        0,
        -0.5,
        -0.5,
        0,
        -Math.SQRT1_2,
        Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        -Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        Math.SQRT1_2,
        0
      ]),
      indices: new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 6, 7])
    }
  ],
  [
    68,
    {
      position: new Float32Array([
        -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0, -0.5, 0.5, 0, 0,
        0, 0, 0, 0.5, 0
      ]),
      indices: new Uint16Array([0, 1, 1, 2, 2, 3, 3, 4, 5, 6])
    }
  ],
  [
    96,
    {
      position: new Float32Array([
        ...circlePointData,
        -0.5,
        0.5,
        0,
        0.5,
        0.5,
        0,
        0.5,
        -0.5,
        0,
        -0.5,
        -0.5,
        0
      ]),
      indices: new Uint16Array([
        ...circlePointIndexData,
        26,
        27,
        27,
        28,
        28,
        29,
        29,
        26
      ])
    }
  ],
  [
    97,
    {
      position: new Float32Array([
        ...circlePointData,
        -0.5,
        0.5,
        0,
        0.5,
        0.5,
        0,
        0.5,
        -0.5,
        0,
        -0.5,
        -0.5,
        0,
        -0.5,
        0.5,
        0
      ]),
      indices: new Uint16Array([
        ...circlePointIndexData,
        26,
        27,
        27,
        28,
        28,
        29,
        29,
        30
      ])
    }
  ],
  [
    98,
    {
      position: new Float32Array([
        ...circlePointData,
        -0.5,
        0.5,
        0,
        0.5,
        0.5,
        0,
        0.5,
        -0.5,
        0,
        -0.5,
        -0.5,
        0,
        -0.5,
        0.5,
        0,
        -1,
        0,
        0,
        1,
        0,
        0,
        0,
        -1,
        0,
        0,
        1,
        0
      ]),
      indices: new Uint16Array([
        ...circlePointIndexData,
        26,
        27,
        27,
        28,
        28,
        29,
        29,
        30,
        31,
        32,
        33,
        34
      ])
    }
  ],
  [
    99,
    {
      position: new Float32Array([
        ...circlePointData,
        -0.5,
        0.5,
        0,
        0.5,
        0.5,
        0,
        0.5,
        -0.5,
        0,
        -0.5,
        -0.5,
        0,
        -Math.SQRT1_2,
        Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        -Math.SQRT1_2,
        -Math.SQRT1_2,
        0,
        Math.SQRT1_2,
        Math.SQRT1_2,
        0
      ]),
      indices: new Uint16Array([
        ...circlePointIndexData,
        26,
        27,
        27,
        28,
        28,
        29,
        29,
        26,
        30,
        31,
        32,
        33
      ])
    }
  ],
  [
    100,
    {
      position: new Float32Array([
        ...circlePointData,
        -0.5,
        0.5,
        0,
        0.5,
        0.5,
        0,
        0.5,
        -0.5,
        0,
        -0.5,
        -0.5,
        0,
        -0.5,
        0.5,
        0,
        0,
        0,
        0,
        0,
        0.5,
        0
      ]),
      indices: new Uint16Array([
        ...circlePointIndexData,
        26,
        27,
        27,
        28,
        28,
        29,
        29,
        30,
        31,
        32
      ])
    }
  ]
])

export interface AcTrPointSymbolGeometry {
  line?: THREE.BufferGeometry
  point?: THREE.BufferGeometry
}

/**
 * Internal class used to create point style geometry
 * @internal
 */
export class AcTrPointSymbolCreator {
  private static _instance?: AcTrPointSymbolCreator
  private _symbols: AcTrPointSymbolGeometries

  private constructor() {
    this._symbols = this.initialize()
  }

  static get instance() {
    if (!AcTrPointSymbolCreator._instance) {
      AcTrPointSymbolCreator._instance = new AcTrPointSymbolCreator()
    }
    return AcTrPointSymbolCreator._instance
  }

  /**
   * Return true if showing one point using THREE.Points
   */
  isShowPoint(displayMode: number | null = null) {
    return (
      displayMode == null ||
      displayMode == 0 ||
      displayMode == 32 ||
      displayMode == 64 ||
      displayMode == 96
    )
  }

  create(
    displayMode: number | null = null,
    _point: AcGePoint3dLike = { x: 0, y: 0, z: 0 }
  ): AcTrPointSymbolGeometry {
    const result: AcTrPointSymbolGeometry = {}
    if (displayMode == null || displayMode == 0) {
      result.point = new THREE.BufferGeometry().setFromPoints([_originPoint])
    } else if (displayMode == 1) {
      // Display nothing if the pdmode is equal to 1
    } else {
      const pointSymbolGeometry = this._symbols.get(displayMode)
      if (pointSymbolGeometry == null) {
        throw new Error(
          `[AcTrPointSymbolCreator] Invalid point type value: '${displayMode}'!`
        )
      } else {
        result.line = pointSymbolGeometry.clone()

        // For those display mode, there is one point at the center of point symbol
        if (displayMode == 32 || displayMode == 64 || displayMode == 96) {
          result.point = new THREE.BufferGeometry().setFromPoints([
            _originPoint
          ])
        }
      }
    }
    return result
  }

  private initialize() {
    const results: AcTrPointSymbolGeometries = new Map()
    pointTypeData.forEach((lines, index) => {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(lines.position, 3)
      )
      geometry.setIndex(new THREE.BufferAttribute(lines.indices, 1))
      results.set(index, geometry)
    })
    return results
  }
}

const _originPoint = /*@__PURE__*/ new THREE.Vector3(0, 0, 0)
