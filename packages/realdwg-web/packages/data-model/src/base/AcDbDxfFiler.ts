import { AcCmColor, AcCmTransparency } from '@mlightcad/common'
import {
  AcGePoint2dLike,
  AcGePoint3dLike,
  AcGeVector3dLike
} from '@mlightcad/geometry-engine'

import type { AcDbDatabase } from '../database'
import { AcDbDwgVersion } from '../database/AcDbDwgVersion'
import { AcDbResultBuffer } from './AcDbResultBuffer'

export interface AcDbDxfFilerOptions {
  database?: AcDbDatabase
  precision?: number
  version?: string | number | AcDbDwgVersion
}

/**
 * ASCII DXF writer that loosely mirrors the ObjectARX AcDbDxfFiler API.
 *
 * This implementation focuses on export scenarios in the web data model and
 * writes classic group-code based DXF text.
 */
export class AcDbDxfFiler {
  private _database?: AcDbDatabase
  private _precision: number
  private _version?: AcDbDwgVersion
  private readonly _lines: string[]
  private readonly _handleMap: Map<string, string>
  private _nextHandle: number

  constructor(options: AcDbDxfFilerOptions = {}) {
    this._database = options.database
    this._precision = Math.max(0, Math.min(16, options.precision ?? 16))
    this._version =
      options.version instanceof AcDbDwgVersion
        ? options.version
        : options.version != null
          ? new AcDbDwgVersion(options.version)
          : undefined
    this._lines = []
    this._handleMap = new Map()
    this._nextHandle = 1
  }

  get database() {
    return this._database
  }

  set database(value: AcDbDatabase | undefined) {
    this._database = value
  }

  get precision() {
    return this._precision
  }

  setPrecision(value: number) {
    this._precision = Math.max(0, Math.min(16, value))
    return this
  }

  get version() {
    return this._version
  }

  setVersion(value: string | number | AcDbDwgVersion) {
    this._version =
      value instanceof AcDbDwgVersion ? value : new AcDbDwgVersion(value)
    return this
  }

  toString() {
    return this._lines.join('\n') + '\n'
  }

  registerHandle(key: string) {
    if (!this._handleMap.has(key)) {
      this._handleMap.set(key, this._nextHandle.toString(16).toUpperCase())
      this._nextHandle += 1
    }
    return this._handleMap.get(key)!
  }

  resolveHandle(key?: string) {
    if (!key) return undefined
    return this.registerHandle(key)
  }

  writeGroup(code: number, value: unknown) {
    if (value == null) return this
    this._lines.push(String(Math.trunc(code)))
    this._lines.push(this.formatValue(value))
    return this
  }

  writeStart(value: string) {
    return this.writeString(0, value)
  }

  writeSubclassMarker(value: string) {
    return this.writeString(100, value)
  }

  writeString(code: number, value?: string) {
    if (!value && value !== '') return this
    return this.writeGroup(code, value)
  }

  writeInt8(code: number, value?: number) {
    return value == null ? this : this.writeGroup(code, Math.trunc(value))
  }

  writeInt16(code: number, value?: number) {
    return value == null ? this : this.writeGroup(code, Math.trunc(value))
  }

  writeInt32(code: number, value?: number) {
    return value == null ? this : this.writeGroup(code, Math.trunc(value))
  }

  writeInt64(code: number, value?: number) {
    return value == null ? this : this.writeGroup(code, Math.trunc(value))
  }

  writeUInt16(code: number, value?: number) {
    return value == null ? this : this.writeGroup(code, Math.max(0, value))
  }

  writeUInt32(code: number, value?: number) {
    return value == null ? this : this.writeGroup(code, Math.max(0, value))
  }

  writeBoolean(code: number, value?: boolean) {
    return value == null ? this : this.writeGroup(code, value ? 1 : 0)
  }

  writeBool(code: number, value?: boolean) {
    return this.writeBoolean(code, value)
  }

  writeDouble(code: number, value?: number) {
    return value == null || !Number.isFinite(value)
      ? this
      : this.writeGroup(code, value)
  }

  writeAngle(code: number, radians?: number) {
    if (radians == null || !Number.isFinite(radians)) return this
    return this.writeDouble(code, (radians * 180) / Math.PI)
  }

  writeHandle(code: number, key?: string) {
    const handle = this.resolveHandle(key)
    return handle ? this.writeString(code, handle) : this
  }

  writeObjectId(code: number, objectId?: string) {
    return this.writeHandle(code, objectId)
  }

  writePoint2d(code: number, point?: AcGePoint2dLike) {
    if (!point) return this
    this.writeDouble(code, point.x)
    this.writeDouble(code + 10, point.y)
    return this
  }

  writePoint3d(code: number, point?: AcGePoint3dLike) {
    if (!point) return this
    this.writeDouble(code, point.x)
    this.writeDouble(code + 10, point.y)
    this.writeDouble(code + 20, point.z ?? 0)
    return this
  }

  writeVector3d(code: number, vector?: AcGeVector3dLike) {
    if (!vector) return this
    this.writeDouble(code, vector.x)
    this.writeDouble(code + 10, vector.y)
    this.writeDouble(code + 20, vector.z ?? 0)
    return this
  }

  writeCmColor(
    color?: AcCmColor,
    aciCode: number = 62,
    trueColorCode: number = 420
  ) {
    if (!color) return this
    const aci = color.colorIndex
    if (aci != null) {
      this.writeInt16(aciCode, aci)
    }
    const rgb = color.RGB
    if (rgb != null && color.colorIndex == null) {
      this.writeInt32(trueColorCode, rgb)
    }
    return this
  }

  writeTransparency(transparency?: AcCmTransparency, code: number = 440) {
    if (!transparency) return this
    return this.writeInt32(code, transparency.serialize())
  }

  writeResultBuffer(data?: AcDbResultBuffer | null) {
    if (!data) return this
    for (const item of data) {
      this.writeGroup(item.code, item.value)
    }
    return this
  }

  startSection(name: string) {
    this.writeStart('SECTION')
    this.writeString(2, name)
    return this
  }

  endSection() {
    this.writeStart('ENDSEC')
    return this
  }

  startTable(name: string, count: number) {
    this.writeStart('TABLE')
    this.writeString(2, name)
    this.writeInt16(70, count)
    return this
  }

  endTable() {
    this.writeStart('ENDTAB')
    return this
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'string') return value
    if (typeof value === 'boolean') return value ? '1' : '0'
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return '0'
      if (Number.isInteger(value)) return String(value)
      const fixed = value.toFixed(this._precision)
      return fixed.replace(/\.?0+$/, '')
    }
    return String(value)
  }
}
