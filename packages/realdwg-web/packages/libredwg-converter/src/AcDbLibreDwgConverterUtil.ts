import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web'

export async function parseDwg(data: string) {
  const libredwg = await LibreDwg.create()
  if (libredwg == null) {
    throw new Error('libredwg is not loaded!')
  }

  const dwgDataPtr = libredwg.dwg_read_data(data, Dwg_File_Type.DWG)
  if (dwgDataPtr == null) {
    throw new Error('Failed to read dwg data!')
  }
  const result = libredwg.convertEx(dwgDataPtr)
  libredwg.dwg_free(dwgDataPtr)

  return result
}
