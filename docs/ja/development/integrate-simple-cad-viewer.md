---
title: "Simple Viewer の統合"
---

# Simple Viewer の統合

**cad-simple-viewer** は、ドキュメント管理、コマンド処理、UI とレンダリングエンジン間の連携など、CAD ビューアの**高性能**なコアコンポーネントを提供します。大規模な CAD ファイルを扱う際に最適な性能を実現するように設計されています。

このモジュールは特定の UI フレームワークに依存せず、キャンバス以外の UI を提供しません。独自の UI を持つ Web アプリケーションに高性能な CAD ビューアを統合する場合は、このモジュールが適切な選択肢です。

## 主な機能
- 大規模ファイル向けに最適化されたドキュメント管理
- 効率的なコマンドスタックと元に戻す/やり直し操作
- レンダリングエンジンとの最適化された統合
- 性能を重視した設定とコンテキスト管理
- 最大限の柔軟性を実現するフレームワーク非依存の設計

## cad-simple-viewer を選ぶべき場合

UI フレームワークへの依存なしに、**CAD のコアロジックのみ**（ドキュメント管理、コマンドスタック、レンダリングエンジン統合）が必要な場合は、`cad-simple-viewer` を使用してください。このパッケージは次のような場合に最適です：

- **独自のカスタム UI** を構築する場合、または CAD 機能を Vue 以外の環境や Web 以外の環境に統合する場合。
- 大規模な CAD ファイルを扱うための最大限の柔軟性と性能を必要とし、ロジックを独自のレンダリング層または UI 層に接続する予定がある場合。
- 必要最小限の CAD 操作とキャンバスレンダリングのみを提供する、フレームワーク非依存のソリューションを希望する場合。

**推奨:** カスタム統合、ヘッドレス CAD 処理、または高度にカスタマイズされた CAD ソリューションを構築する上級ユーザー。

## インストール

```bash
npm install @mlightcad/cad-simple-viewer
```

## 使用方法

基本的な使用方法と応用的な使用方法については、[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) を参照してください。

統合は 2 段階です。まず**アプリケーションを初期化**し（`AcApDocManager` シングルトンを一度作成）、次に**図面を開きます**。

### アプリケーションの初期化

`AcApDocManager` は `cad-simple-viewer` のエントリポイントです。シングルトンとして動作し、起動時に `AcApDocManager.createInstance(options)` を一度だけ呼び出し、以降は `AcApDocManager.instance` 経由でアクセスします。`createInstance` を再度呼び出しても既存のインスタンスが返されるだけで、新しいオプションは適用されません。

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const docManager = AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  autoResize: true,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
})
```

すべてのオプションは省略可能で、`AcApDocManagerOptions` インターフェースで定義されています。

#### キャンバスとレイアウト

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | 新規要素 | キャンバスを格納する HTML コンテナ。省略した場合は新しい要素が作成されるため、自分で DOM に挿入する必要があります。 |
| `width` | `number` | コンテナの幅 | キャンバスの幅（ピクセル）。 |
| `height` | `number` | コンテナの高さ | キャンバスの高さ（ピクセル）。 |
| `autoResize` | `boolean` | `false` | `true` の場合、コンテナのサイズ変化（ウィンドウ リサイズ、サイドバーの開閉など）にキャンバスが自動追従します。 |
| `busyIndicatorHost` | `HTMLElement` | `container` | ビジー オーバーレイ（エクスポート中のスピナーなど）を表示するホスト要素。リボンやツールバー、ステータスバーまで覆えるよう、ビューアの外側シェルを指定することを推奨します。 |

#### レンダリングとフォント

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `useMainThreadDraw` | `boolean` | `false` | MTEXT エンティティの描画場所を制御します。`true`：メインスレッド — ピーク メモリは少ないが初回描画は遅い。`false`：Web Worker — メモリは増えるが図面の表示が速い。 |
| `preloadDefaultFonts` | `boolean` | `false` | `true` の場合、初期化時にデフォルトのフォールバック フォント チェーンを先行読み込みします。デフォルトではテキスト描画時に必要に応じて読み込みます。 |

#### Worker とリソース

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://cdn.jsdelivr.net/gh/mlightcad/cad-data` | フォントや図面テンプレートなどランタイム リソースを取得するベース URL。オフラインやオンプレミス配置では自分のリソース コピーを指します。 |
| `webworkerFileUrls` | `AcApWebworkerFiles` | – | Worker バンドルの URL：`mtextRender`（MTEXT レイアウト/グリフ Worker）と `dwgParser`（任意の DWG 解析 Worker、準備確認に使用）。バンドラ固有の注意点は[Worker URL の設定](./configure-worker-urls)を参照してください。 |
| `checkWorkersOnInit` | `boolean` | `false` | `true` の場合、初期化後に設定された Worker スクリプト URL を HEAD リクエストで検証し、結果を `AcApDocManager.instance.workersReady` と `workersReady` イベントで公開します。 |

