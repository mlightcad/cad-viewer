import {
  AcDbDatabase,
  acdbFindScale,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLeaderDirectionType,
  AcDbMLeaderLineType,
  AcDbMLeaderPropertyOverrideFlag,
  AcDbMLeaderStyle,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

/**
 * Session overrides applied while running MLEADER (Options branch).
 */
export interface AcApMLeaderSessionOptions {
  leaderLineType?: AcDbMLeaderLineType
  enableLanding?: boolean
  doglegLength?: number
  contentType?: AcDbMLeaderContentType
  maxPoints?: number
  firstAngle?: number
  secondAngle?: number
  blockName?: string
}

export type AcApMLeaderPlacementMode =
  | 'arrowheadFirst'
  | 'landingFirst'
  | 'contentFirst'

export interface AcApMLeaderGeometry {
  arrowPoint: AcGePoint3d
  landingPoint: AcGePoint3d
  doglegStart: AcGePoint3d
  doglegVector: { x: number; y: number; z: number }
  doglegLength: number
  enableLanding: boolean
  directionType: AcDbMLeaderDirectionType
  /**
   * Leader-line vertices: arrowhead and intermediate points. The line ends
   * at `doglegStart`, stored as the branch's last leader point.
   */
  vertices: AcGePoint3d[]
  textLocation: AcGePoint3d
}

/**
 * Resolves the active multileader style for the database.
 */
export function acapResolveMLeaderStyle(
  db: AcDbDatabase
): AcDbMLeaderStyle | undefined {
  const name = db.cmleaderstyle || DEFAULT_STYLE_NAME
  const dictionary = db.objects.mleaderStyle
  if (!dictionary.getAt(name)) {
    // New drawings get their "Standard" style lazily on the first MLEADER
    // append; create it now so the preview already follows the style.
    db.ensureEntityStyleDefaults(new AcDbMLeader())
  }
  return dictionary.getAt(name) ?? dictionary.getAt(DEFAULT_STYLE_NAME)
}

/**
 * Current annotation scale factor (drawing units per paper unit) from
 * CANNOSCALE, e.g. `50` for `1:50`.
 */
export function acapAnnotationScaleFactor(db: AcDbDatabase): number {
  const factor = acdbFindScale(db, db.cannoscale)?.scaleFactor
  return factor != null && factor > 0 ? factor : 1
}

/**
 * Creates a multileader that follows the current multileader style, with
 * the MLEADER Options overrides of this session applied on top (stored as
 * entity property overrides, like AutoCAD).
 */
export function acapCreateMLeader(
  db: AcDbDatabase,
  session: AcApMLeaderSessionOptions = {}
): AcDbMLeader {
  const mleader = new AcDbMLeader()
  const style = acapResolveMLeaderStyle(db)
  if (style) {
    mleader.applyMLeaderStyle(style, acapAnnotationScaleFactor(db))
  }
  let overrides = mleader.propertyOverrideFlag ?? 0
  if (session.leaderLineType != null) {
    mleader.leaderLineType = session.leaderLineType
    overrides |= AcDbMLeaderPropertyOverrideFlag.LeaderLineType
  }
  if (session.enableLanding != null) {
    mleader.doglegEnabled = session.enableLanding
    overrides |= AcDbMLeaderPropertyOverrideFlag.DoglegEnabled
  }
  if (session.doglegLength != null) {
    mleader.doglegLength = session.doglegLength
    overrides |= AcDbMLeaderPropertyOverrideFlag.DoglegLength
  }
  mleader.propertyOverrideFlag = overrides
  mleader.contentType = acapResolveMLeaderContentType(style, session)
  return mleader
}

/**
 * Lays out the first leader of `mleader` from an arrowhead to a landing /
 * content point and attaches the content next to the landing.
 *
 * `mleader` must come from {@link acapCreateMLeader}: its landing settings
 * (already scaled by the style) drive the geometry.
 */
export function acapLayoutMLeader(
  mleader: AcDbMLeader,
  arrowPoint: AcGePoint3dLike,
  contentPoint: AcGePoint3dLike,
  session: AcApMLeaderSessionOptions = {},
  intermediatePoints: AcGePoint3dLike[] = []
) {
  const geometry = acapBuildMLeaderGeometry(
    arrowPoint,
    contentPoint,
    undefined,
    {
      ...session,
      enableLanding: mleader.doglegEnabled,
      doglegLength: mleader.doglegEnabled ? mleader.doglegLength : 0
    },
    intermediatePoints
  )
  acapApplyMLeaderGeometry(mleader, geometry, session)
  if (
    mleader.contentType === AcDbMLeaderContentType.MTextContent &&
    !mleader.mtextContent
  ) {
    mleader.contents = ''
  }
  mleader.attachContentToLanding(0)
  return geometry
}

const DEFAULT_STYLE_NAME = 'Standard'

/**
 * Normalizes a keyword `globalName` / typed token for comparison.
 * Editor returns multi-word globals such as `"Landing first"`.
 */
export function acapNormalizeKeyword(value: string | undefined): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Returns true when the prompt keyword result matches any candidate token.
 */
export function acapMatchKeyword(
  stringResult: string | undefined,
  ...candidates: string[]
): boolean {
  const key = acapNormalizeKeyword(stringResult)
  if (!key) return false
  return candidates.some(candidate => acapNormalizeKeyword(candidate) === key)
}

/**
 * Constrains `to` so the segment from `from` uses a fixed absolute angle
 * (degrees, CCW from +X) when `angleDeg` is set.
 */
export function acapConstrainPointByAngle(
  from: AcGePoint3dLike,
  to: AcGePoint3dLike,
  angleDeg: number | undefined
): AcGePoint3d {
  const target = new AcGePoint3d().copy(to)
  if (angleDeg == null || !Number.isFinite(angleDeg)) return target
  const dx = target.x - from.x
  const dy = target.y - from.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-10) return target
  const radians = (angleDeg * Math.PI) / 180
  return new AcGePoint3d(
    from.x + Math.cos(radians) * distance,
    from.y + Math.sin(radians) * distance,
    from.z
  )
}

