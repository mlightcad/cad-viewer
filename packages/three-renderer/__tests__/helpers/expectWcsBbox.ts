import * as THREE from 'three'

export type WcsBboxCorner = readonly [number, number, number?]

export function expectWcsBboxCloseTo(
  box: THREE.Box3,
  min: WcsBboxCorner,
  max: WcsBboxCorner,
  precision = 5
) {
  expect(box.min.x).toBeCloseTo(min[0], precision)
  expect(box.min.y).toBeCloseTo(min[1], precision)
  expect(box.min.z).toBeCloseTo(min[2] ?? 0, precision)
  expect(box.max.x).toBeCloseTo(max[0], precision)
  expect(box.max.y).toBeCloseTo(max[1], precision)
  expect(box.max.z).toBeCloseTo(max[2] ?? 0, precision)
}

export function expectWcsBboxEmpty(box: THREE.Box3) {
  expect(box.isEmpty()).toBe(true)
}
