import { AcDbDxfFiler } from '../base/AcDbDxfFiler'
import { AcDbObject } from '../base/AcDbObject'
import { AcDbResultBuffer } from '../base/AcDbResultBuffer'

/**
 * Defines how duplicate records are handled when objects
 * are cloned into a destination database.
 *
 * @remarks
 * This enum mirrors AcDb::DuplicateRecordCloning in ObjectARX.
 */
export enum AcDbDuplicateRecordCloning {
  /** No special cloning behavior */
  NotApplicable = 0,

  /** Ignore the duplicate record */
  Ignore = 1,

  /** Replace the existing record */
  Replace = 2,

  /** Mangle the name when coming from an external reference */
  XrefMangleName = 3,

  /** Always mangle the name to avoid conflicts */
  MangleName = 4
}

/**
 * Represents an Xrecord object used to store arbitrary
 * application-defined data.
 *
 * @remarks
 * An Xrecord is typically stored in an extension dictionary
 * and contains an {@link AcDbResultBuffer}.
 */
export class AcDbXrecord extends AcDbObject {
  private _data: AcDbResultBuffer | null = null

  /**
   * Gets or sets the data stored in this Xrecord.
   *
   * @remarks
   * Equivalent to the Xrecord.Data property in AutoCAD .NET.
   */
  get data(): AcDbResultBuffer | null {
    return this._data
  }

  set data(value: AcDbResultBuffer | null) {
    this._data = value
  }

  /**
   * Removes all data from this Xrecord.
   */
  clear(): void {
    this._data?.clear()
  }

  /**
   * Creates a deep copy of this Xrecord.
   *
   * @remarks
   * The cloned Xrecord contains a cloned ResultBuffer.
   */
  clone(): AcDbXrecord {
    const xrec = new AcDbXrecord()
    xrec._data = this._data?.clone() ?? null
    return xrec
  }

  /**
   * Returns the duplicate record cloning behavior for this Xrecord.
   *
   * @remarks
   * This method exists for API parity with ObjectARX.
   */
  getDuplicateRecordCloning(): AcDbDuplicateRecordCloning {
    return AcDbDuplicateRecordCloning.NotApplicable
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbXrecord')
    filer.writeInt16(280, 1)
    filer.writeResultBuffer(this.data)
    return this
  }
}
