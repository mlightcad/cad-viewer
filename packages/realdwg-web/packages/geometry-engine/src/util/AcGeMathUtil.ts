const _lut: string[] = [
  '00',
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '0a',
  '0b',
  '0c',
  '0d',
  '0e',
  '0f',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '1a',
  '1b',
  '1c',
  '1d',
  '1e',
  '1f',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '2a',
  '2b',
  '2c',
  '2d',
  '2e',
  '2f',
  '30',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '3a',
  '3b',
  '3c',
  '3d',
  '3e',
  '3f',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '4a',
  '4b',
  '4c',
  '4d',
  '4e',
  '4f',
  '50',
  '51',
  '52',
  '53',
  '54',
  '55',
  '56',
  '57',
  '58',
  '59',
  '5a',
  '5b',
  '5c',
  '5d',
  '5e',
  '5f',
  '60',
  '61',
  '62',
  '63',
  '64',
  '65',
  '66',
  '67',
  '68',
  '69',
  '6a',
  '6b',
  '6c',
  '6d',
  '6e',
  '6f',
  '70',
  '71',
  '72',
  '73',
  '74',
  '75',
  '76',
  '77',
  '78',
  '79',
  '7a',
  '7b',
  '7c',
  '7d',
  '7e',
  '7f',
  '80',
  '81',
  '82',
  '83',
  '84',
  '85',
  '86',
  '87',
  '88',
  '89',
  '8a',
  '8b',
  '8c',
  '8d',
  '8e',
  '8f',
  '90',
  '91',
  '92',
  '93',
  '94',
  '95',
  '96',
  '97',
  '98',
  '99',
  '9a',
  '9b',
  '9c',
  '9d',
  '9e',
  '9f',
  'a0',
  'a1',
  'a2',
  'a3',
  'a4',
  'a5',
  'a6',
  'a7',
  'a8',
  'a9',
  'aa',
  'ab',
  'ac',
  'ad',
  'ae',
  'af',
  'b0',
  'b1',
  'b2',
  'b3',
  'b4',
  'b5',
  'b6',
  'b7',
  'b8',
  'b9',
  'ba',
  'bb',
  'bc',
  'bd',
  'be',
  'bf',
  'c0',
  'c1',
  'c2',
  'c3',
  'c4',
  'c5',
  'c6',
  'c7',
  'c8',
  'c9',
  'ca',
  'cb',
  'cc',
  'cd',
  'ce',
  'cf',
  'd0',
  'd1',
  'd2',
  'd3',
  'd4',
  'd5',
  'd6',
  'd7',
  'd8',
  'd9',
  'da',
  'db',
  'dc',
  'dd',
  'de',
  'df',
  'e0',
  'e1',
  'e2',
  'e3',
  'e4',
  'e5',
  'e6',
  'e7',
  'e8',
  'e9',
  'ea',
  'eb',
  'ec',
  'ed',
  'ee',
  'ef',
  'f0',
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f7',
  'f8',
  'f9',
  'fa',
  'fb',
  'fc',
  'fd',
  'fe',
  'ff'
]

let _seed = 1234567

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

/**
 * Generate a UUID (universally unique identifier).
 * http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 * @returns Return a UUID
 */
function generateUUID(): string {
  const d0 = (Math.random() * 0xffffffff) | 0
  const d1 = (Math.random() * 0xffffffff) | 0
  const d2 = (Math.random() * 0xffffffff) | 0
  const d3 = (Math.random() * 0xffffffff) | 0
  const uuid =
    _lut[d0 & 0xff] +
    _lut[(d0 >> 8) & 0xff] +
    _lut[(d0 >> 16) & 0xff] +
    _lut[(d0 >> 24) & 0xff] +
    '-' +
    _lut[d1 & 0xff] +
    _lut[(d1 >> 8) & 0xff] +
    '-' +
    _lut[((d1 >> 16) & 0x0f) | 0x40] +
    _lut[(d1 >> 24) & 0xff] +
    '-' +
    _lut[(d2 & 0x3f) | 0x80] +
    _lut[(d2 >> 8) & 0xff] +
    '-' +
    _lut[(d2 >> 16) & 0xff] +
    _lut[(d2 >> 24) & 0xff] +
    _lut[d3 & 0xff] +
    _lut[(d3 >> 8) & 0xff] +
    _lut[(d3 >> 16) & 0xff] +
    _lut[(d3 >> 24) & 0xff]

  // .toLowerCase() here flattens concatenated strings to save heap memory space.
  return uuid.toLowerCase()
}

/**
 * Clamp the value to be between min and max.
 * @param value Input value to be clamped
 * @param min Input minimum value
 * @param max Input maximum value
 * @returns Return clamped value between min and max
 */
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Computes the Euclidean modulo of m % n, that is: ((n % m) + m) % m
 * https://en.wikipedia.org/wiki/Modulo_operation
 * @param n Input one integer
 * @param m Input one integer
 * @returns Return the Euclidean modulo of m % n
 */
