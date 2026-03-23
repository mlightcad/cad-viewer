import { AcDbDatabase } from '../database/AcDbDatabase'
import type { AcDbLayoutManager } from '../object/layout/AcDbLayoutManager'
import { setAcDbHostApplicationServicesProvider } from './AcDbObject'

let layoutManagerFactory: (() => AcDbLayoutManager) | undefined

export function setAcDbLayoutManagerFactory(factory: () => AcDbLayoutManager) {
  layoutManagerFactory = factory
}

/**
 * Returns the singleton instance of the host application services.
 *
 * This function provides access to the global AcDbHostApplicationServices instance
 * that manages various services for host applications at runtime.
 *
 * @returns The singleton instance of AcDbHostApplicationServices
 * @example
 * ```typescript
 * const services = acdbHostApplicationServices();
 * const database = services.workingDatabase;
 * ```
 */
export function acdbHostApplicationServices() {
  return AcDbHostApplicationServices.instance
}

/**
 * The AcDbHostApplicationServices class provides various services to host applications at runtime.
 *
 * This class implements the singleton pattern and manages:
 * - Working database reference
 * - Layout manager instance
 * - Other application-wide services
 *
 * @example
 * ```typescript
 * const services = acdbHostApplicationServices();
 * services.workingDatabase = new AcDbDatabase();
 * const layoutManager = services.layoutManager;
 * ```
 */
export class AcDbHostApplicationServices {
  /** The current working database instance */
  private _workingDatabase: AcDbDatabase | null = null

  /** The layout manager instance */
  private _layoutManager?: AcDbLayoutManager

  /** The singleton instance of AcDbHostApplicationServices */
  public static instance: AcDbHostApplicationServices =
    new AcDbHostApplicationServices()

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Gets the current working database.
   *
   * The working database is the primary database that the application
   * is currently operating on. This must be set before it can be accessed.
   *
   * @returns The current working database
   * @throws {Error} When the working database has not been set
   * @example
   * ```typescript
   * const services = acdbHostApplicationServices();
   * try {
   *   const db = services.workingDatabase;
   *   // Use the database
   * } catch (error) {
   *   console.error('Working database not set');
   * }
   * ```
   */
  get workingDatabase(): AcDbDatabase {
    if (this._workingDatabase == null) {
      throw new Error(
        'The current working database must be set before using it!'
      )
    } else {
      return this._workingDatabase
    }
  }

  /**
   * Sets the working database.
   *
   * This method sets the database that will be used as the current working database
   * for the application. This database will be returned by the workingDatabase getter.
   *
   * @param database - The database to make the new working database
   * @example
   * ```typescript
   * const services = acdbHostApplicationServices();
   * const db = new AcDbDatabase();
   * services.workingDatabase = db;
   * ```
   */
  set workingDatabase(database: AcDbDatabase) {
    this._workingDatabase = database
  }

  /**
   * Gets the layout manager instance.
   *
   * The layout manager is responsible for managing layout objects in the application.
   * This is a singleton instance that is created when the AcDbHostApplicationServices
   * is instantiated.
   *
   * @returns The layout manager instance
   * @example
   * ```typescript
   * const services = acdbHostApplicationServices();
   * const layoutManager = services.layoutManager;
   * // Use the layout manager
   * ```
   */
  get layoutManager() {
    if (!this._layoutManager) {
      if (!layoutManagerFactory) {
        throw new Error(
          'The layout manager factory must be registered before using it!'
        )
      }
      this._layoutManager = layoutManagerFactory()
    }
    return this._layoutManager
  }
}

setAcDbHostApplicationServicesProvider(acdbHostApplicationServices)
