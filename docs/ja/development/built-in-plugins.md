---
title: "組み込みプラグイン"
---

# 組み込みプラグイン

MLightCAD には、ファーストパーティのプラグインが同梱されています。各プラグインは、UI、AI アシスタント、エクスポート/インポートパイプライン、クラウドデータソースといった 1 つの関心事に焦点を当てており、必要に応じて組み合わせて使用できます。

プラグインの仕組み自体（`AcApPlugin`、プラグインマネージャー、遅延ロード、独自のプラグインの作成方法）については、[プラグインシステム](./plugin-system)を参照してください。インストール、登録、完全な API の詳細は、各パッケージの README に記載されています。以下のリンクを参照してください。

## プラグインの一覧

| パッケージ | 役割 | コマンド / 機能 |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin) | `cad-simple-viewer` 用の**ツールバー、レイヤマネージャー、レビューパレット UI**（プレーンな DOM、Vue/React なし） | `layer`、`markuppanel`、デフォルトツールバー（ビュー、計測、エクスポート、レビュー、テーマ、ロケール） |
| [`@mlightcad/cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) | **自然言語 CAD エージェント**（AI チャットパネル + 図面ツールの呼び出し） | `agent` |
| [`@mlightcad/cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) | **手動 CAD スクリプトコンソール**（チェック済みスクリプトを図面に対して実行、LLM / API キー不要） | `cadscript` |
| [`@mlightcad/cad-html-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin) | 図面を**自己完結型のオフライン HTML** にエクスポート | `chtml`（`cad-viewer` 内のダイアログ）、`-chtml`（コマンドライン） |
| [`@mlightcad/cad-pdf-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin) | **PDF エクスポートとインポート**（ベクターパイプライン） | `cpdf`、`ipdf` |
| [`@mlightcad/cad-svg-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin) | **SVG エクスポート**と共有ベクターレンダラー（PDF エクスポートでも使用） | `csvg` |
| [`@mlightcad/cad-onedrive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin) | **OneDrive データソース** — OneDrive / SharePoint から DWG/DXF を開く | `AcApDataSource` を登録（`onedrive`）、「サインイン → 開く」の 2 ステップ（ポップアップブロッカーセーフ） |
| [`@mlightcad/cad-google-drive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin) | **Google Drive データソース** — Google Drive から DWG/DXF を開く | `AcApDataSource` を登録（`googledrive`）、「サインイン → 開く」の 2 ステップ（ポップアップブロッカーセーフ） |

コマンドでトリガーされるすべてのプラグインは**遅延ロード**されます。最初に小さな登録スタブが登録され、重いバンドルはユーザーがトリガーコマンドを実行したときにのみダウンロードされます。登録 API については、[プラグインシステム — プラグインの登録](./plugin-system#プラグインの登録)を参照してください。

---

## UI プラグイン

### `@mlightcad/cad-simple-ui-plugin` — シンプルビューアの UI

[`cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer) は意図的に**アプリケーション UI を含まず**、キャンバスと CAD コアのみを提供します。シンプルビューアを独自の Web アプリに埋め込み、Vue ベースの完全な [`cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-editor) シェルを採用せずにすぐに使える UI を求める場合は、**`cad-simple-ui-plugin` が目的の UI レイヤーです**。

提供されるもの:

- **設定可能なツールバー**（任意の端への配置、デフォルトの CAD コマンド、ネストされたメニュー、カスタム項目）
- **ドックパネル**。**レイヤマネージャー**タブ（レイヤのオン/オフ、ACI カラーピッカー、ダブルクリックでレイヤにズーム）と**レビューパレット**タブ（マークアップ一覧、ステータス、コメント）
- ホスト要素上の `COLORTHEME` システム変数と `--ml-ui-*` CSS トークンとの**テーマ同期**
- `AcApI18n` との**ロケール同期**（英語 / 中国語 / チェコ語 / トルコ語）

すべてのウィジェットはフレームワークに依存しません（プレーンな DOM）。完全な Vue アプリである `cad-viewer` には独自の Element Plus UI があるため、このプラグインは不要です。`cad-simple-viewer` を直接使用して構築する場合に `cad-simple-ui-plugin` を使用してください。

→ **クイックスタート、ツールバーのカスタマイズ、オプション:** [packages/cad-simple-ui-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI 図面アシスタント

[`cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) は、`cad-simple-viewer` ベースのアプリに**自然言語 CAD エージェント**を追加します。ユーザーは平易な言葉で希望を記述し、エージェントは CAD ツールを呼び出して図面を調査し、ジオメトリを作成または変更します。

