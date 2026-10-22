---
title: "Build a Cloud DWG Web Viewer"
---

# Building a Cloud DWG Web Viewer with `cad-html-plugin`: Pre-rendering + Static Hosting

This article introduces how to use the **multi-file ACEX package** export capability of `@mlightcad/cad-html-plugin` to convert DWG/DXF drawings into directly hostable static resources on the server side (or during the build process). Users can then open a web page and view the drawing without having to parse the drawing or tessellate geometry in the browser.

For details about the format itself (manifest fields, ACEC/ACEO binary encoding, etc.), see [acex-package-format.md](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-html-plugin/docs/acex-package-format.md). This article focuses only on **how to build a cloud-based drawing viewer using this format**.

---

## 1. Background: Two Web Drawing Viewer Architectures

**Architecture A: Real-time parsing in the browser (the default way `cad-viewer` opens DWG/DXF files)**

```text
DWG/DXF file → Browser download → Parse entities (AcDb*) → Tessellate/triangulate into rendering data → Render with WebGL
```

All the cost of parsing and converting "entities → rendering data" occurs on the **user's device**: large drawings have slow initial rendering, low-end mobile devices may become sluggish, and memory pressure can be significant.

**Architecture B: Pre-rendering + static hosting (the mainstream approach used by cloud-based drawing viewers such as Haochen Viewer Web and Autodesk Web Viewer)**

```text
Conversion stage (one-time): DWG/DXF → Parse + tessellate → Display data (line/mesh batches) + offline viewer → Static files
Access stage (every time):   Browser only needs to fetch → gunzip → render directly
```

The **multi package** exported by `cad-html-plugin` is the product of Architecture B: a `.zip` file that becomes a pure static directory after extraction. It can be hosted by any web server (nginx, object storage, CDN) and **does not require any backend runtime**.

### When to Choose Architecture B

* Drawings are primarily used for **publishing / sharing / archival viewing**, with many users repeatedly viewing the same drawing (high CDN cache hit rate);
* You want fast initial rendering and a good mobile experience without requiring users' devices to perform parsing and tessellation;
* You do not want to distribute the original DWG/DXF to viewers (the package contains only **display-level data**, without editable entity records, which provides a degree of protection for drawing assets);
* You want server-side costs to approach zero (pure static traffic).

### Costs and Prerequisites

* **The network needs to be fast enough.** Pre-rendered data is flattened display geometry and may be larger than the original DWG/DXF (although it is usually very small after gzip compression: an uncompressed block of about 2 MiB is typically less than 200 KiB after gzip). If the network cost of downloading this data is already greater than the cost of parsing + tessellating locally, this approach has no advantage. For weak-network environments or scenarios where a small drawing is viewed only once, directly delivering a single-file HTML or parsing the drawing online may be more appropriate.
* **Drawings need to be re-exported and republished after they are updated.** This approach is suitable for "read-only after publication" scenarios, but not for online collaborative editing.
* Password and expiration protection are currently available only for **single-file HTML** exports. Access control for multi packages needs to be handled by the hosting layer (signed URLs, authenticated reverse proxies, etc.).

> **How should you choose between single-file and multi-file?**
>
> Send directly to someone or open offline by double-clicking → use `single` (self-contained `.html`).
>
> Host on a Web server/CDN for access by many users → use `multi` (the approach described in this article): geometry is split into small chunks and **progressively loaded**. Only the first few chunks of the current layout need to be downloaded for the initial view; other layouts and object-snap data are lazy-loaded on demand.

---

## Online Demo

If you would like to get a hands-on feel for this **pre-rendering + static hosting** approach to DWG Web viewing, you can directly open the online demo below:

