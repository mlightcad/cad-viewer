export {
  asyncComplexLineTypeGlyphs,
  buildComplexLineTypeGeometry,
  estimateComplexLineTypeCycles,
  hasPendingComplexLineTypeGlyphs,
  MAX_COMPLEX_LINETYPE_CYCLES,
  resolveLineTypeScale,
  resolveLinetypeEmbeddedText,
  syncComplexLineTypeGlyphs
} from './AcTrComplexLineBuilder'
export {
  COMPLEX_LTYPE_ABSOLUTE_ROTATION,
  COMPLEX_LTYPE_SHAPE,
  COMPLEX_LTYPE_TEXT,
  isComplexLineType,
  isComplexPatternElement,
  isComplexShapeElement,
  isComplexTextElement,
  normalizeComplexPattern,
  normalizeComplexPatternElement,
  walkLineType,
  uprightLinetypeAngle,
  type AcTrComplexPatternElement,
  type AcTrLineWalkPlacement,
  type AcTrLineWalkPoint,
  type AcTrLineWalkResult
} from './AcTrLineTypeWalker'
