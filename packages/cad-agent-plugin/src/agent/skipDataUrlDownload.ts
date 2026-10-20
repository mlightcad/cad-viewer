import { createDownload, type Experimental_DownloadFunction } from 'ai'

const downloadRemote = createDownload()

/**
 * AI SDK download hook that leaves `data:` URLs inline.
 *
 * OpenAI-compatible providers only declare `https?` in `supportedUrls`, so the
 * default downloader would `fetch` every attached image data URL before the
 * request. That is redundant (the SDK already splits data URLs) and can stall
 * or fail on large vision payloads. Returning `null` passes the URL through
 * for inline base64 handling.
 */
export const skipDataUrlDownload: Experimental_DownloadFunction = requested =>
  Promise.all(
    requested.map(async req => {
      if (req.isUrlSupportedByModel || req.url.protocol === 'data:') {
        return null
      }
      return downloadRemote({ url: req.url })
    })
  )