/**
 * Builds leader geometry from an arrow tip and a content/landing point.
 *
 * @param intermediatePoints Optional vertices between arrow and landing
 *   (used when Maxpoints &gt; 2).
 */
export function acapBuildMLeaderGeometry(
  arrowPoint: AcGePoint3dLike,
  contentPoint: AcGePoint3dLike,
  style: AcDbMLeaderStyle | undefined,
  session: AcApMLeaderSessionOptions = {},
  intermediatePoints: AcGePoint3dLike[] = []
): AcApMLeaderGeometry {
  const arrow = new AcGePoint3d().copy(arrowPoint)
  let content = new AcGePoint3d().copy(contentPoint)
  const enableLanding =
    session.enableLanding ??
    (style ? style.enableLanding && style.enableDogleg : true)
  const styleScale = style && style.scale > 0 ? style.scale : 1
  const resolvedDogleg =
    session.doglegLength ??
    (enableLanding ? (style?.doglegLength ?? 8) * styleScale : 0)

  const mids = intermediatePoints.map(p => new AcGePoint3d().copy(p))
  if (session.firstAngle != null && mids.length === 0) {
    content = acapConstrainPointByAngle(arrow, content, session.firstAngle)
  } else if (session.firstAngle != null && mids.length > 0) {
    mids[0] = acapConstrainPointByAngle(arrow, mids[0], session.firstAngle)
  }
  if (session.secondAngle != null && mids.length >= 1) {
    const from = mids[0]
    const to = mids[1] ?? content
    const constrained = acapConstrainPointByAngle(from, to, session.secondAngle)
    if (mids.length >= 2) mids[1] = constrained
    else content = constrained
  }

  const dx = content.x - arrow.x
  const direction = dx >= 0 ? 1 : -1
  const directionType =
    direction > 0
      ? AcDbMLeaderDirectionType.Left
      : AcDbMLeaderDirectionType.Right

  if (enableLanding && resolvedDogleg > 0) {
    const doglegStart = new AcGePoint3d(
      content.x - direction * resolvedDogleg,
      content.y,
      content.z
    )
    return {
      arrowPoint: arrow,
      landingPoint: doglegStart.clone(),
      doglegStart,
      doglegVector: { x: direction, y: 0, z: 0 },
      doglegLength: resolvedDogleg,
      enableLanding: true,
      directionType,
      vertices: [arrow.clone(), ...mids.map(p => p.clone())],
      textLocation: content.clone()
    }
  }

  return {
    arrowPoint: arrow,
    landingPoint: content.clone(),
    doglegStart: content.clone(),
    doglegVector: { x: direction, y: 0, z: 0 },
    doglegLength: 0,
    enableLanding: false,
    directionType,
    vertices: [arrow.clone(), ...mids.map(p => p.clone())],
    textLocation: content.clone()
  }
}

