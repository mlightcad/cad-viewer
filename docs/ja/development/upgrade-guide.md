---
title: 'cad-simple-viewer と cad-editor のアップグレード'
---

# cad-simple-viewer と cad-editor のアップグレード

このガイドでは、`@mlightcad/cad-simple-viewer` と`@mlightcad/cad-editor` を安全にアップグレードする方法を説明します。単独でバージョンを上げられない理由、一緒に更新する必要がある関連パッケージ、および任意のリリースに対して正しい互換バージョンのセットを判断する 2 つの信頼できる方法について説明します。

::: info シンプル UI が `cad-simple-viewer` に統合
この変更を含むリリース以降、**`@mlightcad/cad-simple-ui-plugin` は削除**されました。ツールバー・ドックタブ・デフォルト `AcApPaletteHost` は **`@mlightcad/cad-simple-viewer`** にあります。`simpleUi` オプション（デフォルト有効）で有効化し、`cad-editor` / CLI などは `simpleUi: false` でオプトアウトしてください。`@mlightcad/cad-simple-viewer/find` サブパスは削除済みのため、検索 API は `@mlightcad/cad-simple-viewer` から import してください。`/simple-ui` と `/find` サブパスは削除済みです。
:::

::: info ドックパネルの chrome が `cad-simple-viewer` へ移動
プレーン DOM の **ドックパネル chrome**（`AcUiDockPanel`）は **`@mlightcad/cad-simple-viewer`** にあります。組み込み simple UI がドックにタブ内容（画層・検索・レビュー・計測）を載せ `AcApPaletteHost` を登録し、`cad-editor` は Vue ツールパレットホストを登録します。

移行の要点：

- `AcUiDockPanel` / `AcUiDockPanelTab` / `AcUiDockPanelSide` は `@mlightcad/cad-simple-viewer` から import。
- i18n キーは **`main.dockPanel.*`**（`main.dockPanel.tab.layers` など）。
- ホスト未登録時の `AcApPaletteService.open` は `AcUiDockPanel`（右ドック / スマホ sheet）を使用。
- 名前付きタブは `AcApPaletteService.openNamedTab`（`ACAP_PALETTE_NAMED_TAB`）で、**登録済みホストが必須**（名前付きタブにドックフォールバックはない）。ホスト付き `HTMLElement` パネルは引き続き `AcApPaletteService.open`。
  :::

::: info 共有 AI モデル設定（`@mlightcad/cad-llm-plugin`）
この変更を含むリリースから、LLM プロバイダの設定は `@mlightcad/cad-agent-plugin` から新しい **`@mlightcad/cad-llm-plugin`** に移り、CAD エージェントと `pdftext` の文字認識（OCR）が同じ設定を共有します。新パッケージは **LLMSETTINGS** コマンドと UI フレームワークに依存しない設定ダイアログ（`@mlightcad/cad-editor` の AI リボン タブからも開けます）を提供し、`@mlightcad/cad-simple-viewer` には `AcApLlmSettingsService` が追加され、どの機能からもダイアログを開いたり、画像対応モデルが設定済みか確認したりできます。

ホストの移行：

- `@mlightcad/cad-llm-plugin`（`@mlightcad/cad-agent-plugin` の peer 依存になりました）をインストールし、`registerLazyAgentPlugin` と一緒に `registerLazyLlmPlugin` を呼び出します。パッケージがインストールされていれば、`@mlightcad/cad-editor` は自動的に登録します。
- `registerLazyAgentPlugin` は文字認識器を登録しなくなりました。認識器の id は `cad-llm`（以前は `cad-agent`）になり、`registerLazyLlmPlugin` が登録します。`acapAgentRecognizeText` / `cleanRecognizedText` は `@mlightcad/cad-llm-plugin` の `acapLlmRecognizeText` / `acapLlmCleanRecognizedText` になりました。
- エージェント パネル内の設定カードはダイアログに置き換わり、歯車ボタンで LLMSETTINGS が開きます。
- 保存済みの設定はそのまま使えます。`localStorage` のキー `cad-agent-plugin.llm-config` は変わりません。
- 使用中のモデルがテキスト専用の場合、OCR は設定済みで最初の画像対応モデルを使用します。

