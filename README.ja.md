# MLightCAD（日本語）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

MLightCAD は、`バックエンドサービスに一切依存せず、完全にブラウザ上で動作する世界初の Web ベース DXF/DWG 閲覧・比較・編集プラットフォーム` です。
DWG/DXF の解析、ジオメトリ処理、レンダリングをすべてブラウザ内で行うことで、MLightCAD は真のサーバーレス CAD 閲覧・編集を実現します。クラウドアプリ、オフライン利用、プライバシーに配慮したワークフローに最適です。

MLightCAD は単なる CAD ビューアではなく、**ブラウザネイティブな CAD 基盤**です。同じエンジン上で 3 つの製品形態をそのまま利用できます：

| サブプロジェクト | 役割 | パッケージ |
| --- | --- | --- |
| **CAD Viewer** | 閲覧とレビュー：DWG/DXF を開いてパン・ズーム、測定、注釈を実行。自社製品に組み込む SDK としても利用可能 | [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer) |
| **CAD Diff Viewer** | 図面リビジョンの比較：左右並列または重ね合わせで表示し、灰色＝未変更、赤＝削除、緑＝追加。変更セットからリビジョンクラウドも生成 | [`@mlightcad/cad-diff-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-diff-viewer) |
| **CAD Editor** | 編集と作図：AutoCAD 風のメニュー、リボン、コマンドライン、ステータスバーを備え、図面を開いてそのままジオメトリを編集 | [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) |

3 つは同じエンティティモデル、レンダリングエンジン、プラグインバスを共有します。UI、エクスポート、AI などの機能は必要に応じて読み込まれ、重複実装されません。閲覧・比較・編集は同じ CAD カーネルの異なる製品形態であり、無関係なツールではありません。

さらに MLightCAD は、他の CAD ソフトウェアではほとんど見られない機能として、**ワンクリックで単一の自己完結型 HTML ファイルへエクスポート** できます。ダウンロードした `.html` には図面スナップショットと軽量なビューアランタイムが埋め込まれており、受信者は **CAD アプリもサーバーもインストールも不要** で、任意のモダンブラウザから開いて、パン、ズーム、レイヤー切り替え、距離測定ができます。多くのデスクトップおよび Web CAD ツールは自社製品内での閲覧に限られますが、MLightCAD はライブな図面を、メール送信、アーカイブ、静的ファイルホストに置けるポータブルなオフライン成果物に変換します。クライアントへの共有、コンプライアンスアーカイブ、エアギャップ環境に最適です。オフラインビューアは、同じ図面を開く際に従来のデスクトップツールよりはるかに少ないメモリを使用します（下記の[メモリ比較](#自己完結型-html-のメモリ使用量)を参照）。

MLightCAD は **サーバーサイドのプリレンダリング** にも対応しています。図面はサーバー上で一度だけ解析・処理され、クライアントはプリレンダリング済みの結果をそのまま表示するだけで、DWG/DXF の再解析やジオメトリの再構築は不要です。これによりクライアント側のメモリ使用量を大幅に抑えられ、同じ図面を2回目以降に開く際の速度も大きく向上するため、モバイル端末での閲覧に特に適しています。

- [**🌐 ホームページ**](https://mlightcad.com/)
- **🌐 ライブデモ**：[Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API ドキュメント**：[Read the Docs](https://cad-viewer.readthedocs.io/en/latest/)（バージョン管理あり）· [MCP サーバー](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### MLightCAD で構築されたアプリ

[Thingraph](https://cad.thingraph.site/) チームは MLightCAD 上に本番向け DWG/DXF ビューアとプラットフォーム連携を構築し、世界中で数万ユーザーにサービスを提供しています：

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — エンジニアリングチームが高速かつサーバーレスで図面にアクセスするためのブラウザベース DWG/DXF ビューア。各プラットフォーム向けインストール：
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — **Open with** から Drive 上の DWG/DXF を開く
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — `.dwg` / `.dxf` 向けカスタム読み取り専用エディタ
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — Open VSX 経由の同一拡張機能
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — ページに DWG/DXF プレビューを埋め込む
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — エクスプローラーでのサムネイルとプレビュー

コミュニティアプリと連携：

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — DWG、DXF、DWF、DWFx、XPS 向け本番向けブラウザ CAD ビューア（[ライブデモ](https://cad-viewer-iys.pages.dev)）
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — ブラウザで DWG/DXF を表示する Nextcloud ネイティブアプリ（[App Store](https://apps.nextcloud.com/apps/cad_viewer)）

公式デスクトップアプリ：

- [MLightCAD Studio](https://github.com/mlightcad/mlightcad-studio) — MLightCAD の公式デスクトップ版。[`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) を [Tauri 2](https://v2.tauri.app/) シェルで包み、完全オフラインで動作します。Windows（NSIS / MSI）、Linux（AppImage / deb）、macOS（Universal DMG、Apple Silicon + Intel）のインストーラーを提供——[ダウンロード](https://github.com/mlightcad/mlightcad-studio/releases/)。

### デモアプリ（Demo Apps）

MLightCAD を自社プロダクトへ組み込む方法を示す公式サンプルです：

- [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) — [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer) 向けの最小構成 vanilla TypeScript ホスト。ローカルまたは CDN の DXF/DWG を開き、小型ツールバーでコマンドを実行し、フル Vue UI なしで HTML/PDF/SVG エクスポートプラグインを遅延読み込みします。
- [cad-editor-demo](https://github.com/mlightcad/cad-viewer-example) — [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) ベースのフル機能 Vue 3 アプリ。メニュー、リボン、ダイアログ、コマンドライン、ステータスバー付き（[ライブデモ](https://mlightcad.github.io/cad-viewer-example/)）。
- [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) — Next.js の「CAD ドライブ」デモ。DWG/DXF のチャンク再開アップロード、SQLite のファイル一覧とプレビュー、**ブラウザ側ライブ解析**（`cad-simple-viewer`）または**サーバー側 ACEX プリレンダ**（高速表示・低メモリ）での図面オープンに対応。

![MLightCAD Quick Demo](./assets/cad-viewer.gif)

## 機能

- **高性能** — 大規模 DWG/DXF ファイルを 60 FPS 以上の滑らかなレンダリングで表示
- **バックエンド不要** — ファイルの解析と処理をすべてブラウザ内で完結
- **データセキュリティの強化** — ファイルがデバイス外に出ないため、完全なプライバシーを確保
- **容易な統合** — サーバー設定やバックエンドインフラが不要
- サードパーティ連携に適したモジュラーアーキテクチャ
- **プラグインシステム** — 拡張可能なプラグインアーキテクチャ。UI、AI アシスタント、HTML/PDF/SVG エクスポートの公式プラグインを提供。詳細は[プラグインシステム開発ガイド](https://mlightcad.com/cad-viewer/docs/ja/development/plugin-system.html)
- **モバイルレイアウトとタッチ操作** — `@mlightcad/cad-simple-viewer` にレスポンシブなスマホ/タブレット UI とタッチジェスチャ（ピンチズーム、単指パン、タップ選択）を内蔵。専用モバイルアプリなしでモバイルブラウザから利用可能
- **オフライン HTML へのエクスポート** — 現在の図面を、埋め込みビューア付きの単一自己完結型 `.html` ファイルとしてエクスポート（パン/ズーム、範囲ズーム、レイヤー、距離測定、EN/ZH UI）。任意のブラウザでオフライン起動可能。MLightCAD インスタンスやバックエンドは不要
- オフラインおよびオンライン編集ワークフロー
- 高度な最適化手法を備えた THREE.js 3D レンダリングエンジン
- CMS、Notion、WeChat などのプラットフォームとの連携を見据えた拡張性

- **明確なレイヤードアーキテクチャ** — モデル → レンダリング → ビュー → UI / プラグインの階層構造で、下位パッケージが上位パッケージに依存せず、独立してデプロイできるヘッドレスエクスポーターと CLI も提供します。詳細は[アーキテクチャ概要](https://mlightcad.com/cad-viewer/docs/ja/development/architecture-overview.html)

## AI 機能

MLightCAD には、AI 向けに設計された CAD 機能が組み込まれています。スクリプトとツール呼び出しはすべてローカルで実行され、図面データが端末の外に出ることはありません。

### CAD スクリプト
- サンドボックス化された JavaScript スクリプトランタイムを内蔵。統一された `cad.*` ホスト API を介して、エンティティの検索、作図、編集、計測、エクスポートを行えます
- 1 つのスクリプトでフィルタリング、計測、編集、自己検証を一度の呼び出しで完結でき、ツールの往復やトークン消費を抑えます
- 実行前に AST 検証を行い、`import`、`eval`、ネットワーク・ページアクセスを禁止。ステップ数・タイムアウトの予算とスナップショット数の上限を設けています
- スクリプトコンソールからモデルを介さずに手書きのスクリプトを直接実行でき、DXF / PDF / HTML などの形式でエクスポート可能です

### AI エージェント
- 自然言語の対話パネルを提供。要件を記述すると、モデルが `cad.*` スクリプトを作成・実行して作図、検索、編集を行います
- Vercel AI SDK をベースにしており、モデルと API Key は統一された AI モデル設定で構成します
- Simple / High の 2 つの推論モードを提供。High モードでは複雑なタスクの後にスクリーンショットを撮り、視覚的な検証を行います

### MCP
- `@mlightcad/cad-mcp-server` により、同じスクリプトツールカタログを stdio MCP として外部の AI クライアント（Claude Desktop、Cursor など）に公開します
- 外部アシスタントが図面を開き、エンティティを検索し、スクリプトを実行して結果を保存できます。能力は内蔵エージェントと同じです

### スマートブロック
- 選択したオブジェクトのすべての同一コピーを自動的に検索し、ブロック参照に変換します
- 図面全体から重複オブジェクトを検索し、一括でブロックに変換できます
- 文字だけが異なるコピー（部屋番号など）はブロック属性に自動変換でき、最小効果のしきい値も設定可能です

### PDF 図面復元
- PDF ページからベクタージオメトリをインポートし、実際の CAD エンティティを再構築します——円/円弧/楕円/スプライン、バルジ付きポリライン、線幅と破線線種、文字スタイル、ソリッド/ハッチ塗りつぶし、画像。繰り返し描画される Form XObject は自動的にブロック参照に復元されます
- 既知の距離を使って、インポートした図形の縮尺を校正できます
- 線に分解された文字を CAD テキストエンティティとして認識して復元します。まず内蔵の字形辞書でローカル認識を行い、残りを OCR / ビジョンモデルで一括認識します
- 矢印、寸法線、文字から線形、半径、直径、角度の寸法を復元し、確認パネルで数値を確認したり寸法スタイルを選択・新規作成したりできます

## 1 行のコードで DWG/DXF を埋め込む

単一の `<iframe>` で、任意のサイトに DWG/DXF 表示を追加できます。CAD バックエンドは不要で、図面をサードパーティのクラウドにアップロードする必要もありません。ファイルは**あなた自身の URL** から取得され、訪問者のブラウザだけで解析・描画され、レビュー機能（パン、ズーム、計測、注釈）がすぐ使えます。

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1
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

# または図面比較ビューア（cad-diff-viewer）を起動
pnpm dev:diff
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

MLightCAD を初めてお使いですか？**[ユーザーガイド](https://mlightcad.com/cad-viewer/docs/)** では、ビューアの画面構成、デスクトップ/タッチ操作、マークアップ、計測ツールについて順を追って説明しています。

### デスクトップブラウザ操作
- **選択**：エンティティを左クリック
- **拡大/縮小**：マウスホイールを上下にスクロール
- **パン**：マウス中ボタンを押したままドラッグ
- **消去**：エンティティを選択して `Del` キーを押す

### タブレット/モバイルブラウザ操作
- **選択**：エンティティをタップ
- **ズーム**：2 本指でピンチ
- **パン**：1 本指でドラッグ

## パフォーマンス

MLightCAD は **卓越したパフォーマンス** 向けに設計されており、高フレームレートを維持しながら非常に大きな DXF/DWG ファイルを処理できます。複数の高度なレンダリング技術でパフォーマンスを最適化しています：

- **カスタムシェーダーマテリアル**：GPU 加速シェーダーマテリアルで複雑な線種とハッチ塗りつぶしパターンを効率的にレンダリング
- **ジオメトリバッチング**：同一マテリアルの点、線、面をマージし、ドローコールを大幅に削減
- **インスタンスレンダリング**：インスタンシング技術で反復ジオメトリのレンダリングを最適化
- **バッファジオメトリ最適化**：効率的なメモリ管理とジオメトリマージングで GPU オーバーヘッドを低減
- **マテリアルキャッシュ**：類似エンティティ間でマテリアルを再利用し、状態変更を最小化
- **WebGL 最適化**：モダン WebGL 機能でハードウェア加速レンダリングを活用

これらの最適化により、MLightCAD は数千のエンティティを含む複雑な CAD 図面を滑らかにレンダリングし、応答性の高いユーザー操作を維持します。

#### 自己完結型 HTML のメモリ使用量

サンプル図面 [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg) を開いた場合のメモリ消費量の目安：

| ビューア | メモリ消費量 |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| 自己完結型 HTML（測定モード） | 56 MB |
| 自己完結型 HTML（表示モード） | 33 MB |

オフライン HTML ビューアは、表示モードで AutoCAD 2020 より約 **83% 少ない** メモリ、GstarCAD Viewer より約 **77% 少ない** メモリを使用しながら、パン/ズーム、レイヤー切り替え、距離測定（測定モード）をサポートします。

## 既知の問題

デフォルトのオープンソース DWG パスは、オプションの `@mlightcad/libredwg-converter` パッケージ経由で [LibreDWG](https://github.com/LibreDWG/libredwg) を使用します。多くの図面で問題なく動作しますが、エンティティのカバレッジは依然として限定的で、WASM バンドルははるかに大きく、起動は遅く、メモリ使用量は高く、非常に大きな DWG ファイルではメモリ不足エラーが発生する可能性があります。商用クローズドソース製品には GPL ライセンスの考慮事項も伴います。`@mlightcad/cad-simple-viewer` はデフォルトではそのコンバーターに **依存せず、登録もしません** — ホストアプリ（各 example パッケージを参照）が明示的にオプトインします。

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

MLightCAD の目標は、ブラウザ上で動作するフル機能・モジュール式・フレームワーク非依存の 2D CAD システムです——閲覧・比較・編集が同じカーネル上で動きます。

ロードマップは Wiki で管理しています。開発中のプラットフォーム機能（LOD レンダリング、名前付きビュー、カスタムエンティティなど）と、推進中の AI 分野（図面理解、自動レビュー、スキャン図面認識、検証可能な自然言語編集など）をまとめています：

→ **[ロードマップ（Wiki）](https://github.com/mlightcad/cad-viewer/wiki/Roadmap)**

## コントリビューション

コントリビューションを歓迎します！バグ修正、新機能、提案については issue または pull request を開いてください。バグ報告では、問題のある図面へのリンクを提供いただくと、再現と修正に役立ちます。

## ライセンス

MLightCAD モノレポは主に [MIT](LICENSE) ライセンスです。

DXF 読み込みは `@mlightcad/data-model` 内の組み込み MIT パーサーを使用します。DWG 読み込みは **オプトイン** です：`@mlightcad/cad-simple-viewer` は GPL の LibreDWG パッケージに依存しません。オープンソースの DWG サポートが必要なホストは、自身で `@mlightcad/libredwg-converter`（GPL-3.0）を追加し、worker と wasm を配置してコンバーターを登録します。クローズドソース製品を提供し、GPL コードを顧客に配布できない場合は、代わりに [**プロプライエタリ DWG パーサー**](./PROPRIETARY-PARSER.md) を使用してください。

→ **商用パーサー：** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md)（スコープ、ライセンス、価格、統合、GPL コンプライアンス、サポート）
