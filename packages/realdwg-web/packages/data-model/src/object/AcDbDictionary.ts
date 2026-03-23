import { AcDbDxfFiler } from '../base/AcDbDxfFiler'
import { AcDbObject, AcDbObjectId } from '../base/AcDbObject'
import { AcDbDatabase } from '../database/AcDbDatabase'
import { AcDbObjectIterator } from '../misc/AcDbObjectIterator'

/**
 * A database-resident object dictionary that maintains a map between text strings and database objects.
 *
 * An instance of this class represents a single object, such as Drawing Symbol Table, to which objects
 * derived from AcDbObject may be added, accessed, and removed. Entries in an AcDbDictionary must be unique.
 * Entries consist of a unique AcDbObject and string, which comprises the entry's key name. The key may be
 * either a text string, or an asterisk ('*') as the first character in the string to signify an anonymous
 * entry. An anonymous entry's key will be constructed internally by appending an 'A' plus a unique integer
 * value to the asterisk; for example, '*A13'. When an object is placed in a dictionary, the dictionary is
 * established as the object's owner, the lookup key string is associated with the object's object ID, and
 * the dictionary itself is attached to the object as a persistent reactor so that the dictionary is notified
 * when the object is erased.
 *
 * @template TObjectType - The type of objects stored in this dictionary
 *
 * @example
 * ```typescript
 * const dictionary = new AcDbDictionary<AcDbLayout>(database);
 * const layout = new AcDbLayout();
 * dictionary.setAt('MyLayout', layout);
 * const retrievedLayout = dictionary.getAt('MyLayout');
 * ```
 */
export class AcDbDictionary<
  TObjectType extends AcDbObject = AcDbObject
> extends AcDbObject {
  /** Map of records indexed by name */
  protected _recordsByName: Map<string, TObjectType>
  /** Map of records indexed by object ID */
  protected _recordsById: Map<string, TObjectType>

  /**
   * Creates a new AcDbDictionary instance.
   *
   * @param db - The database this dictionary belongs to
   *
   * @example
   * ```typescript
   * const dictionary = new AcDbDictionary(database);
   * ```
   */
  constructor(db: AcDbDatabase) {
    super()
    this.database = db
    this._recordsByName = new Map<string, TObjectType>()
    this._recordsById = new Map<string, TObjectType>()
  }

  /**
   * Gets the number of entries in the dictionary.
   *
   * @returns The number of entries in the dictionary
   *
   * @example
   * ```typescript
   * const count = dictionary.numEntries;
   * console.log(`Dictionary has ${count} entries`);
   * ```
   */
  get numEntries() {
    return this._recordsByName.size
  }

  /**
   * Adds a new entry to the dictionary.
   *
   * If an entry with the specified key already exists, the existing entry is erased
   * and replaced with the new one.
   *
   * @param key - String representing the object's search key name
   * @param value - The new object to add to the dictionary
   *
   * @example
   * ```typescript
   * const layout = new AcDbLayout();
   * dictionary.setAt('MyLayout', layout);
   * ```
   */
  setAt(key: string, value: TObjectType) {
    value.database = this.database
    value.ownerId = this.objectId
    this._recordsByName.set(key, value)
    this._recordsById.set(value.objectId, value)
    this.database.events.dictObjetSet.dispatch({
      database: this.database,
      object: value,
      key: key
    })
  }

  /**
   * Removes the entry specified by name from the dictionary.
   *
   * @param name - String representing the entry's key (or name)
   * @returns True if the entry was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const removed = dictionary.remove('MyLayout');
   * if (removed) {
   *   console.log('Layout removed successfully');
   * }
   * ```
   */
  remove(name: string) {
    const object = this.getAt(name)
    if (object) {
      this._recordsByName.delete(name.toUpperCase())
      this._recordsById.delete(this.objectId)
      this.database.events.dictObjectErased.dispatch({
        database: this.database,
        object: object,
        key: name
      })
      return true
    }
    return false
  }

  /**
   * Removes the entry specified by object ID from the dictionary.
   *
   * @param id - ID of the object to delete
   * @returns True if the entry was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const removed = dictionary.removeId('some-object-id');
   * ```
   */
  removeId(id: string) {
    const object = this.getIdAt(id)
    if (object) {
      this._recordsById.delete(this.objectId)
      this._recordsByName.forEach((value, key) => {
        if (value === object) {
          this._recordsByName.delete(key)
          this.database.events.dictObjectErased.dispatch({
            database: this.database,
            object: object,
            key: key
          })
        }
      })
      return true
    }
    return false
  }

  /**
   * Removes all records from the dictionary.
   *
   * @example
   * ```typescript
   * dictionary.removeAll();
   * ```
   */
  removeAll() {
    this._recordsByName.forEach((value, key) => {
      this.database.events.dictObjectErased.dispatch({
        database: this.database,
        object: value,
        key: key
      })
    })
    this._recordsByName.clear()
    this._recordsById.clear()
  }

  /**
   * Checks if the dictionary contains an object with the specified name.
   *
   * @param name - Name to search for
   * @returns True if the dictionary contains an object with the specified name, false otherwise
   *
   * @example
   * ```typescript
   * if (dictionary.has('MyLayout')) {
   *   console.log('Layout exists');
   * }
   * ```
   */
  has(name: string) {
    return this._recordsByName.has(name.toUpperCase())
  }

  /**
   * Checks if the dictionary contains an object with the specified ID.
   *
   * @param id - ID to search for
   * @returns True if the dictionary contains an object with the specified ID, false otherwise
   *
   * @example
   * ```typescript
   * if (dictionary.hasId('some-object-id')) {
   *   console.log('Object exists');
   * }
   * ```
   */
  hasId(id: string) {
    return this._recordsById.has(id)
  }

  /**
   * Gets the object with the specified name from the dictionary.
   *
   * @param name - Name of the object to retrieve
   * @returns The object with the specified name, or undefined if not found
   *
   * @example
   * ```typescript
   * const layout = dictionary.getAt('MyLayout');
   * if (layout) {
   *   console.log('Layout found:', layout);
   * }
   * ```
   */
  getAt(name: string) {
    return this._recordsByName.get(name)
  }

  /**
   * Gets the object with the specified ID from the dictionary.
   *
   * @param id - ID of the object to retrieve
   * @returns The object with the specified ID, or undefined if not found
   *
   * @example
   * ```typescript
   * const object = dictionary.getIdAt('some-object-id');
   * ```
   */
  getIdAt(id: AcDbObjectId) {
    return this._recordsById.get(id)
  }

  /**
   * Creates a new iterator for traversing the dictionary entries.
   *
   * @returns A new AcDbObjectIterator for this dictionary
   *
   * @example
   * ```typescript
   * const iterator = dictionary.newIterator();
   * while (iterator.hasNext()) {
   *   const object = iterator.next();
   *   console.log('Object:', object);
   * }
   * ```
   */
  newIterator(): AcDbObjectIterator<TObjectType> {
    return new AcDbObjectIterator(this._recordsByName)
  }

  /**
   * Returns dictionary entries as `[key, object]` tuples.
   */
  entries() {
    return this._recordsByName.entries()
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbDictionary')
    filer.writeInt16(281, 1)
    for (const [key, value] of this._recordsByName) {
      filer.writeString(3, key)
      filer.writeObjectId(350, value.objectId)
    }
    return this
  }
}
