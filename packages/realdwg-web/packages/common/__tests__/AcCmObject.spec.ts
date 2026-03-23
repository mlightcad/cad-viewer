import { AcCmAttributes, AcCmObject } from '../src'

interface ObjectAttrs extends AcCmAttributes {
  attr1: number
  attr2?: string
}

describe('Test AcCmObject', () => {
  it('constructs instance correctly', () => {
    const attrs: ObjectAttrs = {
      attr1: 1,
      attr2: 'test'
    }
    const defaults: ObjectAttrs = {
      attr1: 2,
      attr2: 'another test'
    }

    const object = new AcCmObject(attrs, defaults)
    expect(object.get('attr1')).toBe(1)
    expect(object.get('attr2')).toBe('test')
    expect(object.has('attr1')).toBeTruthy()
    expect(object.has('attr2')).toBeTruthy()
    expect(object.hasChanged()).toBe(false)
    expect(object.hasChanged('attr1')).toBe(false)
    expect(object.hasChanged('attr2')).toBe(false)
    expect(object.changed).toEqual({})
    expect(object.previous('attr1')).toBeUndefined()
    expect(object.previous('attr2')).toBeUndefined()
    expect(object.previousAttributes()).toEqual({})
  })

  it('constructs instance with default values correctly', () => {
    const attrs: ObjectAttrs = {
      attr1: 1
    }
    const defaults: ObjectAttrs = {
      attr1: 2,
      attr2: 'test'
    }
    const object = new AcCmObject(attrs, defaults)
    expect(object.get('attr1')).toBe(1)
    expect(object.get('attr2')).toBe('test')
    expect(object.has('attr1')).toBeTruthy()
    expect(object.has('attr2')).toBeTruthy()
    expect(object.hasChanged()).toBe(false)
    expect(object.hasChanged('attr1')).toBe(false)
    expect(object.hasChanged('attr2')).toBe(false)
    expect(object.changed).toEqual({})
    expect(object.previous('attr1')).toBeUndefined()
    expect(object.previous('attr2')).toBeUndefined()
    expect(object.previousAttributes()).toEqual({})
  })

  it('records changes correctly', () => {
    const attrs: ObjectAttrs = {
      attr1: 1,
      attr2: 'test'
    }
    const object = new AcCmObject(attrs)
    expect(object.get('attr1')).toBe(1)
    expect(object.get('attr2')).toBe('test')

    object.set('attr1', 2)
    expect(object.get('attr1')).toBe(2)
    expect(object.get('attr2')).toBe('test')
    expect(object.hasChanged()).toBe(true)
    expect(object.hasChanged('attr1')).toBe(true)
    expect(object.hasChanged('attr2')).toBe(false)
    expect(object.changed.attr1).toEqual(2)
    expect(object.changed.attr2).toBeUndefined()
    expect(object.previous('attr1')).toBe(1)
    expect(object.previous('attr2')).toBe('test')
    expect(object.previousAttributes().attr1).toEqual(1)
    expect(object.previousAttributes().attr2).toEqual('test')
  })

  it('triggers events correctly after modified attributes', () => {
    const attrs: ObjectAttrs = {
      attr1: 1,
      attr2: 'test'
    }
    const object = new AcCmObject(attrs)
    object.events.modelChanged.addEventListener(args => {
      expect(args.object.get('attr1')).toBe(2)
      expect(args.object.get('attr2')).toBe('test')
    })
    object.events.attrChanged.addEventListener(args => {
      expect(args.attrName).toBe('attr1')
      expect(args.attrValue).toBe(2)
    })
    object.set('attr1', 2)
    expect(object.get('attr1')).toBe(2)
  })

  it('clones object correctly', () => {
    const attrs: ObjectAttrs = {
      attr1: 1,
      attr2: 'test'
    }
    const originalObject = new AcCmObject(attrs)
    expect(originalObject.get('attr1')).toBe(1)
    expect(originalObject.get('attr2')).toBe('test')

    const clonedObject = originalObject.clone()
    expect(clonedObject.get('attr1')).toBe(1)
    expect(clonedObject.get('attr2')).toBe('test')

    originalObject.set('attr1', 2)
    expect(originalObject.get('attr1')).toBe(2)
    expect(clonedObject.get('attr1')).toBe(1)
  })
})
