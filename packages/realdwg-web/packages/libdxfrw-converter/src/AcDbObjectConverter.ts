import { AcDbRasterImageDef } from '@mlightcad/data-model'
import { DRW_ImageEx } from '@mlightcad/libdxfrw-web'

export class AcDbObjectConverter {
  convertImageDef(imageDef: DRW_ImageEx) {
    const dbObject = new AcDbRasterImageDef()
    dbObject.sourceFileName = imageDef.path
    dbObject.objectId = imageDef.handle.toString()
    dbObject.ownerId = imageDef.parentHandle.toString()
    return dbObject
  }
}
