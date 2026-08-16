# CAD-Viewer（日本語）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

cad-viewer は、`バックエンドサービスに一切依存せず、完全にブラウザ上で動作する世界初の Web ベース DXF/DWG ビューア兼エディタ` です。
DWG/DXF の解析、ジオメトリ処理、レンダリングをすべてブラウザ内で行うことで、cad-viewer は真のサーバーレス CAD 閲覧・編集を実現します。クラウドアプリ、オフライン利用、プライバシーに配慮したワークフローに最適です。

また、他の CAD ビューアではほとんど見られない機能として、**ワンクリックで単一の自己完結型 HTML ファイルへエクスポート** できます。ダウンロードした `.html` には図面スナップショットと軽量なビューアランタイムが埋め込まれており、受信者は **CAD アプリもサーバーもインストールも不要** で、任意のモダンブラウザから開いて、パン、ズーム、レイヤー切り替え、距離測定ができます。多くのデスクトップおよび Web CAD ビューアは自社製品内での閲覧に限られますが、cad-viewer はライブな図面を、メール送信、アーカイブ、静的ファイルホストに置けるポータブルなオフライン成果物に変換します。クライアントへの共有、コンプライアンスアーカイブ、エアギャップ環境に最適です。オフラインビューアは、同じ図面を開く際に従来のデスクトップツールよりはるかに少ないメモリを使用します（下記の[メモリ比較](#自己完結型-html-のメモリ使用量)を参照）。

- [**🌐 ホームページ**](https://mlightcad.com/)
- **🌐 ライブデモ**：[Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API ドキュメント**：[Read the Docs](https://cad-viewer.readthedocs.io/en/latest/)（バージョン管理あり）· [GitHub Pages](https://mlightcad.github.io/cad-viewer/docs/)（最新 / dev）· [MCP サーバー](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### cad-viewer で構築されたアプリ

[Thingraph](https://cad.thingraph.site/) チームは cad-viewer 上に本番向け DWG/DXF ビューアとプラットフォーム連携を構築し、世界中で数万ユーザーにサービスを提供しています：

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — エンジニアリングチームが高速かつサーバーレスで図面にアクセスするためのブラウザベース DWG/DXF ビューア。各プラットフォーム向けインストール：
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — **Open with** から Drive 上の DWG/DXF を開く
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — `.dwg` / `.dxf` 向けカスタム読み取り専用エディタ
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — Open VSX 経由の同一拡張機能
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — ページに DWG/DXF プレビューを埋め込む
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — エクスプローラーでのサムネイルとプレビュー

コミュニティアプリと連携：

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — DWG、DXF、DWF、DWFx、XPS 向け本番向けブラウザ CAD ビューア（[ライブデモ](https://cad-viewer-iys.pages.dev)）
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — ブラウザで DWG/DXF を表示する Nextcloud ネイティブアプリ（[App Store](https://apps.nextcloud.com/apps/cad_viewer)）

コミュニティ Linux デスクトップパッケージ：

- [CAD Viewer AppImage](https://github.com/pass-wind/cad-viewer-appimage) — Linux 向け Electron ベース AppImage（約 114 MB）、Fedora で検証済み
- [cad-viewer (AUR)](https://aur.archlinux.org/packages/cad-viewer) — システム Electron を使用する Arch Linux ソースパッケージ（約 5.4 MB）
- [cad-viewer-bin (AUR)](https://aur.archlinux.org/packages/cad-viewer-bin) — フォント/テンプレート同梱の Arch Linux バイナリパッケージ。完全オフラインでの図面オープンに対応

![CAD-Viewer Quick Demo](./assets/cad-viewer.gif)

## 機能

- **高性能** — 大規模 DWG/DXF ファイルを 60 FPS 以上の滑らかなレンダリングで表示
- **バックエンド不要** — ファイルの解析と処理をすべてブラウザ内で完結
- **データセキュリティの強化** — ファイルがデバイス外に出ないため、完全なプライバシーを確保
- **容易な統合** — サーバー設定やバックエンドインフラが不要
- サードパーティ連携に適したモジュラーアーキテクチャ
- **オフライン HTML へのエクスポート** — 現在の図面を、埋め込みビューア付きの単一自己完結型 `.html` ファイルとしてエクスポート（パン/ズーム、範囲ズーム、レイヤー、距離測定、EN/ZH UI）。任意のブラウザでオフライン起動可能。cad-viewer インスタンスやバックエンドは不要
- オフラインおよびオンライン編集ワークフロー
- 高度な最適化手法を備えた THREE.js 3D レンダリングエンジン
- CMS、Notion、WeChat などのプラットフォームとの連携を見据えた拡張性

## 1 行のコードで DWG/DXF を埋め込む

単一の `<iframe>` で、任意のサイトに DWG/DXF 表示を追加できます。CAD バックエンドは不要で、図面をサードパーティのクラウドにアップロードする必要もありません。ファイルは**あなた自身の URL** から取得され、訪問者のブラウザだけで解析・描画され、レビュー機能（パン、ズーム、計測、注釈）がすぐ使えます。

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1"
  style="width:100%;height:600px;border:0"
  allowfullscreen>
</iframe>
```

解説とライブ体験：[Embed DWG/DXF on Your Website Without Uploading a Single Byte](https://medium.com/@mlightcad/embed-dwg-dxf-on-your-website-without-uploading-a-single-byte-cf5f6ad484c4)。

## はじめに

### 前提条件

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### インストール

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### 開発

```bash
# フル機能ビューア（cad-viewer）を起動
pnpm dev

# またはシンプルビューアを起動
pnpm dev:simple
```

### ビルド

```bash
pnpm build
```

### プレビュー

```bash
# フル機能ビューアをプレビュー
pnpm preview

# シンプルビューアをプレビュー
pnpm preview:simple
```

## 使い方

### デスクトップブラウザ操作
- **選択**：エンティティを左クリック
- **拡大/縮小**：マウスホイールを上下にスクロール
- **パン**：マウス中ボタンを押したままドラッグ
- **消去**：エンティティを選択して `Del` キーを押す

### タブレット/モバイルブラウザ操作
- **選択**：エンティティをタップ
- **ズーム**：2 本指でピンチ
- **パン**：1 本指でドラッグ

## プラグインシステム

CAD-Viewer は [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer) 内のモジュラー **プラグインシステム** を中心に構築されています。プラグインは `AcApPlugin` インターフェースを実装し、`onLoad` / `onUnload` 経由でビューアのライフサイクルにフックします。通常はコマンド登録、UI 追加、エクスポート/インポートパイプラインの接続に使用します。

プラグインは `AcApDocManager.instance.pluginManager`（`loadPlugin`、`registerLazyPlugin`、またはドキュメントマネージャー作成時の `plugins.fromConfig`）から読み込みます。エクスポート向けプラグインは **遅延読み込み** をサポートします。起動時に小さなスタブだけを登録し、ユーザーが関連コマンド（例：`-chtml`、または `cad-viewer` の `chtml` ダイアログでエクスポートを確定したとき）を実行した時点で重いバンドルをダウンロードします。

モノレポには複数のファーストパーティプラグインが同梱されています。各プラグインは 1 つの関心事に集中しており、必要に応じて組み合わせられます。**インストール、登録、API の詳細は各パッケージの README に記載されています** — 下記リンクを参照してください。

### 公式プラグイン

| パッケージ | 役割 | コマンド / 機能 |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | `cad-simple-viewer` 向け **ツールバー・レイヤーマネージャー・レビューパレット UI**（プレーン DOM、Vue/React 非依存） | `layer`、`markuppanel`、デフォルトツールバー（表示、測定、エクスポート、レビュー、テーマ、ロケール） |
| [`@mlightcad/cad-agent-plugin`](packages/cad-agent-plugin) | **自然言語 CAD エージェント**（AI チャットパネル + 図面ツール呼び出し） | `agent` |
| [`@mlightcad/cad-html-plugin`](packages/cad-html-plugin) | 図面を **自己完結型オフライン HTML** へエクスポート | `chtml`（`cad-viewer` のダイアログ）、`-chtml`（コマンドライン） |
| [`@mlightcad/cad-pdf-plugin`](packages/cad-pdf-plugin) | **PDF エクスポートとインポート**（ベクターパイプライン） | `cpdf`、`ipdf` |
| [`@mlightcad/cad-svg-plugin`](packages/cad-svg-plugin) | **SVG エクスポート** と共有ベクターレンダラー（PDF エクスポートでも使用） | `csvg` |

### `@mlightcad/cad-simple-ui-plugin` — シンプルビューア向け UI 層

[`cad-simple-viewer`](packages/cad-simple-viewer) は意図的に **アプリケーション UI を同梱しません** — キャンバスと CAD コアのみです。シンプルビューアを独自 Web アプリに埋め込み、Vue ベースのフル [`cad-viewer`](packages/cad-viewer) シェルを採用せずにすぐ使える UI が必要な場合、**`cad-simple-ui-plugin` が想定される UI 層** です。

提供機能：

- **設定可能なツールバー**（任意の辺に配置、デフォルト CAD コマンド、ネストメニュー、カスタム項目）
- **ドックパネル**：**レイヤーマネージャー**タブ（レイヤー ON/OFF、ACI カラーピッカー、ダブルクリックでレイヤーへズーム）と**レビューパレット**タブ（マークアップ一覧、ステータス、コメント）
- **`COLORTHEME` システム変数とホスト要素上の `--ml-ui-*` CSS トークンとのテーマ同期**
- **`AcApI18n` とのロケール同期**（英語 / 中国語 / チェコ語 / トルコ語）

すべてのウィジェットはフレームワーク非依存（プレーン DOM）です。フル Vue [`cad-viewer`](packages/cad-viewer) アプリは Element Plus UI を内蔵しており、このプラグインは不要です。`cad-simple-viewer` を直接ベースに構築する場合に `cad-simple-ui-plugin` を使用してください。

→ **クイックスタート、ツールバーカスタマイズ、オプション：** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI 図面アシスタント

[`cad-agent-plugin`](packages/cad-agent-plugin) は `cad-simple-viewer` ベースのアプリに **自然言語 CAD エージェント** を追加します。ユーザーは平易な言語で希望を記述し、エージェントが CAD ツールを呼び出して図面を調査し、ジオメトリを作成または変更します。

提供機能：

- **遅延読み込み** `AcApPlugin`（トリガーコマンド：`agent`）により、AI バンドルをクリティカルパスから外す
- Vercel AI SDK（`Experimental_Agent` + `@ai-sdk/vue`）上の **Vue チャットパネル**（`AgentChatPanel`）
- **ブラウザ側 LLM 設定** — OpenAI、Anthropic、OpenAI 互換エンドポイントの API キーはクライアントに保持（`localStorage` に暗号化保存）
- **フェーズ 1 CAD ツール** — `get_drawing_context`；`draw_line`、`draw_circle`、`draw_arc`、`draw_rectangle`、`draw_polyline`、`draw_text`；`set_current_layer`、`create_layer`、`zoom_extents`
- プラグイン i18n 層による **English / Chinese / Turkish / Czech** UI 文字列

フル Vue [`cad-viewer`](packages/cad-viewer) アプリは、パッケージインストール時にエージェントを自動登録します（パレットタブ）。[`cad-simple-viewer-example`](packages/cad-simple-viewer-example) は `cad-simple-ui-plugin` 経由でドックタブに接続します。ホストアプリは `registerLazyAgentPlugin` と `setAgentPaletteOpener` を呼び出し、パネルのマウント位置を決定します。

→ **インストール、登録、ツール一覧：** [packages/cad-agent-plugin/README.md](packages/cad-agent-plugin/README.md)

### エクスポートプラグイン（HTML / PDF / SVG）

これらのプラグインは、同一プラグインマネージャーにエクスポート（および PDF インポート）コマンドを追加します。**遅延読み込み** により初期ページ重量を抑えます。[`cad-simple-viewer-example`](packages/cad-simple-viewer-example) デモは 3 つのエクスポートプラグイン、`cad-simple-ui-plugin`、`cad-agent-plugin` をすべて登録します。フル [`cad-viewer`](packages/cad-viewer) アプリはブートストラップ時にエクスポートプラグインと（インストール時）エージェントプラグインを登録します。

- **HTML** — 共有とアーカイブ向けの単一ファイルオフラインビューア：[packages/cad-html-plugin/README.md](packages/cad-html-plugin/README.md)  
  （同一パイプラインのヘッドレス CLI：[packages/cad-simple-viewer-cli/README.md](packages/cad-simple-viewer-cli/README.md)）
- **PDF** — ベクター PDF エクスポートと PDF から CAD へのインポート：[packages/cad-pdf-plugin/README.md](packages/cad-pdf-plugin/README.md)
- **SVG** — ベクター SVG エクスポート：[packages/cad-svg-plugin/README.md](packages/cad-svg-plugin/README.md)

#### 自己完結型 HTML のメモリ使用量

サンプル図面 [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg) を開いた場合のメモリ消費量の目安：

| ビューア | メモリ消費量 |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| 自己完結型 HTML（測定モード） | 56 MB |
| 自己完結型 HTML（表示モード） | 33 MB |

オフライン HTML ビューアは、表示モードで AutoCAD 2020 より約 **83% 少ない** メモリ、GstarCAD Viewer より約 **77% 少ない** メモリを使用しながら、パン/ズーム、レイヤー切り替え、距離測定（測定モード）をサポートします。

## パフォーマンス

CAD-Viewer は **卓越したパフォーマンス** 向けに設計されており、高フレームレートを維持しながら非常に大きな DXF/DWG ファイルを処理できます。複数の高度なレンダリング技術でパフォーマンスを最適化しています：

- **カスタムシェーダーマテリアル**：GPU 加速シェーダーマテリアルで複雑な線種とハッチ塗りつぶしパターンを効率的にレンダリング
- **ジオメトリバッチング**：同一マテリアルの点、線、面をマージし、ドローコールを大幅に削減
- **インスタンスレンダリング**：インスタンシング技術で反復ジオメトリのレンダリングを最適化
- **バッファジオメトリ最適化**：効率的なメモリ管理とジオメトリマージングで GPU オーバーヘッドを低減
- **マテリアルキャッシュ**：類似エンティティ間でマテリアルを再利用し、状態変更を最小化
- **WebGL 最適化**：モダン WebGL 機能でハードウェア加速レンダリングを活用

これらの最適化により、CAD-Viewer は数千のエンティティを含む複雑な CAD 図面を滑らかにレンダリングし、応答性の高いユーザー操作を維持します。

## 既知の問題

デフォルトのオープンソース DWG パスは [LibreDWG](https://github.com/LibreDWG/libredwg) ベースです。多くの図面で問題なく動作しますが、エンティティのカバレッジは依然として限定的で、WASM バンドルははるかに大きく、起動は遅く、メモリ使用量は高く、非常に大きな DWG ファイルではメモリ不足エラーが発生する可能性があります。商用クローズドソース製品には GPL ライセンスの考慮事項も伴います。

より良い互換性、低いメモリ使用量、大容量ファイル対応、またはより明確な商用ライセンスが必要な場合は、[**プロプライエタリ DWG パーサー**](./PROPRIETARY-PARSER.md) を参照してください。

| 項目 | LibreDWG ベースパーサー | プロプライエタリ DWG パーサー |
|------|------------------------|------------------------|
| サポートエンティティ | 限定的なカバレッジ | より広いカバレッジ |
| バンドルサイズ | ~13 MB | ~437 KB |
| 読み込み速度 | 起動が遅い | 起動がはるかに高速 |
| メモリ使用量 | 高い | 低い |
| 大容量 DWG ファイル | 大容量ファイルで OOM の可能性 | そのような問題なし |
| ライセンス | GPL 伝播リスク | GPL 伝播の問題なし |

## ロードマップ

本プロジェクトの目標は、モジュラーアーキテクチャとフレームワーク非依存の統合を備えた、**ブラウザ上のフル機能 2D AutoCAD ライクシステム**（ビューア + エディタ）を構築することです。

凡例：
- [x] 完了
- [ ] 計画
- [ ] ⏳ 進行中

### コアファイルとデータ層

#### ファイルサポート

* [x] DXF 読み込み
* [x] DWG 読み込み
* [x] 自己完結型オフライン HTML へのエクスポート（埋め込みビューア）
* [x] 大容量ファイルのストリーミング / 増分読み込み
* [ ] ⏳ ファイルバージョン互換性（R12–Latest）

#### データモデル

* [x] 統一エンティティデータモデル
* [x] レイヤーテーブルサポート
* [x] ブロック / 挿入構造
* [ ] ⏳ Handle と object ID 管理：現在 objectId は handle と同一で、bigint（int64）ではなく 1 つの文字列として表現されている
* [ ] ⏳ XData / 拡張辞書サポート
* [ ] プロキシエンティティ処理

### レンダリングとパフォーマンス

#### レンダリングエンジン

* [x] WebGL ベースレンダリング（Three.js）
* [x] 2D 専用最適化パイプライン
* [x] レイヤーベースのシーン構成
* [x] レイアウト / ペーパースペースレンダリング
* [ ] ビューポートエンティティサポート

#### パフォーマンス最適化

* [x] ジオメトリマージとバッチング
* [x] 空間インデックス（基本）
* [x] 高度な空間インデックス（R-tree / BVH）
* [ ] レベルオブディテール（LOD）レンダリング
* [ ] 超大規模図面向けマルチキャンバス / タイルレンダリング

### 表示とナビゲーション

#### ビュー制御

* [x] パン
* [x] ズーム（ホイール / ボックスズーム）
* [x] 全体表示 / 範囲フィット
* [ ] 名前付きビュー
* [ ] ビュー履歴（ビュー変更の元に戻す / やり直し）

#### 表示制御

* [x] レイヤー表示 ON/OFF
* [x] レイヤーフリーズ / ロック
* [x] 線幅表示
* [ ] 線種スケーリング
* [x] 背景 / テーマ切り替え

### 選択と操作

#### 選択

* [x] 単一エンティティ選択
* [x] 選択エンティティのハイライト
* [x] ウィンドウ選択
* [x] クロシング選択
* [x] 選択フィルター（タイプ / レイヤー別）
* [x] 選択サイクリング

#### スナップ（OSNAP）

* [x] 端点
* [x] 中点
* [x] 中心
* [ ] 交点
* [ ] 垂線 / 接線
* [x] 最近点
* [ ] スナップトラッキング


### 編集と変更

#### 基本編集

* [x] エンティティ編集フレームワーク
* [x] 移動
* [x] コピー
* [x] 回転
* [ ] スケール
* [x] 削除
* [x] 元に戻す / やり直し

#### ジオメトリ編集

* [x] グリップポイント
* [ ] ストレッチ
* [ ] トリム
* [ ] 延長
* [x] オフセット
* [ ] 分解
* [ ] 結合 / フィレット / 面取り（2D）

### 作図と作成ツール

#### 基本エンティティ

* [x] 線分
* [x] ポリライン
* [x] スプライン
* [x] 円
* [x] 円弧
* [x] 楕円
* [x] 矩形 / 多角形

#### 高度なエンティティ

* [x] ハッチ
* [ ] テキスト（単一行 / 複数行）
* [ ] 寸法（線形、位置合わせ、角度）
* [ ] ブロック作成と挿入

### 測定

* [x] 距離
* [x] 弧長
* [x] 面積
* [x] 角度
* [ ] 座標
* [ ] エンティティ統計（長さ、面積、数）

### 寸法

* [x] 線形寸法
* [ ] 角度寸法
* [ ] 座標

### プロパティと UI パネル

#### プロパティパレット

* [x] 選択エンティティのプロパティ
* [ ] レイヤー、色、線種の編集
* [x] 変更時のライブ更新

#### パネルと UI

* [x] レイヤーマネージャー
* [ ] ブロックマネージャー
* [x] コマンド履歴 / コンソール
* [x] ステータスバー（スナップ、直交、グリッド）

#### コマンドシステム

* [x] コマンドレジストリ
* [x] コマンドエイリアス
* [x] コマンドプロンプト（AutoCAD スタイル）

### 統合と拡張性

#### フレームワーク統合

* [x] フレームワーク非依存コア
* [ ] React 統合サンプル
* [x] Vue 統合サンプル
* [ ] OpenLayers / マップ統合
* [ ] CMS / Notion 埋め込み

#### プラグインシステム

* [x] プラグイン API
* [ ] カスタムエンティティサポート
* [x] カスタムコマンド

### オフラインとオンライン編集

#### オフラインエディタ

* [x] ブラウザ内ローカル編集
* [x] DXF として保存
* [ ] 変更セット / diff の保存
* [ ] IndexedDB 永続化

#### オンラインエディタ

* [ ] バックエンド API 設計
* [ ] ユーザー認証
* [ ] ファイルバージョン管理
* [ ] マルチユーザーアクセス制御
* [ ] リアルタイムコラボレーション（将来）

### プラットフォーム目標

* [ ] ⏳ Google Drive 連携
* [ ] WeChat Mini Program ビューア
* [ ] モバイルブラウザサポート（読み取り専用）

### ドキュメントとコミュニティ

* [x] アーキテクチャドキュメント
* [x] API リファレンス
* [ ] コントリビューションガイド
* [x] サンプルプロジェクト
* [x] ロードマップとチェンジログのメンテナンス

このロードマップは意図的に細分化されており、コントリビューターが **存在する機能**、**不足している機能**、**支援が必要な領域** を明確に把握できるようにしています。

## コントリビューション

コントリビューションを歓迎します！バグ修正、新機能、提案については issue または pull request を開いてください。バグ報告では、問題のある図面へのリンクを提供いただくと、再現と修正に役立ちます。

## ライセンス

cad-viewer モノレポは主に [MIT](LICENSE) ライセンスです。

DXF 読み込みは `@mlightcad/data-model` 内の組み込み MIT パーサーを使用します。`@mlightcad/cad-simple-viewer` の **デフォルト DWG 読み込みパス** は GPL-3.0 パッケージ（`libredwg-web` / `@mlightcad/libredwg-converter`）に依存します。クローズドソース製品を提供し、GPL コードを顧客に配布できない場合は、代わりに [**プロプライエタリ DWG パーサー**](./PROPRIETARY-PARSER.md) を使用してください — このコンバーターを置き換え、スタックの残りを MIT のみに保てます。

→ **商用パーサー：** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md)（スコープ、ライセンス、価格、統合、GPL コンプライアンス、サポート）
