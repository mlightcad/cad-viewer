import { AcCmColor, AcCmColorMethod, AcCmEventManager } from '@mlightcad/common'
import { AcGePointLike } from '@mlightcad/geometry-engine'
import { AcGiLineWeight } from '@mlightcad/graphic-interface'

import { DEFAULT_TEXT_STYLE } from '../misc'
import type { AcDbDatabase } from './AcDbDatabase'
import { AcDbSystemVariables } from './AcDbSystemVariables'

/**
 * Supported AutoCAD system variable data type name.
 */
export type AcDbSysVarTypeName =
  | 'string'
  | 'color'
  | 'number'
  | 'boolean'
  | 'point'
  | 'unknown'

/**
 * Supported AutoCAD system variable data type name.
 */
export type AcDbSysVarType =
  | string
  | number
  | boolean
  | AcGePointLike
  | AcCmColor

/**
 * Definition for a system variable in our registry.
 */
export interface AcDbSysVarDescriptor {
  /** System variable name, e.g., "CLAYER" */
  name: string

  /** Expected variable type */
  type: AcDbSysVarTypeName

  /** The flag to indicate whether it is one database-resident variable. */
  isDbVar: boolean

  /** Optional description (documentation) */
  description?: string

  /** Optional default value */
  defaultValue?: AcDbSysVarType
}

/**
 * Event arguments for system variable related events.
 */
export interface AcDbSysVarEventArgs {
  /** The database that triggered the event */
  database: AcDbDatabase
  /** The system variable name */
  name: string
  /** The new value of system variable */
  newVal: AcDbSysVarType
  /** The old value of system variable */
  oldVal?: AcDbSysVarType
}

/**
 * Main manager responsible for:
 * - registry of known system variables
 * - caching values
 * - invoking backend getVar/setVar
 * - dispatching sysvar change events
 */
export class AcDbSysVarManager {
  private static _instance: AcDbSysVarManager | null = null

  /** Singleton accessor */
  public static instance(): AcDbSysVarManager {
    if (!this._instance) this._instance = new AcDbSysVarManager()
    return this._instance
  }

  /** Registered system variable metadata */
  private registry = new Map<string, AcDbSysVarDescriptor>()

  /** Cached current values for non-database-resident variables. */
  private cache = new Map<string, unknown>()

  /** System variable related events */
  public readonly events = {
    /**
     * Fired after a system variable is changed directly through the SETVAR command or
     * by entering the variable name at the command line.
     */
    sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>()
  }

  private constructor() {
    this.registerVar({
      name: AcDbSystemVariables.CECOLOR,
      type: 'color',
      isDbVar: true,
      defaultValue: new AcCmColor(AcCmColorMethod.ByLayer)
    })
    this.registerVar({
      name: AcDbSystemVariables.CELTSCALE,
      type: 'number',
      isDbVar: true,
      defaultValue: -1
    })
    this.registerVar({
      name: AcDbSystemVariables.CELWEIGHT,
      type: 'number',
      isDbVar: true,
      defaultValue: AcGiLineWeight.ByLayer
    })
    this.registerVar({
      name: AcDbSystemVariables.CLAYER,
      type: 'string',
      isDbVar: true,
      defaultValue: '0'
    })
    /**
     * Color theme of UI elements
     * - 0:	Dark theme
     * - 1:	Light theme
     */
    this.registerVar({
      name: AcDbSystemVariables.COLORTHEME,
      type: 'number',
      isDbVar: false,
      defaultValue: '0'
    })
    this.registerVar({
      name: AcDbSystemVariables.LWDISPLAY,
      type: 'boolean',
      isDbVar: true,
      defaultValue: false
    })
    /**
     * Color used for measurement tool overlays (distance, area, arc).
     * Default: RGB(96, 165, 250)
     */
    this.registerVar({
      name: AcDbSystemVariables.MEASUREMENTCOLOR,
      type: 'color',
      isDbVar: false,
      defaultValue: (() => {
        const c = new AcCmColor(AcCmColorMethod.ByColor)
        c.setRGB(96, 165, 250)
        return c
      })()
    })
    /**
     * Running Object Snap (OSNAP) modes stored as a bitcode value.
     * Each snap type corresponds to a bit, and the values are added together.
     */
    this.registerVar({
      name: AcDbSystemVariables.OSMODE,
      type: 'number',
      isDbVar: true,
      defaultValue: 0
    })
    /**
     * Represents the half-size of the pickbox in pixels
     */
    this.registerVar({
      name: AcDbSystemVariables.PICKBOX,
      type: 'number',
      isDbVar: false,
      defaultValue: 10
    })
    this.registerVar({
      name: AcDbSystemVariables.TEXTSTYLE,
      type: 'string',
      isDbVar: true,
      defaultValue: DEFAULT_TEXT_STYLE
    })
    this.registerVar({
      /**
       * The flag whether the background color is white
       * - false: black
       * - true: white
       */
      name: AcDbSystemVariables.WHITEBKCOLOR,
      type: 'boolean',
      isDbVar: false,
      defaultValue: false
    })
  }

