---
title: "Supporting Tianzheng DWG Drawings"
---

# Supporting DWG Drawings with Tianzheng (天正) Entities

This page explains why DWG drawings created by **Tianzheng** software (天正建筑, TArch, and other Tianzheng vertical products) cannot be fully parsed by generic DWG parsers, and describes the industry-standard workaround: converting such drawings to **T3 format DWG** before parsing and rendering them.

## Background: Why Tianzheng Entities Cannot Be Parsed Directly

Unlike ordinary DWG entities, Tianzheng entities (walls, doors, windows, columns, dimension annotations, and other intelligent building objects) use a **data format privately defined by Tianzheng software**. They are **not** part of the native AutoCAD DWG standard format.

In DWG files, these Tianzheng-specific objects are stored as [custom entities](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-4E5C1B56-95C3-4D4F-8F1C-A9D34B1E1408) (proxy entities). Their internal data is only meaningful to Tianzheng's own ObjectARX runtime. As a result:

- No general-purpose commercial DWG parser can directly parse these proprietary Tianzheng entities.
- A generic parser (including MLightCAD) can only render the standard AutoCAD entities in such drawings, while the Tianzheng custom entities are skipped or displayed as proxy graphics.

## The Common Industry Solution: Convert to T3 Format

CAD viewing software vendors in the industry handle this problem in a similar way. The typical pipeline looks like this:

```text
DWG with Tianzheng entities
        |
        |  (1) Run Tianzheng runtime / conversion tool on the server
        v
T3 format DWG
        |
        |  (2) Parse with a standard DWG parser
        v
Rendered drawing in the viewer
```

1. **Run a Tianzheng environment or conversion tool on the server side.** The drawing containing Tianzheng proprietary entities is processed by software that understands the Tianzheng data format.
2. **Convert the DWG to T3 format.** T3 (Tianzheng 3) is an export format designed for compatibility. During conversion, all Tianzheng-specific objects are decomposed ("exploded") into ordinary DWG entities — for example, walls become lines/polylines, doors and windows become block references, and Tianzheng annotations become standard dimension/text entities.
3. **Parse the converted file with a standard DWG parser.** Because the Tianzheng proprietary objects are gone and only standard DWG entities remain, any generic DWG parser can now read and display the drawing correctly.

In other words, after conversion to T3 format, Tianzheng-specific objects in the drawing are turned into ordinary DWG entities, so a generic DWG parser works out of the box.

## Open-Source T3 Conversion Tool Reference

For reference, here is an open-source command-line tool that automates this conversion:

- [t3-conv](https://github.com/housyty/t3-conv) — a Windows command-line tool that converts Tianzheng DWG files to T3 DWG files through a no-UI batch workflow.

Note that this tool drives a real Tianzheng runtime behind the scenes, so the conversion machine still needs Tianzheng TArch and AutoCAD installed. Please refer to the project README for detailed requirements, configuration, and usage.

## Recommendation: Add a Preprocessing Step

If your business scenario involves a large number of Tianzheng drawings, we recommend adding a **preprocessing step** before drawings enter the viewing pipeline:

```text
Upload / Import
      |
      v
Detect Tianzheng entities  ->  If present, convert to T3 DWG
      |
      v
Store converted DWG
      |
      v
MLightCAD parsing & rendering
```

- Detect whether an incoming DWG contains Tianzheng custom entities (for example, by checking for Tianzheng-specific proxy entity class names or application signatures).
- If present, run the T3 conversion (e.g. via `t3-conv` on a Windows server) and store the converted file.
- Feed the converted T3 DWG to MLightCAD. All previously invisible Tianzheng objects will now render as standard entities.

This keeps the viewer itself lightweight and parser-agnostic, while ensuring Tianzheng drawings are fully visible to end users.


