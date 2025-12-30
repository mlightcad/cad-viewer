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
    cameraZoomUniform: { value: number }
  ): THREE.Material {
    let totalLength = 0.0

    const ltypeElementLenArr: number[] = [];
    for (let i = 0; i < pattern.length; i++) {
        let len = pattern[i].elementLength;
        // because we cannot (or, it's kind of hard to) draw a dot, let's draw a short dash (0.5 long)
        if (len === 0) {
            len = 0.5;
        } else if (len < 0 && pattern[i].elementTypeFlag !== 0) {
            // If current element is a complex linetype element.
            // Since we don"t support this kind of linetype now, we'll need to make its length possitive,
            // in order to draw a line segment for this case!
            // TODO: support complex ltype, thus we can remove unsupportedLineTypes
            len = Math.abs(len);
        }
        len *= scale;
        ltypeElementLenArr[i] = len;
        totalLength += Math.abs(ltypeElementLenArr[i]);
    }

    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      {
        pattern: { value: ltypeElementLenArr },
        patternLength: { value: totalLength },
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
