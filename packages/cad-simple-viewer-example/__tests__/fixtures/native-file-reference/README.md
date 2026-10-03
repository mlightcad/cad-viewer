# Native file reference qualification

These are unchanged public test files, not customer drawings. The DWG and DXF
are independent inputs, not a conversion/parity pair. Tests use literal authored
or separately documented coordinates, not captured output from the decoder under
test. A filename does not declare a CRS; placement is supplied explicitly.

| File                           | Provenance                                                                                          | SHA-256                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `gdal-block-basepoint-r12.dxf` | GDAL commit `d2c9714a06047038dcb83138d3e05b3334b56076`, `autotest/ogr/data/dxf/block-basepoint.dxf` | `79ae8c3a7daec34d4f31ff04a266d9e4c3ed782b2ec96ad72d49771e536d3754` |
| `gnu-point-2010.dwg`           | GNU LibreDWG 0.13.3 source release, `test/test-data/2010/Point.dwg`                                 | `66c5e2887a948fe9ecc8dab883c39d84801e5e76c21cd3654f5c883ca6e6c403` |

The GDAL DXF was copied from the audited public fixture snapshot
`geotech-fixtures/synthetic/native-spatial/2026-09-21/cad`; its original source is
<https://github.com/OSGeo/gdal/blob/d2c9714a06047038dcb83138d3e05b3334b56076/autotest/ogr/data/dxf/block-basepoint.dxf>.
Its notice is retained as `LICENSE.gdal.txt`.

The GNU DWG was copied from the existing public application fixture
`geotech-platform/features/imports/tests/spatial/fixtures/gnu-point-2010.dwg`.
Original archive: <https://ftp.gnu.org/gnu/libredwg/libredwg-0.13.3.tar.xz>, SHA-256
`83f1f6e78a744777a481ff4520e4cef3f8ac4b2c1c25671077ca12fe81e8816e`.
Its GPLv3-or-later notice is retained as `LICENSE.libredwg.txt`.

The DXF explicitly defines INNERBLOCK base `(50,200)`, containing line `660`
from `(40,210)` to `(60,190)` and line `661` from `(60,210)` to `(40,190)`.
INSERT `A3B` places INNERBLOCK at `(60,250)` inside OUTERBLOCK, whose base is
also `(60,250)`. Top-level INSERT `E06` places OUTERBLOCK at `(300,150)`.
Thus native source endpoints must be `(290,160)`→`(310,140)` and
`(310,160)`→`(290,140)`. All authored Z values are zero.

The GNU POINT is `(27.92801065531282,8.65307688043195,0)`, independently recorded
using the source distribution's `dwgread` JSON output before this test existed.
No broader DWG fidelity or georeferencing claim follows from this one point.

Tests exercise native file parsing, native database conversion, detached overlay
preparation, CPU bounds, source-qualified picking and native snapping. The Node
test host replaces only the browser worker transport with the parser's documented
Node WASM API; the decoder, converter mapping and renderer remain native. It
creates one decoder for one small DWG and releases its native drawing pointer.
The test process owns WASM lifetime. Browser worker transport, GPU rendering,
font rendering, memory/performance capacity and 3D fidelity are outside this test.
No fixture generation, downloading, browser, or command-line CAD converter is
required at test runtime.

The offline qualification host uses Node 24. Only the decoder package is loaded
through Node's real `createRequire`, obtained from `process.getBuiltinModule`;
this loads its advertised ESM import entry and ESM WASM glue instead of passing
the glue through Jest's CJS transformer. Its UMD entry has incompatible ESM
default interop in this Node host. The converter, database and scene stay in the ordinary
Jest runtime. No installed source, WASM bytes or production loader are modified.