/**
 * Applies arrow/landing geometry onto a multileader (creating the first branch).
 */
export function acapApplyMLeaderGeometry(
  mleader: AcDbMLeader,
  geometry: AcApMLeaderGeometry,
  session: AcApMLeaderSessionOptions = {}
) {
  while (mleader.numberOfLeaders > 0) {
    mleader.removeLeader(0)
  }

  if (session.leaderLineType != null) {
    mleader.leaderLineType = session.leaderLineType
  }
  mleader.doglegEnabled = geometry.enableLanding
  mleader.doglegLength = geometry.doglegLength
  mleader.doglegVector = geometry.doglegVector

  if (mleader.leaderLineType === AcDbMLeaderLineType.InvisibleLeader) {
    // No leader branch: the landing lives on the entity itself.
    mleader.landingPoint = geometry.landingPoint
    if (mleader.contentType === AcDbMLeaderContentType.MTextContent) {
      mleader.textLocation = geometry.textLocation
    }
    return
  }
  mleader.landingPoint = undefined

  const leaderIndex = mleader.addLeader({
    landingPoint: geometry.landingPoint,
    doglegVector: geometry.doglegVector,
    doglegVectorSet: true,
    doglegLength: geometry.doglegLength,
    directionType: geometry.directionType,
    lastLeaderLinePoint: geometry.doglegStart,
    lastLeaderLinePointSet: true
  })
  mleader.addLeaderLine(leaderIndex, geometry.vertices)
  if (mleader.contentType === AcDbMLeaderContentType.MTextContent) {
    mleader.textLocation = geometry.textLocation
  }
}

/**
 * Adds a leader line with its arrowhead at `arrowPoint` (MLEADEREDIT Add
 * leader): it joins the landing on the side of the content facing the
 * point, or gets a new landing on the other side of the content.
 *
 * @param mleader Multileader to edit.
 * @param arrowPoint Arrowhead location of the new leader line.
 * @param _style Ignored; kept for backward compatibility. The landing now
 *   follows the multileader itself.
 * @param _session Ignored; kept for backward compatibility.
 * @returns Index of the branch that received the new line.
 */
export function acapAddMLeaderBranch(
  mleader: AcDbMLeader,
  arrowPoint: AcGePoint3dLike,
  _style?: AcDbMLeaderStyle,
  _session?: AcApMLeaderSessionOptions
) {
  return mleader.addLeaderLineAtPoint(arrowPoint).leaderIndex
}

/**
 * Counts total leader lines across all branches.
 */
export function acapCountMLeaderLines(mleader: AcDbMLeader): number {
  return mleader.leaders.reduce(
    (sum, leader) => sum + leader.leaderLines.length,
    0
  )
}

/**
 * Distance in XY from `p` to the segment `a`–`b`.
 */
function distanceToSegment(
  p: AcGePoint3dLike,
  a: AcGePoint3dLike,
  b: AcGePoint3dLike
) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  const t =
    lengthSq > 0
      ? Math.min(
          1,
          Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)
        )
      : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Finds the leader line nearest to a pick point.
 *
 * The distance is measured to the whole drawn line — arrowhead, intermediate
 * vertices and the point where it meets its landing — so the user can pick a
 * leader anywhere along it, like AutoCAD's MLEADEREDIT *Remove leaders*.
 *
 * @param maxDistance When set, returns null if the nearest line is farther.
 */
