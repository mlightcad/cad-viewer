import {
  AcCmAttributes,
  AcCmObject,
  AcCmStringKey,
  defaults
} from '@mlightcad/common'
import { uid } from 'uid'

import type { AcDbDatabase } from '../database/AcDbDatabase'
import { AcDbDxfCode } from './AcDbDxfCode'
import { AcDbDxfFiler } from './AcDbDxfFiler'
import { AcDbResultBuffer } from './AcDbResultBuffer'

/** Type alias for object ID as string */
export type AcDbObjectId = string

let hostApplicationServicesProvider:
  | (() => { workingDatabase: AcDbDatabase })
  | undefined

export function setAcDbHostApplicationServicesProvider(
  provider: () => { workingDatabase: AcDbDatabase }
) {
  hostApplicationServicesProvider = provider
}

/**
 * Interface defining the attributes that can be associated with an AcDbObject.
 *
 * Extends the base AcCmAttributes interface and adds object-specific attributes
 * like objectId and ownerId.
 */
export interface AcDbObjectAttrs extends AcCmAttributes {
  /** Unique identifier for the object */
  objectId?: AcDbObjectId
  /** Identifier of the object that owns this object */
  ownerId?: AcDbObjectId
  /**
   * The objectId of the extension dictionary owned by the object. If the object does
   * not own an extension dictionary, then the returned objectId is set to undefined.
   */
  extensionDictionary?: AcDbObjectId
}

/**
 * The base class for all objects that reside in a drawing database.
 *
 * This class provides the fundamental functionality for all database objects,
 * including attribute management, object identification, and database association.
 * It serves as the foundation for entities, tables, and other database objects.
 *
 * @template ATTRS - The type of attributes this object can have
 *
 * @example
 * ```typescript
 * class MyEntity extends AcDbObject<MyEntityAttrs> {
 *   constructor(attrs?: Partial<MyEntityAttrs>) {
 *     super(attrs);
 *   }
 * }
 * ```
 */
export class AcDbObject<ATTRS extends AcDbObjectAttrs = AcDbObjectAttrs> {
  /** Reference to the database this object belongs to */
  private _database?: AcDbDatabase
  /** The attributes object that stores all object properties */
  private _attrs: AcCmObject<ATTRS>
  /** XData attached to this object */
  private _xDataMap: Map<string, AcDbResultBuffer>

  /**
   * Creates a new AcDbObject instance.
   *
   * @param attrs - Input attribute values for this object
   * @param defaultAttrs - Default values for attributes of this object
   *
   * @example
   * ```typescript
   * const obj = new AcDbObject({ objectId: '123' });
   * ```
   */
  constructor(attrs?: Partial<ATTRS>, defaultAttrs?: Partial<ATTRS>) {
    attrs = attrs || {}
    defaults(attrs, { objectId: uid() })
    this._attrs = new AcCmObject<ATTRS>(attrs, defaultAttrs)
    this._xDataMap = new Map()
  }

  /**
   * Gets the attributes object for this AcDbObject.
   *
   * @returns The AcCmObject instance containing all attributes
   *
   * @example
   * ```typescript
   * const attrs = obj.attrs;
   * const value = attrs.get('someAttribute');
   * ```
   */
  get attrs() {
    return this._attrs
  }

  /**
   * Gets the value of the specified attribute.
   *
   * This method will throw an exception if the specified attribute doesn't exist.
   * Use getAttrWithoutException() if you want to handle missing attributes gracefully.
   *
   * @param attrName - The name of the attribute to retrieve
   * @returns The value of the specified attribute
   * @throws {Error} When the specified attribute doesn't exist
   *
   * @example
   * ```typescript
   * try {
   *   const value = obj.getAttr('objectId');
   * } catch (error) {
   *   console.error('Attribute not found');
   * }
   * ```
   */
  getAttr(attrName: AcCmStringKey<ATTRS>) {
    const value = this._attrs.get(attrName)
    if (value === undefined) {
      throw new Error(
        `[AcDbObject] Attribute name '${attrName}' does't exist in this object!`
      )
    }
    return value
  }

  /**
   * Gets the value of the specified attribute without throwing an exception.
   *
   * This method returns undefined if the specified attribute doesn't exist,
   * making it safer for optional attributes.
   *
   * @param attrName - The name of the attribute to retrieve
   * @returns The value of the specified attribute, or undefined if it doesn't exist
   *
   * @example
   * ```typescript
   * const value = obj.getAttrWithoutException('optionalAttribute');
   * if (value !== undefined) {
   *   // Use the value
   * }
   * ```
   */
  getAttrWithoutException(attrName: AcCmStringKey<ATTRS>) {
    return this._attrs.get(attrName)
  }

