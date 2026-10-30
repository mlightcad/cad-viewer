---
title: "クラウド DWG Web ビューアの構築"
---

# `cad-html-plugin` によるクラウド DWG Web ビューアの構築：プリレンダリング + 静的ホスティング

この記事では、`@mlightcad/cad-html-plugin` の**マルチファイル ACEX パッケージ**のエクスポート機能を使用して、DWG/DXF 図面をサーバー側（またはビルドプロセス中）に直接ホスティング可能な静的リソースに変換する方法を紹介します。ユーザーは Web ページを開くだけで図面を表示でき、ブラウザーで図面を解析したりジオメトリをテッセレーションしたりする必要はありません。

形式自体の詳細（マニフェストのフィールド、ACEC/ACEO のバイナリエンコーディングなど）については、[acex-package-format.md](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-html-plugin/docs/acex-package-format.md)を参照してください。この記事は、**この形式を使用してクラウドベースの図面ビューアを構築する方法**のみに焦点を当てています。

---

## 1. 背景：2 つの Web 図面ビューアアーキテクチャ

**アーキテクチャ A：ブラウザーでのリアルタイム解析（`cad-viewer` が DWG/DXF ファイルを開く既定の方法）**

```text
DWG/DXF file → Browser download → Parse entities (AcDb*) → Tessellate/triangulate into rendering data → Render with WebGL
```

「エンティティ → レンダリングデータ」の解析と変換のコストはすべて**ユーザーのデバイス**で発生します。大きな図面は初回レンダリングが遅くなり、低スペックのモバイルデバイスでは動作が鈍くなり、メモリ負荷が大きくなる可能性があります。

**アーキテクチャ B：プリレンダリング + 静的ホスティング（Haochen Viewer Web や Autodesk Web Viewer などのクラウドベースの図面ビューアが採用している主流のアプローチ）**

```text
Conversion stage (one-time): DWG/DXF → Parse + tessellate → Display data (line/mesh batches) + offline viewer → Static files
Access stage (every time):   Browser only needs to fetch → gunzip → render directly
```

`cad-html-plugin` がエクスポートする**マルチパッケージ**はアーキテクチャ B の成果物です。`.zip` ファイルは解凍すると純粋な静的ディレクトリになり、任意の Web サーバー（nginx、オブジェクトストレージ、CDN）でホスティングでき、**バックエンドランタイムを必要としません**。

### アーキテクチャ B を選ぶべき場合

* 図面が主に**公開 / 共有 / アーカイブ閲覧**に使用され、多くのユーザーが同じ図面を繰り返し閲覧する（CDN キャッシュのヒット率が高い）場合
* ユーザーのデバイスで解析やテッセレーションを行わせることなく、高速な初回レンダリングと良好なモバイル体験を実現したい場合
* 元の DWG/DXF を閲覧者に配布したくない場合（パッケージには**表示レベルのデータ**のみが含まれ、編集可能なエンティティレコードは含まれないため、図面資産に対する一定の保護になります）
* サーバー側のコストをほぼゼロにしたい場合（純粋な静的トラフィック）

### コストと前提条件

* **ネットワークが十分に高速である必要があります。** プリレンダリングされたデータはフラット化された表示ジオメトリであり、元の DWG/DXF より大きくなる場合があります（ただし、gzip 圧縮後は通常非常に小さくなります。約 2 MiB の非圧縮ブロックは、gzip 後には通常 200 KiB 未満になります）。このデータのダウンロードにかかるネットワークコストが、ローカルでの解析 + テッセレーションのコストをすでに上回っている場合、このアプローチに利点はありません。弱いネットワーク環境や、小さな図面を 1 回だけ閲覧するシナリオでは、単一ファイルの HTML を直接配信するか、図面をオンラインで解析する方が適している場合があります。
* **図面を更新した後は、再エクスポートして再公開する必要があります。** このアプローチは「公開後は読み取り専用」のシナリオに適しており、オンラインでの共同編集には適していません。
* パスワードと有効期限による保護は、現在**単一ファイル HTML** のエクスポートでのみ利用できます。マルチパッケージのアクセス制御は、ホスティング層（署名付き URL、認証付きリバースプロキシなど）で処理する必要があります。

