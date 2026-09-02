const THREE = require('three')

const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()

class LineSegments2 extends THREE.Mesh {
  constructor(geometry = new THREE.BufferGeometry(), material = null) {
    super(geometry, material)
  }

  // Mirrors three.js LineSegments2.computeLineDistances(): writes cumulative
  // instanceDistanceStart/End attributes used by dashed LineMaterial.
  computeLineDistances() {
    const geometry = this.geometry
    const instanceStart = geometry.attributes.instanceStart
    const instanceEnd = geometry.attributes.instanceEnd
    if (!instanceStart || !instanceEnd) {
      return this
    }
    const lineDistances = new Float32Array(2 * instanceStart.count)
    for (let i = 0, j = 0; i < instanceStart.count; i++, j += 2) {
      _v1.fromBufferAttribute(instanceStart, i)
      _v2.fromBufferAttribute(instanceEnd, i)
      lineDistances[j] = j === 0 ? 0 : lineDistances[j - 1]
      lineDistances[j + 1] = lineDistances[j] + _v1.distanceTo(_v2)
    }
    const instanceBuffer = new THREE.InstancedInterleavedBuffer(
      lineDistances,
      2,
      1
    )
    geometry.setAttribute(
      'instanceDistanceStart',
      new THREE.InterleavedBufferAttribute(instanceBuffer, 1, 0)
    )
    geometry.setAttribute(
      'instanceDistanceEnd',
      new THREE.InterleavedBufferAttribute(instanceBuffer, 1, 1)
    )
    return this
  }
}

module.exports = { LineSegments2 }