  /**
   * Sets the value of an attribute.
   *
   * @param attrName - The name of the attribute to set
   * @param val - The value to assign to the attribute
   *
   * @example
   * ```typescript
   * obj.setAttr('objectId', 'new-id-123');
   * ```
   */
  setAttr<A extends AcCmStringKey<ATTRS>>(attrName: A, val?: ATTRS[A]) {
    this._attrs.set(attrName, val)
  }

  /**
   * Gets the object ID.
   *
   * AutoCAD uses 64-bit integers to represent handles, which exceed the maximum
   * integer value of JavaScript. Therefore, strings are used to represent object handles.
   *
   * @returns The object ID as a string
   *
   * @example
   * ```typescript
   * const id = obj.objectId;
   * console.log(`Object ID: ${id}`);
   * ```
   */
  get objectId(): AcDbObjectId {
    return this.getAttr('objectId')
  }

  /**
   * Sets the object ID.
   *
   * @param value - The new object ID
   *
   * @example
   * ```typescript
   * obj.objectId = 'new-object-id';
   * ```
   */
  set objectId(value: AcDbObjectId) {
    this._attrs.set('objectId', value)
  }

  /**
   * Gets the object ID of the owner of this object.
   *
   * @returns The owner object ID
   *
   * @example
   * ```typescript
   * const ownerId = obj.ownerId;
   * ```
   */
  get ownerId(): AcDbObjectId {
    return this.getAttr('ownerId')
  }

  /**
   * Sets the object ID of the owner of this object.
   *
   * @param value - The new owner object ID
   *
   * @example
   * ```typescript
   * obj.ownerId = 'parent-object-id';
   * ```
   */
  set ownerId(value: AcDbObjectId) {
    this._attrs.set('ownerId', value)
  }

  /**
   * Gets the objectId of the extension dictionary owned by this object.
   *
   * If the object does not have an extension dictionary, this returns `undefined`.
   *
   * In ObjectARX terms, this is equivalent to `AcDbObject::extensionDictionary()`.
   *
   * @returns The extension dictionary objectId, or undefined
   *
   * @example
   * ```typescript
   * const dictId = obj.extensionDictionary
   * if (dictId) {
   *   console.log('Has extension dictionary:', dictId)
   * }
   * ```
   */
  get extensionDictionary(): AcDbObjectId | undefined {
    return this.getAttrWithoutException('extensionDictionary')
  }

  /**
   * Sets the objectId of the extension dictionary owned by this object.
   *
   * This does not create or delete the dictionary object itself — it only
   * establishes or clears the ownership relationship.
   *
   * Passing `undefined` removes the association.
   *
   * @param value - The extension dictionary objectId, or undefined
   *
   * @example
   * ```typescript
   * obj.extensionDictionary = dict.objectId
   * ```
   */
  set extensionDictionary(value: AcDbObjectId | undefined) {
    this._attrs.set('extensionDictionary', value)
  }

  /**
   * Gets the database in which this object is resident.
   *
   * When an object isn't added to a database, this property returns the current
   * working database. After it is added to a database, it will be set automatically.
   * You should never set this value manually.
   *
   * @returns The database this object belongs to
   *
   * @example
   * ```typescript
   * const db = obj.database;
   * ```
   */
  get database(): AcDbDatabase {
    if (this._database) {
      return this._database
    }
    if (hostApplicationServicesProvider) {
      return hostApplicationServicesProvider().workingDatabase
    }
    throw new Error('The current working database must be set before using it!')
  }

  /**
   * Sets the database for this object.
   *
   * This is typically set automatically when the object is added to a database.
   * Manual setting should be avoided unless you know what you're doing.
   *
   * @param db - The database to associate with this object
   *
   * @example
   * ```typescript
   * obj.database = myDatabase;
   * ```
   */
  set database(db: AcDbDatabase) {
    this._database = db
  }

  /**
   * Retrieves the XData associated with this object for a given application ID.
   *
   * Extended Entity Data (XData) allows applications to attach arbitrary,
   * application-specific data to an AcDbObject. Each XData entry is identified
   * by a registered application name (AppId) and stored as an AcDbResultBuffer.
   *
   * This method is conceptually equivalent to `AcDbObject::xData()` in ObjectARX,
   * but simplified to return the entire result buffer for the specified AppId.
   *
   * @param appId - The application ID (registered AppId name) that owns the XData
   * @returns The AcDbResultBuffer associated with the AppId, or `undefined`
   *          if no XData exists for that AppId
   *
   * @example
   * ```typescript
   * const xdata = obj.getXData('MY_APP')
   * if (xdata) {
   *   // Read values from the result buffer
   * }
   * ```
   */
  getXData(appId: string): AcDbResultBuffer | undefined {
    return this._xDataMap.get(appId)
  }

