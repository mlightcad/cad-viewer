import {
  AcDbMLine,
  AcDbMLineJustification,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDoubleOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'

const ACAP_MLINE_EPSILON = 1e-9

/**
 * Preview jig that renders an MLINE from confirmed points and the current cursor point.
 */
export class AcApMLineJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _mline: AcDbMLine
  private _points: AcGePoint3d[]
  private _resolveState: () => {
    justification: AcDbMLineJustification
    scale: number
    styleName: string
    elementOffsets: number[]
  }

  constructor(
    view: AcEdBaseView,
    points: AcGePoint3d[],
    resolveState: () => {
      justification: AcDbMLineJustification
      scale: number
      styleName: string
      elementOffsets: number[]
    }
  ) {
    super(view)
    this._mline = new AcDbMLine()
    this._points = points
    this._resolveState = resolveState
    if (points.length > 0) {
      const state = this._resolveState()
      applyMLineGeometry(
        this._mline,
        points,
        state.styleName,
        state.justification,
        state.scale,
        false,
        state.elementOffsets
      )
    }
  }

  get entity(): AcDbMLine {
    return this._mline
  }

  update(point: AcGePoint3dLike) {
    if (this._points.length <= 0) return
    const previewPoints = [...this._points, new AcGePoint3d(point)]
    const state = this._resolveState()
    applyMLineGeometry(
      this._mline,
      previewPoints,
      state.styleName,
      state.justification,
      state.scale,
      false,
      state.elementOffsets
    )
  }
}

/**
 * Command to create one AcDbMLine entity.
 *
 * Behavior is aligned with AutoCAD MLINE:
 * - Supports `Justification`, `Scale`, `Style` options during point input.
 * - Supports `Undo` and `Close` after first segment.
 */
