---
title: "複数リポジトリでのデバッグ"
---

# 複数リポジトリでのデバッグ

`cad-viewer` リポジトリは、他の MLight リポジトリのパッケージに依存しています。たとえば：

- リポジトリ **`cad-viewer`**
  - パッケージ：`@mlightcad/cad-simple-viewer`
- リポジトリ **`realdwg-web`**
  - パッケージ：`@mlightcad/data-model`、`@mlightcad/libredwg-converter`
- リポジトリ **`mtext-renderer`**
  - パッケージ：`@mlightcad/mtext-renderer`、`@mlightcad/mtext-input-box`、`@mlightcad/mtext-parser`

依存関係チェーンの例：

```
@mlightcad/cad-simple-viewer  --->  @mlightcad/data-model
                                   @mlightcad/libredwg-converter
                                   @mlightcad/mtext-renderer
```

開発中、`realdwg-web` や `mtext-renderer` にバグが存在し、それを `cad-viewer` 内で即座に修正してテストする必要がある場合があります。

## `pnpm link` の問題

複数のモノレポ間で `pnpm link` を使用すると、いくつかの問題が発生します。

- セットアップと解除が複雑
- unlink の手順を忘れやすい
- `node_modules` の状態が把握しにくくなる
- CI / 再現性を損なう
- 新しい開発者が手順を追いにくい

ローカルデバッグを簡素化するため、pnpm overrides を使用した**ローカルディレクトリ依存**のアプローチを採用しています。

## 解決策：pnpm overrides によるローカルディレクトリ依存の使用

パッケージを公開またはリンクする代わりに、`pnpm-workspace.yaml` の `overrides` を一時的に変更し、他のリポジトリにあるパッケージのローカルファイルシステムパスを直接参照します。

一元化されたバージョン管理は `pnpm-workspace.yaml` にあります。

- 公開された semver 範囲（たとえば `^1.8.3`）がリリースの信頼できる情報源
- `pnpm sync:versions` がその値を各 `packages/*/package.json` に反映する
- CI とリリーススクリプトが `pnpm sync:versions:check` を実行し、すべてが整合していることを確認する

短期的なデバッグでは、semver のオーバーライドを `file:` パスに置き換えます。このアプローチは：

✅ `pnpm` と自然に連携する  
✅ グローバルなリンクが不要  
✅ 明示的で元に戻しやすい  
✅ 短期的なデバッグに適している  
✅ 依存関係の解決が予測可能に保たれる  
✅ モノレポ内のすべてのパッケージに適用される

## ディレクトリ構成（推奨）

リポジトリを並べて配置します。

```
workspace/
├── cad-viewer/
│   ├── packages/
│   │   └── cad-simple-viewer/
│   ├── package.json
│   └── pnpm-workspace.yaml
│
├── realdwg-web/
│   ├── packages/
│   │   ├── data-model/
│   │   └── libredwg-converter/
│   └── pnpm-workspace.yaml
│
└── mtext-renderer/
    ├── packages/
    │   ├── mtext-renderer/
    │   └── mtext-input-box/
    └── pnpm-workspace.yaml
```

> ⚠️ この構成は**必須ではありません**が、相対パスの管理が容易になります。

## ステップバイステップガイド

### 1. `pnpm-workspace.yaml` にローカルの `file:` オーバーライドを追加する

`cad-viewer/pnpm-workspace.yaml` で、デバッグ対象の semver エントリーを一時的にローカルパスに置き換えます。

通常の（公開済みの）オーバーライドは次のようになります。

```yaml
packages:
  - 'packages/*'

overrides:
  '@mlightcad/data-model': '^1.8.3'
  '@mlightcad/libredwg-converter': '^3.6.3'
  '@mlightcad/mtext-input-box': '^0.2.16'
  '@mlightcad/mtext-renderer': '^0.11.2'
  # ... other shared dependency pins
```

ローカルデバッグでは、テストする必要があるパッケージのみを変更します。

```yaml
overrides:
  '@mlightcad/data-model': 'file:../realdwg-web/packages/data-model'
  '@mlightcad/libredwg-converter': 'file:../realdwg-web/packages/libredwg-converter'
  '@mlightcad/mtext-renderer': 'file:../mtext-renderer/packages/mtext-renderer'
  # Keep other overrides unchanged, or comment out entries you are not debugging
```

> ディレクトリ構成が異なる場合は、相対パスを調整してください。  
> オーバーライドをルートの `package.json` に置かないでください。オーバーライドは `pnpm-workspace.yaml` に属します。