提供されるもの:

- **遅延ロードされる** `AcApPlugin`（トリガーコマンド: `agent`）。AI バンドルがクリティカルパスに載りません
- Vercel AI SDK（`Experimental_Agent` + `@ai-sdk/vue`）上に構築された **Vue チャットパネル**（`AgentChatPanel`）
- **ブラウザー側での LLM 設定** — OpenAI、Anthropic、または OpenAI 互換エンドポイントの API キーはクライアントに保持されます（`localStorage` 内で暗号化）
- **フェーズ 1 の CAD ツール** — `get_drawing_context`；`draw_line`、`draw_circle`、`draw_arc`、`draw_rectangle`、`draw_polyline`、`draw_text`；`set_current_layer`、`create_layer`、`zoom_extents`
- プラグイン i18n レイヤーによる**英語 / 中国語 / トルコ語 / チェコ語**の UI 文字列

完全な Vue アプリである `cad-viewer` は、パッケージがインストールされるとエージェントを自動的に登録します（パレットタブ）。`cad-simple-viewer-demo` は `cad-simple-ui-plugin` を介してドックタブに組み込みます。ホストアプリは `registerLazyAgentPlugin` と `setAgentPaletteOpener` を呼び出して、パネルを任意の場所にマウントします。

→ **インストール、登録、ツール一覧:** [packages/cad-agent-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin/README.md)

### `@mlightcad/cad-script-plugin` — CAD スクリプトコンソール