export class AcApMLineCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    let justification = AcDbMLineJustification.Zero
    let scale = db.cmlscale ?? 1
    let styleName = db.cmlstyle || 'STANDARD'

    const points: AcGePoint3d[] = []
    let shouldClose = false
    const resolveStyleElementOffsets = () => {
      const style = db.objects.mlineStyle.getAt(styleName)
      return resolveMLineStyleElementOffsets(
        style?.elements ?? [],
        justification,
        scale
      )
    }
    const appendPoint = (point: AcGePoint3dLike) =>
      points.push(new AcGePoint3d(point))
    const undoLastPoint = () => {
      if (points.length > 1) {
        points.pop()
      }
    }
    const closePath = () => {
      if (points.length <= 1) return
      const first = points[0]
      const current = points[points.length - 1]
      if (!isSamePoint3d(first, current)) {
        appendPoint(first)
      }
      shouldClose = true
    }

    const promptJustification = async () => {
      const prompt = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.mline.justificationPrompt')
      )
      prompt.allowNone = true
      prompt.keywords.add(
        AcApI18n.t('jig.mline.keywords.top.display'),
        AcApI18n.t('jig.mline.keywords.top.global'),
        AcApI18n.t('jig.mline.keywords.top.local')
      )
      prompt.keywords.add(
        AcApI18n.t('jig.mline.keywords.zero.display'),
        AcApI18n.t('jig.mline.keywords.zero.global'),
        AcApI18n.t('jig.mline.keywords.zero.local')
      )
      prompt.keywords.add(
        AcApI18n.t('jig.mline.keywords.bottom.display'),
        AcApI18n.t('jig.mline.keywords.bottom.global'),
        AcApI18n.t('jig.mline.keywords.bottom.local')
      )
      const result = await AcApDocManager.instance.editor.getKeywords(prompt)
      if (result.status === AcEdPromptStatus.None) return true
      if (result.status !== AcEdPromptStatus.Keyword) return false

      const keyword = result.stringResult ?? ''
      if (keyword === 'Top') {
        justification = AcDbMLineJustification.Top
      } else if (keyword === 'Bottom') {
        justification = AcDbMLineJustification.Bottom
      } else {
        justification = AcDbMLineJustification.Zero
      }
      return true
    }

    const promptScale = async () => {
      const prompt = new AcEdPromptDoubleOptions(AcApI18n.t('jig.mline.scalePrompt'))
      prompt.allowNone = true
      prompt.allowZero = true
      prompt.allowNegative = true
      prompt.useDefaultValue = true
      prompt.defaultValue = scale
      const result = await AcApDocManager.instance.editor.getDouble(prompt)
      if (result.status === AcEdPromptStatus.None) return true
      if (result.status !== AcEdPromptStatus.OK) return false
      scale = result.value ?? scale
      return true
    }

    const showStyleList = () => {
      const styleNames = [...db.objects.mlineStyle.entries()].map(
        ([name]) => name
      )
      if (styleNames.length <= 0) {
        AcApDocManager.instance.editor.showMessage(
          AcApI18n.t('jig.mline.styleListEmpty'),
          'warning'
        )
        return
      }
      AcApDocManager.instance.editor.showMessage(
        `${AcApI18n.t('jig.mline.styleListHeader')} ${styleNames.join(', ')}`,
        'info'
      )
    }

    const promptStyle = async () => {
      while (true) {
        const prompt = new AcEdPromptStringOptions(
          AcApI18n.t('jig.mline.stylePrompt')
        )
        prompt.allowEmpty = false
        prompt.allowSpaces = false
        const result = await AcApDocManager.instance.editor.getString(prompt)
        if (result.status !== AcEdPromptStatus.OK) return false

        const raw = (result.stringResult ?? '').trim()
        if (!raw) continue
        if (raw === '?') {
          showStyleList()
          continue
        }

        styleName = raw
        return true
      }
    }

    const handleCommonKeyword = async (keyword: string) => {
      if (keyword === 'Justification') return await promptJustification()
      if (keyword === 'Scale') return await promptScale()
      if (keyword === 'Style') return await promptStyle()
      return true
    }

    // Start point
    while (true) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.mline.startPointWithOptions')
      )
      prompt.keywords.add(
        AcApI18n.t('jig.mline.keywords.justification.display'),
        AcApI18n.t('jig.mline.keywords.justification.global'),
        AcApI18n.t('jig.mline.keywords.justification.local')
      )
      prompt.keywords.add(
        AcApI18n.t('jig.mline.keywords.scale.display'),
        AcApI18n.t('jig.mline.keywords.scale.global'),
        AcApI18n.t('jig.mline.keywords.scale.local')
      )
      prompt.keywords.add(
        AcApI18n.t('jig.mline.keywords.style.display'),
        AcApI18n.t('jig.mline.keywords.style.global'),
        AcApI18n.t('jig.mline.keywords.style.local')
      )
      const result = await AcApDocManager.instance.editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.OK) {
        appendPoint(result.value!)
        break
      }
      if (result.status !== AcEdPromptStatus.Keyword) {
        return
      }
      const keepRunning = await handleCommonKeyword(result.stringResult ?? '')
      if (!keepRunning) return
    }

    type StepResult = AcEdPromptStateStep
    type MLineState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >

    class NextPointState implements MLineState {
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.mline.nextPointWithOptions')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.mline.keywords.justification.display'),
          AcApI18n.t('jig.mline.keywords.justification.global'),
          AcApI18n.t('jig.mline.keywords.justification.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.mline.keywords.scale.display'),
          AcApI18n.t('jig.mline.keywords.scale.global'),
          AcApI18n.t('jig.mline.keywords.scale.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.mline.keywords.style.display'),
          AcApI18n.t('jig.mline.keywords.style.global'),
          AcApI18n.t('jig.mline.keywords.style.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.mline.keywords.undo.display'),
          AcApI18n.t('jig.mline.keywords.undo.global'),
          AcApI18n.t('jig.mline.keywords.undo.local')
        )
        if (points.length > 1) {
          prompt.keywords.add(
            AcApI18n.t('jig.mline.keywords.close.display'),
            AcApI18n.t('jig.mline.keywords.close.global'),
            AcApI18n.t('jig.mline.keywords.close.local')
          )
        }
        prompt.useDashedLine = true
        prompt.useBasePoint = true
        prompt.basePoint = new AcGePoint3d(points[points.length - 1])
        prompt.jig = new AcApMLineJig(context.view, points, () => ({
          justification,
          scale,
          styleName,
          elementOffsets: resolveStyleElementOffsets()
        }))
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          appendPoint(result.value!)
          return 'continue'
        }

        if (result.status !== AcEdPromptStatus.Keyword) {
          return 'finish'
        }

        const keyword = result.stringResult ?? ''
        if (keyword === 'Undo') {
          undoLastPoint()
          return 'continue'
        }
        if (keyword === 'Close' && points.length > 1) {
          closePath()
          return 'finish'
        }

        const keepRunning = await handleCommonKeyword(keyword)
        return keepRunning ? 'continue' : 'finish'
      }
    }

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new NextPointState())
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))

    if (points.length < 2) return

    const mline = new AcDbMLine()
    applyMLineGeometry(
      mline,
      points,
      styleName,
      justification,
      scale,
      shouldClose,
      resolveStyleElementOffsets()
    )
    db.tables.blockTable.modelSpace.appendEntity(mline)
    db.cmlstyle = styleName
    db.cmlscale = scale
  }
}

