import { AcGiLineTypePatternElement } from '@mlightcad/data-model'
import * as THREE from 'three'

import { normalizeComplexPatternElement } from '../linetype'

export class AcTrLinePatternShaders {
  /**
   * Creates line shader by given pattern.
   * Note: remember to call line.computeLineDistances() in order to make it work!
   */
  static createLineShaderMaterial(
    pattern: AcGiLineTypePatternElement[],
    color: number,
    scale: number,
    viewportScaleUniform: number,
    cameraZoomUniform: { value: number }
  ): THREE.Material {
    let totalLength = 0.0

    const ltypeElementLenArr: number[] = []
    for (let i = 0; i < pattern.length; i++) {
      // Complex TEXT/SHAPE elements are expanded to geometry elsewhere
      // (`buildComplexLineTypeGeometry`); this shader only handles simple
      // dash/gap patterns. Skip complex elements if one reaches here.
      const normalized = normalizeComplexPatternElement(pattern[i])
      if (normalized.elementTypeFlag !== 0) {
        continue
      }
      const len = pattern[i].elementLength * scale
      ltypeElementLenArr.push(len)
      totalLength += Math.abs(len)
    }
    // Because we cannot (or, it's kind of hard to) draw a dot, let's draw a short dash.
    // A really small value doesn't look good, so, use a fixed small value now!
    for (let i = 0; i < ltypeElementLenArr.length; i++) {
      if (ltypeElementLenArr[i] === 0) {
        ltypeElementLenArr[i] = 0.5 /*totalLength * 0.01 * scale*/
        totalLength += ltypeElementLenArr[i]
      }
    }

    if (ltypeElementLenArr.length === 0) {
      ltypeElementLenArr.push(1)
      totalLength = 1
    }

    return this.createLineShaderMaterialFromScaledPattern(
      ltypeElementLenArr,
      totalLength,
      color,
      viewportScaleUniform,
      cameraZoomUniform
    )
  }

  /**
   * Creates a linetype shader from pre-scaled pattern values.
   * Used by HTML export playback where pattern uniforms are serialized directly.
   */
  static createLineShaderMaterialFromScaledPattern(
    pattern: number[],
    patternLength: number,
    color: number,
    viewportScaleUniform: number,
    cameraZoomUniform: { value: number }
  ): THREE.Material {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      {
        pattern: { value: pattern },
        patternLength: { value: patternLength },
        u_color: { value: new THREE.Color(color) }
      }
    ])

    uniforms.u_viewportScale = { value: viewportScaleUniform }
    uniforms.u_cameraZoom = cameraZoomUniform

    const vertexShader = /*glsl*/ `
            attribute float lineDistance;
            varying float vLineDistance;

            #include <clipping_planes_pars_vertex>

            void main() {
                vLineDistance = lineDistance;

                #include <begin_vertex>
                #include <project_vertex>
                #include <clipping_planes_vertex>
            }`

    const fragmentShader = /*glsl*/ `
            precision highp float;

            uniform mat4 modelMatrix;
            uniform vec3 diffuse;
            uniform vec3 u_color;
            uniform float opacity;
            uniform float pattern[${pattern.length}];
            uniform float patternLength;
            uniform float u_viewportScale;
            uniform float u_cameraZoom;
            varying float vLineDistance;

            #include <clipping_planes_pars_fragment>

            vec2 getWorldScale() {
                return vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
            }

            void main() {

                #include <clipping_planes_fragment>

                // vec2 worldScale = getWorldScale();
                // float averageScale = (abs(worldScale.x) + abs(worldScale.y))/2.0;
                // When zoomed out to a certain extent, it is displayed as a solid line.
                if(patternLength * u_viewportScale * u_cameraZoom/1.5 < 1.0){
                    gl_FragColor = vec4(u_color, opacity);
                    #include <colorspace_fragment>
                    return;
                }

                float pos = mod(vLineDistance, patternLength * u_viewportScale);

                for ( int i = 0; i < ${pattern.length}; i++ ) {
                    pos = pos - abs(pattern[i] * u_viewportScale);
                    if ( pos < 0.0 ) {
                        if ( pattern[i] > 0.0 ) {
                            gl_FragColor = vec4(u_color, opacity);
                            break;
                        }
                        discard;
                    }
                }
                #include <colorspace_fragment>
            }`

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      clipping: true
    })
  }
}
