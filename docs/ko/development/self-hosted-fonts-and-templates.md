---
title: "자체 호스팅 폰트 및 템플릿"
---

# 자체 호스팅 폰트 및 템플릿

이 가이드는 자체 서버에 폰트와 DWG/DXF 템플릿을 배포하는 방법을 설명합니다.

## 개요

**cad viewer**는 폰트와 템플릿을 로드하기 위해 특정 디렉터리 구조를 기대합니다. 이 구조를 따르면 [Github의 기본 서버](https://github.com/mlightcad/cad-data/)를 사용하는 대신 자체 폰트와 템플릿을 호스팅할 수 있습니다.

[cad-data](https://github.com/mlightcad/cad-data)(git 하위 모듈)의 로컬 복사본에서 폰트와 템플릿을 제공하고 라이브 뷰어와 헤드리스 CLI 모두에서 `baseUrl`을 설정하는 동작하는 Next.js 예제는 [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo)를 참조하십시오.

## 디렉터리 구조

서버는 [mlightcad/cad-data 저장소](https://github.com/mlightcad/cad-data)와 동일한 구조를 따라야 합니다:

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

## 구성

### 기본 URL 설정

애플리케이션에서 `baseUrl` 속성을 구성하여 서버를 가리키도록 합니다:

#### Vue 컴포넌트에서
```vue
<template>
  <MlCadViewer 
    locale="en" 
    :base-url="'https://your-server.com/cad-data/'"
  />
</template>
```

#### TypeScript/JavaScript에서
```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Set the base URL for resource loading
AcApDocManager.instance.baseUrl = 'https://your-server.com/cad-data/'
```

#### cad-simple-viewer-cli(헤드리스 CLI)에서

> **`@mlightcad/cad-simple-viewer` / `@mlightcad/cad-simple-viewer-cli` 1.7.2부터 사용 가능합니다.**

자체 호스팅 폰트/템플릿 서버에 대해 헤드리스 CLI를 실행할 때는 기본 URL을 전달해야 합니다. 그렇지 않으면 CLI는 기본 CDN `cad-data` URL을 계속 사용하며 서버에서 폰트나 템플릿을 로드하지 않습니다.

**명령줄**(`--base-url`):

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out \
  --base-url https://your-server.com/cad-data/
```

**프로그래밍 방식 API**(`runHeadless`):

```typescript
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

await runHeadless({
  inputPath: './drawing.dwg',
  scriptPath: './export-png.scr',
  outputDir: './out',
  baseUrl: 'https://your-server.com/cad-data/'
})
```

폰트는 `<base-url>/fonts/`(예: `https://your-server.com/cad-data/fonts/`)에서 로드됩니다. URL은 `http` 또는 `https`여야 합니다.

### 기본 동작

`baseUrl`이 제공되지 않으면 뷰어는 기본 URL인 `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`을 사용합니다

## 폰트 관리

### 폰트 디렉터리

모든 폰트 파일을 `fonts/` 디렉터리에 넣으십시오. 지원되는 폰트 형식은 다음과 같습니다:
- **TTF**(TrueType Font) - `.ttf` 파일
- **SHX**(AutoCAD Shape Font) - `.shx` 파일
- **OTF**(OpenType Font) - `.otf` 파일

### fonts.json 구성

`fonts.json` 파일은 사용 가능한 각 폰트의 메타데이터를 담은 JSON 배열입니다. 이 파일은 기본 URL의 루트에 위치해야 합니다.

#### 파일 구조

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

#### 필드 설명

| 필드 | 유형 | 필수 | 설명 |
|-------|------|----------|-------------|
| `name` | 문자열 배열 | 예 | DWG/DXF 파일에서 사용되는 폰트 이름입니다. 하나의 폰트가 여러 이름을 가질 수 있습니다. |
| `file` | 문자열 | 예 | `fonts/` 디렉터리에 있는 폰트 파일의 파일명입니다. 정확히 일치해야 합니다. |
| `type` | 문자열 | 예 | 폰트 유형/형식입니다. 일반적인 값: `"mesh"` 및 `"shx"`. `"mesh"`는 `"ttf"`, `"otf"`, `"woff"` 폰트를 의미합니다. |
| `description` | 문자열 | 아니오 | 폰트의 용도나 특성에 대한 선택적 설명입니다. |
| `encoding` | 문자열 | 아니오 | 폰트 인코딩에 대한 선택적 설명으로, [TextDecoder: encoding property](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding)에서 사용 가능한 값 중 하나일 수 있습니다. 이 속성은 폰트가 [shx big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-CDAF6EAF-85D1-48FC-9A78-43514E0132D5) 또는 [shx extended big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-00ED0CC6-A4BE-4591-93FA-598CC40AA43D)인 경우에만 필요합니다. |

### 새 폰트 추가

서버에 새 폰트를 추가하려면:

1. **폰트 파일을 업로드**합니다 `fonts/` 디렉터리에
2. **`fonts.json`을 업데이트**하여 새 항목을 추가합니다:

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

3. 애플리케이션에서 **폰트 로딩을 테스트**합니다:

```typescript
// Load the new font
await AcApDocManager.instance.loadFonts(['My Custom Font'])

// Or load default fonts (includes your new font if it's in the list)
await AcApDocManager.instance.loadDefaultFonts()
```

## 템플릿 관리

### 템플릿 디렉터리

DWG 및 DXF 템플릿 파일을 `templates/` 디렉터리에 넣으십시오. 이 템플릿은 새 문서를 생성할 때 사용됩니다.

### 기본 템플릿

라이브러리는 `templates/` 디렉터리에 `acadiso.dxf`라는 기본 템플릿이 있을 것으로 기대합니다. 이 템플릿은 "Quick New" 명령(`AcApQNewCmd`)에서 사용됩니다.

### 사용자 정의 템플릿 추가

1. **템플릿 파일을 업로드**합니다 `templates/` 디렉터리에
2. 애플리케이션에서 **템플릿을 참조**합니다:

```typescript
// Open a custom template
const templateUrl = AcApDocManager.instance.baseUrl + 'templates/my-custom-template.dxf'
await AcApDocManager.instance.openUrl(templateUrl)
```

## 서버 요구 사항

### CORS 구성

CAD Viewer가 리소스를 로드할 수 있도록 서버가 교차 출처 요청을 허용하는지 확인하십시오:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### MIME 유형

폰트 파일을 올바른 MIME 유형으로 제공하도록 서버를 구성하십시오:

- `.ttf` → `font/ttf`
- `.otf` → `font/otf` 
- `.shx` → `application/octet-stream`
- `.dwg` → `application/dwg`
- `.dxf` → `application/dxf`

### Nginx 구성 예시

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

## 오류 처리

라이브러리는 폰트 로딩 문제에 대한 이벤트 핸들러를 제공합니다:

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

## 모범 사례

1. **버전 관리**: 폰트 추가 및 변경을 추적하려면 `fonts.json` 파일을 버전 관리에 두십시오
2. **폰트 최적화**: 로딩 시간을 줄이려면 가능한 경우 압축 폰트 형식(`woff`)을 사용하십시오
3. **테스트**: 호환성을 보장하기 위해 다양한 CAD 파일로 폰트 로딩을 테스트하십시오
4. **문서화**: 팀 구성원을 위해 사용자 정의 폰트와 템플릿을 문서화하십시오

## 문제 해결

### 일반적인 문제

1. **폰트가 로드되지 않음**: `fonts.json`이 `{baseUrl}/fonts.json`에서 접근 가능한지 확인하십시오
2. **CORS 오류**: 서버가 교차 출처 요청을 허용하는지 확인하십시오
3. **404 오류**: `fonts.json`의 파일 경로가 실제 파일명과 일치하는지 확인하십시오
4. **MIME 유형 문제**: 폰트를 올바른 MIME 유형으로 제공하도록 서버를 구성하십시오

### 디버깅

브라우저 개발자 도구를 활성화하여 네트워크 요청을 모니터링하고 다음을 확인하십시오:
- `fonts.json`의 성공적인 로딩
- 폰트 파일 다운로드
- CORS 헤더
- HTTP 상태 코드

## 구현 예제

다음은 사용자 정의 폰트 및 템플릿 서버를 설정하는 완전한 예제입니다:

```typescript
// Initialize the CAD viewer with custom base URL
const docManager = AcApDocManager.createInstance(canvas)
docManager.baseUrl = 'https://my-cdn.com/cad-resources/'

// Load custom fonts
await docManager.loadDefaultFonts(['Arial', 'My Custom Font'])

// Open a document from a custom template
await docManager.openUrl(docManager.baseUrl + 'templates/custom-template.dxf')
```

이 설정을 사용하면 예상되는 구조와의 호환성을 유지하면서 애플리케이션에서 사용할 수 있는 폰트와 템플릿을 완전히 사용자 정의할 수 있습니다.
