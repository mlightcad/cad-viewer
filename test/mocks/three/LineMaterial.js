class MockColor {
  constructor(hex = 0xffffff) {
    this._hex = hex
  }

  set(hex) {
    this._hex = hex
    return this
  }

  getHex() {
    return this._hex
  }
}

class LineMaterial {
  static _nextId = 1

  constructor(parameters = {}) {
    this.id = LineMaterial._nextId++
    this.userData = {}
    this.color = new MockColor(parameters.color ?? 0xffffff)
    this.linewidth = parameters.linewidth ?? 1
    this.resolution = {
      x: 1,
      y: 1,
      copy: value => {
        this.resolution.x = value.x
        this.resolution.y = value.y
        return this.resolution
      }
    }
  }

  clone() {
    const cloned = new LineMaterial({
      color: this.color.getHex(),
      linewidth: this.linewidth
    })
    cloned.userData = { ...this.userData }
    cloned.resolution.copy(this.resolution)
    return cloned
  }

  dispose() {}
}

module.exports = { LineMaterial }
