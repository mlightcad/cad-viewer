import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGeQuaternion,
  AcGeVector3d
} from '@mlightcad/geometry-engine'
import {
  AcGiEntity,
  AcGiMTextAttachmentPoint,
  AcGiMTextData,
  AcGiRenderer,
  AcGiTextStyle
} from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbTextStyleTableRecord } from '../database'
import { DEFAULT_TEXT_STYLE } from '../misc'
import { AcDbBlockReference } from './AcDbBlockReference'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Interface defining the properties of a table cell within an AcDbTable entity.
 *
 * Table cells can contain various types of content including text, blocks, and other
 * entities. Each cell has properties that control its appearance, content, and behavior.
 */
export interface AcDbTableCell {
  /** The text content displayed in the cell */
  text: string
  /** The attachment point for text positioning within the cell */
  attachmentPoint: AcGiMTextAttachmentPoint
  /** Optional text style name for the cell content */
  textStyle?: string
  /** Optional rotation angle for the cell content in radians */
  rotation?: number
  /** The type of cell (text, block, etc.) */
  cellType: number
  /** Optional flag value for cell behavior */
  flagValue?: number
  /** Optional value indicating merged cell information */
  mergedValue?: number
  /** Optional auto-fit behavior setting */
  autoFit?: number
  /** Optional border width for merged cells */
  borderWidth?: number
  /** Optional border height for merged cells */
  borderHeight?: number // applicable for merged cells
  /** Optional override flag for cell properties */
  overrideFlag?: number
  /** Optional virtual edge flag for cell borders */
  virtualEdgeFlag?: number
  /** Optional field object ID for text type cells */
  fieldObjetId?: string // only for text type cell
  /** Optional block table record ID for block type cells */
  blockTableRecordId?: string
  /** Optional scale factor for block type cells */
  blockScale?: number
  /** Optional number of block attributes */
  blockAttrNum?: number
  /** Optional array of attribute definition IDs */
  attrDefineId?: string[]
  /** Optional attribute text content */
  attrText?: string
  /** The height of text in the cell */
  textHeight: number
  /** Extended cell flags from AutoCAD 2007 and later */
  extendedCellFlags?: number // from AutoCAD 2007
}

const tempVector = /*@__PURE__*/ new AcGeVector3d()

/**
 * Represents a table entity in AutoCAD.
 *
 * A table is generally thought of as an n x m rectangular array of cells whose contents
 * consist of annotation objects, primarily text. Tables often contain a title row, a
 * header row, and multiple data rows.
 *
 * After creating a new table object using the constructor, applications usually need to
 * set the table style, number of rows and columns, column width, row height, insert
 * position, width direction, and normal vector. Applications can also enter text or
 * block contents into each cell using methods of this class.
 *
 * Tables are commonly used for bills of materials, schedules, data sheets, and other
 * tabular information in technical drawings and documentation.
 */
export class AcDbTable extends AcDbBlockReference {
  /** The entity type name */
  static override typeName: string = 'Table'

  private _attachmentPoint: AcGiMTextAttachmentPoint
  private _numRows: number
  private _numColumns: number
  private _rowHeight: number[]
  private _columnWidth: number[]
  private _cells: AcDbTableCell[]

  /**
   * Creates a new table entity.
   *
   * @param name - The name of the table block reference
   * @param numRows - The number of rows in the table
   * @param numColumns - The number of columns in the table
   */
  constructor(name: string, numRows: number, numColumns: number) {
    super(name)
    this._attachmentPoint = AcGiMTextAttachmentPoint.TopLeft
    this._numColumns = numColumns
    this._numRows = numRows
    this._columnWidth = new Array<number>(numColumns)
    this._rowHeight = new Array<number>(numRows)
    this._cells = new Array<AcDbTableCell>(numRows * numColumns)
  }

  /**
   * Gets or sets the cell alignment value for this table.
   *
   * This property controls how text is positioned within table cells by default.
   * Individual cells can override this setting with their own attachment point.
   *
   * @returns The default attachment point for table cells
   */
  get attachmentPoint() {
    return this._attachmentPoint
  }
  set attachmentPoint(value: AcGiMTextAttachmentPoint) {
    this._attachmentPoint = value
  }

  /**
   * Gets or sets the number of rows in the table.
   *
   * Changing this value will resize the table and may affect existing cell data.
   *
   * @returns The current number of rows in the table
   */
  get numRows() {
    return this._numRows
  }
  set numRows(value: number) {
    this._numRows = value
  }

