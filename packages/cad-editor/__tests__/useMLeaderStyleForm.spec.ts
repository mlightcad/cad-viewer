import {
  AcCmColor,
  AcDbDatabase,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcDbMLeaderStyle
} from '@mlightcad/data-model'

import {
  createDefaultMLeaderStyleForm,
  createStandardMLeaderStyle,
  readMLeaderStyleForm,
  writeMLeaderStyleForm
} from '../src/component/dialog/mleaderStyleForm'

describe('useMLeaderStyle form mapping', () => {
  it('creates AutoCAD-like default form values', () => {
    const form = createDefaultMLeaderStyleForm()
    expect(form.leaderLineType).toBe(AcDbMLeaderLineType.StraightLeader)
    expect(form.contentType).toBe(AcDbMLeaderContentType.MTextContent)
    expect(form.enableLanding).toBe(true)
    expect(form.constrainMaxPoints).toBe(true)
    expect(form.maxLeaderSegmentsPoints).toBe(2)
  })

  it('round-trips core style fields through form state', () => {
    const db = new AcDbDatabase()
    const style = new AcDbMLeaderStyle()
    style.leaderLineType = AcDbMLeaderLineType.SplineLeader
    style.arrowSize = 0.2
    style.breakSize = 0.15
    style.maxLeaderSegmentsPoints = 3
    style.firstSegmentAngleConstraint = Math.PI / 4
    style.secondSegmentAngleConstraint = Math.PI / 2
    style.enableLanding = true
    style.enableDogleg = true
    style.doglegLength = 0.5
    style.annotative = false
    style.scale = 2
    style.contentType = AcDbMLeaderContentType.MTextContent
    style.defaultMTextContents = 'C1'
    style.textHeight = 0.25
    style.textAlignAlwaysLeft = true
    style.enableFrameText = true
    style.landingGap = 0.1
    style.extendLeaderToText = true
    style.leaderLineColor = new AcCmColor().setByBlock()
    style.textColor = new AcCmColor().setByLayer()

    const form = readMLeaderStyleForm(db, style)
    expect(form.leaderLineType).toBe(AcDbMLeaderLineType.SplineLeader)
    expect(form.constrainMaxPoints).toBe(true)
    expect(form.maxLeaderSegmentsPoints).toBe(3)
    expect(form.constrainFirstAngle).toBe(true)
    expect(form.firstSegmentAngleDegrees).toBe(45)
    expect(form.constrainSecondAngle).toBe(true)
    expect(form.secondSegmentAngleDegrees).toBe(90)
    expect(form.scaleMode).toBe('specify')
    expect(form.scale).toBe(2)
    expect(form.defaultMTextContents).toBe('C1')
    expect(form.textAlignAlwaysLeft).toBe(true)
    expect(form.enableFrameText).toBe(true)

    const written = new AcDbMLeaderStyle()
    writeMLeaderStyleForm(db, written, form)
    expect(written.leaderLineType).toBe(AcDbMLeaderLineType.SplineLeader)
    expect(written.maxLeaderSegmentsPoints).toBe(3)
    expect(written.firstSegmentAngleConstraint).toBeCloseTo(Math.PI / 4)
    expect(written.secondSegmentAngleConstraint).toBeCloseTo(Math.PI / 2)
    expect(written.scale).toBe(2)
    expect(written.defaultMTextContents).toBe('C1')
    expect(written.extendLeaderToText).toBe(true)
  })

  it('creates Standard-like defaults for a new style entry', () => {
    const db = new AcDbDatabase()
    const style = createStandardMLeaderStyle(db)
    expect(style.maxLeaderSegmentsPoints).toBe(2)
    expect(style.breakSize).toBe(3.75)
    expect(style.contentType).toBe(AcDbMLeaderContentType.MTextContent)
    expect(style.leaderLineColor.isByBlock).toBe(true)
    expect(style.textColor.isByBlock).toBe(true)
  })

  it('stores unconstrained max points and angles as AutoCAD sentinels', () => {
    const db = new AcDbDatabase()
    const form = createDefaultMLeaderStyleForm()
    form.constrainMaxPoints = false
    form.constrainFirstAngle = false
    form.constrainSecondAngle = false
    form.scaleMode = 'layout'
    form.annotative = false

    const style = new AcDbMLeaderStyle()
    writeMLeaderStyleForm(db, style, form)
    expect(style.maxLeaderSegmentsPoints).toBe(-1)
    expect(style.firstSegmentAngleConstraint).toBe(0)
    expect(style.secondSegmentAngleConstraint).toBe(0)
    expect(style.scale).toBe(0)
  })
})