```ts
import { registerLazyAgentPlugin } from '@mlightcad/cad-agent-plugin/register'
import { registerLazyLlmPlugin } from '@mlightcad/cad-llm-plugin/register'

registerLazyLlmPlugin(pluginManager)
registerLazyAgentPlugin(pluginManager)
```

:::

::: info PDF 読み込み：`ipdf` は `PDFIMPORT` / `-PDFIMPORT` に
この変更を含むリリース（1.8.0）から、`@mlightcad/cad-pdf-plugin` の PDF 読み込みコマンドは AutoCAD と同じ名前になります：

- **PDFIMPORT** はファイル選択後に［PDF 読み込み］ダイアログ（`AcUiPdfImportDialog`）を開きます：プレビュー付きのページ、挿入点（X/Y または画面上で指定）、尺度、モード（図面を復元 / PDF の見た目を保持）。
- **-PDFIMPORT** は `ipdf` のコマンド ライン プロンプト（ページ番号と、［尺度］［モード］付きの挿入点）を引き継ぎます。クラスは `AcApImportPdfPromptCmd` です。

移行：`ipdf` はなくなりました。`executeCommand('ipdf')` でプロンプトに答えていたスクリプトは `-pdfimport` を使ってください。独自のリボンを描画するホストは `pdfimport` を使います（cad-editor のリボン項目 ID は `cmd-pdfimport` になりました）。コマンドの説明は `command.ACAD.ipdf` から `command.ACAD.pdfimport` / `command.ACAD.-pdfimport` へ、プロンプト文字列は `jig.ipdf` から `jig.pdfimport` へ移りました（ダイアログの文字列は `jig.pdfimport.dialog`）。`AcApPdfImportConvertor.importFromFilePicker` はダイアログを表示し、`importFromCommandLine` がプロンプトの流れです。
:::

::: info スマート ブロック：検索して変換（`BSEARCH`）
本変更を含むリリース以降、`@mlightcad/cad-simple-viewer` は **-BSEARCH** を登録し、`@mlightcad/cad-editor` はツール パレットの「検索して変換」タブ（見つかったインスタンスの一覧）と「ブロックに変換」ダイアログを備えた **BSEARCH**（別名 `BCONVERT`）を追加します（リボンの「挿入」と「AI」タブ）。

形状照合は `@mlightcad/cad-pdf-plugin` から `@mlightcad/cad-simple-viewer` に移動しました。インポートを移行してください：

| `@mlightcad/cad-pdf-plugin`（非推奨）                                      | `@mlightcad/cad-simple-viewer`                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `findPdfShapeMatches`                                                      | `acedFindShapeMatches`                                                           |
| `applyPdfAffine`                                                           | `acedApplyAffine2d`                                                              |
| `pdfEntityToFeature`                                                       | `acedEntityToShapeFeature(entity, id, { matchLayer: false })`                    |
| `PdfMatchFeature` / `PdfAffine` / `PdfShapeMatch` / `PdfShapeMatchOptions` | `AcEdShapeFeature` / `AcEdAffine2d` / `AcEdShapeMatch` / `AcEdShapeMatchOptions` |

旧名は非推奨の別名として引き続き使えます。文字列は特徴の `kind` から `label` に移りました。`pdfblock` は `-BSEARCH` のプロンプト順（変換 → 新規/既存 → 名前 → 挿入基点 → 範囲）になり、旧プロンプトに応答するスクリプトは調整が必要です。
:::

::: info AutoCAD グループ（`GROUP` / `PICKSTYLE` / `GROUPDISPLAYMODE`）
この変更を含むリリースから、`@mlightcad/cad-simple-viewer` は **GROUP**、**-GROUP**、**UNGROUP**、**GROUPEDIT** を登録し、`PICKSTYLE` が `1` または `3` のとき選択を拡張し、選択可能なグループに `GROUPDISPLAYMODE` グリップを適用します。`@mlightcad/cad-editor` は **CLASSICGROUP**（オブジェクトグループ化ダイアログ）とホーム → グループのリボンパネルを追加します。

`PICKSTYLE`（0–3、既定 `1`）と `GROUPDISPLAYMODE`（0–2、既定 `2`）を登録した `@mlightcad/data-model` が必要です。連想ハッチの同時選択（`PICKSTYLE` 2/3）は、`AcDbHatch` に境界ソフトポインタが追加されるまで no-op のままです。
:::

