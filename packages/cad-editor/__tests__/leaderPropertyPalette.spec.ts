import { AcDbLeader, AcDbLeaderAnnotationType } from '@mlightcad/data-model'

import arEntity from '../src/locale/ar/entity'
import csEntity from '../src/locale/cs/entity'
import enEntity from '../src/locale/en/entity'
import trEntity from '../src/locale/tr/entity'
import zhEntity from '../src/locale/zh/entity'

const entities = {
  en: enEntity,
  zh: zhEntity,
  tr: trEntity,
  cs: csEntity,
  ar: arEntity
}
type Locale = keyof typeof entities

/** Mirrors `entityPropName` in `src/locale/i18n.ts`. */
const label = (code: Locale, name: string) =>
  (entities[code].property as Record<string, string>)[name] ?? name

/** Property names emitted by `AcDbLeader.properties`. */
const LEADER_PROPERTIES = [
  'dimensionStyleName',
  'annoType',
  'hasArrowHead',
  'hasHookLine',
  'isHookLineSameDirection',
  'isSplined',
  'associatedAnnotation',
  'byBlockColor',
  'textHeight',
  'textWidth',
  'vertices',
  'normalX',
  'normalY',
  'normalZ',
  'horizontalDirectionX',
  'horizontalDirectionY',
  'horizontalDirectionZ',
  'offsetFromBlockX',
  'offsetFromBlockY',
  'offsetFromBlockZ',
  'offsetFromAnnotationX',
  'offsetFromAnnotationY',
  'offsetFromAnnotationZ'
]

/** Enum labels emitted by `AcDbLeaderAnnotationType` options. */
const LEADER_ANNOTATION_TYPES = [
  'MText',
  'Fcf',
  'BlockReference',
  'NoAnnotation'
]

describe('Leader property locale messages (cad-viewer)', () => {
  it.each(Object.keys(entities) as Locale[])(
    '%s translates every AcDbLeader property name',
    code => {
      for (const name of LEADER_PROPERTIES) {
        expect(label(code, name)).not.toBe(name)
      }
    }
  )

  it.each(Object.keys(entities) as Locale[])(
    '%s translates the leader property group and annotation types',
    code => {
      const enumMessages = entities[code].enum as Record<string, string>
      expect(label(code, 'leader')).not.toBe('leader')
      for (const name of LEADER_ANNOTATION_TYPES) {
        expect(enumMessages[name]?.trim()).not.toBe('')
      }
    }
  )

  it('keeps the English and Chinese leader wording distinct', () => {
    expect(enEntity.property.leader).toBe('Leader')
    expect(zhEntity.property.leader).toBe('引线')
    expect(enEntity.enum.NoAnnotation).toBe('None')
    expect(zhEntity.enum.NoAnnotation).toBe('无')
  })
})

describe('LEADER property palette', () => {
  it('reports the leader-specific groups instead of the bare general group', () => {
    const leader = new AcDbLeader()
    const props = leader.properties

    // Before the override the palette only saw the base `general` group.
    expect(props.type).toBe('Leader')
    expect(props.groups.map(group => group.groupName)).toEqual([
      'general',
      'leader',
      'text',
      'geometry'
    ])
  })

  it('renders localized rows whose labels resolve for every locale', () => {
    const leader = new AcDbLeader()
    leader.appendVertex({ x: 0, y: 0, z: 0 })
    leader.appendVertex({ x: 5, y: 5, z: 0 })
    leader.hasArrowHead = true
    leader.annoType = AcDbLeaderAnnotationType.MText

    const rows = leader.properties.groups
      .filter(group => group.groupName !== 'general')
      .flatMap(group => group.properties)

    const annoType = rows.find(row => row.name === 'annoType')!
    expect(annoType.type).toBe('enum')
    expect(annoType.editable).toBe(true)
    expect(annoType.accessor.get()).toBe(AcDbLeaderAnnotationType.MText)

    for (const code of Object.keys(entities) as Locale[]) {
      for (const row of rows) {
        // A missing key would fall back to the camelCase name.
        expect(label(code, row.name)).not.toBe(row.name)
      }
    }
  })

  it('translates the enum options through entity.enum', () => {
    const annoType = new AcDbLeader().properties.groups
      .find(group => group.groupName === 'leader')!
      .properties.find(prop => prop.name === 'annoType')!
    const enumMessages = enEntity.enum as Record<string, string>

    expect(annoType.options?.map(opt => enumMessages[opt.label])).toEqual([
      'MText',
      'Feature Control Frame',
      'Block Reference',
      'None'
    ])
  })
})
