import {
  AcDbDatabase,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLeaderDirectionType,
  AcDbMLeaderLineType,
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
  return (
    db.objects.mleaderStyle.getAt(name) ??
    db.objects.mleaderStyle.getAt(DEFAULT_STYLE_NAME)
  )
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
    style?.enableLanding ??
    style?.landingEnabled ??
    true
  const styleDogleg = style?.doglegLength ?? 8
  const resolvedDogleg =
    session.doglegLength ??
    (enableLanding && (style?.doglegEnabled ?? style?.enableDogleg ?? true)
      ? styleDogleg
      : 0)

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
      vertices: [arrow.clone(), ...mids.map(p => p.clone()), doglegStart.clone()],
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
    vertices: [arrow.clone(), ...mids.map(p => p.clone()), content.clone()],
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

  const leaderType =
    session.leaderLineType ?? AcDbMLeaderLineType.StraightLeader
  mleader.leaderLineType = leaderType
  mleader.doglegEnabled = geometry.enableLanding
  mleader.doglegLength = geometry.doglegLength
  mleader.doglegVector = geometry.doglegVector
  mleader.landingPoint = geometry.landingPoint

  if (leaderType === AcDbMLeaderLineType.InvisibleLeader) {
    mleader.textLocation = geometry.textLocation
    return
  }

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
  mleader.textLocation = geometry.textLocation
}

/**
 * Adds an extra leader branch aimed at the same content location.
 */
export function acapAddMLeaderBranch(
  mleader: AcDbMLeader,
  arrowPoint: AcGePoint3dLike,
  style: AcDbMLeaderStyle | undefined,
  session: AcApMLeaderSessionOptions = {}
) {
  const content =
    mleader.textLocation ??
    mleader.landingPoint ??
    (mleader.leaders[0]?.landingPoint
      ? mleader.leaders[0].landingPoint
      : undefined)
  if (!content) return -1

  const geometry = acapBuildMLeaderGeometry(arrowPoint, content, style, {
    ...session,
    enableLanding: session.enableLanding ?? mleader.doglegEnabled,
    doglegLength: session.doglegLength ?? mleader.doglegLength
  })

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
  return leaderIndex
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
 * Finds the leader/line indexes whose tip is nearest to a pick point.
 *
 * @param maxDistance When set, returns null if the nearest tip is farther.
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
    const lines = leaders[leaderIndex].leaderLines
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const tip = lines[lineIndex].vertices[0]
      if (!tip) continue
      const distance = Math.hypot(tip.x - pick.x, tip.y - pick.y)
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

  // Rebuild the branch without the selected line.
  const remaining = leader.leaderLines
    .filter((_, index) => index !== lineIndex)
    .map(line => ({
      vertices: line.vertices.map(p => p.clone()),
      breakPointIndexes: [...line.breakPointIndexes],
      breaks: line.breaks.map(b => ({
        index: b.index,
        start: b.start.clone(),
        end: b.end.clone()
      }))
    }))

  mleader.removeLeader(leaderIndex)
  const newIndex = mleader.addLeader({
    landingPoint: leader.landingPoint,
    doglegVector: leader.doglegVector,
    doglegVectorSet: leader.doglegVectorSet,
    doglegLength: leader.doglegLength,
    directionType: leader.directionType,
    lastLeaderLinePoint: leader.lastLeaderLinePoint,
    lastLeaderLinePointSet: leader.lastLeaderLinePointSet,
    breaks: leader.breaks.map(b => ({
      index: b.index,
      start: b.start.clone(),
      end: b.end.clone()
    })),
    leaderLines: remaining
  })
  return newIndex >= 0
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
