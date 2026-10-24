---
title: "アーキテクチャ概要"
---

# アーキテクチャ概要

MLightCAD は完全にブラウザ上で動作し、**バックエンドへの依存はありません**。DWG/DXF ファイルは WebAssembly と JavaScript を使用してローカルで解析・処理されるため、次の特長があります：

- **サーバー不要** - 静的ファイルホスティングだけでどこにでもデプロイできます
- **完全なデータプライバシー** - ファイルがユーザーのデバイスから外に出ることはありません
- **即時統合** - 複雑なバックエンド設定や API 設定は不要です
- **オフライン動作** - インターネット接続なしで動作します

MLightCAD はいくつかのサブパッケージで構成され、それぞれがシステムの特定の側面を担当しています：

- **cad-viewer**：メインの Vue 3 コンポーネントとフロントエンドアプリケーション。UI コンポーネント、ダイアログ、ツールバー、状態管理、レンダリングエンジンとの統合を含みます。
- **cad-simple-viewer**：ドキュメント管理、コマンド処理、UI とレンダリングエンジン間の統合を担うコアロジック。フレームワーク非依存で、UI を持ちません（キャンバスのみ）。
- **svg-renderer**：DWG/DXF エンティティを SVG グラフィックスとしてレンダリングし、エクスポートやスケーラブルな 2D 出力に使用します。
- **three-renderer**：THREE.js を使用して DWG/DXF エンティティをインタラクティブな 2D/3D グラフィックスとしてレンダリングし、高度な可視化とカスタムシェーダーを提供します。

## アーキテクチャ概要

**MLightCAD** は、高性能なブラウザ専用の DWG/DXF ビューアであり、複数の CAD データ形式の読み込み、解析、レンダリング、操作をサポートするために、モジュール化された拡張可能なアーキテクチャを採用しています。システムは次のコアレイヤに分かれています：