> **単一ファイルとマルチファイルはどのように選択すればよいですか？**
>
> 誰かに直接送る、またはダブルクリックでオフラインで開く → `single`（自己完結型の `.html`）を使用します。
>
> Web サーバー/CDN にホスティングして多くのユーザーにアクセスさせる → `multi`（この記事で説明するアプローチ）を使用します。ジオメトリは小さなチャンクに分割され、**段階的に読み込まれます**。初回表示には現在のレイアウトの最初のいくつかのチャンクをダウンロードするだけで済み、他のレイアウトとオブジェクトスナップのデータは必要に応じて遅延読み込みされます。

---

## オンラインデモ

この**プリレンダリング + 静的ホスティング**のアプローチによる DWG Web 閲覧を実際に体験したい場合は、以下のオンラインデモを直接開くことができます。

👉 [**DWG Web ビューアをオンラインで試す**](https://mlightcad.com/cad-viewer/self-contained-html/canteen-progressive/viewer.html)

このデモは、この記事で説明するプリレンダリングのアプローチを使用しています。DWG 図面は公開前にすでに解析され、ジオメトリがテッセレーションされています。ユーザーが Web ページを開くとき、元の DWG ファイルを再度解析する必要はなく、ビューアは事前に生成された表示データを直接読み込みます。

図面リソースはブラウザーによってキャッシュされるため、**初回のページ表示時にはリソースのダウンロードを待つ必要がある場合がありますが、キャッシュが確立された後は、同じページを再度開くのは非常に高速になります**。これは、**プリレンダリング + 静的ホスティング**のアプローチが、図面の公開、共有、繰り返し閲覧に特に適している理由の 1 つです。

まずデモを試してから、以下のアーキテクチャと実装の詳細を読み進めてください。

---

## 2. 出力：解凍後すぐに使用できる静的ディレクトリ

マルチエクスポートは `.zip` ファイルを生成しますが、**zip は配布にのみ使用されます**。ビューアはブラウザーでファイルを解凍せず、代わりにマニフェストと個々のチャンクファイルを順番にフェッチします。**ホスティングの前にパッケージを解凍する必要があります。**

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

ユーザーが `viewer.html` にアクセスした後の読み込み順序は次のとおりです。

1. ページに埋め込まれた `#mlcad-package` 設定を読み取り、マニフェスト URL（既定：`./{name}.acex.json`）を取得します。
2. マニフェスト（小さな JSON）をダウンロードし、レイヤ、レイアウト、範囲などの UI コンポーネントを初期化します。
3. **現在のレイアウト**のジオメトリチャンクを 1 つずつダウンロード → gunzip → デコード → レンダリングし、各チャンクを準備ができ次第表示します。
4. 図面のパンとズームがすでに可能になった後、`*.osnap.gz` オブジェクトスナップデータ（計測/オブジェクトスナップに使用）をダウンロードします。
5. 他のレイアウトは、ユーザーが切り替えたときにのみ読み込まれます。

ビューアランタイムはすでに `viewer.html` にインライン化されているため、ディレクトリには**追加の JavaScript 依存関係は含まれません**。機能には、選択 / パン / ズーム（範囲、ウィンドウ、元のビュー）、レイヤパネル、レイアウト切り替え、計測、マークアップ（Design Review マークアップ）、オブジェクトスナップ、および中国語 / 英語 / チェコ語 / トルコ語の組み込み多言語インターフェースが含まれます。

---

## 3. マルチパッケージを生成する 3 つの方法

### 方法 1：cad-viewer Web アプリから手動でエクスポートする（たまのエクスポートに適している）

* [cad-viewer](https://mlightcad.com/cad-viewer/) で図面を開き、`chtml` コマンドを実行してエクスポートダイアログを開き、エクスポート形式として**「マルチファイルパッケージ（ZIP）」**を選択します。
* またはコマンドラインで `-chtml` を実行してプロンプトに答え、形式として **Multi** を選択します。

```text
-chtml
Export format [Single/Multi] <Single>: Multi
...
```

ブラウザーが `.zip` ファイルをダウンロードします。

### 方法 2：サーバー / CI でのバッチ変換（クラウドアーキテクチャに推奨）

ヘッドレス CLI パッケージ [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli) は、Playwright を使用して、解析 + テッセレーション + エクスポートの完全なパイプラインをヘッドレス Chromium で実行します。変換サービスや CI パイプラインへの統合に最適です。

インストール（Node.js 20+ が必要）：

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

エクスポートには、`-chtml` のプロンプト（`Single/Multi`、`Yes/No`、`Black/White/Space`、`Extents/Current`、`Measure/View`）に 1 行ずつ答える `.scr` スクリプトが必要です。CLI パッケージにはすぐに使える `examples/export-html-multi.scr` が含まれています（npm インストール後は `node_modules/@mlightcad/cad-simple-viewer-cli/examples/` に、リポジトリ内では [`packages/cad-simple-viewer-cli/examples/`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer-cli/examples/export-html-multi.scr) にあります）。

```text
; Export a multi-file ACEX package (zip)
; Prompt order: export format / hidden layers / layouts / background /
; initial view / viewer mode / chunk size MiB / compress chunks
-chtml
Multi
Yes
Yes
Black
Extents
Measure
2
Yes
quit
```

単一の図面をエクスポートする：

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# Output: ./out/floor-plan.zip
```

バッチディレクトリの変換、zip の解凍、公開のための完全な自動化ソリューションについては、セクション 6 を参照してください。

プログラミング API を使用して、独自の変換サービスに統合することもできます。

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

### 方法 3：独自の Web アプリケーションでのプログラムによるエクスポート

アプリケーションにすでに `cad-simple-viewer` が組み込まれている場合（ユーザーが Web アプリケーションで直接図面を表示する場合）、変換 API を直接呼び出し、「ホスティングパッケージのエクスポート」を製品のボタンにすることもできます。

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

低レベルの API（パッケージを自分で組み立て、ディスクに書き込むかアップロードするかを決定）：

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

> **注意：** DWG/DXF の解析とシーンの構築は `cad-simple-viewer` のブラウザーランタイム環境に依存するため、**サーバー側の変換には方法 2（CLI）を使用してください**。方法 3 は、エクスポート機能を独自の Web ベース製品に統合するのに適しています。

---

## 4. Web サーバーへのデプロイ

### 4.1 解凍と公開

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

公開後は、ユーザーに URL `https://your-domain/cad-packages/floor-plan/viewer.html` を提供するだけです。ディレクトリは**図面 ID / バージョン番号**で整理することを推奨します（たとえば `/cad-packages/{drawingId}/{version}/`）。図面が更新されたら、新しいバージョンのディレクトリを公開します。古いバージョンは自然に廃止でき、この構造はキャッシュも容易にします。

### 4.2 サーバーの要件

静的ファイルを配信できるサービスであれば何でも動作します。nginx、Apache、IIS、`npx serve`、Python の `-m http.server`、および Alibaba Cloud OSS / AWS S3 + CloudFront などのオブジェクトストレージの静的 Web サイトホスティングです。要件はわずかです。

1. **HTTP(S) 経由でアクセスする必要があります。** ビューアは `fetch()` を使用してマニフェストとチャンクファイルを読み込みます。`file://` プロトコルでは動作しないため、`viewer.html` をダブルクリックしてローカルファイルとして使用することはできません。
2. **パッケージ全体を同じオリジンでホスティングする必要があります。** セキュリティ上の理由から、ローダーは `manifestUrl` がページと同じオリジンであること、およびチャンクファイルがマニフェストと同じオリジンで、パッケージディレクトリ内にあることを検証します（絶対 URL とディレクトリを越える `..` パスは拒否されます）。したがって、`viewer.html`、マニフェスト、`chunks/` を**同じサイト / 同じ CDN ドメイン**の下に配置してください。チャンクファイルを別のドメインに分割しないでください。ページとチャンクの両方を CDN ドメインでホスティングしても問題ありません。
3. **`.gz` ファイルは元のバイトとして返し、`Content-Encoding: gzip` レスポンスヘッダーを含めてはいけません。**

   `.acex.gz` / `.osnap.gz` はすでに gzip 圧縮されたバイトであり、ビューアは JavaScript で gunzip 操作を自身で行います。Web サーバー（通常は Apache の `mod_mime` で、既定では `.gz` 拡張子に対して `AddEncoding gzip gz` を設定する場合があります。または一部の CDN/オブジェクトストレージサービスで設定されたメタデータ）が `Content-Encoding: gzip` を追加すると、ブラウザーがファイルを 1 回自動的に展開し、ビューアがさらに展開しようとしてエラーになります。これらのファイルが不透明なバイナリデータとして返されるようにしてください（`Content-Type: application/octet-stream` で十分です。ビューアは `arrayBuffer` を使用して読み取るため、MIME タイプに依存しません）。`.acex.json` マニフェストには `application/json` を使用します。
4. **キャッシュ戦略。** チャンクファイルの内容は不変（同じバージョンディレクトリ内では変化しない）であるため、`chunks/` に長いキャッシュ期間を与えても安全です（`Cache-Control: public, max-age=31536000, immutable`）。マニフェストファイルには短いキャッシュ期間または `no-cache` を使用し、パッケージが同じディレクトリに再エクスポートされたときにクライアントが更新をすぐに検出できるようにします。パッケージをバージョン付きディレクトリで公開する場合、ディレクトリ全体に長期キャッシュを使用できます。

nginx の例（既定の設定では、`.gz` ファイルを直接リクエストしたときに圧縮/展開しません。ここでは CDN やカスタム設定の影響を避けるために明示的に宣言しています）。

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

Apache ユーザーは、`.gz` 拡張子に対して `AddEncoding gzip .gz` が有効になっていないことを確認してください（これは既定の MIME 設定でよく見られます）。必要に応じて、パッケージディレクトリの `.htaccess` で削除します。

```apache
<FilesMatch "\.(acex|osnap)\.gz$">
    <IfModule mod_headers.c>
        Header unset Content-Encoding
    </IfModule>
    ForceType application/octet-stream
</FilesMatch>
```

### 4.3 ローカルでの確認

```bash
# In the extracted package directory
npx serve .
# Open http://localhost:3000/viewer.html
```

図面が正しく表示され、レイアウトの切り替えや計測ができる場合、ホスティング設定は正しいです。

---

## 5. エクスポートオプションの選び方

| オプション                  | 説明                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportFormat: 'multi'` | この記事で説明するアプローチ。`'single'` は自己完結型の単一ファイル HTML                                                                                                              |
| `viewerMode`            | `'measure'`（既定）：計測、マークアップ、オブジェクトスナップを含み、`*.osnap.gz` データを生成。`'view'`：閲覧のみ（パン/ズーム/レイヤ）で、パッケージが小さくなり初回レンダリングが高速化 |
| `exportLayouts`         | `true`（既定）はペーパー空間のレイアウトをエクスポート。`false` はモデル空間のみをエクスポートし、ツールバーにレイアウト切り替えが表示されない                                                                    |
| `exportInvisibleLayers` | `true`（既定）はオフ/フリーズされたレイヤもエクスポート。`false` は表示レイヤのみをエクスポートし、パッケージが小さくなる                                                                                 |
| `initialView`           | `'fit'`（既定、開いたときに図面を全体表示に合わせる）または `'current'`（エクスポート時のビュー位置を保持）                                                                           |
| パスワード / 有効期限   | `single` モードでのみサポート。マルチパッケージでは、ホスティング層での認証（署名付き URL、アクセストークン付きリバースプロキシなど）を使用                                                   |

---

## 6. エンドツーエンドのパイプライン例

「変換 → 解凍 → 公開」のための最小限の Node スクリプト（図面アップロード後の Webhook や CI パイプラインに接続できます）。

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

本番環境では、次のような機能も追加できます。図面内容のハッシュを使用して重複変換をスキップできるか判断する、失敗した変換を再試行する、または `PutObject` を直接使用して `pkg.files` をオブジェクトストレージにアップロードする（方法 3 の `buildAcExPackage` を使用すれば zip を作成する必要すらありません）。

---

## 7. FAQ

**Q: zip ファイルをサーバーに置いて、そのリンクを提供するだけではだめですか？**

いいえ。zip はダウンロードと配布のためのパッケージ形式にすぎません。実行時、ビューアは展開された `viewer.html` / `*.acex.json` / `chunks/*.gz` をフェッチします。サーバーで展開して結果のファイルをホスティングするか、独自のアプリケーションで `unzipAcExPackageFiles` を使用してフロントエンドで展開する必要があります（同一オリジンとメモリの問題に注意してください。大きな図面には推奨されません）。

**Q: ページを開いた後、チャンクファイルが 404 になったり、読み込みに失敗したりします。**

ページが HTTP(S) 経由でアクセスされているか、`chunks/` ディレクトリが `viewer.html` とマニフェストと一緒にデプロイされているか、チャンクファイルの名前が変更されたり移動されたりしていないか（マニフェストの `href` 値は相対パスであるため、ディレクトリ構造を保持する必要があります）を確認してください。

**Q: チャンクファイルは正常にダウンロードされますが、解析に失敗します。**

ほとんどの場合、サーバーが `.gz` ファイルに `Content-Encoding: gzip` を追加しています（ブラウザーが 1 回自動的に展開しています）。セクション 4.2 の項目 3 に従ってレスポンスヘッダーを確認してください。

**Q: チャンクファイルを CDN に置き、ページを独自のドメインに置くことはできますか？**

現在のローダーは、ページ、マニフェスト、チャンクファイルが同じオリジンにあることを要求します。**パッケージディレクトリ全体**を CDN ドメインに公開し、ユーザーが CDN から `viewer.html` に直接アクセスできるようにして、CDN アクセラレーションの恩恵を受けられるようにしてください。

**Q: エクスポートされたファイル名が `floor-plan-2.zip` になったのはなぜですか？**

対象のファイルがすでに存在する場合、エクスポートプロセスは上書きを避けるために自動的に連番を追加します。再度エクスポートする前に、出力ディレクトリを削除するか空にして、次の実行で古い zip が使われないようにしてください。

**Q: 図面が変更された場合はどうなりますか？**

変換を再度実行し、新しいディレクトリに公開します（または同じディレクトリを上書きしてマニフェストのキャッシュを無効化します）。パッケージは表示データのスナップショットであり、元のファイルの更新に自動的に追従することはありません。

**Q: 元の図面は公開されてしまいますか？**

パッケージには、線/メッシュのバッチ、レイヤ名、レイアウト名、範囲、単位などの**表示レベル**のデータのみが含まれます。DWG/DXF のバイトや編集可能なエンティティレコードは含まれません。ただし、図面ジオメトリの完全な表現であることには変わりありません。強力なアクセス制御が必要な場合は、ホスティング層で認証を実装するか、パスワードと有効期限の保護をサポートする単一ファイル HTML を使用してください。