👉 [**Try the DWG Web Viewer Online**](https://mlightcad.com/cad-viewer/self-contained-html/canteen-progressive/viewer.html)

This demo uses the pre-rendering approach described in this article. The DWG drawing has already been parsed and its geometry tessellated before publication. When users open the web page, there is no need to parse the original DWG file again; the viewer directly loads the pre-generated display data.

Because the drawing resources are cached by the browser, **the first time you open the page, you may need to wait for the resources to download; after the cache has been established, opening the same page again will be very fast**. This is one of the reasons why the **pre-rendering + static hosting** approach is particularly suitable for publishing, sharing, and repeatedly viewing drawings.

You can try the demo first and then continue reading the architecture and implementation details below.

---

## 2. Output: A Static Directory Ready to Use After Extraction

The multi export produces a `.zip` file, but **the zip is only used for distribution**. The viewer does not unzip the file in the browser. Instead, it fetches the manifest and individual chunk files in sequence. **The package must be extracted before hosting:**

```text
my-drawing/
  viewer.html                 # Entry page (HTML/CSS/JS shell + inlined offline viewer runtime)
  my_drawing.acex.json        # Package manifest (small amount of metadata + index)
  chunks/
    L0-000.acex.gz            # Gzip-compressed geometry chunk (ACEC binary, not base64)
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # Gzip-compressed object-snap data (only available in measure mode)
    L1-000.acex.gz            # Chunks for other layouts, lazy-loaded when switching layouts
    ...
```

The loading sequence after the user accesses `viewer.html` is:

1. Read the `#mlcad-package` configuration embedded in the page and obtain the manifest URL (default: `./{name}.acex.json`);
2. Download the manifest (small JSON) and initialize the layer, layout, extents, and other UI components;
3. Download the geometry chunks of the **current layout** one by one → gunzip → decode → render, displaying each chunk as soon as it is ready;
4. After the drawing can already be panned and zoomed, download the `*.osnap.gz` object-snap data (used for measurement/object snapping);
5. Other layouts are loaded only when the user switches to them.

The viewer runtime is already inlined in `viewer.html`, so the directory contains **no additional JavaScript dependencies**. Features include: selection / pan / zoom (extents, window, original view), layer panel, layout switching, measurement, markup (Design Review markup), object snapping, and built-in multilingual interfaces in Chinese / English / Czech / Turkish.

---

## 3. Three Ways to Generate a Multi Package

### Method 1: Manually Export from the cad-viewer Web App (Suitable for Occasional Exports)

* Open the drawing in [cad-viewer](https://mlightcad.com/cad-viewer/), run the `chtml` command to open the export dialog, and select **"Multi-file Package (ZIP)"** as the export format;
* Or run `-chtml` from the command line and answer the prompts, selecting **Multi** for the format:

```text
-chtml
Export format [Single/Multi] <Single>: Multi
...
```

The browser will download a `.zip` file.

### Method 2: Batch Conversion on the Server / CI (Recommended for Cloud Architectures)

The headless CLI package [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli) uses Playwright to run the complete parsing + tessellation + export pipeline in headless Chromium. It is ideal for integration into a conversion service or CI pipeline.

Installation (requires Node.js 20+):

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

Export requires a `.scr` script that answers the `-chtml` prompts line by line (`Single/Multi`, `Yes/No`, `Extents/Current`, `Measure/View`). The CLI package includes a ready-to-use `examples/export-html-multi.scr` (after npm installation, it is located at `node_modules/@mlightcad/cad-simple-viewer-cli/examples/`; in the repository, it is located at [`packages/cad-simple-viewer-cli/examples/`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer-cli/examples/export-html-multi.scr)):

```text
; Export a multi-file ACEX package (zip)
; Prompt order: export format / export hidden layers / export layouts / initial view / viewer mode
-chtml
Multi
Yes
Yes
Extents
Measure
quit
```

Export a single drawing:

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# Output: ./out/floor-plan.zip
```

See Section 6 for a complete automation solution for batch directory conversion, zip extraction, and publishing.

You can also integrate it into your own conversion service using the programming API:

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawings/floor-plan.dwg', // HTTP(S) URLs are also supported
  scriptPath: 'node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr',
  outputDir: './out',
  mode: 'read'
})

console.log(savedFiles) // [ 'floor-plan.zip', ... ]
```

### Method 3: Programmatic Export in Your Own Web Application

If your application already embeds `cad-simple-viewer` (users view drawings directly in your web application), you can also call the conversion API directly and turn "export hosting package" into a button in your product:

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

// Export a multi package for the currently opened drawing (triggers a .zip download in the browser)
await new AcApHtmlConvertor({ viewerRuntimeUrl: './viewer-runtime.iife.js' })
  .convert('floor-plan.dwg', {
    exportFormat: 'multi',   // Multi-file package; default is 'single'
    viewerMode: 'measure',   // 'measure' (includes measurement/markup/snapping) or 'view' (view-only, smaller)
    exportLayouts: true,     // Whether to include paper space layouts
    exportInvisibleLayers: true, // Whether to include off/frozen layers
    initialView: 'fit'       // 'fit' (extents) or 'current' (current view)
  })
```

Lower-level APIs (assemble the package yourself and decide whether to write it to disk or upload it):

```typescript
import {
  buildAcExPackage,
  zipAcExPackageFiles,
  unzipAcExPackageFiles
} from '@mlightcad/cad-html-plugin'

// snapshot is built from the Three.js scene by AcApHtmlSnapshotBuilder
const pkg = buildAcExPackage(snapshot, {
  viewerRuntime,          // Text of viewer-runtime.iife.js
  baseName: 'floor-plan'
})

const zipBytes = zipAcExPackageFiles(pkg)     // Package into a zip for download
// Or directly write pkg.files ([{ path, bytes }, ...]) to disk / upload to object storage,
// completely skipping the extraction step:
for (const file of pkg.files) {
  // Write to /var/www/packages/floor-plan/<file.path>
}
```

> **Note:** Parsing DWG/DXF and building the scene depend on the browser runtime environment of `cad-simple-viewer`, so **server-side conversion should use Method 2 (CLI)**. Method 3 is suitable for integrating export functionality into your own web-based product.

---

## 4. Deploying to a Web Server

### 4.1 Extract and Publish

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

After publishing, simply give users the URL `https://your-domain/cad-packages/floor-plan/viewer.html`. It is recommended to organize directories by **drawing ID / version number** (for example, `/cad-packages/{drawingId}/{version}/`). When a drawing is updated, publish a new version directory. The old version can naturally be retired, and this structure also makes caching easier.

### 4.2 Server Requirements

Any service capable of serving static files will work: nginx, Apache, IIS, `npx serve`, Python `-m http.server`, as well as object-storage static website hosting such as Alibaba Cloud OSS / AWS S3 + CloudFront. There are only a few requirements:

1. **It must be accessed over HTTP(S).** The viewer uses `fetch()` to load the manifest and chunk files. It does not work with the `file://` protocol, so you cannot simply double-click `viewer.html` and use it as a local file.
2. **The entire package must be hosted on the same origin.** For security reasons, the loader verifies that `manifestUrl` is same-origin with the page, and that chunk files are same-origin with the manifest and located inside the package directory (absolute URLs and `..` paths crossing directories are rejected). Therefore, put `viewer.html`, the manifest, and `chunks/` under **the same site / the same CDN domain**. Do not split the chunk files onto another domain. Hosting both the page and chunks on a CDN domain is perfectly fine.
3. **`.gz` files must be returned as their original bytes and must not include a `Content-Encoding: gzip` response header.**

   `.acex.gz` / `.osnap.gz` are already gzip-compressed bytes, and the viewer performs the gunzip operation itself in JavaScript. If the web server (typically Apache's `mod_mime`, which by default may set `AddEncoding gzip gz` for `.gz` extensions, or metadata configured by some CDNs/object storage services) adds `Content-Encoding: gzip`, the browser will automatically decompress the file once, and the viewer will attempt to decompress it again, resulting in an error. Make sure these files are returned as opaque binary data (`Content-Type: application/octet-stream` is sufficient; the viewer reads them using `arrayBuffer` and does not depend on the MIME type). The `.acex.json` manifest should use `application/json`.
4. **Caching strategy.** Chunk file contents are immutable (they do not change within the same version directory), so it is safe to give `chunks/` a long cache lifetime (`Cache-Control: public, max-age=31536000, immutable`). Manifest files should use a short cache lifetime or `no-cache`, so that clients can discover updates quickly when the package is re-exported to the same directory. If packages are published in versioned directories, the entire directory can use long-term caching.

nginx example (the default configuration does not compress/decompress `.gz` files when they are directly requested; this is explicitly declared here to avoid being affected by CDN or custom configuration):

```nginx
server {
    listen 80;
    server_name drawings.example.com;
    root /var/www/cad-packages;

    # Chunk files: opaque bytes, prohibit any Content-Encoding
    location ~* \.(acex|osnap)\.gz$ {
        gzip off;
        default_type application/octet-stream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.acex\.json$ {
        default_type application/json;
        add_header Cache-Control "no-cache";
    }
}
```

Apache users should make sure that `AddEncoding gzip .gz` is not enabled for the `.gz` extension (this is common in the default MIME configuration). If necessary, remove it in the package directory's `.htaccess`:

```apache
<FilesMatch "\.(acex|osnap)\.gz$">
    <IfModule mod_headers.c>
        Header unset Content-Encoding
    </IfModule>
    ForceType application/octet-stream
</FilesMatch>
```

### 4.3 Local Verification

```bash
# In the extracted package directory
npx serve .
# Open http://localhost:3000/viewer.html
```

If the drawing displays correctly and you can switch layouts and perform measurements, the hosting configuration is correct.

---

## 5. How to Choose the Export Options

| Option                  | Description                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportFormat: 'multi'` | The approach described in this article. `'single'` is a self-contained single-file HTML                                                                                                              |
| `viewerMode`            | `'measure'` (default): includes measurement, markup, and object snapping, with `*.osnap.gz` data; `'view'`: view-only (pan/zoom/layers), resulting in a smaller package and faster initial rendering |
| `exportLayouts`         | `true` (default) exports paper space layouts; `false` exports model space only, and the toolbar does not display layout switching                                                                    |
| `exportInvisibleLayers` | `true` (default) also exports off/frozen layers; `false` exports only visible layers, resulting in a smaller package                                                                                 |
| `initialView`           | `'fit'` (default, fit the drawing to the full view when opened) or `'current'` (preserve the view position at export time)                                                                           |
| Password / expiration   | Supported only in `single` mode; for multi packages, use authentication at the hosting layer (signed URLs, reverse proxy with access tokens, etc.)                                                   |

---

## 6. End-to-End Pipeline Example

A minimal Node script for "convert → extract → publish" (which can be connected to a webhook after a drawing upload or to a CI pipeline):

```js
// publish-cad-package.mjs
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { unzipAcExPackageFiles } from '@mlightcad/cad-html-plugin'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const [drawing, publishRoot] = process.argv.slice(2)
const workDir = './.cad-build'

// 1. Headless conversion, producing a zip
const { outputDir } = await runHeadless({
  inputPath: drawing,
  scriptPath: './export-html-multi.scr',
  outputDir: workDir,
  mode: 'read'
})

// 2. Find the generated zip and extract it to the publishing directory
const zipName = (await readdir(outputDir)).find(f => f.endsWith('.zip'))
const zipBytes = await readFile(path.join(outputDir, zipName))
const files = unzipAcExPackageFiles(
  new Uint8Array(zipBytes)
) // Includes path security validation and rejects dangerous entries such as ../
const target = path.join(publishRoot, path.basename(zipName, '.zip'))
for (const file of files) {
  const dest = path.join(target, file.path)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, file.bytes)
}

// 3. Upload/sync to the nginx directory or object storage (rsync, ossutil, aws s3 sync, ...)
console.log(`Published: https://drawings.example.com/${path.basename(target)}/viewer.html`)
```

In a production environment, you can also add features such as: using a hash of the drawing content to determine whether duplicate conversion can be skipped, retrying failed conversions, or directly using `PutObject` to upload `pkg.files` to object storage (using `buildAcExPackage` from Method 3 so that you do not even need to create a zip).

---

## 7. FAQ

**Q: Can I simply put the zip file on the server and provide a link to it?**

No. The zip is only a packaging format for download and distribution. At runtime, the viewer fetches the extracted `viewer.html` / `*.acex.json` / `chunks/*.gz`. You must either extract it on the server and host the resulting files, or use `unzipAcExPackageFiles` in your own application to extract it on the frontend (be aware of same-origin and memory issues; this is not recommended for large drawings).

**Q: The chunk files return 404 / fail to load after opening the page.**

Check whether the page is accessed through HTTP(S); whether the `chunks/` directory is deployed together with `viewer.html` and the manifest; and whether the chunk files have been renamed or moved (the `href` values in the manifest are relative paths, so the directory structure must be preserved).

**Q: The chunk files are downloaded successfully but fail to parse.**

Most likely, the server has added `Content-Encoding: gzip` to the `.gz` files (the browser automatically decompressed them once). Check the response headers according to item 3 in Section 4.2.

**Q: Can I put the chunk files on a CDN while keeping the page on my own domain?**

The current loader requires the page, manifest, and chunk files to be on the same origin. Publish the **entire package directory** to a CDN domain and let users access `viewer.html` directly from the CDN to benefit from CDN acceleration.

**Q: Why did the exported filename become `floor-plan-2.zip`?**

When the target file already exists, the export process automatically appends a sequence number to avoid overwriting it. Before exporting again, delete or empty the output directory so the next run does not pick up a stale zip.

**Q: What happens when the drawing is modified?**

Run the conversion again and publish it to a new directory (or overwrite the same directory and invalidate the manifest cache). The package is a snapshot of the display data and does not automatically follow updates to the source file.

**Q: Will the original drawing be exposed?**

The package contains only **display-level** data such as line/mesh batches, layer names, layout names, extents, and units. It does not contain DWG/DXF bytes or editable entity records. However, it is still a complete representation of the drawing geometry. If strong access control is required, implement authentication at the hosting layer or use single-file HTML, which supports password and expiration protection.


