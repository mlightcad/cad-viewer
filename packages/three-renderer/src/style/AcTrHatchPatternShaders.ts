import * as THREE from 'three'

/**
 * Another format of AcTrPatternLine.
 * We need to redefine it in order to send it to gpu.
 */
export interface AcTrPatternLine {
  angle: number // in radians
  base: THREE.Vector2
  offset: THREE.Vector2
  /**
   * Dash and gap list.
   * E.g., [1, -1, 2, -1], defines a line repeats by "- - -- " (a dash, a gap, 2 dashes, a gap...)
   * The array size shouldn't be 0.
   */
  dashLengths: number[]
  /**
   * Total length of a *this* pattern definition.
   * We need to pass it in as a individual variable because it's not convenient to get it in glsl.
   * E.g., for dashLengths: [1, -1, 2, -1], patternLength is 5.
   */
  patternLength: number
}

/** Header floats packed before dash lengths: angle, base.xy, offset.xy, patternLength. */
const PATTERN_LINE_HEADER_FLOATS = 6

/** Refcount key on the shared hatch pattern DataTexture. */
const PATTERN_TEXTURE_REF_COUNT = 'acTrPatternTextureRefCount'

/**
 * Retains a hatch pattern DataTexture shared by style-cache materials and their
 * batch/highlight clones. The texture is disposed only when the last retainer
 * releases it.
 */
export function retainHatchPatternTexture(texture: THREE.Texture): void {
  const userData = texture.userData as Record<string, number>
  userData[PATTERN_TEXTURE_REF_COUNT] =
    (userData[PATTERN_TEXTURE_REF_COUNT] ?? 0) + 1
}

/**
 * Releases one retain on a hatch pattern DataTexture and disposes it when the
 * refcount reaches zero.
 */
export function releaseHatchPatternTexture(texture: THREE.Texture): void {
  const userData = texture.userData as Record<string, number>
  const next = (userData[PATTERN_TEXTURE_REF_COUNT] ?? 1) - 1
  userData[PATTERN_TEXTURE_REF_COUNT] = next
  if (next <= 0) {
    texture.dispose()
  }
}

/**
 * Wires retain/release for `u_patternData` onto a material and every clone.
 *
 * Batch/highlight paths clone hatch ShaderMaterials and share the texture by
 * reference, but Three.js does not copy dispose listeners. Overriding `clone`
 * keeps the refcount honest across those call sites (#743).
 */
function wireHatchPatternTextureLifetime(
  material: THREE.ShaderMaterial,
  texture: THREE.DataTexture
): void {
  retainHatchPatternTexture(texture)
  material.addEventListener('dispose', () => {
    releaseHatchPatternTexture(texture)
  })

  material.clone = function cloneHatchPatternMaterial(
    this: THREE.ShaderMaterial
  ) {
    const cloned = THREE.ShaderMaterial.prototype.clone.call(
      this
    ) as THREE.ShaderMaterial
    // UniformsUtils.clone() clones textures; keep one shared DataTexture so
    // retain/release stays accurate across batch/highlight clones.
    cloned.uniforms.u_patternData.value = texture
    wireHatchPatternTextureLifetime(cloned, texture)
    return cloned
  }
}

/**
 * Packs hatch pattern lines into a float RGBA DataTexture.
 *
 * Layout per row (one pattern line):
 *   float 0: angle
 *   float 1–2: base.xy
 *   float 3–4: offset.xy
 *   float 5: patternLength
 *   float 6…: dashLengths (padded to MAX_PATTERN_SEGMENT_COUNT)
 *
 * Pattern data used to live in a uniform struct array, which hit a hard
 * fragment-uniform budget (~85 lines with 4 dash entries against the old
 * scalar count of 1024). A texture removes that limit so user patterns with
 * hundreds of line families can draw completely (#743).
 */
