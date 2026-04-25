const THREE = require('three')

class CSS2DObject extends THREE.Object3D {
  constructor(element = null) {
    super()
    this.element = element
  }
}

module.exports = { CSS2DObject }