#### UI とプロダクト設定

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `builtinOpenFileDialog` | `boolean` | `true` | `false` の場合、組み込み OPEN コマンドのファイル ピッカーをインストールしません（独自のオープン UI を持つ場合に有用）。 |
| `disableExport` | `boolean` | `false` | `true` の場合、図面エクスポート コマンドと関連 UI エントリ（`cdxf`、`pngout`、`jpgout`、`bmpout`、および HTML/PDF/SVG エクスポート）を登録しません。これは製品/UX 上のゲートであり、DRM ではありません — 図面データは依然としてメモリ上に存在します。 |
| `docsBaseUrl` | `string` | MLightCAD ドキュメントサイト | アプリ内ヘルプ リンクで使うローカライズ済みユーザー ガイドのルート URL。 |
| `commandAliases` | `Record<string, string \| string[]>` | 組み込みエイリアス | コマンドのグローバル名でエイリアスを上書きします。例：`{ LINE: ['L', 'LN'], CIRCLE: 'CI' }`。指定しないコマンドは組み込みエイリアスを維持します。 |

#### プラグインとオープン デフォルト

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `plugins` | `{ fromConfig?, fromFolder? }` | – | 初期化時にプラグインを自動読み込みします。`fromConfig` はプラグイン インスタンスまたはファクトリ関数、`fromFolder` はフォルダからプラグイン ファイルを読み込みます（`folderPath`、`pluginList`、`continueOnError`）。詳細は[プラグイン システム](./plugin-system)を参照。 |
| `openDocumentDefaults` | `AcApOpenDatabaseOptions` または `() => AcApOpenDatabaseOptions \| Promise<...>` | – | 組み込み OPEN ダイアログでファイルを開く際のデフォルト オプション。静的オブジェクトまたは同期/非同期ファクトリを指定できます。後から `AcApDocManager.instance.setOpenDocumentDefaults(...)` で更新可能です。 |

#### DWG コンバータの登録

`cad-simple-viewer` はデフォルトで DWG コンバータを登録**しません**（LibreDWG は GPL ライセンスのため）。DWG ファイルを開くには、事前に `@mlightcad/libredwg-converter` などのコンバータを登録してください：

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: './workers/libredwg-parser-worker.js'
  })
)
```

### 図面を開く

ドキュメント マネージャには 2 つのオープン方式があります。どちらも `Promise<boolean>` を返し、正常に開けたら `true` になります：

```typescript
// 1. URL から開く（ファイルの取得はビューアが行う）
await docManager.openUrl('https://example.com/plan.dwg', options)