  /**
   * Register one system variable metadata entry.
   */
  public registerVar(desc: AcDbSysVarDescriptor) {
    const name = this.normalizeName(desc.name)
    this.registry.set(name, {
      ...desc,
      name
    })
    if (!desc.isDbVar) {
      this.cache.set(name, desc.defaultValue)
    }
  }

  /**
   * Register many system variables.
   */
  public registerMany(vars: AcDbSysVarDescriptor[]) {
    vars.forEach(v => this.registerVar(v))
  }

  /**
   * Get system variable value.
   */
  public getVar(name: string, db: AcDbDatabase): AcDbSysVarType | undefined {
    name = this.normalizeName(name)
    const descriptor = this.getDescriptor(name)
    if (descriptor) {
      if (descriptor.isDbVar) {
        return db[name.toLowerCase() as keyof AcDbDatabase] as AcDbSysVarType
      } else if (this.cache.has(name)) {
        return this.cache.get(name) as AcDbSysVarType
      }
    }

    return undefined
  }

  /**
   * Set system variable value.
   */
  public setVar(name: string, value: AcDbSysVarType, db: AcDbDatabase) {
    name = this.normalizeName(name)
    const descriptor = this.getDescriptor(name)
    if (descriptor) {
      const oldVal = this.getVar(name, db)
      if (
        descriptor.type !== 'string' &&
        (typeof value === 'string' || value instanceof String)
      ) {
        if (descriptor.type === 'number') {
          const num = Number(value)
          if (Number.isNaN(num)) {
            throw new Error('Invalid number input!')
          }
          value = num
        } else if (descriptor.type === 'boolean') {
          value = this.parseBoolean(value as string)
        } else if (descriptor.type === 'color') {
          const tmp = AcCmColor.fromString(value as string)
          if (tmp == null) {
            throw new Error('Invalid color value!')
          }
          value = tmp
        }
      }
      if (descriptor.isDbVar) {
        ;(db as unknown as Record<string, unknown>)[name.toLowerCase()] = value
      } else {
        this.cache.set(name, value)
        if (this.hasValueChanged(oldVal, value)) {
          this.events.sysVarChanged.dispatch({
            database: db,
            name,
            newVal: value,
            oldVal
          })
        }
      }
    } else {
      throw new Error(`System variable ${name} not found!`)
    }
  }

  /**
   * Get system variable metadata descriptor (if registered).
   */
  public getDescriptor(name: string): AcDbSysVarDescriptor | undefined {
    return this.registry.get(this.normalizeName(name))
  }

  /**
   * Get all registered system variable descriptors.
   */
  public getAllDescriptors(): AcDbSysVarDescriptor[] {
    return [...this.registry.values()]
  }

  /**
   * Parse one string as one boolean value with case-insensitive by ignoring extra spaces
   * - "true" / "false"
   * - "t" / "f"
   * - "1" / "0"
   * - "yes" / "no"
   * - "y" / "n"
   * @param value - One string
   * @returns - The parsed boolean value
   */
  private parseBoolean(value: string | null | undefined) {
    if (value == null) return false

    const v = String(value).trim().toLowerCase()

    const trueValues = new Set(['true', 't', '1', 'yes', 'y'])
    const falseValues = new Set(['false', 'f', '0', 'no', 'n'])

    if (trueValues.has(v)) return true
    if (falseValues.has(v)) return false

    return false
  }

  /**
   * Check if sysvar value changed.
   */
  private hasValueChanged(
    oldValue: AcDbSysVarType | undefined,
    newValue: AcDbSysVarType | undefined
  ) {
    if (oldValue instanceof AcCmColor && newValue instanceof AcCmColor) {
      return !oldValue.equals(newValue)
    }

    return !Object.is(oldValue, newValue)
  }

  /**
   * Normalize system variable name for internal storage and lookup.
   */
  private normalizeName(name: string): string {
    return name.toLowerCase()
  }
}
