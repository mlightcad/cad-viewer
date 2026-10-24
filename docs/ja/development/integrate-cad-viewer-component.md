---
title: "Vue コンポーネントの統合"
---

# Vue コンポーネントの統合

**cad-viewer** は、CAD ファイル（DXF、DWG）を**バックエンドサーバーなしで完全にブラウザ上で**表示・編集するための**高性能**な Vue 3 コンポーネントです。モダンなユーザーインターフェース、状態管理、最適化されたレンダリングエンジンとのシームレスな統合を提供し、卓越した性能でスムーズなブラウザベースの CAD ワークフローを実現します。

## 主な機能

- 60 FPS 以上のスムーズなレンダリングを備えた**高性能**な CAD 編集・表示
- **バックエンド不要** - ファイルは完全にブラウザ上で解析・処理されます
- **強化されたデータセキュリティ** - ファイルがデバイスから外に出ることはなく、完全なプライバシーが確保されます
- **ローカルファイルのサポート** - ファイルダイアログまたはドラッグ＆ドロップで、コンピューターから DWG/DXF ファイルを直接読み込めます
- **リモートファイルのサポート** - URL から CAD ファイルを自動的に読み込みます
- **簡単な統合** - サードパーティ統合にサーバー設定やバックエンドインフラは不要です
- **カスタマイズ可能な UI** - ツールバー、コマンドライン、座標、パフォーマンス統計の表示を制御できます
- **カスタマイズ可能なリソース** - フォント、テンプレート、サンプルファイルのカスタムベース URL を設定できます
- 大規模な CAD ファイル処理に最適化されたモダンな UI
- レイヤ、エンティティ、設定の状態管理
- 最適化された SVG および THREE.js レンダラーとの統合
- ダイアログ、ツールバー、コマンドラインインターフェース
- 高性能 CAD ビューアを独自のアプリに組み込むための Vue 3 コンポーネント

## cad-viewer を選ぶべき場合

モダンな UI、ダイアログ、ツールバー、状態管理を備えた、CAD ファイルを表示・編集するための**すぐに使える Vue 3 コンポーネント**が必要な場合は、`cad-viewer` を使用してください。このパッケージは次のような場合に最適です：

- 高性能な CAD ビューア/エディタを、最小限の設定で Vue アプリケーションにすばやく組み込みたい場合。
- ローカルファイルの読み込み（ユーザーのコンピューターから）とリモートファイルの読み込み（URL から）の両方をサポートする必要がある場合。
- ファイルの読み込み、レンダリング、レイヤ/エンティティ管理、ユーザー操作をすぐに利用できるソリューションが必要な場合。
- 最適化された SVG および THREE.js レンダラー、国際化、テーマ設定とのシームレスな統合を希望する場合。
- 独自の UI をゼロから構築したく**ない**場合。

**推奨:** 洗練されたユーザーインターフェースで CAD ファイルを表示する必要があるほとんどの Web アプリケーション、ダッシュボード、プラットフォーム。

## ブラウザ専用アーキテクチャ

この Vue 3 コンポーネントは完全にブラウザ上で動作し、**バックエンドへの依存はありません**。DWG/DXF ファイルは WebAssembly と JavaScript を使用してローカルで解析・処理され、次の特長を提供します：

- **サーバー不要** - 静的ファイルホスティングだけで、コンポーネントをどこにでもデプロイできます
- **完全なデータプライバシー** - CAD ファイルは、ローカルから読み込んだ場合も URL から読み込んだ場合も、ユーザーのデバイスから外に出ません
- **ローカルファイルのサポート** - ユーザーは組み込みのファイルダイアログを使用して、コンピューターからファイルを直接読み込めます
- **リモートファイルのサポート** - URL が指定された場合、その URL からファイルを自動的に読み込みます
- **即時統合** - 複雑なバックエンド設定や API 設定は不要です
- **オフライン動作** - 一度読み込めば、インターネット接続なしで動作します
- **サードパーティに優しい** - サーバー側の懸念なしで、任意の Vue 3 アプリケーションに簡単に組み込めます

