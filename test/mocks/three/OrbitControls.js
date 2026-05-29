class OrbitControls {
  constructor() {
    this.enabled = true
    this.target = { set: () => {} }
  }

  update() {}
  dispose() {}
}

module.exports = { OrbitControls }
