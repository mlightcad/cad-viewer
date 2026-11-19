import type { AcExHtmlPackageFile } from './AcExHtmlPackageTypes.js'

/**
 * File name of the drawing preview image at the root of a multi-file package
 * (next to `viewer.html`).
 */
export const ACEX_PACKAGE_PREVIEW_FILE = 'preview.jpg'

/**
 * Returns package files with `preview.jpg` appended when JPEG bytes are given.
 *
 * Package builders only emit viewer HTML, manifest and chunks; every host
 * (browser plugin, Node exporter) adds the drawing thumbnail through this
 * helper so zipped and unzipped packages share one layout.
 *
 * @param files - Files produced by `acexHtmlBuildPackage` / `acexHtmlBuildPackageAsync`.
 * @param previewJpeg - JPEG bytes of the drawing thumbnail, if any.
 * @returns `files` unchanged when there is no preview, otherwise a new array.
 */
export function acexHtmlAppendPackagePreview(
  files: AcExHtmlPackageFile[],
  previewJpeg: Uint8Array | undefined | null
): AcExHtmlPackageFile[] {
  if (!previewJpeg?.length) return files
  return [
    ...files.filter(file => file.path !== ACEX_PACKAGE_PREVIEW_FILE),
    { path: ACEX_PACKAGE_PREVIEW_FILE, bytes: previewJpeg }
  ]
}