// 2. 保持しているファイル内容から開く（ファイル入力など）
const success = await docManager.openDocument(
  'plan.dwg',               // ファイル名の拡張子で DWG か DXF かを判定
  await file.arrayBuffer(), // ArrayBuffer 形式のファイル内容
  options
)
```

両メソッドとも同じ `AcApOpenDatabaseOptions` オブジェクトを受け取ります。省略した場合、マネージャは `drawNoPlotLayers: false` と `progressiveRendering: false` を適用します。この型はビューア レベルのオプションと、`@mlightcad/data-model` の基底 `AcDbOpenDatabaseOptions` を組み合わせたものです。

#### ビューア オプション

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `mode` | `AcEdOpenMode` | – | アクセス モード：`Read`（0、閲覧のみ）、`Review`（4、レビュー、Read と互換）、`Write`（8、完全な読み書き、他と互換）。大きい値のモードは小さい値のモードと互換します。デフォルトの `openViewMode` もこの値で決まります（下記参照）。 |
| `progressiveRendering` | `boolean` | `false` | 変換中の図面を徐々に描画するかどうかを制御します。`false`：すべてのエンティティの変換が完了するまでキャンバスは再描画されず、遅延テキスト/INSERT グリフ ジョブが終わるまでオープン オーバーレイが表示されたままになります。`true`：エンティティ変換がイベント ループをまたいで譲り合い、バッチ単位で描画が進みます。解析と変換の進捗表示が完了すればパン/ズームが可能になり、残りのジオメトリはバックグラウンドで変換が続きます。大きな図面の対話表示では `true`、スクリーンショットや決定的な初回フレームが必要な場合は `false` を使用します。 |
| `openViewMode` | `AcApOpenViewMode` | Read/Review は `Extents`、Write は `Saved` | ユーザーがまだ操作していないレイアウトの初期表示方法。`Extents`（`'extents'`）は変換済みジオメトリにズームします。`Saved`（`'saved'`）は AutoCAD が保存したビューを復元します（モデル空間は VPORT `*ACTIVE`、ペーパー空間は実ビューポートがあればレイアウト限界、なければビューポート枠）。 |
| `sysVars` | `AcApOpenSysVars` | – | データベースを開く際に上書きするシステム変数。キーはシステム変数名（大文字小文字を区別しない）、値は `number`、`boolean`、`string`、`AcCmColor`。よくある例：`lwdisplay: false` で線の太さを非表示、`paperbkcolor` でペーパー空間の背景色を設定。 |
| `convertInvisibleLayers` | `boolean` | `false` | `true` の場合、オフ/凍結レイヤーのエンティティもオープン時に変換するため、オフライン HTML/PDF エクスポートで二次変換が不要になります。対話表示では `false` のままにします（レイヤーをオンにした時点で変換されます）。 |
| `convertAllLayouts` | `boolean` | `false` | `true` の場合、オープン中/直後にすべてのペーパー空間レイアウトを登録・変換するため、エクスポート時にユーザーが各レイアウト タブを巡回するのを待つ必要がありません。 |
| `skipSpatialIndex` | `boolean` | `false` | `true` の場合、エンティティ変換中に階層空間インデックスの構築をスキップします。このインデックスは対話ピッキングやスマート エクステントに使われます。ヘッドレス HTML/JPEG エクスポートはシーン バッチのみ必要なため、時間とメモリを節約できます。 |
| `cooperativeYield` | `boolean` | `true` | `false` の場合、エンティティ変換中の協調的 `setTimeout` 譲渡を無効化し、途中の WebGL 描画をスキップします。ヘッドレス スクリプトは応答性の高い UI を必要としないため、譲渡を無効にするとオープンの実時間を短縮できます。 |

#### データベース オプション（`@mlightcad/data-model` から継承）

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `minimumChunkSize` | `number` | – | 処理チャンクあたりの最小エンティティ数。大きいほどスケジューリング オーバーヘッドが減ります。公式サンプルでは `1000` を使用。上限はエンティティ総数。 |
| `timeout` | `number` | コンバータのデフォルト | Web Worker 解析のタイムアウト（ミリ秒）。選択されたコンバータが Worker で解析する場合にのみ有効。 |
| `encoding` | `string` | 自動検出 | レイヤー名、注記、テキスト、属性のテキスト エンコーディング上書き（例：`'gbk'`、`'euc-kr'`）。省略時、DXF は `$DWGCODEPAGE` を、DWG はヘッダーのコードページを読みます。明示指定は自動検出に優先し、コードページ宣言が欠落・誤りのあるファイルに有効です。 |
| `drawNoPlotLayers` | `boolean` | `false` | 非印刷レイヤー（Defpoints、`*-NPLT` など）のエンティティを描画するかどうか。`true` = デスクトップ AutoCAD と同じ（画面に表示）、`false` = Web/公開ビューアと同じ（非表示）。`AcApDocManager` はデフォルトで `false` を適用します。 |
| `circleSides` | `number` | `50`（ドラフト） | 円をテッセレーションする最大セグメント数。小さいほど GPU メモリを節約し HTML エクスポートも小さく、大きいほど滑らかになります。DXF VPORT の許容範囲にクランプされます。短い円弧はより少ないセグメントを使います。 |
| `fileName` | `string` | – | 図面ファイル名（拡張子込み）。開いたデータベースの読み取り専用 `DWGNAME` システム変数を更新します。 |

#### 非推奨のオプション

| オプション | 状態 |
| --- | --- |
| `waitForTextGeometry` | 無視されます。プログレッシブ レンダリングの両段階は `progressiveRendering` が制御します。指定すると警告が出力されます。 |
| `fontLoader`、`failOnFontLoadError` | 削除済み。フォントはテキスト レンダラーが描画時に遅延読み込みします。指定すると警告が出力されます。 |

#### 例

```typescript
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  layoutBackgroundColorFromRgb
} from '@mlightcad/cad-simple-viewer'

