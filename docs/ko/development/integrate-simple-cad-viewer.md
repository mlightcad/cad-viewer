---
title: "Simple Viewer 통합"
---

# Simple Viewer 통합

**cad-simple-viewer**는 문서 관리, 명령 처리 및 UI와 렌더링 엔진 간의 협업 등 CAD 뷰어의 **고성능** 핵심 컴포넌트를 제공합니다. 대용량 CAD 파일을 처리할 때 최적의 성능을 발휘하도록 설계되었습니다.

이 모듈은 UI 프레임워크에 의존하지 않으며 캔버스 외에는 UI를 제공하지 않습니다. 고성능 CAD 뷰어를 자체 UI와 함께 웹 애플리케이션에 통합하려면 이 모듈이 올바른 선택입니다.

## 주요 기능
- 대용량 파일에 최적화된 문서 관리
- 효율적인 명령 스택 및 실행 취소/재실행 작업
- 렌더링 엔진과의 최적화된 통합
- 성능 중심의 설정 및 컨텍스트 관리
- 최대한의 유연성을 위한 프레임워크 독립적 설계

## cad-simple-viewer를 선택해야 하는 경우

UI 프레임워크 의존성 없이 **핵심 CAD 로직만**(문서 관리, 명령 스택, 렌더링 엔진 통합) 필요한 경우 `cad-simple-viewer`를 사용하십시오. 이 패키지는 다음과 같은 경우에 이상적입니다:

- **자신만의 사용자 정의 UI**를 구축하거나 CAD 기능을 Vue가 아닌 또는 웹이 아닌 환경에 통합하고자 하는 경우.
- 대용량 CAD 파일을 처리하기 위한 최대한의 유연성과 성능이 필요하며, 로직을 자신의 렌더링 또는 UI 계층에 연결할 계획인 경우.
- 필수 CAD 작업 및 캔버스 렌더링만 제공하는 프레임워크 독립적인 솔루션을 원하는 경우.

**권장 대상:** 사용자 정의 통합, 헤드리스 CAD 처리 또는 고도로 맞춤화된 CAD 솔루션을 구축하는 고급 사용자.

## 설치

```bash
npm install @mlightcad/cad-simple-viewer
```

## 사용법

기본 사용법 및 고급 사용법은 [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example)을 참조하십시오.

통합은 두 단계로 이루어집니다. 먼저 **애플리케이션을 초기화**하고(`AcApDocManager` 싱글턴을 한 번 생성), 다음으로 **도면을 엽니다**.

### 애플리케이션 초기화

`AcApDocManager`는 `cad-simple-viewer`의 진입점입니다. 싱글턴으로 동작하며, 시작 시 `AcApDocManager.createInstance(options)`를 한 번 호출한 뒤 `AcApDocManager.instance`를 통해 접근합니다. `createInstance`를 다시 호출하면 기존 인스턴스가 반환될 뿐 새 옵션은 적용되지 않습니다.

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const docManager = AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  autoResize: true,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
})
```

모든 옵션은 선택 사항이며 `AcApDocManagerOptions` 인터페이스로 정의됩니다.

#### 캔버스와 레이아웃

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | 새 요소 | 캔버스를 담는 HTML 컨테이너. 생략하면 새 요소가 생성되므로 직접 DOM에 삽입해야 합니다. |
| `width` | `number` | 컨테이너 너비 | 캔버스 너비(픽셀). |
| `height` | `number` | 컨테이너 높이 | 캔버스 높이(픽셀). |
| `autoResize` | `boolean` | `false` | `true`이면 캔버스가 컨테이너 크기 변화(창 리사이즈, 사이드바 접기 등)를 자동으로 따라갑니다. |
| `busyIndicatorHost` | `HTMLElement` | `container` | 사용 중 오버레이(예: 내보내기 스피너)를 표시할 호스트 요소. 리본, 도구 모음, 상태 표시줄까지 가릴 수 있도록 뷰어 외부 셸을 지정하는 것이 좋습니다. |

#### 렌더링과 폰트

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `useMainThreadDraw` | `boolean` | `false` | MTEXT 엔티티를 어디에서 렌더링할지 제어합니다. `true`: 메인 스레드 — 피크 메모리는 적지만 첫 화면이 느립니다. `false`: Web Worker — 메모리는 더 쓰지만 도면이 더 빨리 표시됩니다. |
| `preloadDefaultFonts` | `boolean` | `false` | `true`이면 초기화 시 기본 폴백 폰트 체인을 미리 로드합니다. 기본값에서는 텍스트를 그릴 때 필요에 따라 폰트를 로드합니다. |

#### Worker와 리소스

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://cdn.jsdelivr.net/gh/mlightcad/cad-data` | 폰트, 도면 템플릿 등 런타임 리소스를 가져오는 베이스 URL. 오프라인·자체 호스팅 배포에서는 자신의 리소스 복사본을 가리킵니다. |
| `webworkerFileUrls` | `AcApWebworkerFiles` | – | Worker 번들 URL: `mtextRender`(MTEXT 레이아웃/글리프 Worker)와 `dwgParser`(선택적 DWG 파싱 Worker, 준비 상태 확인에 사용). 번들러 관련 주의 사항은 [Worker URL 구성](./configure-worker-urls)을 참조하세요. |
| `checkWorkersOnInit` | `boolean` | `false` | `true`이면 초기화 후 설정된 Worker 스크립트 URL을 HEAD 요청으로 검증하고, 그 결과를 `AcApDocManager.instance.workersReady`와 `workersReady` 이벤트로 노출합니다. |