export function packHatchPatternDataTexture(
  patternLines: AcTrPatternLine[],
  maxPatternSegmentCount: number
): {
  texture: THREE.DataTexture
  texelsPerLine: number
} {
  const floatsPerLine = PATTERN_LINE_HEADER_FLOATS + maxPatternSegmentCount
  const texelsPerLine = Math.max(1, Math.ceil(floatsPerLine / 4))
  const lineCount = Math.max(1, patternLines.length)
  const data = new Float32Array(texelsPerLine * lineCount * 4)

  for (let lineIndex = 0; lineIndex < patternLines.length; lineIndex++) {
    const line = patternLines[lineIndex]
    const row = lineIndex * texelsPerLine * 4
    data[row] = line.angle
    data[row + 1] = line.base.x
    data[row + 2] = line.base.y
    data[row + 3] = line.offset.x
    data[row + 4] = line.offset.y
    data[row + 5] = line.patternLength
    for (let i = 0; i < maxPatternSegmentCount; i++) {
      data[row + PATTERN_LINE_HEADER_FLOATS + i] = line.dashLengths[i] ?? 0
    }
  }

  const texture = new THREE.DataTexture(
    data,
    texelsPerLine,
    lineCount,
    THREE.RGBAFormat,
    THREE.FloatType
  )
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.needsUpdate = true
  if ('colorSpace' in texture) {
    ;(texture as THREE.DataTexture & { colorSpace: string }).colorSpace =
      THREE.NoColorSpace
  }
  return { texture, texelsPerLine }
}

/**
 *
 * @param patternLines Line patterns. Angles are in radians.
 * @param patternAngle In radians
 * @param cameraZoomUniform Camera zoom uniform
 * @param color Color
 * @param fixedThicknessInWorldCoord Fixed thickness in world coordinates
 * @returns Shader material
 */