## ファイルの読み込み方法

MlCadViewer コンポーネントは、CAD ファイルを読み込むための複数の方法をサポートしています：

### 1. ローカルファイルの読み込み
ユーザーはコンピューターからファイルを直接読み込めます：
- **ファイルダイアログ**：メインメニュー（☰）をクリックし、「開く」を選択して、ローカルの DWG/DXF ファイルを参照・選択します
- **ドラッグ＆ドロップ**：CAD ファイルをビューア上に直接ドラッグ＆ドロップします（アプリケーションで実装されている場合）
- **ファイル入力**：組み込みのファイルリーダーコンポーネントを使用して、プログラムからファイルを選択します
- **コンポーネントのプロパティ**：File オブジェクトを `localFile` プロパティに直接渡すと、自動的に読み込まれます

#### 例：localFile プロパティをファイル入力で使用する
```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".dwg,.dxf" 
      @change="handleFileSelect"
    />
    <MlCadViewer 
      :local-file="selectedFile" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'

const selectedFile = ref<File | undefined>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0]
}
</script>
```

### 2. リモートファイルの読み込み
URL からファイルを自動的に読み込みます：
- **URL プロパティ**：`url` プロパティを指定すると、コンポーネントのマウント時にファイルが自動的に読み込まれます
- **動的読み込み**：`url` プロパティを変更すると、コンポーネントを再マウントせずに別のファイルを読み込めます

### 3. サポートされるファイル形式
- **DWG ファイル**：バイナリ形式の AutoCAD 図面形式（ArrayBuffer として読み込み）
- **DXF ファイル**：ASCII/バイナリ形式の AutoCAD 図面交換形式（テキストとして読み込み）

## インストール

```bash
npm install @mlightcad/cad-viewer
```

## 使用方法

サブパッケージ `cad-viewer-example` を一例として参照してください。

### 基本的な使用方法

まず、次の依存関係を package.json に追加します。

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @vueuse/core
- element-plus
- vue
- vue-i18n

次に、次のような Vue コンポーネントを作成します。

```vue
<template>
  <div>
    <!-- For local file loading (users can open files via menu) -->
    <MlCADViewer :background="0x808080" />
    
    <!-- For remote file loading (automatically loads from URL) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :url="'https://example.com/drawing.dwg'" 
    /> -->
    
    <!-- For local file loading (automatically loads from File object) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :local-file="selectedFile" 
    /> -->
    
    <!-- With custom base URL for fonts and templates -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :base-url="'https://my-cdn.com/cad-data/'"
    /> -->
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## MlCadViewer コンポーネント

`MlCadViewer` は、完全な CAD 表示・編集インターフェースを提供するメインの Vue 3 コンポーネントです。ツールバー、レイヤ管理、コマンドライン、ステータスバー、さまざまなダイアログを含み、本格的な CAD エクスペリエンスを提供します。

### コンポーネントのプロパティ（Props）

`MlCadViewer` コンポーネントは次の props を受け入れます：

| プロパティ            | 型                        | デフォルト     | 説明                                                                                                                                              |
| ------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`            | `'en' | 'zh' | 'default'` | `'default'` | UI の言語。`'default'` はブラウザのロケールを使用します。ビューア UI と Element Plus コンポーネントの両方に影響します。                                              |
| `url`               | `string`                    | `undefined` | CAD ファイル（DWG/DXF）のリモート URL。指定すると、マウント時にファイルを取得して自動的に開きます。このプロパティを更新すると、ファイルが動的に再読み込みされます。 |
| `localFile`         | `File`                      | `undefined` | `File` オブジェクトとしてのローカル CAD ファイル。マウント時に自動的に開かれ、変更時に再読み込みされます。両方が指定されている場合は **`url` より優先されます**。        |
| `background`        | `number`                    | `undefined` | CAD ビューの背景色。24 ビットの 16 進 RGB 値（例：`0x000000`）。変更時に動的に更新されます。                                  |
| `baseUrl`           | `string`                    | `undefined` | フォント、テンプレート、サンプルファイルなどの外部リソースの読み込みに使用するベース URL。アセットを CDN でホストする場合に便利です。                               |
| `useMainThreadDraw` | `boolean`                   | `false`     | レンダリングモードを制御します。`false` は Web Worker を使用します（大規模な図面に推奨）。`true` はメインスレッドでのレンダリングを強制します。                          |
| `theme`             | `'light' | 'dark'`         | `'dark'`    | ビューアの初期テーマ。ダークモードとライトモードを切り替えるために動的に更新できます。      

