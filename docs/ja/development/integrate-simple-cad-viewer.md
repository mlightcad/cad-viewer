---
title: "Simple CAD Viewer の統合"
---

# Simple CAD Viewer の統合

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

`cad-simple-viewer` は図面を DWG/DXF ファイルに保存する機能をサポートしていませんが、**図面のリアルタイム変更**を包括的にサポートしています。図面内のエンティティを追加、編集、削除でき、ビューアはこれらの変更を反映して自動的に更新されます。

エンティティを変更すると、基盤となる図面データベースを直接操作することになります。ビューアはこれらの変更を自動的に検出し、表示を更新します。このリアルタイム同期により、次のことが保証されます：

- すべての変更が即座に表示されます
- コマンドスタックが元に戻す/やり直し操作のために変更を適切に追跡します。これは近日中に実装される予定です。

この機能により、`cad-simple-viewer` は CAD ファイルを表示するだけでなく、ユーザーが図面の内容を操作・変更できるアプリケーションに適しています。

**重要な注意**：`cad-simple-viewer` の使用方法は **AutoCAD RealDWG と非常によく似ています**。AutoCAD RealDWG の開発に慣れている方なら、API の構造とワークフローがほぼ同じであることがわかります。主な違いは、ネイティブの RealDWG ライブラリではなく [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) を使用していることです。

[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) では、[**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) を使用して 1 つの図面を作成する方法を示しています。

## 利用可能なエクスポート

### コアクラス

- `AcApContext` - メインアプリケーションコンテキスト
- `AcApDocManager` - ドキュメント管理
- `AcApDocument` - 個別ドキュメントの処理
- `AcApSettingManager` - 設定管理

### コマンド

- `AcApOpenCmd` - ファイルを開くコマンド
- `AcApZoomCmd` - ズームコマンド
- `AcApPanCmd` - パンコマンド
- `AcApSelectCmd` - 選択コマンド
- `AcApConvertToSvgCmd` - SVG 変換コマンド

### エディタコンポーネント

- `AcEditor` - メインエディタクラス
- `AcEdCommandStack` - コマンドスタック管理
- `AcEdSelectionSet` - 選択処理
- `AcEdInputPoint` - 入力ポイント管理

### ビューコンポーネント

- `AcTrScene` - シーン管理
- `AcTrLayoutView` - レイアウトビューの処理
- `AcTrView2d` - 2D ビュー管理

## MLightCAD における役割

このパッケージはコアロジック層として機能し、フロントエンド UI とレンダリングエンジンを接続し、ドキュメント関連のすべての操作を管理します。
