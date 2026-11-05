---
title: "ファイルを開くパネル（ランディング UI）"
---

# ファイルを開くパネル（ランディング UI）

このページでは、**ランディングページ用ファイルピッカー**を構築し、**`/file-open-panel`** サブパス経由で **`@mlightcad/cad-simple-viewer`** をクリティカルパスから外す方法を説明します。

**DocManager ホストでは [`acuiCreateFileOpenSession`](#quick-start-recommended) を優先**してください — ランディング UI のマウント、ビューアの遅延作成、クラウドソースの attach、図面のオープンを担います。オープンを自前で制御する場合（例: Vue `MlCadViewer` props）は [`AcUiFileOpenLanding`](#acuifileopenlanding-custom-open) を使います。カスタムメニュー配線が必要な場合のみ低レベルの [`AcUiFileOpenPanel`](#low-level-acuifileopenpanel) を使います。

クラウド起点（OneDrive、Google Drive、カスタムソース）の実装は[データソースプラグイン](./data-source-plugin)を参照してください。

---

## なぜ別エントリか？

**メイン** `@mlightcad/cad-simple-viewer` からファイルオープン UI を import すると、ホーム / アップロード画面の初回描画に `AcApDocManager`、three.js、コマンド / ビュースタックが引き込まれていました。

**1.8.0** からは DocManager 非依存のサブパスを使います:

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

session はユーザーが何かを開いたときだけ `createDocManager` を呼び出します — 通常はメインパッケージの動的 import です。

参考アプリ:

- `packages/cad-simple-viewer-demo` — `acuiCreateFileOpenSession` + 遅延 `AcApDocManager.createInstance`
- `packages/cad-editor-demo` — `AcUiFileOpenLanding` + `defineAsyncComponent(MlCadViewer)`

---

## クイックスタート（推奨） {#quick-start-recommended}

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'

const session = acuiCreateFileOpenSession({
  host: document.getElementById('file-open-host')!,
  theme: 'dark',
  showNewDrawing: true,
  createDocManager: async () => {
    const { AcApDocManager, AcApSettingManager } = await import(
      '@mlightcad/cad-simple-viewer'
    )
    AcApSettingManager.configure({ storageKey: 'my-app.settings' })
    if (!AcApDocManager.tryGetInstance()) {
      AcApDocManager.createInstance({ container: viewerEl /* … */ })
    }
    return AcApDocManager.instance
  },
  getOpenOptions: () => ({ mode: /* … */ })
})

// 任意のクラウドソース（動的 import で SDK を初回描画から外す）:
const oneDriveEnv = /* … */
if (oneDriveEnv) {
  const { AcApOneDriveDataSource } = await import(
    '@mlightcad/cad-onedrive-plugin'
  )
  const source = new AcApOneDriveDataSource(oneDriveEnv, session.manager)
  session.registerSource(source)
  await source.restoreSession()
}
```

各オープン時に session は:

1. `createDocManager` を**一度**呼び出す（以降はキャッシュ）
2. `attachSourcesTo(docManager.dataSourceManager)` で MSAL / GIS クライアントを再利用
3. `openDocument` / `openUrl` / `newDocument` を実行

任意フック: `onBeforeOpen`、`onPrepareOpen`（DocManager 準備後）、`onAfterOpen`。

ランディング画面を破棄するときは `session.dispose()`。プログラムからのオープン: `session.open({ kind: 'file' | 'url' | 'new', … })`。

---

## Session オプション

| オプション | 説明 |
|--------|-------------|
| `host` | パネルルートを受け取る要素 |
| `createDocManager` | DocManager 相当オブジェクトを返す（`dataSourceManager` + オープン API） |
| `getOpenOptions?` | openDocument / openUrl / newDocument に渡す |
| `onBeforeOpen?` / `onPrepareOpen?` / `onAfterOpen?` | ライフサイクルフック |
| `theme?` / `cardSize?` / `showUrl?` / `showNewDrawing?` / `manager?` / … | landing ファサードと同じ chrome オプション |

主な API: `landing`、`manager`、`registerSource()`、`open()`、`ensureDocManager()`、`dispose()`。

---

## `AcUiFileOpenLanding`（カスタムオープン） {#acuifileopenlanding-custom-open}

ホストが自前で図面を開く場合（Vue store + `MlCadViewer`、カスタム進捗 UI など）:

```ts
import {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenRequest
} from '@mlightcad/cad-simple-viewer/file-open-panel'

const landing = new AcUiFileOpenLanding({
  host,
  showNewDrawing: true,
  onOpen: (request: AcUiFileOpenRequest) => {
    void openWithViewer(request) // 自前コード
  }
})

// DocManager / ビューアが存在したあと:
landing.attachSourcesTo(AcApDocManager.instance.dataSourceManager)
// または: acuiAttachDataSources(landing.manager, …)
```

`AcUiFileOpenRequest`: `{ kind: 'file'; file }` | `{ kind: 'url'; url }` | `{ kind: 'new' }`。

---

## パネル UI の役割

session と landing の両方が `AcUiFileOpenPanel` をマウントします:

| 領域 | 動作 |
|------|------|
| カード本体 | ローカルドロップゾーン、URL 行、またはクラウド「ファイルを選択」/ アカウント chrome |
| フッターの chevron | **ローカル**、**URL**、登録済みクラウドソース |
| 任意 | **新規図面** ボタン |

パネルは **決して** `AcApDocManager` に直接触れません。

---

## 遅延読み込みの注意

1. landing / session コードは `@mlightcad/cad-simple-viewer/file-open-panel` のみ import。
2. `createDocManager`（または `onOpen` ハンドラー）がメインパッケージを動的 import。
3. `createInstance` の後にエクスポートプラグイン / OneDrive `/register` を登録。クラウドプラグインは landing レジストリから既に attach された source を再利用可能。

ランディングでエディタをマウントせず Vue i18n が必要なら `@mlightcad/cad-editor/locale` を優先。

---

## 低レベル `AcUiFileOpenPanel` {#low-level-acuifileopenpanel}

カスタム `onDataSourceAction` / `onResult` 配線が必要な高度なホストは `AcUiFileOpenPanel` を直接使えます。新規統合では session または landing ファサードを優先してください。

---

## チェックリスト

- [ ] ランディングはメインパッケージではなく `/file-open-panel` から import
- [ ] DocManager ホストは `acuiCreateFileOpenSession` を優先
- [ ] カスタムオープンホストは `AcUiFileOpenLanding` + `attachSourcesTo`
- [ ] クラウドプラグインパッケージは動的 import
- [ ] サインインとピックは別ユーザー操作のまま

---

## 関連ドキュメント

- [データソースプラグイン](./data-source-plugin) — `AcApDataSource`、メニューヘルパー、クラウドプラグインの作成
- [Simple Viewer の統合](./integrate-simple-cad-viewer) — ランディング後の `AcApDocManager`
- [Vue コンポーネントの統合](./integrate-cad-viewer-component) — `MlCadViewer`
- [組み込みプラグイン](./built-in-plugins) — OneDrive / Google Drive パッケージ
- [ローカライゼーション](./localization) — `main.dataSource.*` 文字列
- [アップグレード](./upgrade-guide) — 1.8.0 の `/file-open-panel` と `/locale` サブパス
