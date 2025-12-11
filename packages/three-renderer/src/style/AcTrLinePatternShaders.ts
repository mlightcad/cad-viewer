import { AcGiLineTypePatternElement } from '@mlightcad/data-model'
import * as THREE from 'three'

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
    cameraZoomUniform: number
  ): THREE.Material {
    let totalLength = 0.0

    const newPattern: number[] = []
    for (let i = 0; i < pattern.length; i++) {
      newPattern[i] = pattern[i].elementLength * scale
      totalLength += Math.abs(newPattern[i])
    }

    for (let i = 0; i < newPattern.length; i++) {
      // It is hard to draw a dot. So convert it to a short line.
      if (newPattern[i] === 0) {
        newPattern[i] = totalLength * 0.01 * scale
        totalLength += newPattern[i]
      }
    }

    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      {
        pattern: { value: newPattern },
        patternLength: { value: totalLength },
        u_color: { value: new THREE.Color(color) }
      }
    ])

    uniforms.u_viewportScale = { value: viewportScaleUniform }
    uniforms.u_cameraZoom = { value: cameraZoomUniform }

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
