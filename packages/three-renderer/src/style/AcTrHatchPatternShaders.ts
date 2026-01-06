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
  fixedThicknessInWorldCoord = 0
): THREE.Material {
  const uniforms = {
    u_cameraZoom: cameraZoomUniform,
    u_patternLines: { value: patternLines },
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

    uniform PatternLine u_patternLines[${patternLines.length}];
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
        float distanceBetweenLines = length(offset);

        base = rotate(base, u_patternAngle);
        vec2 samplePos = rotate(v_pos.xy - base, -(patternLine.angle + u_patternAngle));

        return drawSpaceLine(samplePos, distanceBetweenLines, thick);
    }

    int getPatternIndex(PatternLine patternLine, float linePosition, out float distance) {
        if (patternLine.dashLengths.length() < 1 || patternLine.patternLength <= 0.0) {
            return -1;
        }

        // Normalize linePosition to [0, patternLength) range
        float patternRepeat = floor(linePosition / patternLine.patternLength);
        linePosition -= patternLine.patternLength * patternRepeat;

        // Use cumulative sum approach for better precision
        float sum = 0.0;
        #pragma unroll_loop_start
        for (int i = 0; i < patternLine.dashLengths.length(); i++) {
            float segmentLength = abs(patternLine.dashLengths[i]);
            if (linePosition <= sum + segmentLength + EPSILON) {
                distance = linePosition - sum;
                // Clamp distance to avoid negative values due to precision
                distance = max(0.0, distance);
                return i;
            }
            sum += segmentLength;
        }
        #pragma unroll_loop_end

        return -1;
    }

    float drawDashedLine(PatternLine patternLine, float thick){
        float opacity = 0.0; // 0.0 = don't draw, 1.0 = draw
        vec2 base = patternLine.base;
        vec2 offset = patternLine.offset;
        float distanceBetweenLines = abs(offset.y);

        base = rotate(base, u_patternAngle);
        vec2 samplePos = rotate(v_pos.xy - base, -(patternLine.angle + u_patternAngle));

        float offsetX = 0.0;
        if (abs(offset.y) > EPSILON) {
            offsetX = samplePos.y * offset.x / offset.y;
        }
        float linePosition = samplePos.x - offsetX;
        float distance = 0.0;
        int index = getPatternIndex(patternLine, linePosition, distance);
        if (index < 0 || index >= patternLine.dashLengths.length()) {
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
        #pragma unroll_loop_start
        for (int i = 0; i < u_patternLines.length(); i++) {
            PatternLine pl = u_patternLines[i];
            float opacity = drawLine(pl, thick);
            total += opacity;
        }
        #pragma unroll_loop_end
#else
        float opacity = drawLine(u_patternLines[0], thick);
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

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    clipping: true
  })
}
