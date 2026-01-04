import * as THREE from 'three'

export interface AcTrPatternLine {
  origin: THREE.Vector2
  delta: THREE.Vector2
  angle: number // in radians
  pattern: number[] // line pattern
  patternSum: number[]
  patternLength: number // total length of a line pattern
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
        vec2 origin;
        vec2 delta;
        float angle;
        float pattern[MAX_PATTERN_SEGMENT_COUNT];
        float patternSum[MAX_PATTERN_SEGMENT_COUNT+1];
        float patternLength;
    };

    uniform PatternLine u_patternLines[${patternLines.length}];
    uniform float u_patternAngle;

    #include <clipping_planes_pars_fragment>

    // Clamp [0..1] range
    #define saturate(a) clamp(a, 0.0, 1.0)

    const float EPS = 1000.0;

    vec2 getWorldScale() {
        return vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
    }

    // Rotate a 2D point by rotation angle (in radians)
    vec2 rotate(vec2 st, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return vec2(c * st.x - s * st.y, c * st.y + s * st.x);
    }

    vec2 translate(vec2 samplePosition, vec2 offset) {
        //move sample point in the opposite direction that we want to move shapes in
        return samplePosition - offset;
    }

    vec2 scale(vec2 samplePosition, float scale) {
        return samplePosition / scale;
    }

    // signed distance from point st to infinite line (a->b)
    float sdfLine(vec2 st, vec2 a, vec2 b) {
        vec2 ap = st - a;
        vec2 ab = b - a;
        return abs((ap.x * ab.y) - (ab.x * ap.y)) / max(length(ab), 1e-6);
    }

    // Draw a repeated line pattern in object/world space with smooth anti-aliasing.
    float drawSpaceLine(vec2 st, float distanceBetweenLines, float thick) {
        float dist = sdfLine(st, vec2(0.0, 0.0), vec2(1.0, 0.0));

        // compute fractional distance to nearest repeated line center
        float u = dist / max(distanceBetweenLines, 1e-6);
        float lineDistance = abs(fract(u + 0.5) - 0.5) * distanceBetweenLines;
        float threshold = step(thick, lineDistance);
        return threshold;
    }

    float drawSolidLine(PatternLine patternLine, float thick) {
        vec2 origin = patternLine.origin;
        vec2 delta = patternLine.delta;
        float distanceBetweenLines = length(delta);

        origin = rotate(origin, u_patternAngle);
        vec2 st = rotate(v_pos.xy - origin, -(patternLine.angle + u_patternAngle));

        return drawSpaceLine(st, distanceBetweenLines, thick);
    }

    int getPatternIndex(PatternLine patternLine, float u, out float distance) {
        //u = mod(u, patternLine.patternLength);
        float y = floor(u / patternLine.patternLength);
        u = u - patternLine.patternLength * y;
        //float distance = 0.0;

        #pragma unroll_loop_start
        for (int i = 1; i < patternLine.patternSum.length(); i++){
            if (u <= patternLine.patternSum[i]) {
                distance = u - patternLine.patternSum[i - 1];
                return i - 1;
            }
        }
        #pragma unroll_loop_end

        return -1;
    }

    float drawDashedLine(PatternLine patternLine, float thick){
        float threshold = 1.0;
        vec2 origin = patternLine.origin;
        vec2 delta = patternLine.delta;
        float distanceBetweenLines = abs(delta.y);

        origin = rotate(origin, u_patternAngle);
        vec2 st = rotate(v_pos.xy - origin, -(patternLine.angle + u_patternAngle));

        float offsetX = 0.0;
        if (abs(delta.y) > 1e-6) {
            offsetX = st.y * delta.x / delta.y;
        }
        float u = st.x - offsetX;
        float distance = 0.0;
        int index = getPatternIndex(patternLine, u, distance);
        if (index < 0) {
            return threshold;
        }

        float size = patternLine.pattern[index];
        if (size >= 0.0) {
            threshold = drawSpaceLine(st, distanceBetweenLines, thick);
            // Try to solve the problem caused by the precision after zooming out by drawing a part of the dashed line
        } else if (distance < thick) {
            //threshold = 0.8;
            threshold = drawSpaceLine(st, distanceBetweenLines, thick);
        }

        return threshold;
    }

    float drawLine(PatternLine patternLine, float thick) {
        float t = 0.0;
        if (patternLine.patternLength > 0.0) {
            t = drawDashedLine(patternLine, thick);
        } else {
            t = drawSolidLine(patternLine, thick);
        }
        return t;
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

        if (thick > EPS) {
            gl_FragColor = vec4(u_color, 1.0);
            #include <colorspace_fragment>
            return;
        }

        float total = 0.0;

#if ${patternLines.length} > 1
        #pragma unroll_loop_start
        for (int i = 0; i < u_patternLines.length(); i++) {
            PatternLine pl = u_patternLines[i];
            float t = drawLine(pl, thick);
            total += (1.0 - t);
        }
        #pragma unroll_loop_end
#else
        float t = drawLine(u_patternLines[0], thick);
        total += (1.0 - t);
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
