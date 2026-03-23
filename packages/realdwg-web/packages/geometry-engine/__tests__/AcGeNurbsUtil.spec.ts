import {
  generateUniformKnots,
  generateChordKnots,
  generateSqrtChordKnots,
  basisFunction,
  evaluateNurbsPoint,
  calculateCurveLength,
  interpolateControlPoints
} from '../src/util/AcGeNurbsUtil'

describe('AcGeNurbsUtil', () => {
  describe('generateUniformKnots', () => {
    it('should generate uniform knots for degree 3 with 4 control points', () => {
      const knots = generateUniformKnots(3, 4)
      expect(knots).toEqual([0, 0, 0, 0, 1, 1, 1, 1])
    })

    it('should generate uniform knots for degree 2 with 5 control points', () => {
      const knots = generateUniformKnots(2, 5)
      expect(knots).toEqual([0, 0, 0, 1, 2, 3, 3, 3])
    })

    it('should generate uniform knots for degree 1 with 3 control points', () => {
      const knots = generateUniformKnots(1, 3)
      expect(knots).toEqual([0, 0, 1, 2, 2])
    })
  })

  describe('generateChordKnots', () => {
    it('should generate chord parameterized knots', () => {
      const points = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]
      const knots = generateChordKnots(3, points)

      expect(knots).toHaveLength(8)
      expect(knots[0]).toBe(0)
      expect(knots[1]).toBe(0)
      expect(knots[2]).toBe(0)
      expect(knots[3]).toBe(0)
      expect(knots[4]).toBeGreaterThan(0)
      expect(knots[5]).toBeGreaterThan(0)
      expect(knots[6]).toBe(1)
      expect(knots[7]).toBe(1)
    })

    it('should handle points with different distances', () => {
      const points = [
        [0, 0, 0],
        [1, 0, 0], // distance 1
        [3, 0, 0], // distance 2
        [6, 0, 0] // distance 3
      ]
      const knots = generateChordKnots(3, points)

      // Total length is 6, so middle knots should be proportional
      expect(knots[4]).toBeGreaterThan(0)
      expect(knots[5]).toBeGreaterThan(0)
    })
  })

  describe('generateSqrtChordKnots', () => {
    it('should generate sqrt chord parameterized knots', () => {
      const points = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]
      const knots = generateSqrtChordKnots(3, points)

      expect(knots).toHaveLength(8)
      expect(knots[0]).toBe(0)
      expect(knots[1]).toBe(0)
      expect(knots[2]).toBe(0)
      expect(knots[3]).toBe(0)
      expect(knots[4]).toBeGreaterThan(0)
      expect(knots[5]).toBeGreaterThan(0)
      expect(knots[6]).toBe(1)
      expect(knots[7]).toBe(1)
    })
  })

  describe('basisFunction', () => {
    it('should return 1 for degree 0 when parameter is in range', () => {
      const knots = [0, 1, 2, 3]
      expect(basisFunction(0, 0, 0.5, knots)).toBe(1)
      expect(basisFunction(1, 0, 1.5, knots)).toBe(1)
    })

    it('should return 0 for degree 0 when parameter is out of range', () => {
      const knots = [0, 1, 2, 3]
      expect(basisFunction(0, 0, 1.5, knots)).toBe(0)
      expect(basisFunction(1, 0, 0.5, knots)).toBe(0)
    })

    it('should calculate degree 1 basis function correctly', () => {
      const knots = [0, 0, 1, 1]
      const result = basisFunction(0, 1, 0.5, knots)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(1)
    })

    it('should handle edge cases with zero knot differences', () => {
      const knots = [0, 0, 0, 0]
      const result = basisFunction(0, 1, 0, knots)
      expect(result).toBe(0)
    })
  })

  describe('evaluateNurbsPoint', () => {
    it('should evaluate point on NURBS curve', () => {
      const degree = 3
      const knots = [0, 0, 0, 0, 1, 1, 1, 1]
      const controlPoints = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]
      const weights = [1, 1, 1, 1]

      const point = evaluateNurbsPoint(
        0.5,
        degree,
        knots,
        controlPoints,
        weights
      )

      expect(point).toHaveLength(3)
      expect(point[0]).toBeGreaterThan(0)
      expect(point[0]).toBeLessThan(3)
      expect(point[1]).toBeGreaterThan(0)
      expect(point[1]).toBeLessThan(1)
      expect(point[2]).toBe(0)
    })

    it('should clamp parameter to valid range', () => {
      const degree = 3
      const knots = [0, 0, 0, 0, 1, 1, 1, 1]
      const controlPoints = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]
      const weights = [1, 1, 1, 1]

      const point1 = evaluateNurbsPoint(
        -1,
        degree,
        knots,
        controlPoints,
        weights
      )
      const point2 = evaluateNurbsPoint(
        2,
        degree,
        knots,
        controlPoints,
        weights
      )

      expect(point1).toEqual(
        evaluateNurbsPoint(0, degree, knots, controlPoints, weights)
      )
      expect(point2).toEqual(
        evaluateNurbsPoint(1, degree, knots, controlPoints, weights)
      )
    })

    it('should handle weighted control points', () => {
      const degree = 3
      const knots = [0, 0, 0, 0, 1, 1, 1, 1]
      const controlPoints = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]
      const weights = [1, 2, 1, 1] // Second control point has weight 2

      const point = evaluateNurbsPoint(
        0.5,
        degree,
        knots,
        controlPoints,
        weights
      )

      expect(point).toHaveLength(3)
      // The weighted point should be influenced more by the second control point
      expect(point[0]).toBeGreaterThan(1)
    })
  })

  describe('calculateCurveLength', () => {
    it('should calculate length of a straight line', () => {
      const degree = 3
      const knots = [0, 0, 0, 0, 1, 1, 1, 1]
      const controlPoints = [
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 0]
      ]
      const weights = [1, 1, 1, 1]

      const length = calculateCurveLength(degree, knots, controlPoints, weights)

      expect(length).toBeCloseTo(1, 2)
    })

    it('should calculate length of a curved spline', () => {
      const degree = 3
      const knots = [0, 0, 0, 0, 1, 1, 1, 1]
      const controlPoints = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]
      const weights = [1, 1, 1, 1]

      const length = calculateCurveLength(degree, knots, controlPoints, weights)

      expect(length).toBeGreaterThan(3) // Should be longer than straight line distance
      expect(length).toBeLessThan(7) // Should be reasonable
    })
  })

  describe('interpolateControlPoints', () => {
    it('should return copy of fit points', () => {
      const fitPoints = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]

      const controlPoints = interpolateControlPoints(fitPoints)

      expect(controlPoints).toHaveLength(4)
      expect(controlPoints[0]).toEqual([0, 0, 0])
      expect(controlPoints[1]).toEqual([1, 1, 0])
      expect(controlPoints[2]).toEqual([2, 0, 0])
      expect(controlPoints[3]).toEqual([3, 1, 0])

      // Should be different arrays (copies)
      expect(controlPoints).not.toBe(fitPoints)
      expect(controlPoints[0]).not.toBe(fitPoints[0])
    })

    it('should handle empty array', () => {
      const controlPoints = interpolateControlPoints([])
      expect(controlPoints).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small knot differences', () => {
      const knots = [0, 0, 0, 0, 1e-10, 1, 1, 1]
      const result = basisFunction(0, 1, 0, knots)
      expect(result).toBe(0)
    })

    it('should handle zero weights', () => {
      const degree = 3
      const knots = [0, 0, 0, 0, 1, 1, 1, 1]
      const controlPoints = [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
        [3, 1, 0]
      ]
      const weights = [0, 0, 0, 0]

      const point = evaluateNurbsPoint(
        0.5,
        degree,
        knots,
        controlPoints,
        weights
      )

      expect(point).toEqual([0, 0, 0])
    })

    it('should handle single control point', () => {
      const degree = 3
      const knots = [0, 0, 0, 0, 1, 1, 1, 1]
      const controlPoints = [[1, 2, 3]]
      const weights = [1]

      const point = evaluateNurbsPoint(
        0.5,
        degree,
        knots,
        controlPoints,
        weights
      )

      expect(point).toEqual([1, 2, 3])
    })
  })
})