  /**
   * Gets or sets the number of columns in the table.
   *
   * Changing this value will resize the table and may affect existing cell data.
   *
   * @returns The current number of columns in the table
   */
  get numColumns() {
    return this._numColumns
  }
  set numColumns(value: number) {
    this._numColumns = value
  }

  /**
   * Gets the number of contents in the specified cell.
   *
   * @param row - Row index. Must be greater than or equal to 0 and less than the number of rows
   * @param col - Column index. Must be greater than or equal to 0 and less than the number of columns
   * @returns The number of contents in the specified cell
   */
  // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
  numContents(row: number, col: number) {
    // TODO: Implement it
    return 1
  }

  /**
   * Gets the row height of the specified row in the table.
   *
   * @param index - Zero-based row index
   * @returns The row height of the specified row in the table
   */
  rowHeight(index: number) {
    return this._rowHeight[index]
  }

  /**
   * Sets the row height for the specified row index in the table.
   *
   * @param index - Zero-based row index
   * @param height - Height to be used for the specified row
   */
  setRowHeight(index: number, height: number) {
    this._rowHeight[index] = height
  }

  /**
   * Sets a uniform row height for all the rows in the table.
   *
   * @param height - Height to be used for all the rows in the table
   */
  setUniformRowHeight(height: number) {
    this._rowHeight.fill(height)
  }

  /**
   * Gets the column width at the specified column index in the table.
   *
   * @param index - Zero-based column index
   * @returns The width of the specified column
   */
  columnWidth(index: number) {
    return this._columnWidth[index]
  }

  /**
   * Sets a uniform column width for all the columns in the table.
   *
   * @param width - Uniform width to be used for all the columns in the table
   */
  setUniformColumnWidth(width: number) {
    this._columnWidth.fill(width)
  }

  /**
   * Sets the column width at the specified column index in the table.
   *
   * @param index - Zero-based column index
   * @param width - Width to be used for the specified column
   */
  setColumnWidth(index: number, width: number) {
    this._columnWidth[index] = width
  }

  /**
   * Gets the cell at the specified index.
   *
   * @param index - Cell index (calculated as row * numColumns + column)
   * @returns The specified cell by index, or undefined if index is out of range
   */
  cell(index: number) {
    if (index < 0 || index >= this._cells.length) return undefined
    return this._cells[index]
  }

  /**
   * Sets the cell at the specified index.
   *
   * @param index - Cell index (calculated as row * numColumns + column)
   * @param cell - The cell data to set
   */
  setCell(index: number, cell: AcDbTableCell) {
    this._cells[index] = cell
  }

  /**
   * Gets the text string in the specified cell.
   *
   * @param row - Integer specifying the zero-based row index for the cell
   * @param col - Integer specifying the zero-based column index for the cell
   * @param content - Content index. Should be greater than or equal to 0 and less than the number of contents
   * @returns The text string in the specified cell
   */
  // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
  textString(row: number, col: number, content?: number) {
    return this._cells[row * col].text
  }

  /**
   * Sets the text for the first content at the specified content index.
   *
   * @param row - Integer specifying the zero-based row index for the cell
   * @param col - Integer specifying the zero-based column index for the cell
   * @param text - Text string to set
   */
  setTextString(row: number, col: number, text: string) {
    this._cells[row * col].text = text
  }

  /**
   * Checks if the content of the specified cell is empty.
   *
   * @param row - Integer specifying the zero-based row index for the cell
   * @param col - Integer specifying the zero-based column index for the cell
   * @returns True if the content of the specified cell is empty, false otherwise
   */
  isEmpty(row: number, col: number) {
    return !this._cells[row * col].text
  }

  /**
   * Gets the geometric extents (bounding box) of this table entity.
   *
   * The geometric extents define the minimum bounding box that completely contains
   * the table entity, including all its cells, borders, and content.
   *
   * @returns A 3D bounding box containing the table entity
   * @inheritdoc
   */
  get geometricExtents(): AcGeBox3d {
    // TODO: Implement it
    return new AcGeBox3d()
  }