export function createHatchPatternShaderMaterial(
  patternLines: AcTrPatternLine[],
  patternAngle: number, // in radians
  cameraZoomUniform: { value: number },
  color: THREE.Color,
  fixedThicknessInWorldCoord = 0,
  side: THREE.Side = THREE.FrontSide
): THREE.Material {
  const maxPatternSegmentCount = Math.max(
    2,
    ...patternLines.map(line => line.dashLengths.length)
  )
  const { texture, texelsPerLine } = packHatchPatternDataTexture(
    patternLines,
    maxPatternSegmentCount
  )
  const patternLineCount = Math.max(1, patternLines.length)

  const uniforms = {
    u_cameraZoom: cameraZoomUniform,
    // Kept for export / tests (AcExPatternSnapshot.extractHatchPattern).
    // Not declared in the shader — pattern data is sampled from u_patternData.
    u_patternLines: { value: patternLines },
    u_patternData: { value: texture },
    u_patternLineCount: { value: patternLineCount },
    u_texelsPerLine: { value: texelsPerLine },
    u_patternAngle: { value: patternAngle },
    u_color: { value: color }
  }

  // TODO: it doesn't support "GRAVEL" pattern well, the reason may because of the angle
  // in PatternLine! Tried to normalize the angle but doesn't work.

  const vertexShader = /*glsl*/ `
    varying vec3 v_pos;

    #include <clipping_planes_pars_vertex>
    void main() {
        //vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        v_pos = position;

        #include <begin_vertex>
        #include <project_vertex>
        #include <clipping_planes_vertex>
    }`

  const fragmentShader = /*glsl*/ `
    precision highp float;
    uniform mat4 modelMatrix;
    uniform float u_cameraZoom;
    uniform vec3 u_color;
    varying vec3 v_pos;

    struct PatternLine {
        float angle;
        vec2 base;
        vec2 offset;
        float dashLengths[MAX_PATTERN_SEGMENT_COUNT];
        float patternLength;
    };

    uniform sampler2D u_patternData;
    uniform float u_patternLineCount;
    uniform float u_texelsPerLine;
    uniform float u_patternAngle;

    #include <clipping_planes_pars_fragment>

    // Clamp [0..1] range
    #define saturate(a) clamp(a, 0.0, 1.0)

    const float MAX_THICKNESS = 1000.0; // If line thickness exceeds this, use solid fill instead of pattern
    const float EPSILON = 1e-6;

    vec2 getWorldScale() {
        return vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
    }

    // Rotate a 2D point by rotation angle (in radians)
    vec2 rotate(vec2 samplePos, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return vec2(c * samplePos.x - s * samplePos.y, c * samplePos.y + s * samplePos.x);
    }

    vec2 translate(vec2 samplePosition, vec2 offset) {
        //move sample point in the opposite direction that we want to move shapes in
        return samplePosition - offset;
    }

    vec2 scale(vec2 samplePosition, float scale) {
        return samplePosition / scale;
    }

    vec4 fetchPatternTexel(float lineIndex, float texelIndex) {
        vec2 uv = vec2(
            (texelIndex + 0.5) / u_texelsPerLine,
            (lineIndex + 0.5) / u_patternLineCount
        );
        return texture2D(u_patternData, uv);
    }

    PatternLine loadPatternLine(float lineIndex) {
        PatternLine pl;
        vec4 t0 = fetchPatternTexel(lineIndex, 0.0);
        vec4 t1 = fetchPatternTexel(lineIndex, 1.0);
        pl.angle = t0.r;
        pl.base = t0.gb;
        pl.offset = vec2(t0.a, t1.r);
        pl.patternLength = t1.g;

        // Dash lengths start at float index 6 (t1.ba, then subsequent texels).
        // Do not use three.js unroll_loop here: it only rewrites [i] /
        // UNROLLED_LOOP_INDEX, so float(i) would become an undeclared
        // identifier and the fragment shader would fail to compile.
        for (int i = 0; i < ${maxPatternSegmentCount}; i++) {
            float floatIndex = float(i) + 6.0;
            float texelIndex = floor(floatIndex / 4.0);
            float comp = mod(floatIndex, 4.0);
            vec4 t = fetchPatternTexel(lineIndex, texelIndex);
            if (comp < 0.5) pl.dashLengths[i] = t.r;
            else if (comp < 1.5) pl.dashLengths[i] = t.g;
            else if (comp < 2.5) pl.dashLengths[i] = t.b;
            else pl.dashLengths[i] = t.a;
        }
        return pl;
    }

    // signed distance from point samplePos to infinite line (a->b)
    float sdfLine(vec2 samplePos, vec2 a, vec2 b) {
        vec2 ap = samplePos - a;
        vec2 ab = b - a;
        return abs((ap.x * ab.y) - (ab.x * ap.y)) / max(length(ab), EPSILON);
    }

    // Draw a repeated line pattern in object/world space with smooth anti-aliasing.
    float drawSpaceLine(vec2 samplePos, float distanceBetweenLines, float thick) {
        float dist = sdfLine(samplePos, vec2(0.0, 0.0), vec2(1.0, 0.0));

        // compute fractional distance to nearest repeated line center
        float normalizedDist = dist / max(distanceBetweenLines, EPSILON);
        float lineDistance = abs(fract(normalizedDist + 0.5) - 0.5) * distanceBetweenLines;
        // opacity: 0.0 = don't draw, 1.0 = draw
        float opacity = 1.0 - step(thick, lineDistance);
        return opacity;
    }

    float drawSolidLine(PatternLine patternLine, float thick) {
        vec2 base = patternLine.base;
        vec2 offset = patternLine.offset;
        // Below ~1px of spacing, dist / distanceBetweenLines (in drawSpaceLine)
        // grows past float32's fractional precision and fract() returns noise,
        // discarding the fill entirely instead of thinning it. Floor the spacing
        // at the line's own stroke thickness so lines that would visually merge
        // degrade into a solid tone, matching how this prints/renders in AutoCAD.
        float distanceBetweenLines = max(length(offset), thick);

        base = rotate(base, u_patternAngle);
        vec2 samplePos = rotate(v_pos.xy - base, -(patternLine.angle + u_patternAngle));

        return drawSpaceLine(samplePos, distanceBetweenLines, thick);
    }

    int getPatternIndex(PatternLine patternLine, float linePosition, float thick, out float distance) {
        if (patternLine.patternLength <= 0.0) {
            return -1;
        }

        // Normalize linePosition to [0, patternLength) range
        float patternRepeat = floor(linePosition / patternLine.patternLength);
        linePosition -= patternLine.patternLength * patternRepeat;

        // Use cumulative sum approach for better precision.
        // Plain loop (not three.js unroll_loop): return i must stay a real
        // loop index — unroll only rewrites [i] / UNROLLED_LOOP_INDEX.
        float sum = 0.0;
        for (int i = 0; i < ${maxPatternSegmentCount}; i++) {
            float segmentLength = abs(patternLine.dashLengths[i]);
            // A dash length of 0 is AutoCAD's "dot" marker: a zero-length
            // element that consumes no along-line distance (sum still
            // advances by the real, zero, segmentLength -- the pattern's
            // period is unaffected), but a zero-width hit-test window can
            // never actually be sampled. Give only dots a hittable window
            // sized to the stroke thickness (same floor as #727's sub-pixel
            // spacing fix); real dashes keep their exact length.
            float hitWindow = segmentLength == 0.0 ? thick : segmentLength;
            if (linePosition <= sum + hitWindow + EPSILON) {
                distance = linePosition - sum;
                // Clamp distance to avoid negative values due to precision
                distance = max(0.0, distance);
                return i;
            }
            sum += segmentLength;
            // Trailing pads are zeros beyond the real dash list; once the
            // cumulative length covers the pattern period we are done.
            if (sum >= patternLine.patternLength - EPSILON) {
                return -1;
            }
        }

        return -1;
    }

    float drawDashedLine(PatternLine patternLine, float thick){
        float opacity = 0.0; // 0.0 = don't draw, 1.0 = draw
        vec2 base = patternLine.base;
        vec2 offset = patternLine.offset;
        // See drawSolidLine: floor sub-pixel spacing at the stroke thickness
        // so the fill degrades to a solid tone instead of vanishing.
        float distanceBetweenLines = max(abs(offset.y), thick);

        base = rotate(base, u_patternAngle);
        vec2 samplePos = rotate(v_pos.xy - base, -(patternLine.angle + u_patternAngle));

        float offsetX = 0.0;
        if (abs(offset.y) > EPSILON) {
            offsetX = samplePos.y * offset.x / offset.y;
        }
        float linePosition = samplePos.x - offsetX;
        float distance = 0.0;
        int index = getPatternIndex(patternLine, linePosition, thick, distance);
        if (index < 0 || index >= ${maxPatternSegmentCount}) {
            return opacity;
        }

        float size = patternLine.dashLengths[index];
        if (size >= 0.0) {
            // Dash segment: draw the line
            opacity = drawSpaceLine(samplePos, distanceBetweenLines, thick);
            // Try to solve the problem caused by the precision after zooming out by drawing a part of the dashed line
        } else if (distance < thick) {
            // Gap segment: draw only if very close to edge (for precision handling)
            opacity = drawSpaceLine(samplePos, distanceBetweenLines, thick);
        }

        return opacity;
    }

    float drawLine(PatternLine patternLine, float thick) {
        float opacity = 0.0;
        if (patternLine.patternLength > 0.0) {
            opacity = drawDashedLine(patternLine, thick);
        } else {
            opacity = drawSolidLine(patternLine, thick);
        }
        return opacity;
    }

    void main() {
        #include <clipping_planes_fragment>

        // Idealy, the thickness of lines in hatch pattern should always be 1 pixel.
        // In Viewer2d, it uses orthographic camera and always in top view,
        // so we adjust thickness by cameraZoom (and also consider worldScale).
        // While 3d view is more complex, it can use perspective camera,
        // its camera position and direction is flexible. We cannot keep line thickness
        // in a fixed pixel any more, and there is no proper way to adjust thickness as camera
        // position changes. So, we need to use a fixed thickness in world coordinates.
#if ${fixedThicknessInWorldCoord} > 0
        float thick = float(${fixedThicknessInWorldCoord});
#else
        vec2 worldScale = getWorldScale();
        float averageScale = (abs(worldScale.x) + abs(worldScale.y))/2.0;
        // possible size of a pixel
        float thick = (0.7 / averageScale) / u_cameraZoom;
#endif

        if (thick > MAX_THICKNESS) {
            gl_FragColor = vec4(u_color, 1.0);
            #include <colorspace_fragment>
            return;
        }

        float total = 0.0;

#if ${patternLines.length} > 1
        // Do not unroll: user patterns can have hundreds of line families (#743).
        for (int i = 0; i < ${patternLines.length}; i++) {
            PatternLine pl = loadPatternLine(float(i));
            float opacity = drawLine(pl, thick);
            total += opacity;
        }
#else
        float opacity = drawLine(loadPatternLine(0.0), thick);
        total += opacity;
#endif

        total = saturate(total);
        if (total < 0.001) {
            discard;
        }

        gl_FragColor = vec4(u_color * total, 1.0);
        #include <colorspace_fragment>
    }
    `

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    clipping: true,
    side,
    defines: {
      MAX_PATTERN_SEGMENT_COUNT: maxPatternSegmentCount
    }
  })

  // ShaderMaterial.dispose() does not free textures. Retain/release across
  // clones so batch/highlight copies can outlive a cache rematerialize.
  wireHatchPatternTextureLifetime(material, texture)

  return material
}
