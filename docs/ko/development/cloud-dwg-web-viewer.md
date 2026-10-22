---
title: "클라우드 DWG 웹 뷰어 구축"
---

# `cad-html-plugin`으로 클라우드 DWG 웹 뷰어 구축하기: 사전 렌더링 + 정적 호스팅

이 문서는 `@mlightcad/cad-html-plugin`의 **다중 파일 ACEX 패키지** 내보내기 기능을 사용하여 DWG/DXF 도면을 서버 측(또는 빌드 과정)에서 바로 호스팅 가능한 정적 리소스로 변환하는 방법을 소개합니다. 그러면 사용자는 브라우저에서 도면을 파싱하거나 형상을 테셀레이션할 필요 없이 웹 페이지를 열어 도면을 볼 수 있습니다.

형식 자체(매니페스트 필드, ACEC/ACEO 바이너리 인코딩 등)에 대한 자세한 내용은 [acex-package-format.md](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-html-plugin/docs/acex-package-format.md)를 참조하십시오. 이 문서는 **이 형식을 사용하여 클라우드 기반 도면 뷰어를 구축하는 방법**에만 초점을 맞춥니다.

---

## 1. 배경: 두 가지 웹 도면 뷰어 아키텍처

**아키텍처 A: 브라우저에서 실시간 파싱(`cad-viewer`가 DWG/DXF 파일을 여는 기본 방식)**

```text
DWG/DXF file → Browser download → Parse entities (AcDb*) → Tessellate/triangulate into rendering data → Render with WebGL
```

파싱과 "엔티티 → 렌더링 데이터" 변환의 모든 비용이 **사용자 기기**에서 발생합니다. 큰 도면은 초기 렌더링이 느리고, 저사양 모바일 기기는 느려질 수 있으며, 메모리 압박이 클 수 있습니다.

**아키텍처 B: 사전 렌더링 + 정적 호스팅(하오천 뷰어 웹, Autodesk Web Viewer 등 클라우드 기반 도면 뷰어가 사용하는 주류 방식)**

```text
Conversion stage (one-time): DWG/DXF → Parse + tessellate → Display data (line/mesh batches) + offline viewer → Static files
Access stage (every time):   Browser only needs to fetch → gunzip → render directly
```

`cad-html-plugin`이 내보내는 **다중 패키지**가 아키텍처 B의 산물입니다. 즉, 압축을 풀면 순수 정적 디렉터리가 되는 `.zip` 파일입니다. 어떤 웹 서버(nginx, 객체 스토리지, CDN)로도 호스팅할 수 있으며 **백엔드 런타임이 필요하지 않습니다**.

### 아키텍처 B를 선택해야 하는 경우

* 도면을 주로 **게시 / 공유 / 보관 열람** 용도로 사용하며, 많은 사용자가 동일한 도면을 반복적으로 열람하는 경우(CDN 캐시 적중률이 높음);
* 사용자 기기가 파싱과 테셀레이션을 수행할 필요 없이 빠른 초기 렌더링과 좋은 모바일 경험을 원하는 경우;
* 원본 DWG/DXF를 열람자에게 배포하고 싶지 않은 경우(패키지에는 편집 가능한 엔티티 레코드 없이 **표시 수준 데이터**만 포함되므로 도면 자산에 어느 정도 보호를 제공합니다);
* 서버 측 비용을 거의 0에 가깝게 만들고 싶은 경우(순수 정적 트래픽).

### 비용과 전제 조건

* **네트워크가 충분히 빨라야 합니다.** 사전 렌더링된 데이터는 평탄화된 표시 형상이며 원본 DWG/DXF보다 클 수 있습니다(다만 gzip 압축 후에는 보통 매우 작습니다. 약 2 MiB의 비압축 블록은 일반적으로 gzip 후 200 KiB 미만입니다). 이 데이터를 다운로드하는 네트워크 비용이 이미 로컬에서 파싱 + 테셀레이션하는 비용보다 크다면 이 방식은 이점이 없습니다. 약한 네트워크 환경이나 작은 도면을 한 번만 열람하는 시나리오에는 단일 파일 HTML을 직접 전달하거나 온라인에서 도면을 파싱하는 것이 더 적절할 수 있습니다.
* **도면이 갱신되면 다시 내보내고 재게시해야 합니다.** 이 방식은 "게시 후 읽기 전용" 시나리오에 적합하며, 온라인 협업 편집에는 적합하지 않습니다.
* 비밀번호 및 만료 보호는 현재 **단일 파일 HTML** 내보내기에서만 사용할 수 있습니다. 다중 패키지의 접근 제어는 호스팅 계층(서명된 URL, 인증 리버스 프록시 등)에서 처리해야 합니다.