  /**
   * Returns the full property definition for this table entity, including
   * general group, table group, and geometry group.
   *
   * The geometry group exposes editable properties via {@link AcDbPropertyAccessor}
   * so the property palette can update the table in real-time.
   *
   * Each property is an {@link AcDbEntityRuntimeProperty}.
   */
  get properties(): AcDbEntityProperties {
    return {
      type: this.type,
      groups: [
        this.getGeneralProperties(),
        {
          groupName: 'table',
          properties: [
            {
              name: 'numRows',
              type: 'string',
              editable: true,
              accessor: {
                get: () => this.numRows,
                set: (v: number) => {
                  this.numRows = v
                }
              }
            },
            {
              name: 'numColumns',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.numColumns,
                set: (v: number) => {
                  this.numColumns = v
                }
              }
            },
            {
              name: 'tableWidth',
              type: 'float',
              editable: false,
              accessor: {
                get: () =>
                  this._columnWidth.reduce((total, value) => total + value, 0)
              }
            },
            {
              name: 'tableHeight',
              type: 'float',
              editable: false,
              accessor: {
                get: () =>
                  this._rowHeight.reduce((total, value) => total + value, 0)
              }
            }
          ]
        },
        {
          groupName: 'geometry',
          properties: [
            {
              name: 'positionX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.x,
                set: (v: number) => {
                  this.position.x = v
                }
              }
            },
            {
              name: 'positionY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.y,
                set: (v: number) => {
                  this.position.y = v
                }
              }
            },
            {
              name: 'positionZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.z,
                set: (v: number) => {
                  this.position.z = v
                }
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Renders the table entity using the specified graphics renderer.
   *
   * This method draws the table structure including borders, cell content, and text.
   * It handles the rendering of individual cells, merged cells, and applies the
   * appropriate transformations and styling.
   *
   * @param renderer - The graphics renderer used to draw the table
   * @returns The rendered graphics entity representing the table
   */
  subWorldDraw(renderer: AcGiRenderer): AcGiEntity {
    let allRowHeights = 0,
      allColumnWidths = 0
    const indices = new Uint16Array(this.numColumns * this.numRows * 8)
    const points = new Float32Array(
      (this.numColumns + 1) * (this.numRows + 1) * 3
    )
    let index = 0
    for (let i = 0; i <= this.numRows; i++) {
      allRowHeights -= i > 0 ? this.rowHeight(i - 1) : 0
      allColumnWidths = 0
      for (let j = 0; j <= this.numColumns; j++) {
        allColumnWidths += j > 0 ? this.columnWidth(j - 1) : 0
        points[index++] = allColumnWidths
        points[index++] = allRowHeights
        points[index++] = 0
      }
    }

    const results: AcGiEntity[] = []
    const visited: boolean[] = new Array(this.numRows * this.numColumns).fill(
      false
    )
    allColumnWidths = 0
    index = 0
    let cellIndex = 0
    for (let i = 0; i < this.numColumns; i++) {
      allColumnWidths += i > 0 ? this.columnWidth(i - 1) : 0
      allRowHeights = 0
      for (let j = 0; j < this.numRows; j++) {
        allRowHeights += j > 0 ? this.rowHeight(j - 1) : 0
        const cell = this.cell(j * this.numColumns + i)
        cellIndex = j * this.numColumns + i
        if (cell && !visited[cellIndex]) {
          const columnSpan = cell.borderWidth ?? 1
          const rowSpan = cell.borderHeight ?? 1
          this.fillVisited(
            visited,
            cellIndex,
            this.numColumns,
            columnSpan,
            rowSpan
          )

          // Draw top border line of the current cell by considering merged cell
          indices[index++] = i + j * (this.numColumns + 1)
          indices[index++] = i + j * (this.numColumns + 1) + columnSpan

          // Calcuate width of the cell by considering merged cell
          const width = points[indices[index - 1] * 3] - allColumnWidths

          // Draw right border line of the current cell by considering merged cell
          const tmp = i + (j + rowSpan) * (this.numColumns + 1) + columnSpan
          if (i + columnSpan == this.numColumns) {
            indices[index++] = i + j * (this.numColumns + 1) + columnSpan
            indices[index++] = tmp
          }

          // Calcuate height of the cell by considering merged cell
          const height = -points[tmp * 3 + 1] - allRowHeights

          // Draw bottom border line of the current cell by considering merged cell
          if (j + rowSpan == this.numRows) {
            indices[index++] =
              i + (j + rowSpan) * (this.numColumns + 1) + rowSpan
            indices[index++] = i + (j + rowSpan) * (this.numColumns + 1)
          }

          // Draw left border line of the current cell by considering merged cell
          indices[index++] = i + (j + rowSpan) * (this.numColumns + 1)
          indices[index++] = i + j * (this.numColumns + 1)

          // Draw text
          if (cell.text) {
            const attachmentPoint =
              cell.attachmentPoint ||
              this.attachmentPoint ||
              AcGiMTextAttachmentPoint.MiddleCenter
            const offset = this.getTableTextOffset(
              attachmentPoint,
              width,
              height
            )
            const mtextData: AcGiMTextData = {
              text: cell.text,
              height: cell.textHeight,
              width: width,
              position: tempVector
                .set(allColumnWidths, -allRowHeights, 0)
                .clone()
                .add(offset),
              rotation: this.rotation,
              attachmentPoint: attachmentPoint
            }
            const textStyle: AcGiTextStyle = this.getTextStyle(cell)
            results.push(renderer.mtext(mtextData, textStyle))
          }
        }
      }
    }
    results.push(renderer.lineSegments(points, 3, indices))

    const group = renderer.group(results)
    const quaternion = new AcGeQuaternion()
    quaternion.setFromAxisAngle(AcGeVector3d.Z_AXIS, this.rotation)
    _tmpMatrix.compose(this.position, quaternion, this.scaleFactors)
    group.applyMatrix(_tmpMatrix)
    return group
  }

  /**
   * Marks cells as visited to handle merged cell rendering.
   *
   * This method prevents duplicate rendering of merged cells by marking all
   * constituent cells as visited.
   *
   * @param visited - Array tracking which cells have been processed
   * @param currentIndex - Index of the current cell being processed
   * @param columnCount - Total number of columns in the table
   * @param columnSpan - Number of columns this cell spans
   * @param rowSpan - Number of rows this cell spans
   * @private
   */
  private fillVisited(
    visited: boolean[],
    currentIndex: number,
    columnCount: number,
    columnSpan: number,
    rowSpan: number
  ) {
    if (rowSpan == 1 && columnSpan == 1) {
      visited[currentIndex] = true
    } else {
      for (let i = 0; i < columnSpan; ++i) {
        for (let j = 0; j < rowSpan; ++j) {
          visited[currentIndex + i + j * columnCount] = true
        }
      }
    }
  }

  /**
   * Gets the text style for a specific cell.
   *
   * This method retrieves the appropriate text style for the cell, falling back
   * to the standard style if no specific style is specified.
   *
   * @param cell - The cell for which to get the text style
   * @returns The text style configuration for the cell
   * @private
   */
  private getTextStyle(cell: AcDbTableCell): AcGiTextStyle {
    const textStyleTable = this.database.tables.textStyleTable
    let style: AcDbTextStyleTableRecord | undefined
    if (cell.textStyle) {
      style = textStyleTable.getAt(cell.textStyle)
    }
    if (!style) {
      style = (textStyleTable.getAt(DEFAULT_TEXT_STYLE) ||
        textStyleTable.getAt(DEFAULT_TEXT_STYLE))!
    }
    return style.textStyle
  }

  /**
   * Calculates the text offset within a table cell based on attachment point.
   *
   * This method determines the appropriate positioning offset for text within
   * a cell based on the specified attachment point and cell dimensions.
   *
   * @param textAlign - The text alignment/attachment point value
   * @param width - The width of the cell
   * @param height - The height of the cell
   * @returns A vector representing the text offset from the cell corner
   * @private
   */
  private getTableTextOffset(textAlign: number, width: number, height: number) {
    const offset = new AcGeVector3d()
    switch (textAlign) {
      case 1:
        break
      case 2:
        // Top Center
        offset.setX(width / 2)
        break
      case 3:
        // Top Right
        offset.setX(width)
        break
      case 4:
        // Middle Left
        offset.setY(-height / 2)
        break
      case 5:
        // Middle Center
        offset.set(width / 2, -height / 2, 0)
        break
      case 6:
        // Middle Right
        offset.set(width, -height / 2, 0)
        break
      case 7:
        // Bottom Left
        offset.setY(-height)
        break
      case 8:
        // Bottom Center
        offset.set(width / 2, -height, 0)
        break
      case 9:
        // Bottom Right
        offset.set(width, -height, 0)
        break
    }
    return offset
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbTable')
    filer.writeInt16(71, this.attachmentPoint)
    filer.writeInt32(91, this.numRows)
    filer.writeInt32(92, this.numColumns)
    for (let i = 0; i < this.numRows; ++i) {
      filer.writeDouble(141, this.rowHeight(i))
    }
    for (let i = 0; i < this.numColumns; ++i) {
      filer.writeDouble(142, this.columnWidth(i))
    }
    return this
  }
}

const _tmpMatrix = /*@__PURE__*/ new AcGeMatrix3d()
