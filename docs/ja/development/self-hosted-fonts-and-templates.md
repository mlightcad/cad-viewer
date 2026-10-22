---
title: "セルフホストフォントとテンプレート"
---

# セルフホストフォントとテンプレート

このガイドでは、フォントと DWG/DXF テンプレートを独自のサーバーにデプロイする方法について説明します。

## 概要

**cad viewer** は、フォントとテンプレートを読み込むために特定のディレクトリ構造を想定しています。この構造に従うことで、[Github のデフォルトサーバー](https://github.com/mlightcad/cad-data/) を使用する代わりに、独自のフォントとテンプレートをホストできます。

[cad-data](https://github.com/mlightcad/cad-data) のローカルコピー（git サブモジュール）からフォントとテンプレートを配信し、ライブビューアとヘッドレス CLI の両方で `baseUrl` を設定する動作する Next.js の例については、[cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) を参照してください。

## ディレクトリ構造

サーバーは [mlightcad/cad-data リポジトリ](https://github.com/mlightcad/cad-data) と同じ構造に従う必要があります：

```
your-base-url/
├── fonts/                    # Font files directory
│   ├── arial.ttf
│   ├── simkai.ttf
│   ├── custom-font.shx
│   └── ...
├── templates/                # DWG/DXF template files directory
│   ├── acadiso.dxf
│   ├── custom-template.dwg
│   └── ...
└── fonts.json               # Font metadata configuration file
```

## 設定

### ベース URL の設定

アプリケーションの `baseUrl` プロパティを設定して、サーバーを指定します：

#### Vue コンポーネントの場合
```vue
<template>
  <MlCadViewer 
    locale="en" 
    :base-url="'https://your-server.com/cad-data/'"
  />
</template>
```

#### TypeScript/JavaScript の場合
```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Set the base URL for resource loading
AcApDocManager.instance.baseUrl = 'https://your-server.com/cad-data/'
```

#### cad-simple-viewer-cli（ヘッドレス CLI）の場合

> **`@mlightcad/cad-simple-viewer` / `@mlightcad/cad-simple-viewer-cli` 1.7.2 以降で利用可能です。**

セルフホストのフォント/テンプレートサーバーに対してヘッドレス CLI を実行する場合、ベース URL を渡す必要があります。そうしないと、CLI はデフォルトの CDN `cad-data` URL を使用し続け、サーバーからフォントやテンプレートを読み込みません。

**コマンドライン**（`--base-url`）：

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out \
  --base-url https://your-server.com/cad-data/
```

**プログラム API**（`runHeadless`）：

```typescript
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

await runHeadless({
  inputPath: './drawing.dwg',
  scriptPath: './export-png.scr',
  outputDir: './out',
  baseUrl: 'https://your-server.com/cad-data/'
})
```

フォントは `<base-url>/fonts/`（例：`https://your-server.com/cad-data/fonts/`）から読み込まれます。URL は `http` または `https` である必要があります。

### デフォルトの動作

`baseUrl` が指定されていない場合、ビューアはデフォルト URL `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/` を使用します。

## フォント管理

### フォントディレクトリ

すべてのフォントファイルを `fonts/` ディレクトリに配置します。サポートされるフォント形式は次のとおりです：
- **TTF**（TrueType Font）- `.ttf` ファイル
- **SHX**（AutoCAD Shape Font）- `.shx` ファイル
- **OTF**（OpenType Font）- `.otf` ファイル

### Fonts.json の設定

`fonts.json` ファイルは、利用可能な各フォントのメタデータを含む JSON 配列です。このファイルはベース URL のルートに配置する必要があります。

#### ファイル構造

```json
[
  {
    "name": ["Arial"],
    "file": "arial.ttf",
    "type": "mesh",
    "description": "Standard Arial font for text rendering"
  },
  {
    "name": ["SimKai"],
    "file": "simkai.ttf", 
    "type": "mesh",
    "description": "Chinese Kai font for CJK text support"
  },
  {
    "name": ["Custom SHX Font"],
    "file": "custom.shx",
    "type": "shx",
    "description": "Custom AutoCAD shape font",
    "encoding": "gbk"
  }
]
```

#### フィールドの説明

| フィールド | 型 | 必須 | 説明 |
|-------|------|----------|-------------|
| `name` | string array | はい | DWG/DXF ファイルで使用されるフォント名。1 つのフォントに複数の名前を設定できます。 |
| `file` | string | はい | `fonts/` ディレクトリにあるフォントファイルのファイル名。正確に一致する必要があります。 |
| `type` | string | はい | フォントの種類/形式。一般的な値：`"mesh"` と `"shx"`。`"mesh"` は `"ttf"`、`"otf"`、`"woff"` フォントを意味します。 |
| `description` | string | いいえ | フォントの用途や特性に関する任意の説明。 |
| `encoding` | string | いいえ | フォントのエンコーディングに関する任意の説明。[TextDecoder: encoding property](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding) で利用可能な値のいずれかを指定できます。このプロパティは、フォントが [shx big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-CDAF6EAF-85D1-48FC-9A78-43514E0132D5) または [shx extended big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-00ED0CC6-A4BE-4591-93FA-598CC40AA43D) の場合にのみ必要です。 |

### 新しいフォントの追加

サーバーに新しいフォントを追加するには：

1. **フォントファイルをアップロード**して `fonts/` ディレクトリに配置します
2. **`fonts.json` を更新**し、新しいエントリを追加します：

```json
[
  // ... existing fonts ...
  {
    "name": "My Custom Font",
    "file": "my-custom-font.ttf",
    "type": "mesh",
    "description": "Custom font for specific project needs"
  }
]
```

3. アプリケーションで**フォントの読み込みをテスト**します：

```typescript
// Load the new font
await AcApDocManager.instance.loadFonts(['My Custom Font'])

// Or load default fonts (includes your new font if it's in the list)
await AcApDocManager.instance.loadDefaultFonts()
```

## テンプレート管理

### テンプレートディレクトリ

DWG および DXF テンプレートファイルを `templates/` ディレクトリに配置します。これらのテンプレートは、新しいドキュメントを作成する際に使用されます。

### デフォルトテンプレート

ライブラリは、`templates/` ディレクトリに `acadiso.dxf` という名前のデフォルトテンプレートがあることを想定しています。このテンプレートは「Quick New」コマンド（`AcApQNewCmd`）で使用されます。

### カスタムテンプレートの追加

1. **テンプレートファイルをアップロード**して `templates/` ディレクトリに配置します
2. アプリケーションで**テンプレートを参照**します：

```typescript
// Open a custom template
const templateUrl = AcApDocManager.instance.baseUrl + 'templates/my-custom-template.dxf'
await AcApDocManager.instance.openUrl(templateUrl)
```

## サーバー要件

### CORS 設定

CAD Viewer がリソースを読み込めるよう、サーバーがクロスオリジンリクエストを許可していることを確認してください：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### MIME タイプ

フォントファイルを正しい MIME タイプで配信するようにサーバーを設定します：

- `.ttf` → `font/ttf`
- `.otf` → `font/otf` 
- `.shx` → `application/octet-stream`
- `.dwg` → `application/dwg`
- `.dxf` → `application/dxf`

### Nginx 設定の例

```nginx
location /cad-data/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
    
    location ~* \.(ttf|otf|shx)$ {
        add_header Content-Type font/ttf;
    }
    
    location ~* \.(dwg|dxf)$ {
        add_header Content-Type application/octet-stream;
    }
}
```

## エラーハンドリング

ライブラリは、フォント読み込みの問題に対応するためのイベントハンドラーを提供します：

```typescript
import { eventBus } from '@mlightcad/cad-simple-viewer'

// Handle fonts that cannot be found
eventBus.on('fonts-not-found', (params) => {
  console.warn('Fonts not found:', params.fonts)
  // Implement fallback logic or user notification
})

// Handle fonts that fail to load
eventBus.on('fonts-not-loaded', (params) => {
  console.error('Fonts failed to load:', params.fonts)
  // Implement error handling or user notification
})
```

## ベストプラクティス

1. **バージョン管理**：`fonts.json` ファイルをバージョン管理に含め、フォントの追加と変更を追跡します
2. **フォントの最適化**：読み込み時間を短縮するため、可能な場合は圧縮フォント形式（`woff`）を使用します
3. **テスト**：さまざまな CAD ファイルでフォントの読み込みをテストし、互換性を確認します
4. **ドキュメント化**：チームメンバー向けにカスタムフォントとテンプレートを文書化します

## トラブルシューティング

### よくある問題

1. **フォントが読み込まれない**：`fonts.json` が `{baseUrl}/fonts.json` でアクセス可能であることを確認します
2. **CORS エラー**：サーバーがクロスオリジンリクエストを許可していることを確認します
3. **404 エラー**：`fonts.json` のファイルパスが実際のファイル名と一致していることを確認します
4. **MIME タイプの問題**：フォントを正しい MIME タイプで配信するようにサーバーを設定します

### デバッグ

ブラウザの開発者ツールを有効にしてネットワークリクエストを監視し、次を確認します：
- `fonts.json` が正常に読み込まれたか
- フォントファイルのダウンロード
- CORS ヘッダー
- HTTP ステータスコード

## 実装例

カスタムフォントとテンプレートサーバーを設定する完全な例を次に示します：

```typescript
// Initialize the CAD viewer with custom base URL
const docManager = AcApDocManager.createInstance(canvas)
docManager.baseUrl = 'https://my-cdn.com/cad-resources/'

// Load custom fonts
await docManager.loadDefaultFonts(['Arial', 'My Custom Font'])

// Open a document from a custom template
await docManager.openUrl(docManager.baseUrl + 'templates/custom-template.dxf')
```

この設定により、想定される構造との互換性を維持しつつ、アプリケーションで利用可能なフォントとテンプレートを完全にカスタマイズできます。