::: info `cad.view.capturePreview` の選択プレビュー
この変更を含むリリースから、`CadSession.capturePreview` は単独の `longSide` 数値ではなくオプションオブジェクトを受け取ります。

```ts
capturePreview?(options?: {
  longSide?: number
  selection?: boolean
}): Promise<CaptureDrawingPreviewResult>
```

スクリプトでは `cad.view.capturePreview({ longSide?, selection? })` を使います。`cad.selection.replace(ids)` の後に `selection: true` を渡すと、ENTPREVIEW と同じ batch プレビュー経路で選択図形を抽出し（シーン境界でフレーミング。データベースの `geometricExtents` ではない）、PNG をツール結果に添付します。選択が空のときは `reason: 'no-selection'` を返します。レンダラのない `createDatabaseSession` では従来どおりプレビューをスキップします。
:::

::: info `cad.view.capturePreview` の画層プレビュー
この変更を含むリリースから、`CadCapturePreviewOptions` に `layers?: string | string[]` が、`CaptureDrawingPreviewFailure` に `'no-layers'` が追加されます。

```ts
cad.view.capturePreview({ layers: ['WALL', 'DOOR'], longSide: 1024 })
```

モデル空間のそれらの画層上の図形だけを描画し（INSERT はそれらの画層上の部分のみ）、図面全体ではなく画層を合わせた範囲でフレーミングします。画層名は大文字小文字を区別しません。存在しない画層名はスクリプト実行中にエラーになります。`layers` は `selection: true` と併用できません。`normalizeCadCapturePreviewOptions` は `NormalizedCadCapturePreviewOptions`（`layers` は重複除去済みの `string[]`）を返すようになりました。独自の `CadSession.capturePreview` 実装は `options.layers` を処理するか、`reason: 'no-layers'` を返してください。ビューア実装は新しい `AcApEntityPreviewConvertor.captureLayers(layerNames, longSide)` を使います。
:::

::: info 軽量なファイルオープン用ランディング入口
**1.8.0** から、`@mlightcad/cad-simple-viewer` はランディングページ向けに DocManager 非依存のサブパスを公開します。**`acuiCreateFileOpenSession`**（遅延 `createDocManager` + 自動オープン / `attachSourcesTo`）を優先してください。図面のオープンを自前で行う場合（例: Vue `MlCadViewer`）は `AcUiFileOpenLanding` を使います。

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

ホーム / ファイル選択画面で使い、図面が開くまで本体ビューアを lazy のままにします。Vue エディタ側は `@mlightcad/cad-editor/locale` で、`MlCadViewer` をマウントせずに i18n を使えます。

詳細は[ファイルを開くパネル](./file-open-panel)を参照してください。クラウドソースの契約は[データソースプラグイン](./data-source-plugin)を参照してください。
:::

::: warning パッケージ名の変更: `@mlightcad/cad-viewer` → `@mlightcad/cad-editor`
**1.8.0** から、パッケージ名が実際の機能を表すように、`@mlightcad/cad-viewer` を `@mlightcad/cad-editor` に改名しました。

- **旧パッケージは更新されません。** `@mlightcad/cad-viewer` は 1.7.x で止まり、それ以降のバージョンは registry に公開されないため、`pnpm add @mlightcad/cad-viewer@1.8.0` は 404 になります。プロジェクトが終了したわけではなく、新しい名前を使う必要があるだけです。
- **API は一切変わっていません。** 変わったのはパッケージ名と出力ファイル名だけで、`MlCadViewer` や `i18n` などのエクスポートと使い方は同じです。
- **他のパッケージと同じバージョンに上げる際に、まとめて名前を変更してください:**

```diff
  {
    "dependencies": {
-     "@mlightcad/cad-viewer": "1.7.8",
+     "@mlightcad/cad-editor": "1.8.0",
      "@mlightcad/cad-simple-viewer": "1.8.0"
    }
  }
```

```diff
- import { MlCadViewer, i18n } from '@mlightcad/cad-viewer'
+ import { MlCadViewer, i18n } from '@mlightcad/cad-editor'
```

CDN（jsDelivr、unpkg など）でファイルをバージョン固定している場合は、ファイル名も更新してください:

```diff
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.js
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.css
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.js
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.css
```