function euclideanModulo(n: number, m: number) {
  return ((n % m) + m) % m
}

/**
 * Linear mapping of x from range [a1, a2] to range [b1, b2].
 * @param x Input value to be mapped.
 * @param a1 Input minimum value for range A.
 * @param a2 Input maximum value for range A.
 * @param b1 Input minimum value for range B.
 * @param b2 Input maximum value for range B.
 * @returns Return linear mapping of x from range [a1, a2] to range [b1, b2]
 */
function mapLinear(x: number, a1: number, a2: number, b1: number, b2: number) {
  return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1)
}

/**
 * Return the percentage in the closed interval [0, 1] of the given value between the start and end point.
 * https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/inverse-lerp-a-super-useful-yet-often-overlooked-function-r5230/
 * @param x Input start point
 * @param y Input end point
 * @param value Input a value between start and end
 * @returns Return the percentage in the closed interval [0, 1] of the given value between the start and end point.
 */
function inverseLerp(x: number, y: number, value: number) {
  if (x !== y) {
    return (value - x) / (y - x)
  } else {
    return 0
  }
}
/**
 * Returns a value linearly interpolated from two known points based on the given interval - t = 0 will
 * return x and t = 1 will return y.
 * https://en.wikipedia.org/wiki/Linear_interpolation
 * @param x Input start point
 * @param y Input end point
 * @param t Input interpolation factor in the closed interval [0, 1]
 * @returns Return a value linearly interpolated from two known points
 */
function lerp(x: number, y: number, t: number) {
  return (1 - t) * x + t * y
}

/**
 * Smoothly interpolate a number from x toward y in a spring-like manner using the dt to maintain frame
 * rate independent movement. For details, see Frame rate independent damping using lerp.
 * http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/
 * @param x Input current point.
 * @param y Input target point.
 * @param lambda A higher lambda value will make the movement more sudden, and a lower value will make
 * the movement more gradual.
 * @param dt Input delta time in seconds.
 * @returns Return a number from x toward y
 */
function damp(x: number, y: number, lambda: number, dt: number) {
  return lerp(x, y, 1 - Math.exp(-lambda * dt))
}

/**
 * Return a value that alternates between 0 and length.
 * https://www.desmos.com/calculator/vcsjnyz7x4
 * @param x Input the value to pingpong.
 * @param length The positive value the function will pingpong to. Default is 1.
 * @returns Return a value that alternates between 0 and length : Float.
 */
function pingpong(x: number, length: number = 1) {
  return length - Math.abs(euclideanModulo(x, length * 2) - length)
}

/**
 * Return a value between 0-1. A variation on smoothstep that has zero 1st and 2nd order derivatives
 * at x=0 and x=1.
 * http://en.wikipedia.org/wiki/Smoothstep
 * @param x Input the value to evaluate based on its position between min and max.
 * @param min Any x value below min will be 0.
 * @param max  Any x value above max will be 1.
 * @returns Return a value between 0-1
 */
function smoothstep(x: number, min: number, max: number) {
  if (x <= min) return 0
  if (x >= max) return 1

  x = (x - min) / (max - min)

  return x * x * (3 - 2 * x)
}

/**
 * Return a value between 0-1. A variation on smoothstep that has zero 1st and 2nd order derivatives
 * at x=0 and x=1.
 * @param x Input the value to evaluate based on its position between min and max.
 * @param min Any x value below min will be 0.
 * @param max Any x value above max will be 1.
 * @returns Return a value between 0-1
 */
function smootherstep(x: number, min: number, max: number) {
  if (x <= min) return 0
  if (x >= max) return 1

  x = (x - min) / (max - min)

  return x * x * x * (x * (x * 6 - 15) + 10)
}

/**
 * Random integer in the interval [low, high].
 * @param low Input interval lower boundary value
 * @param high Input interval upper boundary value
 * @returns Return random integer in the interval [low, high].
 */
function randInt(low: number, high: number) {
  return low + Math.floor(Math.random() * (high - low + 1))
}

/**
 * Random float in the interval [low, high].
 * @param low Input interval lower boundary value
 * @param high Input interval upper boundary value
 * @returns Return random float in the interval [low, high]
 */
// Random float from <low, high> interval
function randFloat(low: number, high: number) {
  return low + Math.random() * (high - low)
}

/**
 * Random float in the interval [- range / 2, range / 2].
 * @param range Input interval range value
 * @returns Return random float in the interval [- range / 2, range / 2].
 */
function randFloatSpread(range: number) {
  return range * (0.5 - Math.random())
}

/**
 * Deterministic pseudo-random float in the interval [0, 1]. The integer seed is optional.
 * @param s Input one integer seed number
 * @returns Return pseudo-random float in the interval [0, 1]
 */