const options = {
  mode: AcEdOpenMode.Write,
  minimumChunkSize: 1000,
  progressiveRendering: true,
  openViewMode: AcApOpenViewMode.Extents,
  sysVars: {
    lwdisplay: false,
    paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
  }
}

const success = await AcApDocManager.instance.openDocument(
  'plan.dwg',
  await file.arrayBuffer(),
  options
)
if (!success) {
  console.error('図面を開けませんでした')
}
```

オープンのライフサイクルを追跡するには、`AcApDocManager.instance.events` のイベントを購読します：`documentToBeOpened`、`documentCreated`、`documentToBeActivated`、`documentActivated`、`documentToBeDestroyed`、`documentDestroyed`。

### 図面のリアルタイム変更

`cad-simple-viewer` は図面を DWG/DXF ファイルに保存する機能をサポートしていませんが、**図面のリアルタイム変更**を包括的にサポートしています。図面内のエンティティを追加、編集、削除でき、ビューアはこれらの変更を反映して自動的に更新されます。

エンティティを変更すると、基盤となる図面データベースを直接操作することになります。ビューアはこれらの変更を自動的に検出し、表示を更新します。このリアルタイム同期により、次のことが保証されます：

- すべての変更が即座に表示されます
- コマンドスタックが元に戻す/やり直し操作のために変更を適切に追跡します。これは近日中に実装される予定です。

この機能により、`cad-simple-viewer` は CAD ファイルを表示するだけでなく、ユーザーが図面の内容を操作・変更できるアプリケーションに適しています。

**重要な注意**：`cad-simple-viewer` の使用方法は **AutoCAD RealDWG と非常によく似ています**。AutoCAD RealDWG の開発に慣れている方なら、API の構造とワークフローがほぼ同じであることがわかります。主な違いは、ネイティブの RealDWG ライブラリではなく [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) を使用していることです。

[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) では、[**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) を使用して 1 つの図面を作成する方法を示しています。

## MLightCAD における役割

このパッケージはコアロジック層として機能し、フロントエンド UI とレンダリングエンジンを接続し、ドキュメント関連のすべての操作を管理します。
