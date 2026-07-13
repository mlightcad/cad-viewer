const THREE = require('three')

class LineSegments2 extends THREE.Mesh {
  constructor(geometry = new THREE.BufferGeometry(), material = null) {
    super(geometry, material)
  }
}

module.exports = { LineSegments2 }
