---
title: "cad-simple-viewer と cad-viewer のアップグレード"
---

# cad-simple-viewer と cad-viewer のアップグレード

このガイドでは、`@mlightcad/cad-simple-viewer` と`@mlightcad/cad-viewer` を安全にアップグレードする方法を説明します。単独でバージョンを上げられない理由、一緒に更新する必要がある関連パッケージ、および任意のリリースに対して正しい互換バージョンのセットを判断する 2 つの信頼できる方法について説明します。

## 概要

`@mlightcad/cad-simple-viewer` と `@mlightcad/cad-viewer` は**独立したパッケージではありません**。これらは共通のコードベースとリリースサイクルを共有する、緊密に統合されたエコシステムの一部です。各リリースには、プラグイン、レンダラー、data-model パッケージ、テキストレンダリングライブラリ、サードパーティの UI フレームワークにまたがる、調整された一連の更新が含まれています。

**`cad-simple-viewer` または `cad-viewer` のみを単独でアップグレードすると、微妙な実行時障害が発生する可能性があります**。たとえば：

- プラグインのインターフェースが、新しい（または古い）コアバージョンで変更された API シグネチャを期待している
- コアが期待するデータモデルの形状と、古いパーサー/レンダラーが生成する形状の不一致
- libredwg-converter の更新後の WebAssembly または Worker の互換性の欠如
- `mtext-renderer` / `mtext-parser` のバージョンがずれたときのテキストレンダリングの不具合
- レンダラー層全体で一致していない Three.js の破壊的変更や動作変更

常に**関連パッケージのセット全体を一緒に**アップグレードしてください。正しいバージョンを判断する 2 つの信頼できる方法を以下で説明します。

---

## エコシステムの全体像

アップグレードする前に、どのパッケージが調整されたリリースに属し、どれがサードパーティ製かを知っておくと役立ちます。次のカテゴリは、同じ cad-viewer リリースに同期されます。

### コアビューアパッケージ

| パッケージ | 役割 |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | フレームワーク非依存のコア（ドキュメント管理、コマンドスタック、レンダリングの接着層） |
| `@mlightcad/cad-viewer` | cad-simple-viewer の上に構築された Vue 3 + Element Plus の UI ラッパー |

### プラグイン — **cad-simple-viewer のバージョンと完全に一致させる必要があります**

| パッケージ | 目的 |
| --- | --- |
| `@mlightcad/cad-html-plugin` | ワンクリックの自己完結型 HTML エクスポート |
| `@mlightcad/cad-pdf-plugin` | PDF エクスポートと PDF アンダーレイのインポート |
| `@mlightcad/cad-svg-plugin` | SVG エクスポート |
| `@mlightcad/cad-simple-ui-plugin` | プレーン DOM のツールバー、レイヤマネージャー、ドックパネル |
| `@mlightcad/cad-agent-plugin` | AI エージェントによるインタラクション |
| `@mlightcad/cad-onedrive-plugin` | OneDrive 統合 |
| `@mlightcad/cad-google-drive-plugin` | Google Drive 統合 |

> **経験則：** 上記のリストのすべてのプラグインは、アップグレード先の `cad-simple-viewer` と**完全に同じバージョン番号**（たとえば `1.7.5`）に固定する必要があります。

### 内部レンダラー層（コアと同じバージョン、別途公開）

| パッケージ | 目的 |
| --- | --- |
| `@mlightcad/three-renderer` | THREE.js ベースの 2D/3D レンダリングエンジン |
| `@mlightcad/pdf-renderer` | cad-pdf-plugin が PDF コンテンツ生成に使用するバックエンド |

これらはプラグインと cad-simple-viewer によって内部的に使用されます。通常は直接インストールする**必要はありません**が、そのバージョンはインストールするプラグインと互換性がある必要があります。

### 低レベルデータ & テキスト層 — **リリースのバージョンと一致させる必要があります**

| パッケージ | 備考 |
| --- | --- |
| `@mlightcad/data-model` | コアのエンティティ/データベース型。各リリースでビューアと一緒に更新されます |
| `@mlightcad/libredwg-converter` | DWG 解析の WebAssembly ラッパー — DWG サポートはこれに依存します |
| `@mlightcad/mtext-parser` | MTEXT コンテンツパーサー |
| `@mlightcad/mtext-renderer` | MTEXT → THREE ジオメトリのレンダラー |
| `@mlightcad/mtext-input-box` | キャンバス内の MTEXT エディターウィジェット |

### cad-viewer 専用の Vue UI 依存関係

これらは `pnpm-workspace.yaml` のオーバーライドに含まれていますが、`@mlightcad/cad-viewer`（完全な Vue 3 UI）を使用する場合にのみ必要です。cad-simple-viewer の統合では直接インストールしません。

| パッケージ | 目的 |
| --- | --- |
| `@mlightcad/ribbon` | リボン UI コンポーネント |
| `@mlightcad/ui-components` | 共有 Vue UI プリミティブ |

### サードパーティのピア依存関係（リリースで固定されたバージョンを維持）

| パッケージ |
| --- |
| `three` |
| `vue`（cad-viewer 専用） |
| `element-plus`（cad-viewer 専用） |
| `vue-i18n`（cad-viewer 専用） |
| `lodash-es` |

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

4. 使用するすべての `@mlightcad/cad-*-plugin` を、`cad-simple-viewer` / `cad-viewer` と**同じバージョン**に更新します。

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-viewer": "1.7.5",
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

## 方法 2 — `cad-simple-viewer-example` のアップグレードコミットを追う

[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) リポジトリは、`cad-simple-viewer` の公式の最小ホストです。コアがリリースされるたびに、サンプルプロジェクトには `feat: upgrade to cad-simple-viewer vX.Y.Z` というタイトルのコミットが追加され、**すべての関連依存関係が一緒に**更新されます。このコミットは、そのリリースでメンテナーが実際に使用したバージョンを正確に示す、実用的で具体的な参考資料です。

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

A: はい。バージョンの調整はパッケージマネージャーに関係なく同じです。`pnpm-workspace.yaml` の値を使用して `overrides`（pnpm）、`resolutions`（yarn）、または `overrides`（npm）を使用するか、`cad-simple-viewer-example` の差分からバージョンを `package.json` に固定するだけです。
