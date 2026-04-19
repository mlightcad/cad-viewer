import { AcApDocManager } from '../../app'

/**
 * Utility class for exporting the current CAD drawing to DXF format.
 */
export class AcApDxfConvertor {
  /**
   * Exports the current drawing database to a DXF file and downloads it.
   */
  convert() {
    const document = AcApDocManager.instance.curDocument
    const dxfContent = document.database.dxfOut(undefined, 6)
    const baseName = this.getBaseName(document.fileName || document.docTitle)
    this.createFileAndDownloadIt(dxfContent, `${baseName}.dxf`)
  }

  private createFileAndDownloadIt(dxfContent: string, fileName: string) {
    const dxfBlob = new Blob([dxfContent], {
      type: 'application/dxf;charset=utf-8'
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
}