#### UI와 제품 스위치

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `builtinOpenFileDialog` | `boolean` | `true` | `false`이면 내장 OPEN 명령의 파일 피커를 설치하지 않습니다(자체 열기 UI를 갖춘 경우 유용). |
| `disableExport` | `boolean` | `false` | `true`이면 도면 내보내기 명령과 관련 UI 진입점(`cdxf`, `pngout`, `jpgout`, `bmpout`, HTML/PDF/SVG 내보내기)을 등록하지 않습니다. 이는 제품/UX 차원의 스위치이지 DRM이 아닙니다 — 도면 데이터는 여전히 메모리에 존재합니다. |
| `docsBaseUrl` | `string` | MLightCAD 문서 사이트 | 앱 내 도움말 링크가 사용하는 현지화된 사용자 가이드 루트 URL. |
| `commandAliases` | `Record<string, string \| string[]>` | 내장 별칭 | 명령 전역 이름 기준으로 별칭을 재정의합니다. 예: `{ LINE: ['L', 'LN'], CIRCLE: 'CI' }`. 지정하지 않은 명령은 내장 별칭을 유지합니다. |

#### 플러그인과 열기 기본값

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `plugins` | `{ fromConfig?, fromFolder? }` | – | 초기화 중 플러그인을 자동 로드합니다. `fromConfig`는 플러그인 인스턴스나 팩토리 함수를, `fromFolder`는 폴더에서 플러그인 파일을 로드합니다(`folderPath`, `pluginList`, `continueOnError`). 자세한 내용은 [플러그인 시스템](./plugin-system) 참조. |
| `openDocumentDefaults` | `AcApOpenDatabaseOptions` 또는 `() => AcApOpenDatabaseOptions \| Promise<...>` | – | 내장 OPEN 대화상자로 파일을 열 때 적용할 기본 옵션. 정적 객체 또는 동기/비동기 팩토리를 지정할 수 있습니다. 이후 `AcApDocManager.instance.setOpenDocumentDefaults(...)`로 갱신할 수 있습니다. |

#### DWG 컨버터 등록

`cad-simple-viewer`는 기본적으로 DWG 컨버터를 등록하지 **않습니다**(LibreDWG는 GPL 라이선스). DWG 파일을 열려면 열기 전에 `@mlightcad/libredwg-converter` 같은 컨버터를 등록하세요:

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: './workers/libredwg-parser-worker.js'
  })
)
```

### 도면 열기

문서 관리자는 두 가지 열기 방법을 제공합니다. 둘 다 `Promise<boolean>`을 반환하며 성공적으로 열리면 `true`로 해석됩니다:

```typescript
// 1. URL에서 열기(파일 가져오기는 뷰어가 담당)
await docManager.openUrl('https://example.com/plan.dwg', options)