function applyMLineGeometry(
  mline: AcDbMLine,
  points: AcGePoint3dLike[],
  styleName: string,
  justification: AcDbMLineJustification,
  scale: number,
  closed: boolean,
  elementOffsets: number[]
) {
  if (points.length <= 0) {
    mline.clearSegments()
    return
  }

  mline.styleName = styleName
  // Let AcDbMLine resolve style from current database style dictionaries.
  mline.styleObjectHandle = ''
  mline.justification = justification
  mline.scale = scale
  mline.styleCount = elementOffsets.length
  mline.closed = closed
  mline.startPosition = points[0]

  if (points.length < 2) {
    mline.clearSegments()
    return
  }

  mline.segments = createMLineSegments(points, elementOffsets)
}

function createMLineSegments(
  points: AcGePoint3dLike[],
  elementOffsets: number[]
) {
  const edgeDirections = createEdgeDirections(points)
  return points.slice(1).map((position, index) => {
    const vertexIndex = index + 1
    const miter = createMiterInfo(edgeDirections, vertexIndex)
    return {
      position,
      direction: edgeDirections[Math.min(vertexIndex, edgeDirections.length - 1)],
      miterDirection: miter.direction,
      elements: elementOffsets.map(offset => ({
        parameterCount: 1,
        parameters: [offset * miter.offsetScale],
        fillCount: 0,
        fillParameters: []
      }))
    }
  })
}

function createEdgeDirections(points: AcGePoint3dLike[]): AcGeVector3dLike[] {
  const directions: AcGeVector3dLike[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]
    const to = points[i + 1]
    const direction = normalizeVector({
      x: to.x - from.x,
      y: to.y - from.y,
      z: to.z - from.z
    })
    directions.push(direction ?? { x: 1, y: 0, z: 0 })
  }
  return directions
}

function createMiterInfo(
  edgeDirections: AcGeVector3dLike[],
  vertexIndex: number
): { direction: AcGeVector3dLike; offsetScale: number } {
  if (edgeDirections.length <= 0) {
    return { direction: { x: 0, y: 1, z: 0 }, offsetScale: 1 }
  }
  if (vertexIndex <= 0) {
    return { direction: leftNormal(edgeDirections[0]), offsetScale: 1 }
  }
  if (vertexIndex >= edgeDirections.length) {
    return {
      direction: leftNormal(edgeDirections[edgeDirections.length - 1]),
      offsetScale: 1
    }
  }

  const prevNormal = leftNormal(edgeDirections[vertexIndex - 1])
  const nextNormal = leftNormal(edgeDirections[vertexIndex])
  const blended = normalizeVector({
    x: prevNormal.x + nextNormal.x,
    y: prevNormal.y + nextNormal.y,
    z: prevNormal.z + nextNormal.z
  })
  if (!blended) {
    return { direction: nextNormal, offsetScale: 1 }
  }

  const projection = Math.abs(dotVector(blended, nextNormal))
  if (projection <= ACAP_MLINE_EPSILON) {
    return { direction: blended, offsetScale: 1 }
  }

  return {
    direction: blended,
    offsetScale: 1 / projection
  }
}

function resolveMLineStyleElementOffsets(
  elements: Array<{ offset: number }>,
  justification: AcDbMLineJustification,
  scale: number
): number[] {
  if (elements.length <= 0) return []

  let minOffset = Number.POSITIVE_INFINITY
  let maxOffset = Number.NEGATIVE_INFINITY
  for (const element of elements) {
    if (element.offset < minOffset) minOffset = element.offset
    if (element.offset > maxOffset) maxOffset = element.offset
  }

  let shift = 0
  if (justification === AcDbMLineJustification.Top) {
    shift = -maxOffset
  } else if (justification === AcDbMLineJustification.Bottom) {
    shift = -minOffset
  }

  return elements.map(element => (element.offset + shift) * scale)
}

function leftNormal(vector: AcGeVector3dLike): AcGeVector3dLike {
  const normal = normalizeVector({
    x: -vector.y,
    y: vector.x,
    z: 0
  })
  return normal ?? { x: 0, y: 1, z: 0 }
}

function normalizeVector(vector: AcGeVector3dLike): AcGeVector3dLike | undefined {
  const length = Math.sqrt(
    vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
  )
  if (length <= ACAP_MLINE_EPSILON) return undefined
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  }
}

function dotVector(a: AcGeVector3dLike, b: AcGeVector3dLike): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function isSamePoint3d(a: AcGePoint3dLike, b: AcGePoint3dLike): boolean {
  return (
    Math.abs(a.x - b.x) <= ACAP_MLINE_EPSILON &&
    Math.abs(a.y - b.y) <= ACAP_MLINE_EPSILON &&
    Math.abs(a.z - b.z) <= ACAP_MLINE_EPSILON
  )
}
