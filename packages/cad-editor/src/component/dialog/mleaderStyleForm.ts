import {
  AcCmColor,
  AcCmColorMethod,
  type AcDbDatabase,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcDbMLeaderStyle,
  AcDbMLeaderTextAttachmentDirection,
  AcGeVector3d,
  ByBlock,
  DEFAULT_TEXT_STYLE
} from '@mlightcad/data-model'

/**
 * Editable fields for the Multileader Style Manager / Modify dialogs.
 */
export interface MLeaderStyleFormState {
  leaderLineType: number
  leaderLineColor: AcCmColor
  leaderLineTypeName: string
  leaderLineWeight: number
  arrowSymbolId: string
  arrowSize: number
  breakSize: number
  constrainMaxPoints: boolean
  maxLeaderSegmentsPoints: number
  constrainFirstAngle: boolean
  firstSegmentAngleDegrees: number
  constrainSecondAngle: boolean
  secondSegmentAngleDegrees: number
  enableLanding: boolean
  setLandingDistance: boolean
  doglegLength: number
  annotative: boolean
  scaleMode: 'layout' | 'specify'
  scale: number
  contentType: number
  defaultMTextContents: string
  textStyleName: string
  textAngleType: number
  textColor: AcCmColor
  textHeight: number
  textAlignAlwaysLeft: boolean
  enableFrameText: boolean
  textAttachmentDirection: number
  textLeftAttachmentType: number
  textRightAttachmentType: number
  topTextAttachmentType: number
  bottomTextAttachmentType: number
  landingGap: number
  extendLeaderToText: boolean
  blockName: string
  blockConnectionType: number
  blockColor: AcCmColor
  blockScale: number
  description: string
}

const ANGLE_OPTIONS_DEG = [15, 30, 45, 60, 90, 135, 180] as const

/**
 * Angle choices shown in the Leader Structure tab (degrees).
 */
export const MLEADER_ANGLE_OPTIONS_DEG: readonly number[] = ANGLE_OPTIONS_DEG

function cloneColor(color: AcCmColor | undefined): AcCmColor {
  if (!color) return new AcCmColor(AcCmColorMethod.ByBlock)
  const next = new AcCmColor()
  next.copy(color)
  return next
}

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function radiansToDegrees(radians: number): number {
  if (!Number.isFinite(radians) || radians === 0) return 0
  return Math.round((radians * 180) / Math.PI)
}

function degreesToRadians(degrees: number): number {
  if (!Number.isFinite(degrees) || degrees === 0) return 0
  return (degrees * Math.PI) / 180
}

function nearestAngleOption(degrees: number): number {
  if (!Number.isFinite(degrees) || degrees <= 0) return 45
  let best: number = ANGLE_OPTIONS_DEG[0]
  let bestDist = Math.abs(best - degrees)
  for (const option of ANGLE_OPTIONS_DEG) {
    const dist = Math.abs(option - degrees)
    if (dist < bestDist) {
      best = option
      bestDist = dist
    }
  }
  return best
}

/**
 * Returns sorted multileader style names from the drawing dictionary.
 */
export function listMLeaderStyleNames(db: AcDbDatabase): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const [name] of db.objects.mleaderStyle.entries()) {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    names.push(trimmed)
  }
  names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return names
}

/**
 * Resolves a style by dictionary name (case-insensitive).
 */
export function getMLeaderStyleByName(
  db: AcDbDatabase,
  name: string
): AcDbMLeaderStyle | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  const direct = db.objects.mleaderStyle.getAt(trimmed)
  if (direct) return direct
  const upper = trimmed.toUpperCase()
  for (const [key, style] of db.objects.mleaderStyle.entries()) {
    if (key.toUpperCase() === upper) return style
  }
  return undefined
}

/**
 * Collects style names referenced by multileader entities in the drawing.
 */