[`cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) は、`cad-simple-viewer` ベースのアプリに**手動 CAD スクリプトコンソール**を追加します。エージェントプラグインとは異なり、モデルと通信する**こと**はなく、API キーも**不要**です。コンソールは `@mlightcad/cad-agent-core` のチェック済みスクリプトホストを実行し、各スクリプトは引数を 1 つだけ持つ関数本体（`cad`）で、エージェントが使用するのと同じ図面ツールにプログラムからアクセスできます。

- 遅延ロードされる `AcApPlugin`（トリガーコマンド: `cadscript`）
- `@mlightcad/cad-agent-core` の CAD ツールを再利用します。このパッケージはパネルとコマンドのみを追加します
- ホストアプリは `registerLazyCadScriptPlugin` を呼び出し、`new CadScriptPanel().element` をマウントします（`cad-simple-viewer-demo` ではドックタブ、`cad-viewer` ではツールパレットタブ）。タブを削除するときは `destroy()` を呼び出します

→ **使用方法:** [packages/cad-script-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin/README.md)

---

## エクスポート / インポートプラグイン（HTML / PDF / SVG）

これらのプラグインは、同じプラグインマネージャーにエクスポート（および PDF インポート）コマンドを追加します。初期ページのサイズを小さく保つため、**遅延ロード**されます。`cad-simple-viewer-demo` デモは、3 つのエクスポートプラグインすべてに加えて UI/エージェント/スクリプトプラグインを登録します。完全な `cad-viewer` アプリは、ブートストラップでエクスポートプラグインと、エージェント/スクリプトプラグイン（インストールされている場合）を登録します。

### HTML（`@mlightcad/cad-html-plugin`）

共有とアーカイブのための 1 ファイルの**オフラインビューア** — エクスポートされた HTML には図面データとランタイムビューアが埋め込まれ、サーバーは不要です。

| 項目 | 値 |
|------|-------|
| コマンド | `chtml`（`cad-viewer` 内のダイアログ）、`-chtml`（`cad-simple-viewer-cli` 経由のコマンドライン） |
| 追加設定 | `AcApDocManager.createInstance()` の `htmlViewerRuntimeUrl` — `viewer-runtime.iife.js` への URL（パッケージの `dist/` からコピー） |
| パブリック API | `registerLazyHtmlPlugin`、`createHtmlPlugin`、`AcApHtmlConvertor`、`packHtml`、スナップショット型 |

→ **ビルド出力と統合:** [packages/cad-html-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin/README.md)
→ **同じパイプラインを使用するヘッドレス CLI:** [packages/cad-simple-viewer-cli/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer-cli/README.md)

### PDF（`@mlightcad/cad-pdf-plugin`）

**ベクター PDF エクスポートと PDF から CAD へのインポート。**

| 項目 | 値 |
|------|-------|
| コマンド | `cpdf`（エクスポート）、`ipdf`（インポート） |
| パブリック API | `registerLazyPdfPlugin`、`createPdfPlugin`、コンバーター |

→ **ビルド出力と統合:** [packages/cad-pdf-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin/README.md)

### SVG（`@mlightcad/cad-svg-plugin`）

**ベクター SVG エクスポート**と、PDF エクスポートで使用される共有ベクターレンダラー。

| 項目 | 値 |
|------|-------|
| コマンド | `csvg` |
| パブリック API | `registerLazySvgPlugin`、`createSvgPlugin`、`AcApSvgConvertor`、SVG レンダラーユーティリティ |

→ **ビルド出力と統合:** [packages/cad-svg-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin/README.md)

---

## データソースプラグイン（OneDrive / Google Drive）

これらのプラグインはコマンドを登録する代わりに、[`AcApDataSource`](./data-source-plugin) を登録します。これにより、ユーザーはクラウドストレージから直接 DWG/DXF 図面を開くことができます。どちらも、ポップアップブロッカーを回避できるように設計された「**サインイン → 開く**」の 2 ステップフローを使用します。

### `@mlightcad/cad-onedrive-plugin`

Microsoft File Picker v8 + MSAL 上に構築された **OneDrive / SharePoint データソース**。Azure アプリの登録（SPA、委任された `User.Read` + `Files.Read.All` アクセス許可）が必要です。

```typescript
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-azure-app-client-id'
})
```

→ **Azure アプリのセットアップと完全な統合:** [packages/cad-onedrive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin/README.md) および [データソースプラグイン](./data-source-plugin)

### `@mlightcad/cad-google-drive-plugin`

同じ `AcApDataSource` 契約を持つ **Google Drive データソース**。

```typescript
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-google-oauth-client-id'
})
```

→ **Google Cloud のセットアップと完全な統合:** [packages/cad-google-drive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin/README.md)

---

## 各アプリが登録するプラグイン

| アプリ | 登録されるプラグイン |
|-----|--------------------|
| `cad-simple-viewer` | なし — コアのみ、プラグインは任意 |
| `cad-simple-viewer-demo` | エクスポートプラグイン（HTML/PDF/SVG）、`cad-simple-ui-plugin`、`cad-agent-plugin`、`cad-script-plugin` |
| `cad-viewer`（Vue） | エクスポートプラグイン（HTML/PDF/SVG）。エージェントおよびスクリプトプラグインは、**インストールされている場合**（オプションのピア依存関係）に自動的に登録されます |

---

## 関連ドキュメント

- [プラグインシステム](./plugin-system) — `AcApPlugin` インターフェース、プラグインマネージャー、遅延ロード、独自のプラグインの作成
- [データソースプラグイン](./data-source-plugin) — OneDrive / Google Drive プラグインが使用する `AcApDataSource` の仕組み
- [コマンド](./command) — コマンドのライフサイクルと `AcEdCommand`
