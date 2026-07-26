const {
  BufferGeometry,
  BufferAttribute,
  Float32BufferAttribute
} = require('three')

/**
 * Minimal mergeGeometries mock for Jest.
 * Concatenates matching attributes (and optional indices) so unit tests can
 * assert vertex-count conservation after AcTrGroupCompactor runs.
 */
function mergeGeometries(geometries, useGroups = false) {
  if (!geometries || geometries.length === 0) {
    return null
  }
  if (geometries.length === 1) {
    return geometries[0]
  }

  const first = geometries[0]
  const attrNames = Object.keys(first.attributes)
  for (const geometry of geometries) {
    for (const name of attrNames) {
      if (!geometry.getAttribute(name)) {
        return null
      }
    }
  }

  const merged = new BufferGeometry()
  for (const name of attrNames) {
    const itemSize = first.getAttribute(name).itemSize
    const normalized = first.getAttribute(name).normalized
    let total = 0
    for (const geometry of geometries) {
      total += geometry.getAttribute(name).count
    }
    const array = new Float32Array(total * itemSize)
    let offset = 0
    for (const geometry of geometries) {
      const attr = geometry.getAttribute(name)
      const src = attr.array
      array.set(src.subarray(0, attr.count * itemSize), offset)
      offset += attr.count * itemSize
    }
    merged.setAttribute(
      name,
      normalized
        ? new BufferAttribute(array, itemSize, true)
        : new Float32BufferAttribute(array, itemSize)
    )
  }

  const firstIndex = first.getIndex()
  if (firstIndex) {
    let totalIndices = 0
    let vertexOffset = 0
    for (const geometry of geometries) {
      const index = geometry.getIndex()
      if (!index) {
        return null
      }
      totalIndices += index.count
    }
    const IndexArray = totalIndices > 65535 ? Uint32Array : Uint16Array
    const indices = new IndexArray(totalIndices)
    let indexOffset = 0
    vertexOffset = 0
    for (const geometry of geometries) {
      const index = geometry.getIndex()
      const position = geometry.getAttribute('position')
      for (let i = 0; i < index.count; i++) {
        indices[indexOffset++] = index.getX(i) + vertexOffset
      }
      vertexOffset += position.count
    }
    merged.setIndex(new BufferAttribute(indices, 1))
  }

  void useGroups
  return merged
}

module.exports = {
  mergeGeometries
}