export function collectUsedMLeaderStyleNames(db: AcDbDatabase): Set<string> {
  const used = new Set<string>()
  const idToName = new Map<string, string>()
  for (const [name, style] of db.objects.mleaderStyle.entries()) {
    if (style.objectId) idToName.set(style.objectId.toUpperCase(), name)
  }

  for (const block of db.tables.blockTable.newIterator()) {
    const name = block.name ?? ''
    if (name.startsWith('*') && !/^(\*Model_Space|\*Paper_Space)/i.test(name)) {
      continue
    }
    for (const entity of block.newIterator()) {
      if (!(entity instanceof AcDbMLeader)) continue
      const styleId = (entity.mleaderStyleId || entity.leaderStyleId || '')
        .toString()
        .trim()
      if (!styleId) continue
      const byId = idToName.get(styleId.toUpperCase())
      if (byId) {
        used.add(byId)
        continue
      }
      const byName = getMLeaderStyleByName(db, styleId)
      if (!byName) continue
      for (const [styleName, style] of db.objects.mleaderStyle.entries()) {
        if (style === byName) {
          used.add(styleName)
          break
        }
      }
    }
  }
  return used
}

function resolveLinetypeName(
  db: AcDbDatabase,
  lineTypeId: string | undefined
): string {
  if (!lineTypeId) return 'ByBlock'
  for (const record of db.tables.linetypeTable.newIterator()) {
    if (record.objectId === lineTypeId) {
      return record.name || 'ByBlock'
    }
  }
  return 'ByBlock'
}

function resolveLinetypeId(
  db: AcDbDatabase,
  name: string
): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  const record = db.tables.linetypeTable.getAt(trimmed)
  return record?.objectId
}

function resolveTextStyleName(
  db: AcDbDatabase,
  textStyleId: string | undefined
): string {
  if (!textStyleId) return 'Standard'
  for (const record of db.tables.textStyleTable.newIterator()) {
    if (record.objectId === textStyleId) {
      return record.name || record.textStyle?.name || 'Standard'
    }
  }
  return 'Standard'
}

function resolveTextStyleId(
  db: AcDbDatabase,
  name: string
): string | undefined {
  const trimmed = name.trim() || 'Standard'
  const record = db.tables.textStyleTable.getAt(trimmed)
  if (record) return record.objectId
  const upper = trimmed.toUpperCase()
  for (const candidate of db.tables.textStyleTable.newIterator()) {
    const candidateName = candidate.name ?? candidate.textStyle?.name
    if (candidateName?.toUpperCase() === upper) return candidate.objectId
  }
  return undefined
}

function resolveBlockName(
  db: AcDbDatabase,
  blockId: string | undefined
): string {
  if (!blockId) return ''
  for (const record of db.tables.blockTable.newIterator()) {
    if (record.objectId === blockId) return record.name || ''
  }
  return ''
}

function resolveBlockId(
  db: AcDbDatabase,
  name: string
): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  const record = db.tables.blockTable.getAt(trimmed)
  return record?.objectId
}

/**
 * Creates a blank form with AutoCAD-like defaults.
 */
export function createDefaultMLeaderStyleForm(): MLeaderStyleFormState {
  return {
    leaderLineType: AcDbMLeaderLineType.StraightLeader,
    leaderLineColor: new AcCmColor().setByBlock(),
    leaderLineTypeName: 'ByBlock',
    leaderLineWeight: -2,
    arrowSymbolId: '',
    arrowSize: 0.18,
    breakSize: 0.125,
    constrainMaxPoints: true,
    maxLeaderSegmentsPoints: 2,
    constrainFirstAngle: false,
    firstSegmentAngleDegrees: 45,
    constrainSecondAngle: false,
    secondSegmentAngleDegrees: 90,
    enableLanding: true,
    setLandingDistance: true,
    doglegLength: 0.36,
    annotative: false,
    scaleMode: 'specify',
    scale: 1,
    contentType: AcDbMLeaderContentType.MTextContent,
    defaultMTextContents: '',
    textStyleName: 'Standard',
    textAngleType: 1,
    textColor: new AcCmColor().setByBlock(),
    textHeight: 0.25,
    textAlignAlwaysLeft: false,
    enableFrameText: false,
    textAttachmentDirection: AcDbMLeaderTextAttachmentDirection.Horizontal,
    textLeftAttachmentType: 1,
    textRightAttachmentType: 1,
    topTextAttachmentType: 9,
    bottomTextAttachmentType: 9,
    landingGap: 0.09,
    extendLeaderToText: false,
    blockName: '',
    blockConnectionType: 0,
    blockColor: new AcCmColor().setByBlock(),
    blockScale: 1,
    description: ''
  }
}

