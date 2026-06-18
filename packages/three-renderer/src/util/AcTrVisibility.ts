import * as THREE from 'three'

/**
 * Returns false when the object or any ancestor has `visible === false`.
 */
export function isObjectHierarchyVisible(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object
  while (node) {
    if (node.visible === false) {
      return false
    }
    node = node.parent
  }
  return true
}
