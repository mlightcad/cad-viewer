class OrbitControls {
  constructor() {
    this.enabled = true
    this.target = { x: 0, y: 0, z: 0, set: () => {} }
  }

  addEventListener() {}
  update() {}
  dispose() {}
}

module.exports = { OrbitControls }