// 2. 이미 가진 파일 내용에서 열기(파일 입력 등)
const success = await docManager.openDocument(
  'plan.dwg',               // 파일 이름의 확장자로 DWG/DXF 결정
  await file.arrayBuffer(), // ArrayBuffer 형태의 파일 내용
  options
)
```

두 메서드 모두 같은 `AcApOpenDatabaseOptions` 객체를 받습니다. 생략하면 관리자가 `drawNoPlotLayers: false`와 `progressiveRendering: false`를 적용합니다. 이 타입은 뷰어 수준 옵션과 `@mlightcad/data-model`의 기본 `AcDbOpenDatabaseOptions`를 결합한 것입니다.

#### 뷰어 옵션

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `mode` | `AcEdOpenMode` | – | 접근 모드: `Read`(0, 보기 전용), `Review`(4, 검토, Read와 호환), `Write`(8, 완전한 읽기/쓰기, 나머지와 호환). 값이 큰 모드는 작은 모드와 호환됩니다. 기본 `openViewMode`도 이 값으로 결정됩니다(아래 참조). |
| `progressiveRendering` | `boolean` | `false` | 도면 변환 중에 점진적으로 그릴지 제어합니다. `false`: 모든 엔티티의 변환이 끝날 때까지 캔버스를 다시 그리지 않고, 지연된 텍스트/INSERT 글리프 작업이 끝날 때까지 열기 오버레이가 유지됩니다. `true`: 엔티티 변환이 이벤트 루프를 넘나들며 양보하여 배치 단위로 그려집니다. 파싱과 변환 진행 표시가 끝나면 팬/줌이 가능해지고, 나머지 지오메트리는 백그라운드에서 계속 변환됩니다. 큰 도면의 대화형 보기에는 `true`, 스크린샷이나 결정론적 첫 프레임이 필요하면 `false`를 사용하세요. |
| `openViewMode` | `AcApOpenViewMode` | Read/Review는 `Extents`, Write는 `Saved` | 사용자가 아직 조작하지 않은 레이아웃을 어떻게 프레이밍할지 결정합니다. `Extents`(`'extents'`)는 변환된 지오메트리에 맞춰 줌합니다. `Saved`(`'saved'`)는 AutoCAD가 저장한 뷰를 복원합니다(모델 공간은 VPORT `*ACTIVE`, 페이퍼 공간은 실제 뷰포트가 있으면 레이아웃 한계, 없으면 뷰포트 상자). |
| `sysVars` | `AcApOpenSysVars` | – | 데이터베이스를 열 때 재정의할 시스템 변수. 키는 시스템 변수 이름(대소문자 구분 없음), 값은 `number`, `boolean`, `string`, `AcCmColor`를 사용할 수 있습니다. 일반적인 예: `lwdisplay: false`로 선 가중치 숨기기, `paperbkcolor`로 페이퍼 공간 배경색 설정. |
| `convertInvisibleLayers` | `boolean` | `false` | `true`이면 꺼짐/동결 레이어의 엔티티도 열기 시점에 변환하여 오프라인 HTML/PDF 내보내기에서 2차 변환이 필요 없게 됩니다. 대화형 보기에서는 `false`로 두세요(레이어를 켤 때 변환됩니다). |
| `convertAllLayouts` | `boolean` | `false` | `true`이면 열기 중/직후 모든 페이퍼 공간 레이아웃을 등록·변환하여, 내보내기가 사용자가 각 레이아웃 탭을 방문하기를 기다리지 않아도 됩니다. |
| `skipSpatialIndex` | `boolean` | `false` | `true`이면 엔티티 변환 중 계층형 공간 인덱스 구축을 건너뜁니다. 이 인덱스는 대화형 픽과 스마트 익스텐트에 사용됩니다. 헤드리스 HTML/JPEG 내보내기는 씬 배치만 필요하므로 시간과 메모리를 절약할 수 있습니다. |
| `cooperativeYield` | `boolean` | `true` | `false`이면 엔티티 변환 중 협력적 `setTimeout` 양보를 비활성화하고 중간 WebGL 그리기를 건너뜁니다. 헤드리스 스크립트는 반응형 UI가 필요 없으므로 양보를 끄면 열기 소요 시간이 줄어듭니다. |

#### 데이터베이스 옵션(`@mlightcad/data-model`에서 상속)

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `minimumChunkSize` | `number` | – | 처리 청크당 최소 엔티티 수. 클수록 스케줄링 오버헤드가 줄어듭니다. 공식 예제에서는 `1000`을 사용. 상한은 엔티티 총수. |
| `timeout` | `number` | 컨버터 기본값 | Web Worker 파싱 타임아웃(밀리초). 선택한 컨버터가 Worker에서 파싱할 때만 유효. |
| `encoding` | `string` | 자동 감지 | 레이어 이름, 주석, 텍스트, 속성의 텍스트 인코딩 재정의(예: `'gbk'`, `'euc-kr'`). 생략 시 DXF는 `$DWGCODEPAGE`를, DWG는 헤더의 코드 페이지를 읽습니다. 명시적 지정은 자동 감지보다 우선하며, 코드 페이지 선언이 없거나 잘못된 파일에 유용합니다. |
| `drawNoPlotLayers` | `boolean` | `false` | 인쇄 불가 레이어(Defpoints, `*-NPLT` 등)의 엔티티를 그릴지 여부. `true` = 데스크톱 AutoCAD 의미론(화면에 표시), `false` = 웹/배포 뷰어 의미론(숨김). `AcApDocManager`는 기본값을 `false`로 둡니다. |
| `circleSides` | `number` | `50`(초안) | 원을 테셀레이션할 최대 세그먼트 수. 작을수록 GPU 메모리를 절약하고 HTML 내보내기가 작아지며, 클수록 매끄럽습니다. DXF VPORT 허용 범위로 클램프됩니다. 짧은 호는 더 적은 세그먼트를 사용합니다. |
| `fileName` | `string` | – | 도면 파일 이름(확장자 포함). 열린 데이터베이스의 읽기 전용 `DWGNAME` 시스템 변수를 갱신합니다. |

#### 폐기된 옵션

| 옵션 | 상태 |
| --- | --- |
| `waitForTextGeometry` | 무시됨. 점진 렌더링의 두 단계 모두 이제 `progressiveRendering`이 제어합니다. 전달하면 경고가 출력됩니다. |
| `fontLoader`, `failOnFontLoadError` | 제거됨. 폰트는 텍스트 렌더러가 그릴 때 지연 로드합니다. 전달하면 경고가 출력됩니다. |

#### 예제

```typescript
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  layoutBackgroundColorFromRgb
} from '@mlightcad/cad-simple-viewer'

