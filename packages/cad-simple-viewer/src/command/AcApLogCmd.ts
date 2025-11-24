import { AcCmPerformanceCollector } from '@mlightcad/data-model'

import { AcApContext } from '../app'
import { AcEdCommand } from '../command'
import { AcTrView2d } from '../view'

/**
 * This is an internal command used to log some debug information in console.
 * @internal
 */
export class AcApLogCmd extends AcEdCommand {
  execute(context: AcApContext) {
    this.printSelectionSet(context)
    this.printStats(context)
    this.printPerformanceData()
  }

  private printSelectionSet(context: AcApContext) {
    const modelSpace = context.doc.database.tables.blockTable.modelSpace
    context.view.selectionSet.ids.forEach(id => {
      const entity = modelSpace.getIdAt(id)
      if (entity) console.log(entity)
    })
  }

  private printStats(context: AcApContext) {
    const layouts = (context.view as AcTrView2d).stats.layouts
    console.log('Geometry information in current drawing:')
    for (let index = 0; index < layouts.length; ++index) {
      console.group(`Layout: ${index}`)
      const layout = layouts[index]
      const sizes: number[] = [0, 0, 0, 0, 0, 0]
      const totals: number[] = [0, 0, 0, 0, 0, 0]
      const data = layout.layers.map(layer => {
        sizes[0] = layer.line.indexed.geometrySize / 1024
        sizes[1] = layer.line.nonIndexed.geometrySize / 1024
        sizes[2] = layer.mesh.indexed.geometrySize / 1024
        sizes[3] = layer.mesh.nonIndexed.geometrySize / 1024
        sizes[4] = layer.point.indexed.geometrySize / 1024
        sizes[5] = layer.point.nonIndexed.geometrySize / 1024
        totals[0] += sizes[0]
        totals[1] += sizes[1]
        totals[2] += sizes[2]
        totals[3] += sizes[3]
        totals[4] += sizes[4]
        totals[5] += sizes[5]
        return {
          name: layer.name,
          'idx line (KB)': sizes[0].toFixed(1),
          'line (KB)': sizes[1].toFixed(1),
          'idx mesh (KB)': sizes[2].toFixed(1),
          'mesh (KB)': sizes[3].toFixed(1),
          'idx point (KB)': sizes[4].toFixed(1),
          'point (KB)': sizes[5].toFixed(1),
          'total geo (KB)': (layer.summary.totalGeometrySize / 1024).toFixed(1),
          'total mapping (KB)': (layer.summary.totalMappingSize / 1024).toFixed(
            1
          )
        }
      })
      data.push({
        name: 'total',
        'idx line (KB)': totals[0].toFixed(1),
        'line (KB)': totals[1].toFixed(1),
        'idx mesh (KB)': totals[2].toFixed(1),
        'mesh (KB)': totals[3].toFixed(1),
        'idx point (KB)': totals[4].toFixed(1),
        'point (KB)': totals[5].toFixed(1),
        'total geo (KB)': (layout.summary.totalSize.geometry / 1024).toFixed(1),
        'total mapping (KB)': (layout.summary.totalSize.mapping / 1024).toFixed(
          1
        )
      })
      console.table(data)
      console.groupEnd()
    }
  }

  private printPerformanceData() {
    AcCmPerformanceCollector.getInstance().printAll()
  }
}
