const THREE = require('three')

class LineSegments2 extends THREE.Object3D {
  constructor(geometry = new THREE.BufferGeometry(), material = null) {
    super()
    this.geometry = geometry
    this.material = material
  }
}

module.exports = { LineSegments2 }