![Architecture Overview](https://github.com/mlightcad/cad-viewer/blob/main/assets/arch-en.jpg?raw=true)

この階層アーキテクチャにより、**MLightCAD** はさまざまなデータ規模、レンダリング要件、デプロイ環境に対応する際に、高性能、低レイテンシ、高い拡張性を維持できます。

### **モデルレイヤ**

- [`realdwg-web`](https://github.com/mlightcad/realdwg-web) の [`@mlightcad/data-model`](https://github.com/mlightcad/realdwg-web) モジュールを通じて、解析済み CAD データ（幾何エンティティ、レイヤ情報、ビューパラメータなど）を記述する統一的な**データモデル**を定義します。
- [`AcDbDatabaseConverter`](https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/database/AcDbDatabaseConverter.ts) を通じて統一的な CAD ファイル変換インターフェースを実装し、さまざまなコンバーターが CAD データを統一データモデルに変換できるようにします。
- `realdwg-web` の [`@mlightcad/libredwg-converter`](https://github.com/mlightcad/realdwg-web) モジュールを通じて DWG 解析機能を提供し、DWG ファイルを統一データモデルに変換します。
- [`@mlightcad/dxf-json`](https://github.com/mlightcad/dxf-json) モジュールを通じて DXF 解析機能を提供し、DXF ファイルを統一データモデルに変換します。
- `realdwg-web` の [`@mlightcad/geometry-engine`](https://github.com/mlightcad/realdwg-web) モジュールを通じて幾何エンジンを提供し、さまざまな幾何計算（点、線、ポリライン、スプライン、円、円弧、楕円、楕円弧）と数学演算（ベクトル、行列など）をサポートします。

`AcDbDatabaseConverter` インターフェースを定義している理由について簡単に説明します。市場に存在する既存の DXF/DWG 読み書き・変換ツールは、しばしば不完全です。私はいくつかのオープンソースコードを基に `@mlightcad/libredwg-converter` と `@mlightcad/dxf-json` を実装しました。しかし、実際に利用可能な最も優れた DWG/DXF 解析・変換ツールは [ODA](https://www.opendesign.com/products/drawings) です。これを利用するにはライセンスを購入してソースコードへのアクセス権を取得する必要があり、そのソースコードから DXF/DWG を `@mlightcad/data-model` で定義された統一データモデルに変換する WebAssembly モジュールを構築できます。もし誰かが ODA のソースコードを私に共有してくれるなら、それに基づくコンバーターも実装できます。

### **レンダリングレイヤ**

- `realdwg-web` の [`@mlightcad/graphic-interface`](https://github.com/mlightcad/realdwg-web) モジュールを通じて、さまざまな種類の CAD エンティティをレンダリングするための統一レンダリングインターフェースを定義します。
- `cad-viewer` の [`@mlightcad/three-renderer`](https://github.com/mlightcad/cad-viewer) モジュールでレンダリングインターフェースを実装し、Three.js を使用してすべてのエンティティタイプをレンダリングします。
- `cad-viewer` の [`@mlightcad/svg-renderer`](https://github.com/mlightcad/cad-viewer) モジュールでレンダリングインターフェースを実装し、図面を SVG としてレンダリングします。

### **ビューレイヤ**

- `cad-viewer` の [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer) モジュールは、ドキュメント管理、コマンド処理、UI とレンダリングエンジン間の連携など、CAD ファイル閲覧のコアロジックを提供します。UI フレームワークへの依存はなく、キャンバス以外の UI 要素も提供しません。
- [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) モジュールは `@mlightcad/cad-simple-viewer` を基に構築され、メニュー、ツールバー、コマンドライン、ステータスバー、ダークテーマとライトテーマを備えた Vue 3 ベースの UI を提供します。すべてのコア機能を Vue 3 コンポーネントとしてパッケージ化し、簡単に統合できるようにしています。

## レンダリングエンジン

DXF/DWG ファイルのレンダリングには、いくつかの課題があります：

- 大量のエンティティを含む図面の高性能レンダリング。
- AutoCAD のテキストレンダリング効果の再現。
- 線種とハッチングパターンのサポート。

### 高性能レンダリング

大規模な図面を高性能にレンダリングするための鍵は、点、線、面をマージして **Draw Calls** を削減することです。THREE.js は、三角形メッシュをマージするための [BatchedMesh](https://threejs.org/docs/index.html?q=Mesh#api/en/objects/BatchedMesh) クラスを通じて部分的な解決策を提供しています。しかし、点や線のマージはサポートしておらず、面のマージも私たちのニーズを完全には満たしていません。そのため、`BatchedMesh` に着想を得た複数のクラスを実装し、点、線、面をマージしています。[コードはこちら](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/batch)で確認できます。

### テキストレンダリング

AutoCAD は、リッチテキストに [`MText`](https://ezdxf.mozman.at/docs/dxfinternals/entities/mtext.html) 形式を使用し、高速レンダリングのために特別な [SHX](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-DE941DB5-7044-433C-AA68-2A9AE98A5713) フォント（線だけで描画されるストロークベースのフォント）を使用します。主な課題は次のとおりです：

- **MText の解析** – [`@mlightcad/mtext-parser`](https://github.com/mlightcad/mtext-parser) パッケージで実装しています。
- **SHX フォントの解析** – [`@mlightcad/shx-parser`](https://github.com/mlightcad/shx-parser) パッケージで実装しています。
- **MText のレンダリング** – [`@mlightcad/mtext-renderer`](https://github.com/mlightcad/mtext-renderer) パッケージで実装しています。性能向上のため、解析済みのフォントファイルはブラウザの IndexedDB にキャッシュされ、一度ダウンロードして解析すれば、以降のレンダリングが高速になります。

テキストレンダリングをデバッグするために、THREE.js ベースのリッチテキストエディタ [mtext-editor](https://github.com/mlightcad/mtext-editor) を構築しました。現在、THREE.js ベースのリッチテキストエディタは他にオープンソースで存在しないため、これは任意のレンダリングエンジン向けのテキストエディタとして再利用できます。

### 線種とハッチングパターン

AutoCAD はカスタム線種とハッチングパターンをサポートしています。私たちはその一部を実装しました（テキストを含む線種はまだサポートしていません）。すべての線種とハッチング効果は、THREE.js の `ShaderMaterial` で実装しています。[コードはこちら](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/style)で確認できます。
