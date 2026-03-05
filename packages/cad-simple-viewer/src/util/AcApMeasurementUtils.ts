import { AcCmColor, AcCmColorMethod } from '@mlightcad/data-model'

/** Cor azul padrão dos overlays de medição. */
export function blueColor(): AcCmColor {
  return new AcCmColor(AcCmColorMethod.ByColor).setRGB(96, 165, 250)
}

