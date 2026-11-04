import {
  AcDb2dPolyline,
  AcDb3dSolid,
  AcDbAlignedDimension,
  AcDbArcAlignedText,
  AcDbAttribute,
  AcDbAttributeDefinition,
  AcDbBlockReference,
  AcDbEntity,
  AcDbFcf,
  AcDbHatch,
  AcDbLeader,
  AcDbLine,
  AcDbMLeader,
  AcDbMLine,
  AcDbMText,
  AcDbPoint,
  AcDbPoly2dType,
  AcDbProxyEntity,
  AcDbRasterImage,
  AcDbSpline,
  AcDbTable,
  AcDbText,
  AcDbViewport
} from '@mlightcad/data-model'

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
const propLabel = (code: Locale, name: string) =>
  (entities[code].property as Record<string, string>)[name] ?? name

/** Mirrors `entityPropEnum` in `src/locale/i18n.ts`. */
const enumLabel = (code: Locale, name: string) =>
  (entities[code].enum as Record<string, string>)[name] ?? name

/** Mirrors `entityName` in `src/locale/i18n.ts`. */
const typeLabel = (code: Locale, type: string) =>
  (entities[code].entityName as Record<string, string>)[type] ?? type

/**
 * Representative entities whose `properties` were completed in
 * realdwg-web `f1f7ca7` so the property palette can show full metadata.
 */
const SAMPLE_ENTITIES: AcDbEntity[] = [
  new AcDbLine(),
  new AcDbPoint(),
  new AcDbText(),
  new AcDbMText(),
  new AcDbHatch(),
  new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 }
  ]),
  new AcDbSpline(),
  new AcDbRasterImage(),
  new AcDbBlockReference('TEST'),
  new AcDbAttribute(),
  new AcDbAttributeDefinition(),
  new AcDbMLeader(),
  new AcDbMLine(),
  new AcDbViewport(),
  new AcDbProxyEntity(),
  new AcDb3dSolid(''),
  new AcDbFcf(),
  new AcDbArcAlignedText(),
  new AcDbLeader(),
  new AcDbTable('TEST', 2, 2),
  new AcDbAlignedDimension({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 2 })
]

function collectRuntimeKeys(entity: AcDbEntity) {
  const props = entity.properties
  const propertyNames = new Set<string>()
  const groupNames = new Set<string>()
  const enumOptionLabels = new Set<string>()

  for (const group of props.groups) {
    groupNames.add(group.groupName)
    for (const prop of group.properties) {
      propertyNames.add(prop.name)
      if (prop.type === 'enum' && prop.options) {
        for (const opt of prop.options) {
          enumOptionLabels.add(opt.label)
        }
      }
      if (prop.type === 'array' && prop.itemSchema) {
        for (const item of prop.itemSchema.properties) {
          propertyNames.add(item.name)
        }
      }
    }
  }

  return {
    type: props.type,
    propertyNames: [...propertyNames],
    groupNames: [...groupNames],
    enumOptionLabels: [...enumOptionLabels]
  }
}

describe('entity property palette i18n (data-model inspector props)', () => {
  it.each(SAMPLE_ENTITIES.map(e => [e.type, e] as const))(
    '%s exposes localized property and group names in every locale',
    (_type, entity) => {
      const keys = collectRuntimeKeys(entity)

      expect(keys.propertyNames.length).toBeGreaterThan(0)

      for (const code of Object.keys(entities) as Locale[]) {
        const entityNames = entities[code].entityName as Record<string, string>
        const enumMessages = entities[code].enum as Record<string, string>

        expect(entityNames[keys.type]?.trim()).not.toBe('')
        expect(typeLabel(code, keys.type)).toBe(entityNames[keys.type])

        for (const group of keys.groupNames) {
          // Group keys are lowercase English words; labels must resolve.
          expect(propLabel(code, group)).not.toBe(group)
        }

        for (const name of keys.propertyNames) {
          const messages = entities[code].property as Record<string, string>
          // Require an explicit locale entry; missing keys fall back to camelCase.
          expect(messages[name]).toBeDefined()
          expect(propLabel(code, name)).not.toBe(name)
          if (code !== 'en') {
            // Non-English locales must not leave English placeholders in place.
            // Allow identical loanwords only for single-letter axes and GUID.
            const enLabel = propLabel('en', name)
            if (!/^[XYZ]$/.test(enLabel) && enLabel !== 'GUID') {
              expect(propLabel(code, name)).not.toBe(enLabel)
            }
          }
        }

        for (const label of keys.enumOptionLabels) {
          // Some locales keep CAD product terms (MText, Spline) as-is.
          expect(enumMessages[label]).toBeDefined()
          expect(enumMessages[label]!.trim().length).toBeGreaterThan(0)
          expect(enumLabel(code, label)).toBe(enumMessages[label])
        }
      }
    }
  )

  it('keeps English and Chinese wording distinct for new groups', () => {
    expect(enEntity.property.viewport).toBe('Viewport')
    expect(zhEntity.property.viewport).toBe('视口')
    expect(enEntity.property.mline).toBe('Multiline')
    expect(zhEntity.property.mline).toBe('多线')
    expect(enEntity.property.proxy).toBe('Proxy')
    expect(zhEntity.property.proxy).toBe('代理')
    expect(enEntity.enum.NoneContent).toBe('None')
    expect(zhEntity.enum.NoneContent).toBe('无')
    expect(enEntity.entityName.MLeader).toBe('Multileader')
    expect(zhEntity.entityName.MLeader).toBe('多重引线')
  })
})
