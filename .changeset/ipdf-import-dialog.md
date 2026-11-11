---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

PDF import is renamed to AutoCAD's commands: `ipdf` becomes **PDFIMPORT** and **-PDFIMPORT**. `PDFIMPORT` (the AI ribbon's Import PDF button, now item `cmd-pdfimport`) opens an Import PDF dialog after the file is picked, laid out like AutoCAD's: the file name with Browse, the page to import with a page preview or a thumbnail grid and the page size, the insertion point (X/Y, or "Specify insertion point on-screen" to pick it after OK), the scale and the import mode (Recover drawing / Keep PDF appearance). Location, scale and mode are remembered for the next import. The dialog lives in `@mlightcad/cad-pdf-plugin` (`AcUiPdfImportDialog`) and is framework-free. `-PDFIMPORT` (`AcApImportPdfPromptCmd`) keeps the former command-line prompts for page, insertion point, `Scale` and `Mode`. Strings move from `jig.ipdf` / `command.ACAD.ipdf` to `jig.pdfimport` / `command.ACAD.pdfimport` and `command.ACAD.-pdfimport`, in all locales.
