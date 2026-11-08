/**
 * @jest-environment node
 */
import {
  AcDbDatabase,
  AcDbLine,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  acedCoveredGroupGripUnits,
  acedEffectiveGroupDisplayMode,
  acedIdsForEntityGrips,
  acedShouldUseGroupGripDisplay
} from '../src/editor/grip/AcEdGroupGripPolicy'
import { acapCreateGroup } from '../src/service/AcApGroup'

function appendLine(db: AcDbDatabase, x: number): string {
  const line = new AcDbLine(new AcGePoint3d(x, 0, 0), new AcGePoint3d(x, 1, 0))
  db.tables.blockTable.modelSpace.appendEntity(line)
  return line.objectId
}

describe('AcEdGroupGripPolicy', () => {
  let db: AcDbDatabase
  let manager: AcDbSysVarManager

  beforeEach(() => {
    db = new AcDbDatabase()
    manager = AcDbSysVarManager.instance()
    manager.setVar(AcDbSystemVariables.PICKSTYLE, 1, db)
    manager.setVar(AcDbSystemVariables.GROUPDISPLAYMODE, 2, db)
  })

  test('uses group grip display for fully covered selectable groups', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const c = appendLine(db, 2)
    acapCreateGroup(db, { name: 'G1', entityIds: [a, b] })

    expect(acedShouldUseGroupGripDisplay(db, [a, b])).toBe(true)
    expect(acedShouldUseGroupGripDisplay(db, [a])).toBe(false)
    // Mixed selection still exposes GROUPDISPLAYMODE for the covered group.
    expect(acedShouldUseGroupGripDisplay(db, [a, b, c])).toBe(true)
  })

  test('lists covered groups and entity-grip ids for mixed selection', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const c = appendLine(db, 2)
    acapCreateGroup(db, { name: 'G1', entityIds: [a, b] })

    const units = acedCoveredGroupGripUnits(db, [c, a, b])
    expect(units).toHaveLength(1)
    expect(units[0].memberIds).toEqual([a, b])
    expect(acedIdsForEntityGrips([c, a, b], units, 2)).toEqual([c])
    expect(acedIdsForEntityGrips([c, a, b], units, 0)).toEqual([c, a, b])
  })

  test('ignores non-selectable groups and PICKSTYLE without group bit', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    acapCreateGroup(db, {
      name: 'G1',
      selectable: false,
      entityIds: [a, b]
    })

    expect(acedShouldUseGroupGripDisplay(db, [a, b])).toBe(false)

    acapCreateGroup(db, { name: 'G2', entityIds: [a, b] })
    manager.setVar(AcDbSystemVariables.PICKSTYLE, 0, db)
    expect(acedShouldUseGroupGripDisplay(db, [a, b])).toBe(false)
  })

  test('effective mode follows GROUPDISPLAYMODE when group grips apply', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    acapCreateGroup(db, { name: 'G1', entityIds: [a, b] })

    manager.setVar(AcDbSystemVariables.GROUPDISPLAYMODE, 1, db)
    expect(acedEffectiveGroupDisplayMode(db, [a, b])).toBe(1)

    manager.setVar(AcDbSystemVariables.GROUPDISPLAYMODE, 0, db)
    expect(acedEffectiveGroupDisplayMode(db, [a, b])).toBe(0)

    expect(acedEffectiveGroupDisplayMode(db, [a])).toBe(0)
  })
})
