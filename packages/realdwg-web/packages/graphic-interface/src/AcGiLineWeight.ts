/**
 * This enumerated type provides the line weight (thickness) values used to specify how
 * lines will be displayed and plotted. The lineweights are in 100ths of a millimeter,
 * except for the negative values. The negative values denote the default indicated by
 * their constant's name.
 */
export enum AcGiLineWeight {
  ByBlock = -2,
  ByDIPs = -4,
  ByLayer = -1,
  ByLineWeightDefault = -3,
  LineWeight000 = 0,
  LineWeight005 = 5,
  LineWeight009 = 9,
  LineWeight013 = 13,
  LineWeight015 = 15,
  LineWeight018 = 0x12,
  LineWeight020 = 20,
  LineWeight025 = 0x19,
  LineWeight030 = 30,
  LineWeight035 = 0x23,
  LineWeight040 = 40,
  LineWeight050 = 50,
  LineWeight053 = 0x35,
  LineWeight060 = 60,
  LineWeight070 = 70,
  LineWeight080 = 80,
  LineWeight090 = 90,
  LineWeight100 = 100,
  LineWeight106 = 0x6a,
  LineWeight120 = 120,
  LineWeight140 = 140,
  LineWeight158 = 0x9e,
  LineWeight200 = 200,
  LineWeight211 = 0xd3
}