const options = {
  mode: AcEdOpenMode.Write,
  minimumChunkSize: 1000,
  progressiveRendering: true,
  openViewMode: AcApOpenViewMode.Extents,
  sysVars: {
    lwdisplay: false,
    paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
  }
}

const success = await AcApDocManager.instance.openDocument(
  'plan.dwg',
  await file.arrayBuffer(),
  options
)
if (!success) {
  console.error('도면을 열지 못했습니다')
}
```

열기 수명 주기를 추적하려면 `AcApDocManager.instance.events`의 이벤트를 구독하세요: `documentToBeOpened`, `documentCreated`, `documentToBeActivated`, `documentActivated`, `documentToBeDestroyed`, `documentDestroyed`.

### 도면 실시간 수정

`cad-simple-viewer`는 도면을 DWG/DXF 파일로 저장하는 기능을 지원하지 않지만, **도면을 실시간으로 수정**하는 데 대한 포괄적인 지원을 제공합니다. 도면 내에서 엔티티를 추가, 편집 및 삭제할 수 있으며, 뷰어는 이러한 변경 사항을 반영하여 자동으로 업데이트됩니다.

엔티티를 수정할 때는 기본 도면 데이터베이스와 직접 작업하게 됩니다. 뷰어는 이러한 변경 사항을 자동으로 감지하고 그에 따라 표시를 업데이트합니다. 이러한 실시간 동기화는 다음을 보장합니다:

- 모든 수정 사항이 즉시 표시됩니다
- 명령 스택이 실행 취소/재실행 작업을 위해 변경 사항을 적절하게 추적합니다. 이 기능은 곧 구현될 예정입니다.

이 기능 덕분에 `cad-simple-viewer`는 CAD 파일을 표시할 뿐만 아니라 사용자가 도면 내용과 상호 작용하고 이를 수정할 수 있어야 하는 애플리케이션에 적합합니다.

**중요 참고 사항**: `cad-simple-viewer`의 사용 패턴은 **AutoCAD RealDWG와 매우 유사합니다**. AutoCAD RealDWG 개발에 익숙하다면 API 구조와 워크플로가 거의 동일하다는 것을 알게 될 것입니다. 주요 차이점은 네이티브 RealDWG 라이브러리 대신 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/)를 사용한다는 것입니다.

[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example)에서는 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/)를 사용하여 도면을 생성하는 방법을 보여줍니다.

## MLightCAD에서의 역할

이 패키지는 핵심 로직 계층으로서, 프런트엔드 UI를 렌더링 엔진과 연결하고 모든 문서 관련 작업을 관리합니다.