::: tip リポジトリ名は変わっていません
GitHub リポジトリは引き続き [`mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) で、ドキュメントサイトとライブデモも既存のパスを維持しています。変わったのは **npm パッケージ名**だけなので、このガイド内のリポジトリや issue へのリンクはすべてそのまま使えます。
:::
:::

::: warning HTML エクスポート公開 API の改名（`AcExHtml` / `acexHtml`）
**1.8.0** から、`@mlightcad/cad-html-core`（`@mlightcad/cad-html-plugin` が再エクスポート）の公開型と関数は、層プレフィックス `AcExHtml*`（型）と `acexHtml*`（関数）を使います。モノレポのほかの層と同じ命名規則です。

挙動は変わりません。シンボル名だけが変わります。1.7.x からアップグレードするときは import を更新してください。

```diff
  import {
-   type AcExSnapshot,
-   buildAcExPackage,
-   zipAcExPackageFiles,
-   unzipAcExPackageFiles,
-   packHtml,
-   packHtmlPackage
+   type AcExHtmlSnapshot,
+   acexHtmlBuildPackage,
+   acexHtmlZipPackageFiles,
+   acexHtmlUnzipPackageFiles,
+   acexHtmlPackHtml,
+   acexHtmlPackHtmlPackage
  } from '@mlightcad/cad-html-plugin'
```

ほかの HTML-core ヘルパーも同様です（例: `captureAcExSavedViewExtents` → `acexHtmlCaptureSavedViewExtents`、`buildOsnapCatalog` → `acexHtmlBuildOsnapCatalog`）。`AcApHtmlConvertor` や `chtml` / `-chtml` などのコマンド級 API は影響を受けません。開発ガイドに出てくる新しい名前は **1.8.0+** 向けです。1.7.x では従来のシンボルを使い続けてください。
:::

::: tip スクリプトホスト: 本物の寸法エンティティを作成（`drawDim*`）
**1.8.0-preview.2** 以降のリリースから、`@mlightcad/cad-script-core` の `cad.edit.transaction` で寸法エンティティを作成できます（以前はスナップショットの読み取りのみ）:

- `drawDimAligned`、`drawDimLinear`、`drawDimDiameter`、`drawDimRadius`
- `drawDimAngular`、`drawDimArc`、`drawDimOrdinate`

Agent / スクリプトは線・矢印・文字で寸法を模倣せず、これらを呼び出してください。直径/半径は `center` + `radius` を受け取り、円スナップショットをそのまま渡せます。詳細は [スクリプト API](../guide/script/api.md)。
:::

::: tip スクリプトホスト: ブロック単位の集計は `cad.blocks`
この変更を含むリリースから、`cad.blocks` はブロックごとの `entityCount` / `typeCounts` メタデータを公開し、完全な `entities` 配列は埋め込みません。集計はこれらのフィールドまたは `count(pred)` を使ってください。スナップショットは `where` / `inBlock(id, pred)` — 空間全体の裸スナップショットは約 500 件で `too_many_matches` になります。`where` / `count` / `inBox` はモデル／ペーパー空間のみです。
:::

::: info SVG File → Open
**1.8.0** から、通常の File → Open / `openDocument` / `openUrl` で `.svg` を図面として開けます。変換は新パッケージ [`@mlightcad/cad-svg-converter`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-converter)（`@mlightcad/data-model` のみに依存）にあります。`cad-editor` の `initializeCadViewer` は自動登録します。`cad-simple-viewer` のみの場合は起動時に `registerSvgConverter()` を一度呼び出してください。エクスポートは引き続き `cad-svg-plugin` の `csvg` です。
:::

::: info HTML/PDF エクスポートは空のレイアウトを既定でスキップ
この変更を含むリリースから、HTML / PDF エクスポートに **`exportEmptyLayouts`**（既定 **`false`**）が追加されます。AutoCAD 既定の `*Paper_Space` ビューポートだけを含むペーパー空間レイアウトは、オプションを `true` にしない限り省略されます。レイアウトを書き出すときはモデル空間は常に残ります。

移行：空白のペーパー タブも出力に含める場合は `exportEmptyLayouts: true` を渡します（書き出しダイアログのトグル、`-chtml` / `-cpdf` のプロンプト、スクリプトの `cad.file.saveHtml` / `savePdf`、またはエクスポーター CLI の `--export-empty-layouts`）。
:::

::: info PDF エクスポートを共有コアに分割（ブラウザ + Node）
**1.8.0** から、PDF エクスポートは HTML エクスポートと同じ階層になります。共有ロジックは `@mlightcad/cad-pdf-core`（オプションモデルと database → PDF パイプライン。`cad-simple-viewer` / DOM に**依存しません**）にあり、次の 2 つのフロントエンドがそれを使います。

| パッケージ                    | 役割                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `@mlightcad/cad-pdf-plugin`   | ブラウザの `cpdf` / `-cpdf` / `pdfimport`（および Vue のエクスポートダイアログ） |
| `@mlightcad/cad-pdf-exporter` | Node のヘッドレス DXF/DWG → PDF — **ブラウザ不要**                               |

**ブラウザ統合側 — ほぼ変更なし。** `cpdf` / `-cpdf` / `pdfimport`、`AcApPdfConvertor`、`AcApPdfExportOptions`、`resolveAcApPdfExportOptions` をそのまま使えます。新しい peer `@mlightcad/cad-pdf-core` をプラグインと同じバージョンで追加インストールしてください。

**ユーザーに影響する API / 挙動の差分:**

- 新しいオプション `colorMode: 'color' | 'monochrome'`（既定 `'color'`）。`cpdf` ダイアログ、`-cpdf` の**最後の**プロンプト（`Color` / `Monochrome`）、および `AcApPdfExportOptions` で利用できます。既存の `-cpdf` スクリプトは、テキストモードの回答のあとにこのプロンプトへ答える（または空行で既定）必要があります。
- ブラウザなしのサーバー / CI: Playwright で `cpdf` を動かす代わりに `@mlightcad/cad-pdf-exporter`（`exportFileToPdf`、`convertDatabaseToPdf`）を使います。

```ts
// ブラウザ（名前は変わらず）
import {
  AcApPdfConvertor,
  resolveAcApPdfExportOptions
} from '@mlightcad/cad-pdf-plugin'

await new AcApPdfConvertor().convert(
  context,
  resolveAcApPdfExportOptions({ colorMode: 'monochrome' })
)

// Node、ブラウザ不要
import { exportFileToPdf } from '@mlightcad/cad-pdf-exporter'

await exportFileToPdf('drawing.dwg', 'drawing.pdf', {
  colorMode: 'monochrome'
})
```

共有パイプラインを直接呼ぶ高度な用途は `@mlightcad/cad-pdf-core` の `acexPdfExportDatabase` / `acexPdfResolveExportOptions` を参照してください。フォント・レイアウト・テキストモードの詳細は各パッケージの README にあります。
:::

## 概要

`@mlightcad/cad-simple-viewer` と `@mlightcad/cad-editor` は**独立したパッケージではありません**。これらは共通のコードベースとリリースサイクルを共有する、緊密に統合されたエコシステムの一部です。各リリースには、プラグイン、レンダラー、data-model パッケージ、テキストレンダリングライブラリ、サードパーティの UI フレームワークにまたがる、調整された一連の更新が含まれています。

**`cad-simple-viewer` または `cad-editor` のみを単独でアップグレードすると、微妙な実行時障害が発生する可能性があります**。たとえば：

- プラグインのインターフェースが、新しい（または古い）コアバージョンで変更された API シグネチャを期待している
- コアが期待するデータモデルの形状と、古いパーサー/レンダラーが生成する形状の不一致
- libredwg-converter の更新後の WebAssembly または Worker の互換性の欠如
- `mtext-renderer` / `mtext-parser` のバージョンがずれたときのテキストレンダリングの不具合
- レンダラー層全体で一致していない Three.js の破壊的変更や動作変更

常に**関連パッケージのセット全体を一緒に**アップグレードしてください。正しいバージョンを判断する 2 つの信頼できる方法を以下で説明します。

---

## エコシステムの全体像

アップグレードする前に、どのパッケージが調整されたリリースに属し、どれがサードパーティ製かを知っておくと役立ちます。次のカテゴリは、同じ cad-editor リリースに同期されます。

### コアビューアパッケージ

| パッケージ                     | 役割                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `@mlightcad/cad-simple-viewer` | フレームワーク非依存のコア（ドキュメント管理、コマンドスタック、レンダリングの接着層） |
| `@mlightcad/cad-editor`        | cad-simple-viewer の上に構築された Vue 3 + Element Plus の UI ラッパー                 |

### プラグイン — **cad-simple-viewer のバージョンと完全に一致させる必要があります**

| パッケージ                               | 目的                                                |
| ---------------------------------------- | --------------------------------------------------- |
| `@mlightcad/cad-html-plugin`             | ワンクリックの自己完結型 HTML エクスポート          |
| `@mlightcad/cad-pdf-plugin`              | ブラウザの PDF エクスポートと PDF → CAD インポート  |
| `@mlightcad/cad-svg-plugin`              | SVG エクスポート                                    |
| `@mlightcad/cad-simple-viewer` (`simpleUi`) | Built-in plain-DOM toolbar / dock tabs (`simpleUi`) |
| `@mlightcad/cad-agent-plugin`            | AI エージェントによるインタラクション               |
| `@mlightcad/cad-onedrive-plugin`         | OneDrive 統合                                       |
| `@mlightcad/cad-google-drive-plugin`     | Google Drive 統合                                   |

> **経験則：** 上記のリストのすべてのプラグインは、アップグレード先の `cad-simple-viewer` と**完全に同じバージョン番号**（たとえば `1.7.5`）に固定する必要があります。

### 共有エクスポートコアとヘッドレスエクスポーター（コアと同じバージョン）

| パッケージ                     | 目的                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `@mlightcad/cad-html-core`     | 共有 HTML スナップショット / パッケージングパイプライン（ビューア / DOM なし） |
| `@mlightcad/cad-html-exporter` | Node ヘッドレス HTML エクスポート                                              |
| `@mlightcad/cad-pdf-core`      | 共有 PDF オプションモデルと database → PDF パイプライン（ビューア / DOM なし） |
| `@mlightcad/cad-pdf-exporter`  | Node ヘッドレス DXF/DWG → PDF（ブラウザ不要）                                  |

### 内部レンダラー層（コアと同じバージョン、別途公開）

| パッケージ                  | 目的                                             |
| --------------------------- | ------------------------------------------------ |
| `@mlightcad/three-renderer` | THREE.js ベースの 2D/3D レンダリングエンジン     |
| `@mlightcad/pdf-renderer`   | `cad-pdf-core` が使う PDF コンテンツバックエンド |

これらはプラグインと cad-simple-viewer によって内部的に使用されます。通常は直接インストールする**必要はありません**が、そのバージョンはインストールするプラグインと互換性がある必要があります。

### 低レベルデータ & テキスト層 — **リリースのバージョンと一致させる必要があります**

| パッケージ                      | 備考                                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| `@mlightcad/data-model`         | コアのエンティティ/データベース型。各リリースでビューアと一緒に更新されます |
| `@mlightcad/libredwg-converter` | DWG 解析の WebAssembly ラッパー — DWG サポートはこれに依存します            |
| `@mlightcad/mtext-parser`       | MTEXT コンテンツパーサー                                                    |
| `@mlightcad/mtext-renderer`     | MTEXT → THREE ジオメトリのレンダラー                                        |
| `@mlightcad/mtext-input-box`    | キャンバス内の MTEXT エディターウィジェット                                 |

### cad-editor 専用の Vue UI 依存関係

これらは `pnpm-workspace.yaml` のオーバーライドに含まれていますが、`@mlightcad/cad-editor`（完全な Vue 3 UI）を使用する場合にのみ必要です。cad-simple-viewer の統合では直接インストールしません。

| パッケージ                 | 目的                     |
| -------------------------- | ------------------------ |
| `@mlightcad/ribbon`        | リボン UI コンポーネント |
| `@mlightcad/ui-components` | 共有 Vue UI プリミティブ |

### サードパーティのピア依存関係（リリースで固定されたバージョンを維持）

| パッケージ                        |
| --------------------------------- |
| `three`                           |
| `vue`（cad-editor 専用）          |
| `element-plus`（cad-editor 専用） |
| `vue-i18n`（cad-editor 専用）     |
| `lodash-es`                       |

---

## 方法 1 — 対象バージョンの `pnpm-workspace.yaml` を読む

すべてのリリースの正規の信頼できる情報源は、対応する Git タグでのモノレポの `pnpm-workspace.yaml` の `overrides` セクションです。ここには、そのリリースでテストされたすべての `@mlightcad/*` パッケージとサードパーティのピア依存関係の**正確なバージョン**が記載されています。

### 手順

1. アップグレード先のバージョンのタグを見つけます。タグは `vX.Y.Z` のパターン（たとえば `v1.7.5`）に従います。すべてのタグはメインリポジトリにあります。

   ```
   https://github.com/mlightcad/cad-viewer/tags
   ```

2. そのタグの `pnpm-workspace.yaml` を開きます。URL テンプレートは次のとおりです。

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/vX.Y.Z/pnpm-workspace.yaml
   ```

   `vX.Y.Z` を実際のバージョンタグに置き換えます。たとえば：

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/v1.7.5/pnpm-workspace.yaml
   ```

3. `overrides:` ブロックを独自のプロジェクトの `pnpm-workspace.yaml` にコピーします。次のようになります（省略された例）。

   ```yaml
   overrides:
     '@mlightcad/data-model': '^1.15.4'
     '@mlightcad/libredwg-converter': '^3.15.4'
     '@mlightcad/mtext-input-box': '^0.3.3'
     '@mlightcad/mtext-parser': '^1.5.3'
     '@mlightcad/mtext-renderer': '^0.13.3'
     '@mlightcad/ribbon': '^0.1.13'
     '@mlightcad/ui-components': '^0.1.11'
     element-plus: '^2.12.0'
     lodash-es: '4.17.21'
     three: '^0.172.0'
     vue: '^3.4.21'
     vue-i18n: '^11.4.4'
   ```

4. 使用するすべての `@mlightcad/cad-*-plugin` を、`cad-simple-viewer` / `cad-editor` と**同じバージョン**に更新します。

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-editor": "1.7.5",
       "@mlightcad/cad-html-plugin": "1.7.5",
       "@mlightcad/cad-pdf-plugin": "1.7.5",
       "@mlightcad/cad-svg-plugin": "1.7.5",
       "@mlightcad/cad-simple-ui-plugin": "1.7.5",
       "@mlightcad/cad-agent-plugin": "1.7.5",
       "@mlightcad/cad-onedrive-plugin": "1.7.5",
       "@mlightcad/cad-google-drive-plugin": "1.7.5"
     }
   }
   ```

5. `pnpm install`（または `npm install`）を実行し、ピア依存関係の警告なしでアプリが読み込まれることを確認します。

> プロジェクトが通常の `npm` または `yarn` ワークスペースの場合、同じ `overrides` をそれぞれ `pnpm.overrides` / `resolutions` ブロックにコピーしてください。重要なのはバージョンの値であり、ファイル形式ではありません。

---

## 方法 2 — `cad-simple-viewer-demo` のアップグレードコミットを追う

[cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) リポジトリは、`cad-simple-viewer` の公式の最小ホストです。コアがリリースされるたびに、サンプルプロジェクトには `feat: upgrade to cad-simple-viewer vX.Y.Z` というタイトルのコミットが追加され、**すべての関連依存関係が一緒に**更新されます。このコミットは、そのリリースでメンテナーが実際に使用したバージョンを正確に示す、実用的で具体的な参考資料です。

### 手順

1. package.json ファイルのコミット履歴を開きます。

   ```
   https://github.com/mlightcad/cad-simple-viewer-example/commits/main/package.json
   ```

2. 対象バージョンの `feat: upgrade to cad-simple-viewer vX.Y.Z` というメッセージのコミットを見つけます。

3. コミットをクリックして差分を表示します。差分には、次の項目にまたがる調整されたバージョン更新が表示されます。
   - すべてのプラグイン（`cad-simple-viewer` と同じバージョン）
   - `data-model`
   - `libredwg-converter`
   - `mtext-parser`
   - `mtext-renderer`
   - および変更されたサードパーティパッケージ

4. 差分からバージョンを独自の `package.json` に転記します。

### 具体例 — v1.7.3 → v1.7.4 のアップグレード

次の実際の差分は、サンプルリポジトリの[コミット `492680a`](https://github.com/mlightcad/cad-simple-viewer-example/commit/492680a6b18d7683c457dbc6e689e035ac636fff)から取得したものです。**すべての `@mlightcad/*` パッケージが足並みを揃えて更新されている**ことに注目してください。

```diff
 dependencies:
-    "@mlightcad/cad-html-plugin": "1.7.3",
-    "@mlightcad/cad-pdf-plugin": "1.7.3",
-    "@mlightcad/cad-svg-plugin": "1.7.3",
-    "@mlightcad/cad-simple-ui-plugin": "1.7.3",
-    "@mlightcad/cad-simple-viewer": "1.7.3",
-    "@mlightcad/data-model": "1.15.0",
-    "@mlightcad/libredwg-converter": "^3.15.0",
+    "@mlightcad/cad-html-plugin": "1.7.4",
+    "@mlightcad/cad-pdf-plugin": "1.7.4",
+    "@mlightcad/cad-svg-plugin": "1.7.4",
+    "@mlightcad/cad-simple-ui-plugin": "1.7.4",
+    "@mlightcad/cad-simple-viewer": "1.7.4",
+    "@mlightcad/data-model": "1.15.1",
+    "@mlightcad/libredwg-converter": "^3.15.1",
     "@mlightcad/mtext-parser": "^1.5.3",
-    "@mlightcad/mtext-renderer": "^0.13.1"
+    "@mlightcad/mtext-renderer": "^0.13.2"
```

> これはまさに、独自のプロジェクトで行うべき調整された更新の例です。`mtext-parser` は `^1.5.3` のまま（変更は不要）で、`mtext-renderer` は `0.13.1` から `0.13.2` に更新されていることに注意してください。これらの判断はリリースごとに行われるため、推測するのではなくそれに従うべきです。

---

## アップグレード後の簡単な動作確認

1. **インストール** — クリーンインストールを実行し、古い `node_modules` が干渉しないことを確認します。

   ```bash
   rm -rf node_modules pnpm-lock.yaml && pnpm install
   ```

2. **図面を開く** — DXF と DWG の両方のファイルが読み込まれ、パン/ズームが動作し、コンソールエラーが表示されないことを確認します。

3. **エクスポート** — エクスポートプラグインを使用する場合は、サンプル図面で HTML、PDF、SVG のエクスポートをテストします。

4. **ピア依存関係の警告を確認** — `pnpm` は、満たされていない `peerDependencies` がある場合に警告します。これらは必ず修正すべき問題として扱ってください。通常、プラグインのバージョンがコアからずれていることが原因です。

5. **アプリをビルド** — 完全な `vite build`（または同等のもの）は、ビューアの型と独自の統合コードの間の型の不一致を検出する最速の方法です。

---

## FAQ

**Q: `cad-simple-viewer@1.7.5` と `cad-html-plugin@1.7.3` を混在させることはできますか？**

A: 一般的にはできません。プラグインはコアと一緒にリリースされ、マイナーバージョン間で変更された内部 API に依存することがよくあります。TypeScript がコンパイルできたとしても、実行時障害が発生する可能性があります（たとえば、エクスポートが黙って空の出力を生成する、またはプラグインの登録が誤解を招くエラーで失敗するなど）。

**Q: プラグインなしで `cad-simple-viewer` のみを使用する場合はどうなりますか？**

A: それでも `data-model` と、（DWG ファイルを読み込む場合は）互換性のあるバージョンの `libredwg-converter` が必要です。対象タグの `pnpm-workspace.yaml` は依然として適用されます。

**Q: セマンティックバージョニングは保護を提供しますか？**

A: semver 範囲（`^`、`~`）は、リリースシリーズ**内**でのパッチレベルの更新には問題なく機能します（たとえば、`^1.7.0` は `1.7.5` を自動的に取得します）が、**調整されたプラグイン/data-model/libredwg-converter のバージョン**は semver だけでは判別できません。これらはリリースのメンテナーによって設定されます。特定のマイナー更新に対してどのバージョンが一緒に動作するかを知るには、上記の 2 つの方法のいずれかが必要です。

**Q: pnpm の代わりに npm/yarn を使用しています。これは引き続き適用されますか？**

A: はい。バージョンの調整はパッケージマネージャーに関係なく同じです。`pnpm-workspace.yaml` の値を使用して `overrides`（pnpm）、`resolutions`（yarn）、または `overrides`（npm）を使用するか、`cad-simple-viewer-demo` の差分からバージョンを `package.json` に固定するだけです。
