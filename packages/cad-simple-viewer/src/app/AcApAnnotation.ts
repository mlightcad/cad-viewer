import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbDxfCode,
  AcDbLayerTableRecord,
  AcDbObject,
  AcDbObjectId,
  AcDbResultBuffer
} from '@mlightcad/data-model'

export class AcApAnnotation {
  /**
   * Default annotation color is red
   */
  static DEFAULT_ANNOTATION_COLOR = new AcCmColor(AcCmColorMethod.ByACI, 1)
  private _database: AcDbDatabase

  constructor(db: AcDbDatabase) {
    this._database = db
  }

  /**
   * Finds or creates a annotation layer identified by MLightCAD-specific XData.
   *
   * This method enforces the concept of a *singleton annotation layer* in a drawing.
   * It first scans all existing layers and looks for one whose XData contains
   * a description value of `"mlightcad"` under the registered application name
   * `"mlightcad"`.
   *
   * Behavior:
   * - If such a layer already exists, its name is returned and **no new layer
   *   is created**.
   * - If no matching layer is found, a new layer is created with:
   *   - A unique name using the prefix `"$revision_"` followed by a numeric index
   *     (e.g. `$revision_1`, `$revision_2`, …)
   *   - Yellow color (ACI = 2)
   *   - Layer turned on and plottable
   *   - XData attached to mark it as an MLightCAD annotation layer
   *
   * XData layout:
   * - RegApp name: `"mlightcad"`
   * - Description (ASCII string): `"mlightcad"`
   *
   * The attached XData allows the annotation layer to be reliably identified even
   * if the layer is renamed by the user.
   *
   * @returns The name of the existing or newly created annotation layer.
   */
  public getAnnotationLayer(): string {
    const prefix = '$revision_'
    const appId = AcDbDatabase.MLIGHTCAD_APPID

    const layerTable = this._database.tables.layerTable

    // 1. Try to find an existing annotation layer by XData
    for (const layer of layerTable.newIterator()) {
      if (this.hasAnnotationXData(layer)) return layer.name
    }

    // 2. Generate a unique layer name
    let index = 1
    let layerName = `${prefix}${index}`
    while (layerTable.has(layerName)) {
      index++
      layerName = `${prefix}${index}`
    }

    // 3. Create the layer
    const record = new AcDbLayerTableRecord({
      name: layerName,
      isOff: false,
      // Use red color as default color
      color: new AcCmColor(AcCmColorMethod.ByACI, 1),
      isPlottable: true
    })

    // 4. Attach XData
    const xdata = new AcDbResultBuffer([
      { code: AcDbDxfCode.ExtendedDataRegAppName, value: appId },
      { code: AcDbDxfCode.ExtendedDataAsciiString, value: appId }
    ])

    record.setXData(xdata)

    layerTable.add(record)

    return layerName
  }

  filterAnnotationEntities(ids: AcDbObjectId[]) {
    const layerName = this.getAnnotationLayer()
    return ids.filter(id => {
      const entity = this._database.tables.blockTable.getEntityById(id)
      return entity && entity.layer == layerName
    })
  }

  /**
   * Returns true if the specified object contains annotation xdata, which means
   * it is only object created by annotation related commands.
   * @param object - Object to check whether it contains annotation xdata.
   * @returns Returns true if the specified object contains annotation xdata.
   */
  public hasAnnotationXData(object: AcDbObject) {
    const appId = AcDbDatabase.MLIGHTCAD_APPID
    const xdata = object.getXData(appId)
    if (!xdata) return false

    // Look for Description string == 'mlightcad'
    for (const tv of xdata) {
      if (
        tv.code === AcDbDxfCode.ExtendedDataAsciiString &&
        tv.value === appId
      ) {
        return true
      }
    }
    return false
  }
}