/**
 * Reads a style object into UI form state.
 */
export function readMLeaderStyleForm(
  db: AcDbDatabase,
  style: AcDbMLeaderStyle
): MLeaderStyleFormState {
  const firstDeg = radiansToDegrees(asNumber(style.firstSegmentAngleConstraint, 0))
  const secondDeg = radiansToDegrees(
    asNumber(style.secondSegmentAngleConstraint, 0)
  )
  const maxPoints = asNumber(style.maxLeaderSegmentsPoints, -1)
  const scale = asNumber(style.scale, 1)
  return {
    leaderLineType: asNumber(
      style.leaderLineType,
      AcDbMLeaderLineType.StraightLeader
    ),
    leaderLineColor: cloneColor(style.leaderLineColor),
    leaderLineTypeName: resolveLinetypeName(db, style.leaderLineTypeId),
    leaderLineWeight: asNumber(style.leaderLineWeight, -2),
    arrowSymbolId: style.arrowSymbolId ?? '',
    arrowSize: asNumber(style.arrowSize, 0.18),
    breakSize: asNumber(style.breakSize, 0.125),
    constrainMaxPoints: maxPoints >= 0,
    maxLeaderSegmentsPoints: maxPoints >= 0 ? maxPoints : 2,
    constrainFirstAngle: firstDeg > 0,
    firstSegmentAngleDegrees: nearestAngleOption(firstDeg || 45),
    constrainSecondAngle: secondDeg > 0,
    secondSegmentAngleDegrees: nearestAngleOption(secondDeg || 90),
    enableLanding: style.enableLanding !== false,
    setLandingDistance: style.enableDogleg !== false,
    doglegLength: asNumber(style.doglegLength, 0.36),
    annotative: !!style.annotative,
    scaleMode: scale === 0 ? 'layout' : 'specify',
    scale: scale === 0 ? 1 : scale,
    contentType: asNumber(
      style.contentType,
      AcDbMLeaderContentType.MTextContent
    ),
    defaultMTextContents: style.defaultMTextContents ?? '',
    textStyleName: resolveTextStyleName(db, style.textStyleId),
    textAngleType: asNumber(style.textAngleType, 1),
    textColor: cloneColor(style.textColor),
    textHeight: asNumber(style.textHeight, 0.25),
    textAlignAlwaysLeft: !!style.textAlignAlwaysLeft,
    enableFrameText: !!style.enableFrameText,
    textAttachmentDirection: asNumber(
      style.textAttachmentDirection,
      AcDbMLeaderTextAttachmentDirection.Horizontal
    ),
    textLeftAttachmentType: asNumber(style.textLeftAttachmentType, 1),
    textRightAttachmentType: asNumber(style.textRightAttachmentType, 1),
    topTextAttachmentType: asNumber(style.topTextAttachmentType, 9),
    bottomTextAttachmentType: asNumber(style.bottomTextAttachmentType, 9),
    landingGap: asNumber(style.landingGap, 0.09),
    extendLeaderToText: !!style.extendLeaderToText,
    blockName: resolveBlockName(db, style.blockId),
    blockConnectionType: asNumber(style.blockConnectionType, 0),
    blockColor: cloneColor(style.blockColor),
    blockScale: asNumber(style.blockScale?.x, 1),
    description: style.description ?? ''
  }
}

/**
 * Writes UI form state onto a style object.
 */