### コンポーネントのイベント

`MlCadViewer` はライフサイクルイベントを発行し、親コンポーネントがビューアの作成と破棄にフックできるようにします。

| イベント     | ペイロード | 説明                                                                           |
| --------- | ------- | ------------------------------------------------------------------------------------- |
| `create`  | `void`  | CAD ビューアが完全に初期化され、使用可能になった後に発行されます。          |
| `destroy` | `void`  | CAD ビューアが破棄され、内部リソースが解放される直前に発行されます。 |

### UI 設定

`MlCadViewer` は、グローバルな `AcApSettingManager`（`@mlightcad/cad-simple-viewer` が提供）から UI の表示設定を読み取ります。ビューアをレンダリングする前にこれらのフラグを設定すると、UI をカスタマイズできます。

| 設定                  | 型      | デフォルト | 説明                                                                |
| ------------------------ | --------- | ------- | -------------------------------------------------------------------------- |
| `isShowToolbar`          | `boolean` | `true`  | メインツールバーの表示を制御します                                |
| `isShowMainMenu`         | `boolean` | `true`  | メインメニューの表示を制御します                                   |
| `isShowCommandLine`      | `boolean` | `true`  | コマンドラインインターフェースの表示を制御します                      |
| `isShowCoordinate`       | `boolean` | `true`  | 座標表示の表示を制御します                          |
| `isShowEntityInfo`       | `boolean` | `true`  | エンティティ情報カードの表示を制御します                     |
| `isShowFileName`         | `boolean` | `true`  | 現在開いているファイル名を表示するかどうかを制御します               |
| `isShowLanguageSelector` | `boolean` | `true`  | 言語セレクターの表示を制御します                           |
| `isShowStats`            | `boolean` | `false` | パフォーマンス統計（FPS、レンダリング時間など）の表示を制御します

#### 例（推奨）
```vue
<template>
  <!-- Local file loading - users can open files via main menu -->
  <MlCadViewer locale="en" />
  
  <!-- Remote file loading - automatically loads from URL -->
  <!-- <MlCadViewer 
    locale="en" 
    :url="'https://example.com/drawing.dwg'" 
  /> -->
  
  <!-- Local file loading - automatically loads from File object -->
  <!-- <MlCadViewer 
    locale="en" 
    :local-file="selectedFile" 
  /> -->
  
  <!-- Custom baseUrl for fonts and templates -->
  <!-- <MlCadViewer 
    locale="en" 
    :base-url="'https://my-cdn.com/cad-data/'"
  /> -->
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// Configure global UI flags before the viewer mounts
AcApSettingManager.instance.isShowCommandLine = false
// Optional toggles
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = true
// AcApSettingManager.instance.isShowCoordinate = false
</script>
```

#### 注意事項

- 設定はグローバルであり、`MlCadViewer` に即座に反映されます。
- 同じ `AcApSettingManager.instance` 参照を使用して、実行時に変更できます。

### ベース URL の設定

`baseUrl` プロパティを使用すると、CAD ビューアがフォント、テンプレート、サンプルファイルを読み込む場所をカスタマイズできます。これは特に次の場合に便利です：

- **セルフホストリソース**：独自のフォントとテンプレートを CDN またはサーバーでホストする
- **企業環境**：CAD リソースに内部サーバーを使用する
- **オフラインデプロイ**：ローカルファイルシステムからリソースを配信する
- **カスタムブランディング**：独自のテンプレートとフォントを使用する

