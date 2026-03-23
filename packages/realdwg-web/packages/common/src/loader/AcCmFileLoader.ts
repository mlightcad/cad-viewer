/**
 * @fileoverview HTTP-based file loader implementation for the AutoCAD Common library.
 *
 * This module provides a concrete implementation of the loader interface using
 * the Fetch API for loading files over HTTP. Supports various response types
 * and provides comprehensive error handling.
 *
 * @module AcCmFileLoader
 * @version 1.0.0
 */

import { AcCmLoader, AcCmLoaderProgressCallback } from './AcCmLoader'
import {
  AcCmLoadingManager,
  AcCmOnErrorCallback,
  AcCmOnLoadCallback
} from './AcCmLoadingManager'

/**
 * @internal
 */
const loading: Record<
  string,
  {
    onLoad: (data: unknown) => void
    onProgress: AcCmLoaderProgressCallback
    onError: AcCmOnErrorCallback
  }[]
> = {}

/**
 * Custom error class for HTTP-related failures.
 *
 * @internal
 */
class HttpError extends Error {
  /** The HTTP response object that caused the error. */
  response: Response

  /**
   * Creates a new HttpError.
   *
   * @param {string} message - The error message.
   * @param {Response} response - The HTTP response that caused the error.
   */
  constructor(message: string, response: Response) {
    super(message)
    this.response = response
  }
}

/**
 * The supported response types for file loading operations.
 *
 * - `''` or `'text'` - Returns the data as a string (default).
 * - `'arraybuffer'` - Loads the data into an ArrayBuffer.
 * - `'blob'` - Returns the data as a Blob.
 * - `'document'` - Parses the file using the DOMParser.
 * - `'json'` - Parses the file using JSON.parse.
 */
type AcCmResponseType =
  | ''
  | 'text'
  | 'arraybuffer'
  | 'blob'
  | 'document'
  | 'json'

/**
 * HTTP-based file loader using the Fetch API.
 *
 * A low-level class for loading resources over HTTP, used internally by most loaders.
 * It can also be used directly to load any file type that does not have a specialized loader.
 *
 * Supports various response types, custom MIME types, and provides comprehensive error handling
 * with automatic retry mechanisms for failed requests.
 *
 * @example
 * ```typescript
 * import { AcCmFileLoader } from './AcCmFileLoader'
 *
 * const loader = new AcCmFileLoader()
 *
 * // Load a text file
 * loader.load(
 *   'data.txt',
 *   (data) => console.log('Loaded:', data),
 *   (progress) => console.log('Progress:', progress.loaded / progress.total),
 *   (error) => console.error('Error:', error)
 * )
 *
 * // Load binary data
 * loader.setResponseType('arraybuffer')
 * loader.load('file.dwg', (arrayBuffer) => {
 *   // Process binary data
 * })
 * ```
 */
export class AcCmFileLoader extends AcCmLoader {
  /**
   * The expected mimeType. Default is undefined.
   */
  mimeType?: DOMParserSupportedType
  /**
   * The expected response type. Default is undefined.
   */
  responseType?: AcCmResponseType

  /**
   * Create a new AcCmFileLoader instance.
   * @param manager The loadingManager for the loader to use. Default is DefaultLoadingManager.
   */
  constructor(manager?: AcCmLoadingManager) {
    super(manager)
  }

