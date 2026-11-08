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
  acapCreateGroup,
  acapExpandSelectionByGroups,
  acapExplodeGroup,
  acapFindGroupsContaining,
  acapFindGroupsContainingAny,
  AcApGroupCreateError,
  acapIsUnnamedGroup,
  acapListGroups,
  acapNextAnonymousGroupName,
  acapValidateGroupName
} from '../src/service/AcApGroup'

function appendLine(db: AcDbDatabase, x: number): string {
  const line = new AcDbLine(new AcGePoint3d(x, 0, 0), new AcGePoint3d(x, 1, 0))
  db.tables.blockTable.modelSpace.appendEntity(line)
  return line.objectId
}

describe('AcApGroup', () => {
  let db: AcDbDatabase
  let manager: AcDbSysVarManager

  beforeEach(() => {
    db = new AcDbDatabase()
    manager = AcDbSysVarManager.instance()
    manager.setVar(AcDbSystemVariables.PICKSTYLE, 1, db)
  })

  test('validates and normalizes group names', () => {
    expect(acapValidateGroupName('door-1')).toBe('DOOR-1')
    expect(acapValidateGroupName('bad name')).toBeUndefined()
    expect(acapValidateGroupName('*A1')).toBeUndefined()
  })

  test('creates anonymous groups with *An names', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const group = acapCreateGroup(db, {
      unnamed: true,
      entityIds: [a, b]
    })
    expect(group.name).toBe('*A1')
    expect(group.isAnonymous()).toBe(true)
    expect(group.entityIds).toEqual([a, b])
    expect(acapNextAnonymousGroupName(db)).toBe('*A2')
  })

  test('expands selection when PICKSTYLE enables group selection', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const c = appendLine(db, 2)
    acapCreateGroup(db, { name: 'G1', entityIds: [a, b] })

    expect(acapExpandSelectionByGroups(db, [a])).toEqual(
      expect.arrayContaining([a, b])
    )
    expect(acapExpandSelectionByGroups(db, [c])).toEqual([c])

    manager.setVar(AcDbSystemVariables.PICKSTYLE, 0, db)
    expect(acapExpandSelectionByGroups(db, [a])).toEqual([a])
  })

  test('skips non-selectable groups', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const group = acapCreateGroup(db, {
      name: 'NS',
      selectable: false,
      entityIds: [a, b]
    })
    expect(group.selectable).toBe(false)
    expect(acapExpandSelectionByGroups(db, [a])).toEqual([a])
  })

  test('finds and explodes groups', () => {
    const a = appendLine(db, 0)
    const group = acapCreateGroup(db, { name: 'X', entityIds: [a] })
    expect(acapFindGroupsContaining(db, a)).toEqual([group])
    acapExplodeGroup(db, group)
    expect(db.objects.group.getAt('X')).toBeUndefined()
    expect(db.tables.blockTable.getEntityById(a)).toBeTruthy()
  })

  test('selects all groups when an object belongs to multiple', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const c = appendLine(db, 2)
    acapCreateGroup(db, { name: 'G1', entityIds: [a, b] })
    acapCreateGroup(db, { name: 'G2', entityIds: [a, c] })
    const expanded = acapExpandSelectionByGroups(db, [a])
    expect(expanded).toEqual(expect.arrayContaining([a, b, c]))
  })

  test('finds unique groups for a selection set', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const c = appendLine(db, 2)
    acapCreateGroup(db, { name: 'G1', entityIds: [a, b] })
    acapCreateGroup(db, { name: 'G2', entityIds: [c] })
    const found = acapFindGroupsContainingAny(db, [a, b, c])
    expect(found.map(g => g.name).sort()).toEqual(['G1', 'G2'])
  })

  test('lists groups with Include Unnamed filter', () => {
    const a = appendLine(db, 0)
    const b = appendLine(db, 1)
    const named = acapCreateGroup(db, { name: 'DOOR', entityIds: [a] })
    const anon = acapCreateGroup(db, { unnamed: true, entityIds: [b] })
    expect(acapIsUnnamedGroup(anon)).toBe(true)
    expect(acapIsUnnamedGroup(named)).toBe(false)
    expect(acapListGroups(db, true).map(g => g.name)).toEqual(
      expect.arrayContaining(['DOOR', anon.name])
    )
    expect(acapListGroups(db, false).map(g => g.name)).toEqual(['DOOR'])
  })

  test('rejects invalid and duplicate group names', () => {
    const a = appendLine(db, 0)
    acapCreateGroup(db, { name: 'DOOR', entityIds: [a] })
    expect(() =>
      acapCreateGroup(db, { name: 'bad name', entityIds: [a] })
    ).toThrow(AcApGroupCreateError)
    try {
      acapCreateGroup(db, { name: 'DOOR', entityIds: [a] })
      fail('expected nameExists')
    } catch (error) {
      expect(error).toBeInstanceOf(AcApGroupCreateError)
      expect((error as AcApGroupCreateError).code).toBe('nameExists')
    }
  })
})
