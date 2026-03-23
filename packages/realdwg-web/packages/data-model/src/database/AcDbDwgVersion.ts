export interface AcDbDwgVersionEntry {
  name: string
  value: number
}

/**
 * Please refer to AutoCAD ObjectARX enum AcDb::AcDbDwgVersion for more details.
 * https://help.autodesk.com/view/OARX/2023/ENU/?guid=OARX-RefGuide-AcDb__AcDbDwgVersion
 */
const dwgVersions: AcDbDwgVersionEntry[] = [
  { name: 'AC1.2', value: 1 },
  { name: 'AC1.40', value: 2 },
  { name: 'AC1.50', value: 3 },
  { name: 'AC2.20', value: 4 },
  { name: 'AC2.10', value: 5 },
  { name: 'AC2.21', value: 6 },
  { name: 'AC2.22', value: 7 },
  { name: 'AC1001', value: 8 },
  /**
   * AutoCAD 2.5
   */
  { name: 'AC1002', value: 9 },
  /**
   * AutoCAD 2.6
   */
  { name: 'AC1003', value: 10 },
  /**
   * AutoCAD Release 9
   */
  { name: 'AC1004', value: 11 },
  { name: 'AC1005', value: 12 },
  /**
   * AutoCAD Release 10
   */
  { name: 'AC1006', value: 13 },
  { name: 'AC1007', value: 14 },
  { name: 'AC1008', value: 15 },
  /**
   * AutoCAD R11 and R12
   */
  { name: 'AC1009', value: 16 },
  { name: 'AC1010', value: 17 },
  { name: 'AC1011', value: 18 },
  /**
   * AutoCAD R13
   */
  { name: 'AC1012', value: 19 },
  /**
   * AutoCAD R14 mid version.
   */
  { name: 'AC1013', value: 20 },
  /**
   * AutoCAD R14 final version
   */
  { name: 'AC1014', value: 21 },
  /**
   * AC1500 doesn't actually correspond to any real DWG file version.
   * it's just a legacy or internal placeholder in the enum sequence.
   */
  { name: 'AC1500', value: 22 },
  /**
   * AutoCAD 2000 / 2000i / 2002
   */
  { name: 'AC1015', value: 23 },
  { name: 'AC1800a', value: 24 },
  /**
   * AutoCAD 2004 / 2005 / 2006
   */
  { name: 'AC1018', value: 25 },
  { name: 'AC2100a', value: 26 },
  /**
   * AutoCAD 2007 / 2008 / 2009
   */
  { name: 'AC1021', value: 27 },
  { name: 'AC2400a', value: 28 },
  /**
   * AutoCAD 2010 / 2011 / 2012
   */
  { name: 'AC1024', value: 29 },
  /**
   * AutoCAD 2013 / 2014 / 2015 / 2016 / 2017
   */
  { name: 'AC1027', value: 31 },
  { name: 'AC3200a', value: 32 },
  /**
   * AutoCAD 2018 / 2019 / 2020 / 2021 / 2022 / 2023
   */
  { name: 'AC1032', value: 33 }
]

/**
 * Represents a DWG file format version.
 *
 * Instances can be constructed from either a known DWG version name
 * (e.g. 'AC1032') or its numeric value counterpart.
 */
export class AcDbDwgVersion {
  /**
   * DWG version name as defined in `AcDbDwgVersionEntry.name`.
   */
  name: string
  /**
   * Numeric DWG version value as defined in `AcDbDwgVersionEntry.value`.
   */
  value: number

  /**
   * Create a DWG version from a version name or numeric value.
   *
   * If a string is provided, it is treated as the version name and must
   * match one of the known entries. If a number is provided, it is treated
   * as the numeric version value.
   *
   * @param nameOrValue The DWG version name (e.g. 'AC1032') or the DWG version numeric value.
   * @throws Error if the provided name or value is not recognized.
   */
  constructor(nameOrValue: string | number) {
    if (typeof nameOrValue === 'string') {
      const entry = dwgVersions.find(v => v.name === nameOrValue)
      if (!entry) {
        throw new Error(`Unknown DWG version name: ${nameOrValue}`)
      }
      this.name = entry.name
      this.value = entry.value
      return
    }

    if (typeof nameOrValue === 'number') {
      const entry = dwgVersions.find(v => v.value === nameOrValue)
      if (!entry) {
        throw new Error(`Unknown DWG version value: ${nameOrValue}`)
      }
      this.name = entry.name
      this.value = entry.value
      return
    }

    throw new Error('Invalid constructor argument for AcDbDwgVersion')
  }
}
