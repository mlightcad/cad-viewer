import DxfParser, { ParsedDxf } from '@mlightcad/dxf-json'

// Please don't modify the following two lines to import from '../database' and
// import from '../misc' so that treeshaking can include classes really needed.
import { AcDbDwgVersion } from '../database/AcDbDwgVersion'
import { AcDbCodePage, dwgCodePageToEncoding } from '../misc/AcDbCodePage'

/**
 * Extracts DXF version and code page from an ArrayBuffer containing the DXF data.
 * Efficiently reads the data in chunks and stops as soon as both are found
 * or when the HEADER section ends.
 */
export interface AcDbDxfHeaderInfo {
  version: AcDbDwgVersion | null
  encoding: string | null
}

/**
 * DXF parsing worker
 */
export class AcDbDxfParser {
  parse(data: ArrayBuffer): ParsedDxf {
    const parser = new DxfParser()
    // Use our own parser to parse version and code page information only to avoid
    // parsing the whole dxf file in order to imporve performance
    const headerInfo = this.getDxfInfoFromBuffer(data)
    // If the version is less than or equal to AutoCAD 2000 format (AC1015),
    // we need to decode it to string.
    let text = ''
    if (
      headerInfo.version &&
      headerInfo.version.value <= 23 &&
      headerInfo.encoding
    ) {
      text = new TextDecoder(headerInfo.encoding).decode(data)
    } else {
      text = new TextDecoder().decode(data)
    }
    return parser.parseSync(text)
  }

  /**
   * Reads a DXF ArrayBuffer and returns its version and code page.
   * @param buffer The ArrayBuffer containing DXF file content.
   */
  private getDxfInfoFromBuffer(buffer: ArrayBuffer): AcDbDxfHeaderInfo {
    const chunkSize = 64 * 1024 // 64 KB
    const decoder = new TextDecoder('utf-8')
    let offset = 0
    let leftover = ''
    let version: AcDbDwgVersion | null = null
    let encoding: string | null = null
    let inHeader = false

    while (offset < buffer.byteLength) {
      const end = Math.min(offset + chunkSize, buffer.byteLength)
      const chunk: ArrayBuffer = buffer.slice(offset, end)
      offset = end

      const text: string = leftover + decoder.decode(chunk, { stream: true })
      const lines: string[] = text.split(/\r?\n/)
      leftover = lines.pop() ?? '' // last incomplete line (if any)

      for (let i = 0; i < lines.length; i++) {
        const line: string = lines[i].trim()

        // detect start of HEADER
        if (line === 'SECTION' && lines[i + 2]?.trim() === 'HEADER') {
          inHeader = true
        }
        // detect end of HEADER
        else if (line === 'ENDSEC' && inHeader) {
          return { version, encoding }
        }

        // parse version
        if (inHeader && line === '$ACADVER') {
          const value: string | undefined = lines[i + 2]?.trim()
          if (value) version = new AcDbDwgVersion(value)
        }
        // parse code page
        else if (inHeader && line === '$DWGCODEPAGE') {
          const value: string | undefined = lines[i + 2]?.trim()
          if (value) {
            const codePage = AcDbCodePage[value as keyof typeof AcDbCodePage]
            encoding = dwgCodePageToEncoding(codePage)
          }
        }

        if (version && encoding) {
          return { version, encoding }
        }
      }
    }

    // return even if header not complete
    return { version, encoding }
  }
}