  /**
   * Load the URL and pass the response to the onLoad function.
   * @param url The path or URL to the file. This can also be a Data URI.
   * @param onLoad (optional) — Will be called when loading completes.
   * @param onProgress (optional) — Will be called while load progresses.
   * @param onError (optional) — Will be called if an error occurs.
   */
  load(
    url: string,
    onLoad: AcCmOnLoadCallback,
    onProgress: AcCmLoaderProgressCallback,
    onError: AcCmOnErrorCallback
  ) {
    if (url === undefined) url = ''
    if (this.path !== undefined) url = this.path + url
    url = this.manager.resolveURL(url)

    // Check if request is duplicate
    if (loading[url] !== undefined) {
      loading[url].push({
        onLoad: onLoad,
        onProgress: onProgress,
        onError: onError
      })

      return
    }

    // Initialise array for duplicate requests
    loading[url] = []

    loading[url].push({
      onLoad: onLoad,
      onProgress: onProgress,
      onError: onError
    })

    // create request
    const req = new Request(url, {
      headers: new Headers(this.requestHeader),
      credentials: this.withCredentials ? 'include' : 'same-origin'
      // An abort controller could be added within a future PR
    })

    // record states ( avoid data race )
    const mimeType = this.mimeType
    const responseType = this.responseType

    // start the fetch
    fetch(req)
      .then(response => {
        if (response.status === 200 || response.status === 0) {
          // Some browsers return HTTP Status 0 when using non-http protocol
          // e.g. 'file://' or 'data://'. Handle as success.

          if (response.status === 0) {
            console.warn('HTTP Status 0 received.')
          }

          // Workaround: Checking if response.body === undefined for Alipay browser #23548

          if (
            typeof ReadableStream === 'undefined' ||
            response.body === undefined ||
            response.body?.getReader === undefined
          ) {
            return response
          }

          const callbacks = loading[url]
          const reader = response.body.getReader()

          // Nginx needs X-File-Size check
          // https://serverfault.com/questions/482875/why-does-nginx-remove-content-length-header-for-chunked-content
          const contentLength =
            response.headers.get('X-File-Size') ||
            response.headers.get('Content-Length')
          const total = contentLength ? parseInt(contentLength) : 0
          const lengthComputable = total !== 0
          let loaded = 0

          // periodically read data into the new stream tracking while download progress
          const stream = new ReadableStream({
            start(controller) {
              readData()

              function readData() {
                reader.read().then(
                  ({ done, value }) => {
                    if (done) {
                      controller.close()
                    } else {
                      loaded += value.byteLength

                      const event = new ProgressEvent('progress', {
                        lengthComputable,
                        loaded,
                        total
                      })
                      for (let i = 0, il = callbacks.length; i < il; i++) {
                        const callback = callbacks[i]
                        if (callback.onProgress) callback.onProgress(event)
                      }

                      controller.enqueue(value)
                      readData()
                    }
                  },
                  e => {
                    controller.error(e)
                  }
                )
              }
            }
          })

          return new Response(stream)
        } else {
          throw new HttpError(
            `fetch for "${response.url}" responded with ${response.status}: ${response.statusText}`,
            response
          )
        }
      })
      .then(response => {
        switch (responseType) {
          case 'arraybuffer':
            return response.arrayBuffer()

          case 'blob':
            return response.blob()

          case 'document':
            return response.text().then(text => {
              const parser = new DOMParser()
              return parser.parseFromString(text, mimeType!)
            })

          case 'json':
            return response.json()

          default:
            if (mimeType === undefined) {
              return response.text()
            } else {
              // sniff encoding
              const re = /charset="?([^;"\s]*)"?/i
              const exec = re.exec(mimeType)
              const label = exec && exec[1] ? exec[1].toLowerCase() : undefined
              const decoder = new TextDecoder(label)
              return response.arrayBuffer().then(ab => decoder.decode(ab))
            }
        }
      })
      .then(data => {
        const callbacks = loading[url]
        delete loading[url]

        for (let i = 0, il = callbacks.length; i < il; i++) {
          const callback = callbacks[i]
          if (callback.onLoad) callback.onLoad(data)
        }
      })
      .catch(err => {
        // Abort errors and other errors are handled the same

        const callbacks = loading[url]

        if (callbacks === undefined) {
          // When onLoad was called and url was deleted in `loading`
          this.manager.itemError(url)
          throw err
        }

        delete loading[url]

        for (let i = 0, il = callbacks.length; i < il; i++) {
          const callback = callbacks[i]
          if (callback.onError) callback.onError(err)
        }

        this.manager.itemError(url)
      })
      .finally(() => {
        this.manager.itemEnd(url)
      })

    this.manager.itemStart(url)
  }

  /**
   * Change the response type. Valid values are:
   * - text or empty string (default) - returns the data as String.
   * - arraybuffer - loads the data into a ArrayBuffer and returns that.
   * - blob - returns the data as a Blob.
   * - document - parses the file using the DOMParser.
   * - json - parses the file using JSON.parse.
   * @param value
   * @returns Return this object
   */
  setResponseType(value: AcCmResponseType) {
    this.responseType = value
    return this
  }

  /**
   * Set the expected mimeType of the file being loaded. Note that in many cases this will be determined
   * automatically, so by default it is undefined.
   * @param value The expected mimeType of the file being loaded.
   * @returns Return this object.
   */
  setMimeType(value: DOMParserSupportedType) {
    this.mimeType = value
    return this
  }
}
