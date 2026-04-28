import * as THREE from 'three'

export interface AcTrGradientBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface AcTrGradientHatchStyle {
  name?: string
  angle?: number
  shift?: number
  oneColorMode?: boolean
  shadeTintValue?: number
  startColor?: number
  endColor?: number
}

enum AcTrGradientType {
  Linear = 0,
  Cylinder = 1,
  InvCylinder = 2,
  Spherical = 3,
  InvSpherical = 4,
  Hemispherical = 5,
  InvHemispherical = 6,
  Curved = 7,
  InvCurved = 8
}

const GradientTypes: Record<string, AcTrGradientType> = {
  LINEAR: AcTrGradientType.Linear,
  CYLINDER: AcTrGradientType.Cylinder,
  INVCYLINDER: AcTrGradientType.InvCylinder,
  SPHERICAL: AcTrGradientType.Spherical,
  INVSPHERICAL: AcTrGradientType.InvSpherical,
  HEMISPHERICAL: AcTrGradientType.Hemispherical,
  INVHEMISPHERICAL: AcTrGradientType.InvHemispherical,
  CURVED: AcTrGradientType.Curved,
  INVCURVED: AcTrGradientType.InvCurved
}

export function createGradientHatchShaderMaterial(
  gradient: AcTrGradientHatchStyle,
  _bounds: AcTrGradientBounds,
  fallbackColor: THREE.Color,
  side: THREE.Side = THREE.FrontSide
): THREE.Material {
  const startColor = new THREE.Color(
    gradient.startColor ?? fallbackColor.getHex()
  )
  const endColor = new THREE.Color(
    gradient.endColor ??
      getOneColorGradientEndColor(
        startColor,
        gradient.oneColorMode,
        gradient.shadeTintValue
      )
  )
  const type =
    GradientTypes[(gradient.name || 'LINEAR').trim().toUpperCase()] ??
    AcTrGradientType.Linear

  const uniforms = {
    u_startColor: { value: startColor },
    u_endColor: { value: endColor },
    u_angle: { value: gradient.angle ?? 0 },
    u_shift: { value: gradient.shift ?? 0 },
    u_gradientType: { value: type }
  }

  const vertexShader = /* glsl */ `
    attribute vec2 gradientPosition;

    varying vec2 v_gradientPosition;

    #include <clipping_planes_pars_vertex>
    void main() {
      v_gradientPosition = gradientPosition;

      #include <begin_vertex>
      #include <project_vertex>
      #include <clipping_planes_vertex>
    }`

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform vec3 u_startColor;
    uniform vec3 u_endColor;
    uniform float u_angle;
    uniform float u_shift;
    uniform int u_gradientType;

    varying vec2 v_gradientPosition;

    #include <clipping_planes_pars_fragment>

    const float EPSILON = 1e-6;

    vec2 rotate(vec2 samplePos, float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return vec2(c * samplePos.x - s * samplePos.y, c * samplePos.y + s * samplePos.x);
    }

    float saturate(float value) {
      return clamp(value, 0.0, 1.0);
    }

    float getGradientFactor(vec2 localPos) {
      vec2 shiftedPos = localPos - vec2(clamp(u_shift, -1.0, 1.0), 0.0);
      float linear = saturate(shiftedPos.x * 0.5 + 0.5);
      float cylinder = saturate(1.0 - abs(shiftedPos.x));
      float radial = saturate(length(shiftedPos));
      float curved = smoothstep(0.0, 1.0, linear);
      float hemi = saturate(1.0 - length(shiftedPos - vec2(0.0, -1.0)) * 0.5);

      if (u_gradientType == 1) {
        return cylinder;
      }
      if (u_gradientType == 2) {
        return 1.0 - cylinder;
      }
      if (u_gradientType == 3) {
        return 1.0 - radial;
      }
      if (u_gradientType == 4) {
        return radial;
      }
      if (u_gradientType == 5) {
        return hemi;
      }
      if (u_gradientType == 6) {
        return 1.0 - hemi;
      }
      if (u_gradientType == 7) {
        return curved;
      }
      if (u_gradientType == 8) {
        return 1.0 - curved;
      }
      return linear;
    }

    void main() {
      #include <clipping_planes_fragment>

      vec2 localPos = rotate(v_gradientPosition, -u_angle);
      float factor = saturate(getGradientFactor(localPos));

      gl_FragColor = vec4(mix(u_startColor, u_endColor, factor), 1.0);
      #include <colorspace_fragment>
    }`

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side
  })
}

function getOneColorGradientEndColor(
  startColor: THREE.Color,
  oneColorMode = false,
  shadeTintValue = 0
) {
  if (!oneColorMode) {
    return 0xffffff
  }

  const amount = Math.abs(THREE.MathUtils.clamp(shadeTintValue, -1, 1)) || 0.5
  const target =
    shadeTintValue < 0 ? new THREE.Color(0x000000) : new THREE.Color(0xffffff)
  return startColor.clone().lerp(target, amount).getHex()
}

export function normalizeGradientBounds(
  bounds?: AcTrGradientBounds
): AcTrGradientBounds {
  if (!bounds) {
    return {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1
    }
  }
  return {
    minX: toFiniteNumber(bounds.minX, 0),
    minY: toFiniteNumber(bounds.minY, 0),
    maxX: toFiniteNumber(bounds.maxX, 1),
    maxY: toFiniteNumber(bounds.maxY, 1)
  }
}

function toFiniteNumber(value: unknown, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback
}
