import { AcApDocManager } from '../app'

/**
 * Utility class for exporting the current CAD drawing to DXF format.
 */
export class AcApDxfConvertor {
  /**
   * Exports the current drawing database to a DXF file and downloads it.
   */
  convert() {
    const document = AcApDocManager.instance.curDocument
    const raw = document.database.dxfOut(undefined, 6)
    const dxfContent = this.normalizeDxfAsciiForExternalCad(raw)
    const baseName = this.getBaseName(document.fileName || document.docTitle)
    this.createFileAndDownloadIt(dxfContent, `${baseName}.dxf`)
  }

  private createFileAndDownloadIt(dxfContent: string, fileName: string) {
    const dxfBlob = new Blob([dxfContent], {
      type: 'application/dxf'
    })
    const url = URL.createObjectURL(dxfBlob)
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = fileName
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    URL.revokeObjectURL(url)
  }

  private getBaseName(fileName: string) {
    const normalizedName = fileName?.trim() || 'drawing'
    return normalizedName.replace(/\.[^.]+$/, '') || 'drawing'
  }

  /**
   * Normalizes ASCII DXF for strict readers (e.g. AutoCAD): CRLF, trailing EOF, and
   * stable code/value pairing.
   *
   * **Important:** DXF values are often plain integers (`70` + `4` for INSUNITS, etc.).
   * A line like `4` or `0` is a **value**, not a group code. Any heuristic that treats
   * “looks like an integer” as the start of the next pair will insert **empty value lines**
   * and corrupt the file — the bug seen in exported HEADER/TABLES.
   *
   * Here we assume one value line per group code (matches current `AcDbDxfFiler`, which
   * sanitizes string lines). Blank lines between a code and its value (legacy bugs) are
   * skipped so a stray blank line between code and value is removed.
   */
  private normalizeDxfAsciiForExternalCad(dxf: string): string {
    const lines = dxf.split(/\r\n|\n|\r/)
    const out: string[] = []
    const isGroupCode = (s: string) => /^-?\d+$/.test((s ?? '').trim())

    const skipEmpty = (start: number) => {
      let j = start
      while (j < lines.length && !(lines[j] ?? '').trim()) j++
      return j
    }

    let i = 0
    while (i < lines.length) {
      i = skipEmpty(i)
      if (i >= lines.length) break

      const codeLine = (lines[i] ?? '').trim()
      if (!isGroupCode(codeLine)) {
        i++
        continue
      }
      out.push(codeLine)
      i++

      i = skipEmpty(i)
      if (i >= lines.length) {
        out.push('')
        break
      }
      const valueLine = lines[i] ?? ''
      i++
      const cleaned = valueLine
        .replace(/\r|\n/g, ' ')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      out.push(cleaned)
    }

    let body = out.join('\r\n').replace(/\s+$/, '')
    if (!/0\r\nEOF$/i.test(body)) {
      body += '\r\n0\r\nEOF'
    }
    return `${body}\r\n`
  }
}