#### デフォルトの動作
`baseUrl` が指定されていない場合、ビューアはデフォルト URL `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/` を使用します。

#### リソース構造
カスタム `baseUrl` を使用する場合は、サーバーが次の構造を持っていることを確認してください：
```
your-base-url/
├── fonts/           # Font files for text rendering
├── templates/       # Drawing templates (e.g., acadiso.dxf)
└── examples/        # Example CAD files
```

#### 例：カスタムベース URL
```vue
<template>
  <MlCadViewer 
    :base-url="'https://my-company.com/cad-resources/'"
    :url="'https://my-company.com/drawings/project.dwg'"
  />
</template>
```

この設定では：
- `https://my-company.com/cad-resources/fonts/` からフォントを読み込みます
- `https://my-company.com/cad-resources/templates/` からテンプレートを読み込みます
- 「Quick New」操作にはカスタムベース URL を使用します

### コンポーネントの機能

`MlCadViewer` コンポーネントには次が含まれます：

- **メインメニュー** - ファイル操作（ローカルファイルを開く操作を含む）、ビューコントロール、設定
- **ツールバー** - 作図ツール、ズームコントロール、選択ツール
- **レイヤマネージャ** - レイヤの表示とプロパティの管理
- **コマンドライン** - AutoCAD スタイルのコマンド入力
- **ステータスバー** - 現在位置、ズームレベル、システムステータス
- **ダイアログマネージャ** - さまざまな操作用のモーダルダイアログ
- **ファイルリーダー** - ファイルダイアログによるローカルファイルの読み込みとドラッグ＆ドロップのサポート
- **エンティティ情報** - 選択したエンティティの詳細情報
- **言語セレクター** - UI 言語の切り替え
- **テーマサポート** - ダーク/ライトモードの切り替え

### イベント処理

コンポーネントはさまざまなイベントを自動的に処理します：

- **ファイルの読み込み** - ローカルファイルの読み込み（ファイルダイアログ経由）、ドラッグ＆ドロップ、URL ベースのファイル読み込みをサポートします
- **エラーメッセージ** - 操作に失敗した場合に、ユーザーフレンドリーなエラーメッセージを表示します
- **フォントの読み込み** - 不足しているフォントを適切な通知で処理します
- **システムメッセージ** - ステータスの更新と操作のフィードバックを表示します

### 応用的な使用方法

次の応用的な使用方法については、[Vue コンポーネントの統合](./) を参照してください。

- DWG 形式の図面を表示するために DWG コンバーターを登録する
- 独自のサーバーからフォントを読み込むためのフォントローダーを定義する
- 図面を作成または変更する

## 利用可能なエクスポート

### メインコンポーネント

- `MlCADViewer` - メインの CAD ビューアコンポーネント

### コマンド

- `AcApLayerStateCmd` - レイヤ状態コマンド
- `AcApLogCmd` - ログコマンド
- `AcApMissedDataCmd` - 欠落データコマンド
- `AcApPointStyleCmd` - 点スタイルコマンド

### コンポーネント

- `MlPointStyleDlg` - 点スタイルダイアログ
- `MlReplacementDlg` - 置換ダイアログ
- 各種レイアウトおよび UI コンポーネント

### コンポーザブル

- `useCommands` - コマンド管理
- `useCurrentPos` - 現在位置の追跡
- `useDark` - ダークモードのサポート
- `useDialogManager` - ダイアログ管理
- `useFileTypes` - ファイルタイプユーティリティ
- `useLayers` - レイヤ管理
- `useLayouts` - レイアウト管理
- `useMissedData` - 欠落データの処理
- `useSettings` - 設定管理
- `useSystemVars` - システム変数

### ロケール

- `i18n` - 国際化インスタンス
- 英語と中国語の言語ファイル

### スタイル

- スタイル設定用の CSS および SCSS ファイル
- ダークモードのサポート
- Element Plus の統合