export function acapFindNearestMLeaderLine(
  mleader: AcDbMLeader,
  pick: AcGePoint3dLike,
  maxDistance?: number
): { leaderIndex: number; lineIndex: number; distance: number } | null {
  let bestLeaderIndex = -1
  let bestLineIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY

  const leaders = mleader.leaders
  for (let leaderIndex = 0; leaderIndex < leaders.length; leaderIndex++) {
    const leader = leaders[leaderIndex]
    // Stored vertices stop before the landing; the drawn line ends there.
    const end =
      leader.lastLeaderLinePoint ??
      leader.landingPoint ??
      mleader.landingPoint ??
      mleader.contentBasePosition
    const lines = leader.leaderLines
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const points: AcGePoint3dLike[] = [...lines[lineIndex].vertices]
      if (points.length === 0) continue
      if (end) points.push(end)
      let distance = Math.hypot(points[0].x - pick.x, points[0].y - pick.y)
      for (let i = 1; i < points.length; i++) {
        distance = Math.min(
          distance,
          distanceToSegment(pick, points[i - 1], points[i])
        )
      }
      if (distance < bestDistance) {
        bestDistance = distance
        bestLeaderIndex = leaderIndex
        bestLineIndex = lineIndex
      }
    }
  }

  if (bestLeaderIndex < 0) return null
  if (
    maxDistance != null &&
    Number.isFinite(maxDistance) &&
    bestDistance > maxDistance
  ) {
    return null
  }
  return {
    leaderIndex: bestLeaderIndex,
    lineIndex: bestLineIndex,
    distance: bestDistance
  }
}

/**
 * Removes one leader line; drops the branch when it becomes empty.
 */
export function acapRemoveMLeaderLine(
  mleader: AcDbMLeader,
  leaderIndex: number,
  lineIndex: number
): boolean {
  if (leaderIndex < 0 || leaderIndex >= mleader.numberOfLeaders) return false
  const leaders = mleader.leaders
  const leader = leaders[leaderIndex]
  if (!leader || lineIndex < 0 || lineIndex >= leader.leaderLines.length) {
    return false
  }

  if (leader.leaderLines.length <= 1) {
    mleader.removeLeader(leaderIndex)
    return true
  }

  // AcDbMLeader has no per-line removal: rebuild this branch and the ones
  // after it (the getter returns deep clones) so branch order — and with it
  // which landing the content follows — stays the same.
  leader.leaderLines.splice(lineIndex, 1)
  while (mleader.numberOfLeaders > leaderIndex) {
    mleader.removeLeader(leaderIndex)
  }
  for (const rest of leaders.slice(leaderIndex)) {
    mleader.addLeader(rest)
  }
  return true
}

/**
 * Default content type from style or session.
 */
export function acapResolveMLeaderContentType(
  style: AcDbMLeaderStyle | undefined,
  session: AcApMLeaderSessionOptions
): AcDbMLeaderContentType {
  if (session.contentType != null) return session.contentType
  const fromStyle = style?.contentType
  if (fromStyle === AcDbMLeaderContentType.BlockContent) {
    return AcDbMLeaderContentType.BlockContent
  }
  if (fromStyle === AcDbMLeaderContentType.NoneContent) {
    return AcDbMLeaderContentType.NoneContent
  }
  return AcDbMLeaderContentType.MTextContent
}

export type AcApMLeaderJigDragMode = 'landingFromArrow' | 'arrowFromLanding'

/**
 * Arrowhead and landing points of a multileader being placed.
 */
export interface AcApMLeaderPlacement {
  arrow: AcGePoint3d
  landing: AcGePoint3d
}

/**
 * Resolves the arrowhead / landing pair for a placement step.
 *
 * In content-first mode the fixed point is where the text goes: the landing
 * ends one landing gap before it, on the side facing the arrowhead.
 */
export function acapResolveMLeaderPlacement(
  fixedPoint: AcGePoint3dLike,
  point: AcGePoint3dLike,
  dragMode: AcApMLeaderJigDragMode,
  contentGap?: number
): AcApMLeaderPlacement {
  const fixed = new AcGePoint3d().copy(fixedPoint)
  const moving = new AcGePoint3d().copy(point)
  if (dragMode === 'landingFromArrow') {
    return { arrow: fixed, landing: moving }
  }
  const landing = fixed.clone()
  if (contentGap != null && contentGap > 0) {
    landing.x -= (fixed.x >= moving.x ? 1 : -1) * contentGap
  }
  return { arrow: moving, landing }
}
