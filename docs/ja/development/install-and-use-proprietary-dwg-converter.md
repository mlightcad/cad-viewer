---
title: "独自 DWG コンバーターのインストールと使用"
---

# 独自 DWG コンバーターのインストールと使用

このガイドでは、独自の DWG パーサーパッケージ **`@mlightcad/dwg-converter`** を cad-viewer のデータモデルに**インストール**および**登録**する方法について説明します。

ライセンス、試用アクセス、価格、GPL コンプライアンスについては、メインリポジトリの [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) を参照してください。

> **前提条件：** GitHub アカウントが、プライベートパッケージへの**読み取りアクセス権**をすでに持っている必要があります（試用または購入の承認後に付与されます）。

## 概要

- `@mlightcad/dwg-converter` は **GitHub Packages** に公開されています。
- その他の `@mlightcad/*` パッケージ（例：`@mlightcad/data-model`、`@mlightcad/cad-viewer`）は、公開 **npm レジストリ**に公開されています。
- npm と pnpm は**スコープレベル**のレジストリマッピングのみをサポートしており、同一スコープ内での**パッケージレベルの公式な**レジストリマッピングは**ありません**。

つまり、次の設定を使用して `@mlightcad/dwg-converter` だけを取得することは**できません**：

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

そうすると、**すべて**の `@mlightcad/*` パッケージが GitHub Packages にルーティングされ、公開パッケージのインストールが壊れます。

**バージョンに関する注意：** 以下の例の `1.2.3`（およびタールボールのハッシュ）は、**実際に提供された正確なバージョン**に置き換えてください。

## `read:packages` 権限を持つ `GITHUB_TOKEN` の作成

GitHub Packages は現在、**個人アクセストークン（classic）**で認証します。npm レジストリでは fine-grained トークンはサポートされていません。

