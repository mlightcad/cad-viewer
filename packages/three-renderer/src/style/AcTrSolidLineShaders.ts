import * as THREE from 'three'

/**
 * Creates triangle-based (quad) line shader materials.
 *
 * Follows the same approach as Three.js LineMaterial:
 * Each segment is rendered as a screen-space quad (4 vertices, 2 triangles).
 * All 4 vertices carry both endpoints (instanceStart=A, instanceEnd=B).
 * lineSide.y selects which end this vertex belongs to (0=A, 1=B).
 * lineSide.x is the perpendicular side (-1 or +1).
 */
export class AcTrSolidLineShaders {
  /**
   * Creates a ShaderMaterial for rendering solid lines as screen-space quads.
   * The vertex shader follows the same approach as Three.js LineMaterial:
   * expand quads in NDC space, normalize by resolution.y, handle aspect ratio.
   *
   * Required vertex attributes (from buildShaderQuadGeometry):
   *   - position (vec3): this vertex's endpoint
   *   - normal   (vec3): the OTHER endpoint of the segment
   *   - uv.x:   side direction (-1.0 or +1.0)
   *
   * @param color - Line color as hex number
   * @param lineWidth - Line width in pixels (default 1.0)
   * @param resolution - Shared resolution uniform { value: Vector2 }
   */
  static createMaterial(
    color: number,
    lineWidth: number = 1.0,
    resolution?: { value: THREE.Vector2 }
  ): THREE.ShaderMaterial {
    const res = resolution || {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight)
    }

    const uniforms = {
      u_color: { value: new THREE.Color(color) },
      u_lineWidth: { value: lineWidth },
      u_resolution: res
    }

    // Matches Three.js LineMaterial's proven approach exactly.
    // All 4 vertices of a quad carry instanceStart (A) and instanceEnd (B).
    // lineSide.y selects which endpoint this vertex is positioned at.
    const vertexShader = /*glsl*/ `
      precision highp float;

      attribute vec3 instanceStart;
      attribute vec3 instanceEnd;
      attribute vec2 lineSide;

      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform float u_lineWidth;
      uniform vec2  u_resolution;

      void main() {
        vec4 mvStart = modelViewMatrix * vec4( instanceStart, 1.0 );
        vec4 mvEnd   = modelViewMatrix * vec4( instanceEnd,   1.0 );

        vec4 clipStart = projectionMatrix * mvStart;
        vec4 clipEnd   = projectionMatrix * mvEnd;

        vec2 ndcStart = clipStart.xy / clipStart.w;
        vec2 ndcEnd   = clipEnd.xy   / clipEnd.w;

        float aspect = u_resolution.x / u_resolution.y;
        vec2 dir = ndcEnd - ndcStart;
        dir.x *= aspect;
        float dirLen = length( dir );
        dir = dirLen > 0.0 ? dir / dirLen : vec2( 1.0, 0.0 );

        // perpendicular in NDC
        vec2 offset = vec2( dir.y, -dir.x );

        // undo aspect ratio
        dir.x    /= aspect;
        offset.x /= aspect;

        // side: lineSide.x = -1 or +1
        if ( lineSide.x < 0.0 ) offset *= -1.0;

        // scale to pixels
        offset *= u_lineWidth;
        offset /= u_resolution.y;

        // select endpoint: lineSide.y = 0.0 → A (clipStart), 1.0 → B (clipEnd)
        vec4 clip = ( lineSide.y < 0.5 ) ? clipStart : clipEnd;

        // convert NDC offset to clip-space
        offset *= clip.w;
        clip.xy += offset;

        gl_Position = clip;
      }
    `

    const fragmentShader = /*glsl*/ `
      precision highp float;
      uniform vec3 u_color;

      void main() {
        gl_FragColor = vec4(u_color, 1.0);
      }
    `

