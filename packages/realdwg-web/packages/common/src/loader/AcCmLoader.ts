/**
 * @fileoverview Base loader implementation for the AutoCAD Common library.
 *
 * This module provides the abstract base class for all loaders in the system,
 * defining the common interface and shared functionality for loading various
 * types of resources.
 *
 * @module AcCmLoader
 * @version 1.0.0
 */

import {
  AcCmLoadingManager,
  AcCmOnErrorCallback,
  DefaultLoadingManager
} from './AcCmLoadingManager'

/**
 * Callback function for reporting loading progress.
 *
 * @param {ProgressEvent} progress - The progress event containing loading information.
 */
export type AcCmLoaderProgressCallback = (progress: ProgressEvent) => void

/**
 * Abstract base class for implementing resource loaders.
 *
 * This class provides the common functionality and interface that all loaders
 * must implement, including loading manager integration, path handling, and
 * configuration options for cross-origin requests.
 *
 * @abstract
 *
 * @example
 * ```typescript
 * class MyCustomLoader extends AcCmLoader {
 *   load(url: string, onLoad: (data: MyDataType) => void, onProgress?: AcCmLoaderProgressCallback, onError?: AcCmOnErrorCallback): void {
 *     // Implementation specific loading logic
 *     const fullUrl = this.resolveURL(url)
 *     // ... fetch and process data
 *     onLoad(processedData)
 *   }
 * }
 * ```
 */
export abstract class AcCmLoader {
  manager: AcCmLoadingManager
  /**
   * The crossOrigin string to implement CORS for loading the url from a different domain that allows CORS.
   * Default is anonymous.
   */
  crossOrigin: string
  /**
   * Whether the XMLHttpRequest uses credentials. Default is false.
   */
  withCredentials: boolean
  /**
   * The base path from which the asset will be loaded. Default is the empty string.
   */
  path: string
  /**
   * The base path from which additional resources like textures will be loaded.
   * Default is the empty string.
   */
  resourcePath: string
  /**
   * The request header used in HTTP request.
   */
  requestHeader: HeadersInit

  /**
   * Creates a new AcCmLoader instance.
   * @param manager The loadingManager for the loader to use. Default is DefaultLoadingManager.
   */
  constructor(manager?: AcCmLoadingManager) {
    this.manager = manager !== undefined ? manager : DefaultLoadingManager
    this.crossOrigin = 'anonymous'
    this.withCredentials = false
    this.path = ''
    this.resourcePath = ''
    this.requestHeader = {}
  }

  /**
   * This method needs to be implement by all concrete loaders. It holds the logic for loading
   * the asset from the backend.
   * @param url The path or URL to the file. This can also be a Data URI.
   * @param onLoad (optional) — Will be called when loading completes.
   * @param onProgress (optional) — Will be called while load progresses.
   * @param onError (optional) — Will be called if an error occurs.
   */
  abstract load(
    url: string,
    onLoad?: (data: unknown) => void,
    onProgress?: AcCmLoaderProgressCallback,
    onError?: AcCmOnErrorCallback
  ): void

  /**
   * This method is equivalent to 'load', but returns a Promise.
   * @param url A string containing the path/URL of the file to be loaded.
   * @param onProgress (optional) — A function to be called while the loading is in progress.
   * The argument will be the ProgressEvent instance, which contains .lengthComputable, .total
   * and .loaded. If the server does not set the Content-Length header; .total will be 0.
   * @returns Return a promise.
   */
  loadAsync(url: string, onProgress: AcCmLoaderProgressCallback) {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, onProgress, reject)
    })
  }

  /**
   * This method needs to be implement by all concrete loaders. It holds the logic for parsing the asset.
   */
  parse(_data: unknown) {}

  /**
   * Set the crossOrigin string to implement CORS for loading the url from a different domain that allows
   * CORS.
   * @param crossOrigin The crossOrigin string
   * @returns Return this object
   */
  setCrossOrigin(crossOrigin: string) {
    this.crossOrigin = crossOrigin
    return this
  }

  /**
   * Set whether the XMLHttpRequest uses credentials such as cookies, authorization headers or TLS
   * client certificates.
   * Note that this has no effect if you are loading files locally or from the same domain.
   * @param value The flag whether the XMLHttpRequest uses credentials.
   * @returns Return this object
   */
  setWithCredentials(value: boolean) {
    this.withCredentials = value
    return this
  }

  /**
   * Set the base path for the asset.
   * @param path The base path for the asset.
   * @returns Return this object
   */
  setPath(path: string) {
    this.path = path
    return this
  }

  /**
   * Set the base path for dependent resources like textures.
   * @param resourcePath The base path for dependent resources like textures.
   * @returns Return this object
   */
  setResourcePath(resourcePath: string) {
    this.resourcePath = resourcePath
    return this
  }

  /**
   * Set the request header used in HTTP request.
   * @param requestHeader  key: The name of the header whose value is to be set. value: The value
   * to set as the body of the header.
   * @returns Return this object
   */
  setRequestHeader(requestHeader: HeadersInit) {
    this.requestHeader = requestHeader
    return this
  }
}