1. パッケージへのアクセス権を持つアカウントで GitHub にサインインします。
2. **Settings → Developer settings → Personal access tokens → Tokens (classic)** を開きます  
   （直接リンク：[https://github.com/settings/tokens](https://github.com/settings/tokens)）。
3. **Generate new token → Generate new token (classic)** をクリックします。
4. トークンに名前を付け（例：`dwg-converter-install`）、セキュリティポリシーに合った有効期限を設定します。
5. **Select scopes** で **`read:packages`** を有効にします。インストールのみの用途では、`write:packages` や `delete:packages` は必要ありません。
6. **Generate token** をクリックし、すぐにコピーします（一度しか表示されません）。
7. `GITHUB_TOKEN` として公開します：

   ```bash
   # macOS / Linux
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Windows PowerShell
   $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Windows CMD
   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

8. **クライアント**が GitHub Packages と直接通信する場合（以下のオプション 2）、`.npmrc` に**ホストレベル**の認証エントリを追加します：

   ```ini
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

   これは `npm.pkg.github.com` にのみ認証情報を付加します。`@mlightcad` スコープを再マッピングするものでは**ありません**。`@mlightcad:registry=https://npm.pkg.github.com` を追加しないでください。

   `pnpm install` はこのファイルを読み取ります。`npm view` は、ワークスペースパッケージから実行した場合、このファイルを読み取りません。npm 8.5 以降、CLI はそのパッケージの `.npmrc` を無視し（`ignoring workspace config`）、`GITHUB_TOKEN` が設定されていてもトークンなしでリクエストを送信します（`401 Unauthorized - authentication token not provided`）。`npm view` コマンド自体にトークンを渡してください。オプション 2 を参照してください。

   モノレポでは、このファイルを**ワークスペースのルート**に配置します。メンバーパッケージ内だけにある `.npmrc` は、npm がスキップするファイルです。

   オプション 1（プライベートレジストリプロキシ）を使用する場合、通常クライアントはこの行を必要としません。代わりにプロキシ側にトークンを設定します。

**セキュリティ上の注意**

- トークンはパスワードと同様に扱ってください。git にコミットしたり、公開 issue に貼り付けたりしないでください。
- `.npmrc` にトークンをハードコーディングするより、環境変数（または CI のシークレットストア）を使用することを推奨します。
- GitHub Actions では、リポジトリシークレット（例：`GH_PACKAGES_TOKEN`）をインストールジョブの `GITHUB_TOKEN` / `NODE_AUTH_TOKEN` にマッピングします。

## インストールオプション

以下のいずれか**1 つ**を選択してください。

### オプション 1：npm と GitHub Packages をプロキシする統合プライベートレジストリ

プライベート npm レジストリ（Verdaccio、JFrog Artifactory、Sonatype Nexus、またはクラウドベンダーの npm レジストリ）を運営している（またはすでに使用している）場合は、クライアントをそのレジストリに向け、パッケージごとの上流をレジストリに決定させます：

```text
                ┌── npmjs.org          (@mlightcad/data-model, …)
client ──→ private registry
                └── GitHub Packages    (@mlightcad/dwg-converter)
```

クライアントの `.npmrc`：

```ini
registry=https://npm.example.com/
```

プライベートレジストリを次のように設定します：

| パッケージ | 上流 |
|---------|----------|
| `@mlightcad/foo`（公開パッケージ） | `https://registry.npmjs.org` |
| `@mlightcad/dwg-converter` | `https://npm.pkg.github.com` |

その後、通常どおりインストールします：

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

すでにプライベートレジストリを維持している場合は、これが長期的に最もクリーンな構成です。GitHub Packages を 1 ～ 2 個だけ必要とする小規模プロジェクトでは、通常オプション 2 のほうが軽量です。

### オプション 2：`@mlightcad/dwg-converter` を GitHub Packages のタールボール URL に固定する

パッケージを **タールボール URL** として `package.json` に固定し、`@mlightcad` スコープのレジストリ経由で解決する代わりに、パッケージマネージャーがその URL を直接ダウンロードするようにします。

1. GitHub Packages に対して認証します（タールボール URL は認証をバイパス**しません**）：

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. 必要なバージョンのタールボール URL を解決します。

   このコマンドではプロジェクトの `.npmrc` に依存しないでください。`npm view` はワークスペースパッケージの `.npmrc` を無視するため、そのファイル内の `${GITHUB_TOKEN}` は適用されません。コマンドラインでトークンを渡します：

   ```bash
   # macOS / Linux
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball \
     --registry=https://npm.pkg.github.com \
     --//npm.pkg.github.com/:_authToken="${GITHUB_TOKEN}"
   ```

   ```powershell
   # Windows PowerShell
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball `
     --registry=https://npm.pkg.github.com `
     --//npm.pkg.github.com/:_authToken="$env:GITHUB_TOKEN"
   ```

   ```bat
   REM Windows CMD
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=%GITHUB_TOKEN%
   ```

   手順 1 の `.npmrc` エントリは引き続き必要です。`pnpm install` はタールボールをダウンロードする際にこれを使用します。

   出力例：

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. その URL を `package.json` に記述します（**ご自身の**バージョンとタールボール URL を使用してください）：

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. インストールします：

   ```bash
   pnpm install
   ```

**注意事項**

- アップグレードするには、新しいタールボール URL を取得して `package.json` / ロックファイルを更新する必要があります。
- CI およびローカルインストールでは、読み取りアクセス権を持つ有効な GitHub トークンが引き続き必要です。
- `.npmrc` の GitHub Packages 認証エントリを維持してください。

オプション 2 は評価や小規模チームに適しています。頻繁なアップグレードや多数のプライベートパッケージが見込まれる場合は、オプション 1（または `@mlightcad-private/*` のような別のプライベートスコープを GitHub Packages にマッピングする方法）を推奨します。

## コンバーターの登録

独自パーサーは、オープンソーススタックと同じパイプラインに組み込むことができる**登録可能なコンバーター**です。

- 出力は MIT ライセンスの **`@mlightcad/data-model`** に準拠しています：`AcDbDatabase`、`AcDb*` エンティティ、レイヤテーブル、ブロック、および関連構造。
- **`AcDbDatabaseConverterManager`** を介して登録します。これは `AcDbLibreDwgConverter` と同じメカニズムです。
- 解析後は、既存の MIT ライセンスのレンダリング、レイヤ、選択、インタラクションのパイプライン（`cad-simple-viewer`、`cad-viewer`、プラグインなど）がそのまま動作します。

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

このパッケージは、単独で「DWG を解析する」API を**公開していません**。オープンソースの [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter) と同様に、**`AcDbDatabaseConverter`** を実装しています。変換後は、`@mlightcad/data-model` を通じて結果の図面を操作します。

コンプライアンスのために独自パーサーに依存する場合は、GPL ベースの `libredwg-converter` も登録しないでください。

動作する完全なサンプル（認証、worker アセット、登録、データベースの参照）については、[realdwg-web-example](https://github.com/mlightcad/realdwg-web-example) を参照してください。

## 関連ページ

- [Worker URL の設定](./configure-worker-urls) — DWG/DXF パーサー向けの worker URL 設定
- [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) — 商用ライセンス、試用、GPL に関する注意
- [開発ガイド](./) — 開発者向けトピックの索引
