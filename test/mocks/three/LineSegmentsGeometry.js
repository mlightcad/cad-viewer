const THREE = require('three')

class LineSegmentsGeometry extends THREE.BufferGeometry {
  setPositions(positions) {
    const array =
      positions instanceof Float32Array ? positions : new Float32Array(positions)
    const buffer = new THREE.InterleavedBuffer(array, 6)
    this.setAttribute(
      'instanceStart',
      new THREE.InterleavedBufferAttribute(buffer, 3, 0)
    )
    this.setAttribute(
      'instanceEnd',
      new THREE.InterleavedBufferAttribute(buffer, 3, 3)
    )
    return this
  }
}

module.exports = { LineSegmentsGeometry }