  /**
   * Attaches or replaces XData for this object.
   *
   * If XData already exists for the given AppId, it is replaced by the provided
   * AcDbResultBuffer. The caller is responsible for ensuring that:
   *
   * - The AppId is registered in the database's AppId table
   * - The result buffer follows valid DXF/XData conventions (e.g. starts with
   *   a 1001 group code for the AppId)
   *
   * This method is conceptually similar to `AcDbObject::setXData()` in ObjectARX.
   *
   * @param resbuf - The result buffer containing the XData to attach
   *
   * @example
   * ```typescript
   * const rb = new AcDbResultBuffer([
   *   { code: AcDbDxfCode.ExtendedDataRegAppName, value: 'MY_APP' },
   *   { code: AcDbDxfCode.ExtendedDataAsciiString, value: 'custom value' }
   * ])
   *
   * obj.setXData('MY_APP', rb)
   * ```
   */
  setXData(resbuf: AcDbResultBuffer): void {
    for (const item of resbuf) {
      if (item.code === AcDbDxfCode.ExtendedDataRegAppName) {
        this._xDataMap.set(item.value as string, resbuf)
      }
    }
  }

  /**
   * Removes the XData associated with the specified application ID.
   *
   * After removal, calls to getXData() for the same AppId will return `undefined`.
   * If no XData exists for the given AppId, this method has no effect.
   *
   * This mirrors the behavior of clearing XData for a specific application
   * in ObjectARX rather than removing all XData from the object.
   *
   * @param appId - The application ID whose XData should be removed
   *
   * @example
   * ```typescript
   * obj.removeXData('MY_APP')
   * ```
   */
  removeXData(appId: string): void {
    this._xDataMap.delete(appId)
  }

  /**
   * Creates the extension dictionary for this object if it does not already exist.
   *
   * This method closely mirrors the behavior of
   * `AcDbObject::createExtensionDictionary()` in ObjectARX.
   *
   * - If the object already owns an extension dictionary, no new dictionary
   *   is created and the existing dictionary's objectId is returned.
   * - Otherwise, a new AcDbDictionary is created, added to the same database,
   *   owned by this object, and its objectId is stored on this object.
   *
   * @returns The objectId of the extension dictionary
   *
   * @example
   * ```typescript
   * const dictId = obj.createExtensionDictionary()
   * ```
   */
  createExtensionDictionary(): AcDbObjectId | undefined {
    // If already exists, behave like ObjectARX: do nothing
    // const existingId = this.extensionDictionary
    // if (existingId) {
    //   return existingId
    // }

    // const db = this.database
    // if (db) {
    //   // Create a new extension dictionary
    //   const dict = new AcDbDictionary(db)

    //   // Ensure dictionary lives in the same database
    //   dict.database = db

    //   // Add dictionary to database
    //   db.objects.dictionary.setAt(dict.objectId, dict)

    //   // Establish ownership relationship
    //   this.extensionDictionary = dict.objectId
    //   return dict.objectId
    // }
    return undefined
  }

  /**
   * Closes the object.
   *
   * All changes made to the object since it was opened are committed to the database,
   * and a "closed" notification is sent. This method can be overridden by subclasses
   * to provide specific cleanup behavior.
   *
   * @example
   * ```typescript
   * obj.close();
   * ```
   */
  close() {}

  /**
   * Writes the common DXF wrapper for this object and then delegates the
   * object-specific payload to {@link dxfOutFields}.
   */
  dxfOut(...args: unknown[]): unknown {
    const [filer, allXdata = false] = args as [
      AcDbDxfFiler,
      boolean?,
      AcDbObjectId[]?
    ]
    filer.writeHandle(5, this.objectId)
    filer.writeObjectId(330, this.ownerId)
    filer.writeObjectId(360, this.extensionDictionary)
    this.dxfOutFields(filer)

    if (allXdata) {
      for (const data of this._xDataMap.values()) {
        filer.writeResultBuffer(data)
      }
    }
    return this
  }

  /**
   * Writes object-specific DXF fields.
   *
   * Subclasses should override this method and call `super.dxfOutFields(filer)`
   * first so the subclass markers remain consistent.
   */
  dxfOutFields(_filer: AcDbDxfFiler) {
    // For better downstream compatibility, the object-level marker (AcDbObject) is omitted.
    // filer.writeSubclassMarker('AcDbObject')
    return this
  }
}