export function writeMLeaderStyleForm(
  db: AcDbDatabase,
  style: AcDbMLeaderStyle,
  form: MLeaderStyleFormState
) {
  style.leaderLineType = form.leaderLineType
  style.leaderLineColor = form.leaderLineColor
  style.leaderLineTypeId = resolveLinetypeId(db, form.leaderLineTypeName)
  style.leaderLineWeight = form.leaderLineWeight
  style.arrowSymbolId = form.arrowSymbolId || undefined
  style.arrowSize = form.arrowSize
  style.breakSize = form.breakSize
  style.maxLeaderSegmentsPoints = form.constrainMaxPoints
    ? Math.max(2, Math.floor(form.maxLeaderSegmentsPoints))
    : -1
  style.firstSegmentAngleConstraint = form.constrainFirstAngle
    ? degreesToRadians(form.firstSegmentAngleDegrees)
    : 0
  style.secondSegmentAngleConstraint = form.constrainSecondAngle
    ? degreesToRadians(form.secondSegmentAngleDegrees)
    : 0
  style.enableLanding = form.enableLanding
  style.enableDogleg = form.setLandingDistance
  style.doglegLength = form.doglegLength
  style.annotative = form.annotative
  style.scale = form.annotative
    ? form.scale
    : form.scaleMode === 'layout'
      ? 0
      : form.scale
  style.contentType = form.contentType
  style.defaultMTextContents = form.defaultMTextContents
  style.textStyleId = resolveTextStyleId(db, form.textStyleName)
  style.textAngleType = form.textAngleType
  style.textColor = form.textColor
  style.textHeight = form.textHeight
  style.textAlignAlwaysLeft = form.textAlignAlwaysLeft
  style.enableFrameText = form.enableFrameText
  style.textAttachmentDirection = form.textAttachmentDirection
  style.textLeftAttachmentType = form.textLeftAttachmentType
  style.textRightAttachmentType = form.textRightAttachmentType
  style.topTextAttachmentType = form.topTextAttachmentType
  style.bottomTextAttachmentType = form.bottomTextAttachmentType
  style.landingGap = form.landingGap
  style.extendLeaderToText = form.extendLeaderToText
  style.blockId = resolveBlockId(db, form.blockName)
  style.blockConnectionType = form.blockConnectionType
  style.blockColor = form.blockColor
  style.blockScale = new AcGeVector3d(
    form.blockScale,
    form.blockScale,
    form.blockScale
  )
  style.description = form.description
}

/**
 * Applies form values onto a fresh style used only for preview rendering.
 */
export function buildPreviewMLeaderStyle(
  db: AcDbDatabase,
  form: MLeaderStyleFormState
): AcDbMLeaderStyle {
  const style = new AcDbMLeaderStyle()
  writeMLeaderStyleForm(db, style, form)
  return style
}

/**
 * Deep-copies style property values from `source` onto `target`.
 */
export function copyMLeaderStyle(
  db: AcDbDatabase,
  source: AcDbMLeaderStyle,
  target: AcDbMLeaderStyle
) {
  writeMLeaderStyleForm(db, target, readMLeaderStyleForm(db, source))
}

/**
 * Creates an MLeader style with AutoCAD "Standard" defaults (mirrors
 * `AcDbDatabase.ensureMLeaderStyle`).
 */
export function createStandardMLeaderStyle(db: AcDbDatabase): AcDbMLeaderStyle {
  const style = new AcDbMLeaderStyle()
  style.unknown1 = 2
  style.maxLeaderSegmentsPoints = 2
  style.leaderLineColor = new AcCmColor().setByBlock()
  style.textColor = new AcCmColor().setByBlock()
  style.blockColor = new AcCmColor().setByBlock()
  style.contentType = AcDbMLeaderContentType.MTextContent
  style.alignSpace = 4
  style.breakSize = 3.75
  style.enableBlockRotation = true
  style.unknown2 = false
  const byBlockLinetype = db.tables.linetypeTable.getAt(ByBlock)
  style.leaderLineTypeId = byBlockLinetype?.objectId
  const standardTextStyle = db.tables.textStyleTable.getAt(DEFAULT_TEXT_STYLE)
  style.textStyleId = standardTextStyle?.objectId
  return style
}