### 2. 依存関係をインストールする

**`cad-viewer` のルート**から：

```
pnpm install
```

pnpm は次のことを行います。

- オーバーライドされたパッケージをローカルディレクトリから解決する
- `node_modules` 内にシンボリックリンクを作成する
- それらをファイルベースの依存関係として追跡する

### 3. 依存関係をビルドする（必要な場合）

上流のパッケージにビルドステップ（TypeScript、バンドルなど）が必要な場合：

```
cd ../realdwg-web
pnpm install
pnpm build
```

活発な開発中は、次のコマンドも実行できます。

```
pnpm dev
```

または、サポートされていればウォッチモードを使用します。`mtext-renderer` のパッケージをデバッグする場合は、そのリポジトリで同じ手順を繰り返します。

### 4. 通常どおりデバッグする

これで次のことができます。

- 上流リポジトリ内のコードを変更する（たとえば `realdwg-web/packages/data-model`）
- 再ビルドする（またはウォッチモードに再ビルドさせる）
- `cad-viewer` で変更を即座にテストする

リンクも公開も再インストールも不要です。

## 公開済みパッケージに戻す

デバッグが完了したら：

1. `cad-viewer/pnpm-workspace.yaml` の semver オーバーライドを復元します（すべての `file:` パスを削除します）。
2. 依存関係のバージョンをワークスペースのパッケージに同期します。

```
pnpm sync:versions
```

3. 依存関係を再インストールします。

```
pnpm install
```

4. `pnpm sync:versions` によって生成された `package.json` の変更を、復元した `pnpm-workspace.yaml` と一緒にコミットします。

これにより、次のことが保証されます。

- CI の一貫性
- クリーンな依存関係グラフ
- ローカルパスが誤ってコミットされないこと

## リリースまたは PR の前のバージョン同期

PR を作成する前、またはリリースを実行する前に、依存関係のバージョンが整合していることを確認してください。

```
pnpm sync:versions
```

これは `pnpm-workspace.yaml` の `overrides` を読み取り、すべての `packages/*/package.json` の一致するエントリーを更新します。

ファイルを書き込まずに確認するには：

```
pnpm sync:versions:check
```

リリーススクリプト（`pnpm release`）と CI はどちらもチェックを自動的に実行します。バージョンが同期していない場合は、`pnpm sync:versions` で修正し、コミットしてから再試行してください。

外部依存関係を更新する場合の一般的なワークフロー：

1. `pnpm-workspace.yaml` の `overrides` で semver を更新する
2. `pnpm sync:versions` を実行する
3. `pnpm install` を実行する
4. テストし、コミットして PR を作成する

## ⚠️ 重要な注意事項

### ローカルパスをコミットしない

ローカルの `file:` オーバーライドは**開発者専用**です。

コミットする前に：

- `pnpm-workspace.yaml` に `file:` パスが含まれて**いない**ことを確認する
- `pnpm sync:versions` を実行して、すべての `package.json` が公開された semver オーバーライドと一致するようにする
- PR とリリースには公開済みのバージョンを使用する

### このアプローチを使用する場合

✅ リポジトリをまたぐバグ修正  
✅ 統合の問題のデバッグ  
✅ 公開せずに迅速に反復する  
❌ 長期的な依存関係管理  
❌ CI / 本番ビルド

## 比較：`pnpm link` と pnpm overrides によるローカルパス

| 項目 | pnpm link | pnpm overrides によるローカルパス |
| ---------------- | --------- | ------------------------------- |
| セットアップの複雑さ | 高い      | 低い                             |
| 明示性 | 暗黙的  | 明示的                        |
| 元に戻しやすさ   | ❌         | ✅                               |
| CI 安全性          | ❌         | ❌（開発専用）                    |
| チームにとっての使いやすさ    | ❌         | ✅                               |

## まとめ

**`cad-viewer`** と **`realdwg-web`** や **`mtext-renderer`** などの上流リポジトリにまたがる問題をデバッグするには、一時的に **`pnpm-workspace.yaml` の `file:` オーバーライド**を使用します。

それは次のとおりです。

- シンプル
- 透過的
- 教えやすい
- 元に戻しやすい
- モノレポ内のすべてのパッケージに適用される

デバッグが終わったら、またはリリースの前に、semver オーバーライドを復元し、**`pnpm sync:versions`** を実行して、同期された `package.json` ファイルをコミットしてください。