function seededRandom(s: number) {
  if (s !== undefined) _seed = s

  // Mulberry32 generator

  let t = (_seed += 0x6d2b79f5)

  t = Math.imul(t ^ (t >>> 15), t | 1)

  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * Convert degrees to radians.
 * @param degrees Input degrees value to be converted
 * @returns Return converted angle value in radians
 */
function degToRad(degrees: number) {
  return degrees * DEG2RAD
}

/**
 * Convert radians to degrees.
 * @param radians Input radians value to be converted
 * @returns Return converted angle value in degrees
 */
function radToDeg(radians: number) {
  return radians * RAD2DEG
}

/**
 * Return true if n is a power of 2.
 * @param value Input the number to check
 * @returns Return true if n is a power of 2.
 */
function isPowerOfTwo(value: number) {
  return (value & (value - 1)) === 0 && value !== 0
}

/**
 * Return the smallest power of 2 that is greater than or equal to n.
 * @param value Input one number
 * @returns Return the smallest power of 2 that is greater than or equal to n.
 */
function ceilPowerOfTwo(value: number) {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2))
}

/**
 * Return the largest power of 2 that is less than or equal to n.
 * @param value Input one number
 * @returns Return the largest power of 2 that is less than or equal to n.
 */
function floorPowerOfTwo(value: number) {
  return Math.pow(2, Math.floor(Math.log(value) / Math.LN2))
}

/**
 * Normalize one angle in radian to value in range 0 to 2*PI
 * @param angle Input one angle value in radians
 * @returns Return normalized angle value in radians
 */
function normalizeAngle(angle: number): number {
  const TAU = Math.PI * 2
  return ((angle % TAU) + TAU) % TAU
}

/**
 * Return true if the valueToTest is between (value1, value2) or (value2, value1)
 * @param valueToTest Input value to test
 * @param value1 Input the first value
 * @param value2 Input the second value
 * @returns Return true if if the valueToTest is between (value1, value2) or (value2, value1).
 */
function isBetween(valueToTest: number, value1: number, value2: number) {
  return (
    (valueToTest > value1 && valueToTest < value2) ||
    (valueToTest > value2 && valueToTest < value1)
  )
}

/**
 * Return true if the algleToTest is between startAngle and endAngle
 * @param angleToTest Input angle to test
 * @param startAngle Input start angle
 * @param endAngle Input end angle
 * @param clockwise Input rotation direction from start angle to end angle
 * @returns Return true if the algleToTest is between startAngle and endAngle
 */
function isBetweenAngle(
  angleToTest: number,
  startAngle: number,
  endAngle: number,
  clockwise: boolean = false
) {
  angleToTest = normalizeAngle(angleToTest)
  startAngle = normalizeAngle(startAngle)
  endAngle = normalizeAngle(endAngle)
  if (clockwise) {
    if (startAngle > endAngle) {
      return angleToTest <= startAngle && angleToTest >= endAngle
    } else {
      return angleToTest <= startAngle || angleToTest >= endAngle
    }
  } else {
    if (startAngle < endAngle) {
      return angleToTest >= startAngle && angleToTest <= endAngle
    } else {
      return angleToTest >= startAngle || angleToTest <= endAngle
    }
  }
}

function intPartLength(num: number) {
  num = Math.abs(num)
  if (num < 1.0) {
    return 0
  }
  return Math.ceil(Math.log10(Math.abs(num) + 1))
}

function relativeEps(num: number, epsilon = 1.0e-7) {
  const count = intPartLength(num)
  return Math.max(Math.pow(10, count) * epsilon, epsilon)
}

const AcGeMathUtil = {
  DEG2RAD: DEG2RAD,
  RAD2DEG: RAD2DEG,
  generateUUID: generateUUID,
  clamp: clamp,
  euclideanModulo: euclideanModulo,
  mapLinear: mapLinear,
  inverseLerp: inverseLerp,
  lerp: lerp,
  damp: damp,
  pingpong: pingpong,
  smoothstep: smoothstep,
  smootherstep: smootherstep,
  randInt: randInt,
  randFloat: randFloat,
  randFloatSpread: randFloatSpread,
  seededRandom: seededRandom,
  degToRad: degToRad,
  radToDeg: radToDeg,
  isPowerOfTwo: isPowerOfTwo,
  ceilPowerOfTwo: ceilPowerOfTwo,
  floorPowerOfTwo: floorPowerOfTwo,
  normalizeAngle: normalizeAngle,
  isBetween: isBetween,
  isBetweenAngle: isBetweenAngle,
  intPartLength: intPartLength,
  relativeEps: relativeEps
}

export {
  DEG2RAD,
  RAD2DEG,
  generateUUID,
  clamp,
  euclideanModulo,
  mapLinear,
  inverseLerp,
  lerp,
  damp,
  pingpong,
  smoothstep,
  smootherstep,
  randInt,
  randFloat,
  randFloatSpread,
  seededRandom,
  degToRad,
  radToDeg,
  isPowerOfTwo,
  ceilPowerOfTwo,
  floorPowerOfTwo,
  normalizeAngle,
  isBetween,
  isBetweenAngle,
  intPartLength,
  relativeEps,
  AcGeMathUtil
}