> **단일 파일과 다중 파일 중 무엇을 선택해야 할까요?**
>
> 누군가에게 직접 보내거나 오프라인에서 더블클릭으로 열려면 → `single`(자체 포함 `.html`)을 사용합니다.
>
> 여러 사용자가 접근할 수 있도록 웹 서버/CDN에 호스팅하려면 → `multi`(이 문서에서 설명하는 방식)를 사용합니다. 형상이 작은 청크로 분할되어 **점진적으로 로드**됩니다. 초기 뷰에는 현재 레이아웃의 처음 몇 개 청크만 다운로드하면 되고, 다른 레이아웃과 객체 스냅 데이터는 필요 시 지연 로드됩니다.

---

## 온라인 데모

DWG 웹 뷰잉에 대한 이 **사전 렌더링 + 정적 호스팅** 방식을 직접 체험해 보려면 아래 온라인 데모를 열어 보십시오:

👉 [**DWG 웹 뷰어 온라인 체험**](https://mlightcad.com/cad-viewer/self-contained-html/canteen-progressive/viewer.html)

이 데모는 이 문서에서 설명하는 사전 렌더링 방식을 사용합니다. DWG 도면은 게시 전에 이미 파싱되었고 형상이 테셀레이션되었습니다. 사용자가 웹 페이지를 열 때 원본 DWG 파일을 다시 파싱할 필요가 없으며, 뷰어가 미리 생성된 표시 데이터를 직접 로드합니다.

도면 리소스가 브라우저에 캐시되므로 **페이지를 처음 열 때는 리소스 다운로드를 기다려야 할 수 있지만, 캐시가 형성된 후에는 같은 페이지를 다시 열면 매우 빠릅니다**. 이것이 **사전 렌더링 + 정적 호스팅** 방식이 도면의 게시, 공유, 반복 열람에 특히 적합한 이유 중 하나입니다.

먼저 데모를 체험한 뒤 아래의 아키텍처와 구현 세부 사항을 계속 읽어 보십시오.

---

## 2. 출력: 압축을 풀면 바로 사용 가능한 정적 디렉터리

multi 내보내기는 `.zip` 파일을 생성하지만, **zip은 배포 용도로만 사용됩니다**. 뷰어는 브라우저에서 파일의 압축을 풀지 않습니다. 대신 매니페스트와 개별 청크 파일을 순서대로 가져옵니다. **호스팅 전에 패키지의 압축을 풀어야 합니다:**

```text
my-drawing/
  viewer.html                 # Entry page (HTML/CSS/JS shell + inlined offline viewer runtime)
  my_drawing.acex.json        # Package manifest (small amount of metadata + index)
  chunks/
    L0-000.acex.gz            # Gzip-compressed geometry chunk (ACEC binary, not base64)
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # Gzip-compressed object-snap data (only available in measure mode)
    L1-000.acex.gz            # Chunks for other layouts, lazy-loaded when switching layouts
    ...
```

사용자가 `viewer.html`에 접근한 후의 로딩 순서는 다음과 같습니다:

1. 페이지에 포함된 `#mlcad-package` 구성을 읽고 매니페스트 URL을 얻습니다(기본값: `./{name}.acex.json`);
2. 매니페스트(작은 JSON)를 다운로드하고 레이어, 레이아웃, 범위 및 기타 UI 구성 요소를 초기화합니다;
3. **현재 레이아웃**의 형상 청크를 하나씩 다운로드 → gunzip → 디코드 → 렌더링하여, 준비되는 즉시 각 청크를 표시합니다;
4. 도면을 이미 팬 및 줌할 수 있게 되면 `*.osnap.gz` 객체 스냅 데이터를 다운로드합니다(측정/객체 스냅에 사용);
5. 다른 레이아웃은 사용자가 해당 레이아웃으로 전환할 때만 로드됩니다.

뷰어 런타임은 이미 `viewer.html`에 인라인되어 있으므로 디렉터리에 **추가 JavaScript 의존성이 없습니다**. 기능에는 선택 / 팬 / 줌(범위, 창, 원래 뷰), 레이어 패널, 레이아웃 전환, 측정, 마크업(Design Review 마크업), 객체 스냅, 그리고 중국어 / 영어 / 체코어 / 터키어 내장 다국어 인터페이스가 포함됩니다.

---

## 3. 다중 패키지를 생성하는 세 가지 방법

### 방법 1: cad-viewer 웹 앱에서 수동 내보내기(간헐적 내보내기에 적합)

* [cad-viewer](https://mlightcad.com/cad-viewer/)에서 도면을 열고 `chtml` 명령을 실행하여 내보내기 대화상자를 연 뒤, 내보내기 형식으로 **"Multi-file Package (ZIP)"**를 선택합니다;
* 또는 명령줄에서 `-chtml`을 실행하고 프롬프트에 답하면서 형식으로 **Multi**를 선택합니다:

```text
-chtml
Export format [Single/Multi] <Single>: Multi
...
```

브라우저가 `.zip` 파일을 다운로드합니다.

### 방법 2: 서버 / CI에서 일괄 변환(클라우드 아키텍처에 권장)

헤드리스 CLI 패키지 [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli)는 Playwright를 사용하여 헤드리스 Chromium에서 전체 파싱 + 테셀레이션 + 내보내기 파이프라인을 실행합니다. 변환 서비스나 CI 파이프라인에 통합하기에 이상적입니다.

설치(Node.js 20 이상 필요):

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

내보내기에는 `-chtml` 프롬프트에 한 줄씩 답하는 `.scr` 스크립트가 필요합니다(`Single/Multi`, `Yes/No`, `Extents/Current`, `Measure/View`). CLI 패키지에는 바로 사용 가능한 `examples/export-html-multi.scr`이 포함되어 있습니다(npm 설치 후에는 `node_modules/@mlightcad/cad-simple-viewer-cli/examples/`에, 저장소에서는 [`packages/cad-simple-viewer-cli/examples/`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer-cli/examples/export-html-multi.scr)에 위치):

```text
; Export a multi-file ACEX package (zip)
; Prompt order: export format / export hidden layers / export layouts / initial view / viewer mode
-chtml
Multi
Yes
Yes
Extents
Measure
quit
```

단일 도면 내보내기:

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# Output: ./out/floor-plan.zip
```

일괄 디렉터리 변환, zip 압축 해제 및 게시를 위한 완전한 자동화 솔루션은 섹션 6을 참조하십시오.

프로그래밍 API를 사용하여 자체 변환 서비스에 통합할 수도 있습니다:

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawings/floor-plan.dwg', // HTTP(S) URLs are also supported
  scriptPath: 'node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr',
  outputDir: './out',
  mode: 'read'
})

console.log(savedFiles) // [ 'floor-plan.zip', ... ]
```

### 방법 3: 자체 웹 애플리케이션에서 프로그래밍 방식으로 내보내기

애플리케이션에 이미 `cad-simple-viewer`가 포함되어 있다면(사용자가 웹 애플리케이션에서 도면을 직접 열람), 변환 API를 직접 호출하여 "호스팅 패키지 내보내기"를 제품의 버튼으로 만들 수도 있습니다:

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

// Export a multi package for the currently opened drawing (triggers a .zip download in the browser)
await new AcApHtmlConvertor({ viewerRuntimeUrl: './viewer-runtime.iife.js' })
  .convert('floor-plan.dwg', {
    exportFormat: 'multi',   // Multi-file package; default is 'single'
    viewerMode: 'measure',   // 'measure' (includes measurement/markup/snapping) or 'view' (view-only, smaller)
    exportLayouts: true,     // Whether to include paper space layouts
    exportInvisibleLayers: true, // Whether to include off/frozen layers
    initialView: 'fit'       // 'fit' (extents) or 'current' (current view)
  })
```

하위 수준 API(패키지를 직접 조립하고 디스크에 쓸지 업로드할지 결정):

```typescript
import {
  buildAcExPackage,
  zipAcExPackageFiles,
  unzipAcExPackageFiles
} from '@mlightcad/cad-html-plugin'

// snapshot is built from the Three.js scene by AcApHtmlSnapshotBuilder
const pkg = buildAcExPackage(snapshot, {
  viewerRuntime,          // Text of viewer-runtime.iife.js
  baseName: 'floor-plan'
})

const zipBytes = zipAcExPackageFiles(pkg)     // Package into a zip for download
// Or directly write pkg.files ([{ path, bytes }, ...]) to disk / upload to object storage,
// completely skipping the extraction step:
for (const file of pkg.files) {
  // Write to /var/www/packages/floor-plan/<file.path>
}
```

> **참고:** DWG/DXF 파싱과 장면 구성은 `cad-simple-viewer`의 브라우저 런타임 환경에 의존하므로, **서버 측 변환에는 방법 2(CLI)를 사용해야 합니다**. 방법 3은 내보내기 기능을 자체 웹 기반 제품에 통합하는 데 적합합니다.

---

## 4. 웹 서버에 배포

### 4.1 압축 해제 및 게시

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

게시 후 사용자에게 `https://your-domain/cad-packages/floor-plan/viewer.html` URL을 제공하면 됩니다. 디렉터리를 **도면 ID / 버전 번호**로 구성할 것을 권장합니다(예: `/cad-packages/{drawingId}/{version}/`). 도면이 갱신되면 새 버전 디렉터리를 게시합니다. 이전 버전은 자연스럽게 폐기할 수 있고, 이 구조는 캐싱도 더 쉽게 만듭니다.

### 4.2 서버 요구 사항

정적 파일을 제공할 수 있는 모든 서비스가 동작합니다: nginx, Apache, IIS, `npx serve`, Python `-m http.server`, 그리고 Alibaba Cloud OSS / AWS S3 + CloudFront 같은 객체 스토리지 정적 웹 사이트 호스팅. 요구 사항은 몇 가지뿐입니다:

1. **HTTP(S)를 통해 접근해야 합니다.** 뷰어는 `fetch()`를 사용하여 매니페스트와 청크 파일을 로드합니다. `file://` 프로토콜에서는 동작하지 않으므로 `viewer.html`을 더블클릭하여 로컬 파일로 사용할 수 없습니다.
2. **전체 패키지를 동일한 origin에 호스팅해야 합니다.** 보안상 로더는 `manifestUrl`이 페이지와 동일 origin인지, 청크 파일이 매니페스트와 동일 origin이며 패키지 디렉터리 내부에 있는지 검증합니다(절대 URL과 디렉터리를 벗어나는 `..` 경로는 거부됩니다). 따라서 `viewer.html`, 매니페스트, `chunks/`를 **동일한 사이트 / 동일한 CDN 도메인** 아래에 두십시오. 청크 파일을 다른 도메인으로 분리하지 마십시오. 페이지와 청크를 모두 CDN 도메인에 호스팅하는 것은 전혀 문제없습니다.
3. **`.gz` 파일은 원본 바이트로 반환되어야 하며 `Content-Encoding: gzip` 응답 헤더를 포함해서는 안 됩니다.**

   `.acex.gz` / `.osnap.gz`는 이미 gzip 압축된 바이트이며, 뷰어가 JavaScript에서 직접 gunzip을 수행합니다. 웹 서버(일반적으로 Apache의 `mod_mime`은 기본적으로 `.gz` 확장자에 `AddEncoding gzip gz`를 설정할 수 있으며, 일부 CDN/객체 스토리지 서비스에서 구성한 메타데이터도 마찬가지)가 `Content-Encoding: gzip`을 추가하면 브라우저가 파일을 자동으로 한 번 압축 해제하고, 뷰어가 다시 압축 해제를 시도하여 오류가 발생합니다. 이 파일들이 불투명한 바이너리 데이터로 반환되도록 하십시오(`Content-Type: application/octet-stream`이면 충분하며, 뷰어는 `arrayBuffer`로 읽고 MIME 타입에 의존하지 않습니다). `.acex.json` 매니페스트는 `application/json`을 사용해야 합니다.
4. **캐싱 전략.** 청크 파일 내용은 불변이므로(동일한 버전 디렉터리 내에서는 변경되지 않음), `chunks/`에 긴 캐시 수명(`Cache-Control: public, max-age=31536000, immutable`)을 부여하는 것이 안전합니다. 매니페스트 파일은 짧은 캐시 수명 또는 `no-cache`를 사용하여, 패키지를 동일한 디렉터리에 다시 내보낼 때 클라이언트가 갱신을 빠르게 발견할 수 있도록 해야 합니다. 패키지를 버전별 디렉터리에 게시한다면 전체 디렉터리에 장기 캐싱을 사용할 수 있습니다.

nginx 예시(기본 구성은 `.gz` 파일을 직접 요청할 때 압축/압축 해제하지 않습니다. 여기서는 CDN이나 사용자 정의 구성의 영향을 피하기 위해 명시적으로 선언합니다):

```nginx
server {
    listen 80;
    server_name drawings.example.com;
    root /var/www/cad-packages;

    # Chunk files: opaque bytes, prohibit any Content-Encoding
    location ~* \.(acex|osnap)\.gz$ {
        gzip off;
        default_type application/octet-stream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.acex\.json$ {
        default_type application/json;
        add_header Cache-Control "no-cache";
    }
}
```

Apache 사용자는 `.gz` 확장자에 `AddEncoding gzip .gz`가 활성화되지 않도록 해야 합니다(기본 MIME 구성에서 흔합니다). 필요한 경우 패키지 디렉터리의 `.htaccess`에서 제거합니다:

```apache
<FilesMatch "\.(acex|osnap)\.gz$">
    <IfModule mod_headers.c>
        Header unset Content-Encoding
    </IfModule>
    ForceType application/octet-stream
</FilesMatch>
```

### 4.3 로컬 검증

```bash
# In the extracted package directory
npx serve .
# Open http://localhost:3000/viewer.html
```

도면이 올바르게 표시되고 레이아웃을 전환하고 측정을 수행할 수 있다면 호스팅 구성이 올바른 것입니다.

---

## 5. 내보내기 옵션 선택 방법

| 옵션                    | 설명                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportFormat: 'multi'` | 이 문서에서 설명하는 방식입니다. `'single'`은 자체 포함 단일 파일 HTML입니다                                                                                                                       |
| `viewerMode`            | `'measure'`(기본값): 측정, 마크업, 객체 스냅을 포함하며 `*.osnap.gz` 데이터가 있습니다. `'view'`: 보기 전용(팬/줌/레이어)으로 패키지가 더 작고 초기 렌더링이 더 빠릅니다 |
| `exportLayouts`         | `true`(기본값)이면 도면 공간 레이아웃을 내보냅니다. `false`이면 모델 공간만 내보내며 툴바에 레이아웃 전환이 표시되지 않습니다                                                                      |
| `exportInvisibleLayers` | `true`(기본값)이면 꺼진/동결된 레이어도 내보냅니다. `false`이면 보이는 레이어만 내보내 패키지가 더 작아집니다                                                                                        |
| `initialView`           | `'fit'`(기본값, 열 때 도면을 전체 뷰에 맞춤) 또는 `'current'`(내보내기 시점의 뷰 위치 유지)                                                                                                         |
| 비밀번호 / 만료          | `single` 모드에서만 지원됩니다. 다중 패키지의 경우 호스팅 계층에서 인증(서명된 URL, 접근 토큰이 있는 리버스 프록시 등)을 사용하십시오                                                             |

---

## 6. 종단 간 파이프라인 예시

"변환 → 압축 해제 → 게시"를 수행하는 최소 Node 스크립트(도면 업로드 후 웹훅이나 CI 파이프라인에 연결할 수 있음):

```js
// publish-cad-package.mjs
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { unzipAcExPackageFiles } from '@mlightcad/cad-html-plugin'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const [drawing, publishRoot] = process.argv.slice(2)
const workDir = './.cad-build'

// 1. Headless conversion, producing a zip
const { outputDir } = await runHeadless({
  inputPath: drawing,
  scriptPath: './export-html-multi.scr',
  outputDir: workDir,
  mode: 'read'
})

// 2. Find the generated zip and extract it to the publishing directory
const zipName = (await readdir(outputDir)).find(f => f.endsWith('.zip'))
const zipBytes = await readFile(path.join(outputDir, zipName))
const files = unzipAcExPackageFiles(
  new Uint8Array(zipBytes)
) // Includes path security validation and rejects dangerous entries such as ../
const target = path.join(publishRoot, path.basename(zipName, '.zip'))
for (const file of files) {
  const dest = path.join(target, file.path)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, file.bytes)
}

// 3. Upload/sync to the nginx directory or object storage (rsync, ossutil, aws s3 sync, ...)
console.log(`Published: https://drawings.example.com/${path.basename(target)}/viewer.html`)
```

프로덕션 환경에서는 도면 내용의 해시를 사용하여 중복 변환을 건너뛸지 결정하거나, 실패한 변환을 재시도하거나, `PutObject`로 `pkg.files`를 객체 스토리지에 직접 업로드하는 등의 기능을 추가할 수도 있습니다(방법 3의 `buildAcExPackage`를 사용하면 zip을 만들 필요조차 없습니다).

---

## 7. FAQ

**Q: zip 파일을 서버에 그대로 두고 링크만 제공하면 되지 않나요?**

아니요. zip은 다운로드 및 배포를 위한 패키징 형식일 뿐입니다. 런타임에 뷰어는 압축이 풀린 `viewer.html` / `*.acex.json` / `chunks/*.gz`를 가져옵니다. 서버에서 압축을 풀고 결과 파일을 호스팅하거나, 자체 애플리케이션에서 `unzipAcExPackageFiles`를 사용하여 프런트엔드에서 압축을 풀어야 합니다(동일 origin 및 메모리 문제에 유의하십시오. 큰 도면에는 권장하지 않습니다).

**Q: 페이지를 열면 청크 파일이 404를 반환하거나 로드에 실패합니다.**

페이지가 HTTP(S)를 통해 접근되는지, `chunks/` 디렉터리가 `viewer.html` 및 매니페스트와 함께 배포되었는지, 청크 파일의 이름이 변경되거나 이동되지 않았는지 확인하십시오(매니페스트의 `href` 값은 상대 경로이므로 디렉터리 구조를 유지해야 합니다).

**Q: 청크 파일 다운로드는 성공하지만 파싱에 실패합니다.**

서버가 `.gz` 파일에 `Content-Encoding: gzip`을 추가했을 가능성이 높습니다(브라우저가 자동으로 한 번 압축 해제함). 섹션 4.2의 3번 항목에 따라 응답 헤더를 확인하십시오.

**Q: 청크 파일은 CDN에 두고 페이지는 자체 도메인에 둘 수 있나요?**

현재 로더는 페이지, 매니페스트, 청크 파일이 동일 origin에 있어야 합니다. **전체 패키지 디렉터리**를 CDN 도메인에 게시하고 사용자가 CDN에서 직접 `viewer.html`에 접근하게 하여 CDN 가속의 이점을 누리십시오.

**Q: 내보낸 파일 이름이 `floor-plan-2.zip`이 된 이유는 무엇인가요?**

대상 파일이 이미 존재하면 내보내기 프로세스가 덮어쓰기를 피하기 위해 자동으로 순번을 추가합니다. 다시 내보내기 전에 출력 디렉터리를 삭제하거나 비워서 다음 실행이 오래된 zip을 선택하지 않도록 하십시오.

**Q: 도면이 수정되면 어떻게 되나요?**

변환을 다시 실행하고 새 디렉터리에 게시하십시오(또는 동일한 디렉터리를 덮어쓰고 매니페스트 캐시를 무효화하십시오). 패키지는 표시 데이터의 스냅샷이며 원본 파일의 갱신을 자동으로 따르지 않습니다.

**Q: 원본 도면이 노출되나요?**

패키지에는 선/메시 배치, 레이어 이름, 레이아웃 이름, 범위, 단위 같은 **표시 수준** 데이터만 포함됩니다. DWG/DXF 바이트나 편집 가능한 엔티티 레코드는 포함하지 않습니다. 그러나 여전히 도면 형상의 완전한 표현입니다. 강력한 접근 제어가 필요하다면 호스팅 계층에서 인증을 구현하거나, 비밀번호 및 만료 보호를 지원하는 단일 파일 HTML을 사용하십시오.