    return new THREE.RawShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      transparent: false
    })
  }

  /**
   * Creates a simple MeshBasicMaterial for rendering line quads.
   */
  static createBasicMaterial(color: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true
    })
  }

  /**
   * Builds quad geometry for use with the screen-space shader (createMaterial).
   *
   * For each line segment, creates 4 vertices and 2 triangles.
   * All 4 vertices carry the same instanceStart (A) and instanceEnd (B).
   * - `instanceStart` (vec3): A endpoint
   * - `instanceEnd`   (vec3): B endpoint
   * - `lineSide.x`: side direction (-1.0 or +1.0)
   * - `lineSide.y`: endpoint selector (0.0 = A, 1.0 = B)
   *
   * The vertex shader reads both endpoints from position+normal to compute
   * the screen-space perpendicular offset.
   *
   * @param srcPositions - Float32Array with xyz per vertex (itemSize 3)
   * @param srcIndices - Index pairs [a,b, c,d, ...] defining line segments
   */
  static buildQuadGeometry(
    srcPositions: Float32Array,
    srcIndices: ArrayLike<number>
  ): THREE.BufferGeometry {
    const segmentCount = srcIndices.length / 2

    const vertexCount = segmentCount * 4
    const indexCount = segmentCount * 6

    const starts = new Float32Array(vertexCount * 3)
    const ends   = new Float32Array(vertexCount * 3)
    const sides  = new Float32Array(vertexCount * 2)
    const indices =
      vertexCount > 65535
        ? new Uint32Array(indexCount)
        : new Uint16Array(indexCount)

    let vOff = 0
    let sOff = 0
    let iOff = 0
    let base = 0

    for (let s = 0; s < segmentCount; s++) {
      const ia = srcIndices[s * 2]
      const ib = srcIndices[s * 2 + 1]

      const ax = srcPositions[ia * 3],     ay = srcPositions[ia * 3 + 1], az = srcPositions[ia * 3 + 2]
      const bx = srcPositions[ib * 3],     by = srcPositions[ib * 3 + 1], bz = srcPositions[ib * 3 + 2]

      // All 4 vertices carry the same A and B endpoints.
      // lineSide.y selects which end the vertex is placed at (0=A, 1=B).
      for (let v = 0; v < 4; v++) {
        starts[vOff] = ax; starts[vOff + 1] = ay; starts[vOff + 2] = az
        ends[vOff]   = bx; ends[vOff + 1]   = by; ends[vOff + 2]   = bz
        vOff += 3
      }

      // lineSide: (side, endpointSelector)
      // vertex 0: A side -1
      sides[sOff] = -1.0; sides[sOff + 1] = 0.0; sOff += 2
      // vertex 1: A side +1
      sides[sOff] =  1.0; sides[sOff + 1] = 0.0; sOff += 2
      // vertex 2: B side -1
      sides[sOff] = -1.0; sides[sOff + 1] = 1.0; sOff += 2
      // vertex 3: B side +1
      sides[sOff] =  1.0; sides[sOff + 1] = 1.0; sOff += 2

      // Two triangles: [0,1,2] and [1,3,2]
      indices[iOff++] = base
      indices[iOff++] = base + 1
      indices[iOff++] = base + 2
      indices[iOff++] = base + 1
      indices[iOff++] = base + 3
      indices[iOff++] = base + 2

      base += 4
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('instanceStart', new THREE.BufferAttribute(starts, 3))
    geometry.setAttribute('instanceEnd',   new THREE.BufferAttribute(ends,   3))
    geometry.setAttribute('lineSide',      new THREE.BufferAttribute(sides,  2))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))

    return geometry
  }

  /**
   * Build a complete quad Mesh for solid line rendering, with line geometry
   * stored in userData for batching/raycaster support.
   *
   * @param positions3 - Float32Array with xyz per vertex (itemSize 3)
   * @param indices - Index pairs defining line segments
   * @param lineGeometry - Original line geometry for batching/raycaster
   * @param lineMaterial - Original line material
   * @param color - Line color as hex number
   * @param resolution - Shared resolution uniform
   */
  static buildQuadMesh(
    positions3: Float32Array,
    indices: ArrayLike<number>,
    lineGeometry: THREE.BufferGeometry,
    lineMaterial: THREE.Material,
    color: number,
    resolution?: { value: THREE.Vector2 }
  ): THREE.Mesh {
    const solidMaterial = AcTrSolidLineShaders.createMaterial(color, 1.0, resolution)
    const quadGeometry = AcTrSolidLineShaders.buildQuadGeometry(positions3, indices)
    const mesh = new THREE.Mesh(quadGeometry, solidMaterial)
    mesh.frustumCulled = false
    mesh.userData.lineGeometry = lineGeometry
    mesh.userData.lineMaterial = lineMaterial
    return mesh
  }
}
