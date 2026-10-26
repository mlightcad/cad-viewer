---
title: "Vue 컴포넌트 통합"
---

# Vue 컴포넌트 통합

**cad-viewer**는 **백엔드 서버 없이** 전적으로 브라우저에서 CAD 파일(DXF, DWG)을 보고 편집하기 위한 **고성능** Vue 3 컴포넌트입니다. 현대적인 사용자 인터페이스, 상태 관리를 제공하며 최적화된 렌더링 엔진과의 원활한 통합을 통해 뛰어난 성능으로 부드러운 브라우저 기반 CAD 워크플로를 구현합니다.

## 주요 기능

- 부드러운 60+ FPS 렌더링을 갖춘 **고성능** CAD 편집 및 보기
- **백엔드 불필요** - 파일은 전적으로 브라우저에서 파싱되고 처리됩니다
- **강화된 데이터 보안** - 파일이 장치를 벗어나지 않아 완전한 프라이버시를 보장합니다
- **로컬 파일 지원** - 파일 대화상자 또는 드래그 앤 드롭을 통해 컴퓨터에서 직접 DWG/DXF 파일을 불러옵니다
- **원격 파일 지원** - URL에서 CAD 파일을 자동으로 불러옵니다
- **손쉬운 통합** - 타사 통합을 위한 서버 설정이나 백엔드 인프라가 필요하지 않습니다
- **사용자 정의 가능한 UI** - 툴바, 명령줄, 좌표 및 성능 통계의 표시 여부를 제어할 수 있습니다
- **사용자 정의 가능한 리소스** - 폰트, 템플릿 및 예제 파일의 기본 URL을 사용자 정의할 수 있습니다
- 대용량 CAD 파일 처리를 위해 최적화된 현대적인 UI
- 레이어, 엔티티 및 설정을 위한 상태 관리
- 최적화된 SVG 및 THREE.js 렌더러와의 통합
- 대화상자, 툴바 및 명령줄 인터페이스
- 자체 앱에 고성능 CAD 뷰어를 포함하기 위한 Vue 3 컴포넌트

## cad-viewer를 선택해야 하는 경우

현대적인 UI, 대화상자, 툴바 및 상태 관리를 갖춘 CAD 파일 보기 및 편집용 **바로 사용할 수 있는 Vue 3 컴포넌트**를 원하는 경우 `cad-viewer`를 사용하십시오. 이 패키지는 다음과 같은 경우에 이상적입니다:

- 최소한의 설정으로 고성능 CAD 뷰어/편집기를 Vue 애플리케이션에 신속하게 포함하고자 하는 경우.
- 로컬 파일 로딩(사용자의 컴퓨터에서)과 원격 파일 로딩(URL에서)을 모두 지원해야 하는 경우.
- 파일 로딩, 렌더링, 레이어/엔티티 관리 및 사용자 상호 작용을 기본으로 처리하는 솔루션이 필요한 경우.
- 최적화된 SVG 및 THREE.js 렌더러, 국제화 및 테마와의 원활한 통합을 원하는 경우.
- **직접** UI를 처음부터 구축하고 싶지 **않은** 경우.

**권장 대상:** 세련된 사용자 인터페이스로 CAD 파일을 표시해야 하는 대부분의 웹 애플리케이션, 대시보드 또는 플랫폼.

## 브라우저 전용 아키텍처

이 Vue 3 컴포넌트는 **백엔드 의존성 없이** 전적으로 브라우저에서 동작합니다. DWG/DXF 파일은 WebAssembly와 JavaScript를 사용하여 로컬에서 파싱되고 처리되므로 다음을 제공합니다:

- **서버 요구 사항 없음** - 정적 파일 호스팅만으로 컴포넌트를 어디에나 배포할 수 있습니다
- **완전한 데이터 프라이버시** - 로컬에서 로드하든 URL에서 로드하든 CAD 파일이 사용자의 장치를 벗어나지 않습니다
- **로컬 파일 지원** - 사용자는 내장 파일 대화상자를 사용하여 컴퓨터에서 직접 파일을 불러올 수 있습니다
- **원격 파일 지원** - URL이 제공되면 자동으로 파일을 불러옵니다
- **즉시 통합** - 복잡한 백엔드 설정이나 API 구성이 필요하지 않습니다
- **오프라인 지원** - 로드된 후에는 인터넷 연결 없이도 동작합니다
- **타사 친화적** - 서버 측 걱정 없이 모든 Vue 3 애플리케이션에 쉽게 포함할 수 있습니다

## 파일 로딩 방법

MlCadViewer 컴포넌트는 CAD 파일을 로드하는 여러 가지 방법을 지원합니다:

### 1. 로컬 파일 로딩
사용자는 컴퓨터에서 직접 파일을 불러올 수 있습니다:
- **파일 대화상자**: 메인 메뉴(☰)를 클릭하고 "열기"를 선택하여 로컬 DWG/DXF 파일을 탐색하고 선택합니다
- **드래그 앤 드롭**: CAD 파일을 뷰어 위로 직접 드래그 앤 드롭합니다(애플리케이션에서 구현된 경우)
- **파일 입력**: 내장 파일 리더 컴포넌트를 사용하여 프로그래밍 방식으로 파일을 선택합니다
- **컴포넌트 속성**: `localFile` 속성에 File 객체를 직접 전달하여 자동으로 로드합니다

#### 예제: 파일 입력과 함께 localFile 속성 사용
```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".dwg,.dxf" 
      @change="handleFileSelect"
    />
    <MlCadViewer 
      :local-file="selectedFile" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'

const selectedFile = ref<File | undefined>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0]
}
</script>
```

### 2. 원격 파일 로딩
URL에서 파일을 자동으로 로드합니다:
- **URL 속성**: `url` 속성을 제공하면 컴포넌트가 마운트될 때 파일을 자동으로 로드합니다
- **동적 로딩**: 컴포넌트를 다시 마운트하지 않고 `url` 속성을 변경하여 다른 파일을 로드합니다

### 3. 지원되는 파일 형식
- **DWG 파일**: 바이너리 AutoCAD 도면 형식(ArrayBuffer로 읽음)
- **DXF 파일**: ASCII/바이너리 AutoCAD 도면 교환 형식(텍스트로 읽음)

## 설치

```bash
npm install @mlightcad/cad-viewer
```

## 사용법

예제로 하위 패키지 `cad-editor-demo`을 참조하십시오.

### 기본 사용법

먼저 package.json에 다음 의존성을 추가합니다.

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @vueuse/core
- element-plus
- vue
- vue-i18n

그런 다음 다음과 같이 vue 컴포넌트를 생성합니다.

```vue
<template>
  <div>
    <!-- For local file loading (users can open files via menu) -->
    <MlCADViewer :background="0x808080" />
    
    <!-- For remote file loading (automatically loads from URL) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :url="'https://example.com/drawing.dwg'" 
    /> -->
    
    <!-- For local file loading (automatically loads from File object) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :local-file="selectedFile" 
    /> -->
    
    <!-- With custom base URL for fonts and templates -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :base-url="'https://my-cdn.com/cad-data/'"
    /> -->
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## MlCadViewer 컴포넌트

`MlCadViewer`는 완전한 CAD 보기 및 편집 인터페이스를 제공하는 메인 Vue 3 컴포넌트입니다. 완전한 기능의 CAD 경험을 위해 툴바, 레이어 관리, 명령줄, 상태 표시줄 및 다양한 대화상자를 포함합니다.

### 컴포넌트 속성(Props)

`MlCadViewer` 컴포넌트는 다음 속성을 받습니다:

| 속성                | 유형                        | 기본값      | 설명                                                                                                                                              |
| ------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`            | `'en' | 'zh' | 'default'` | `'default'` | UI 언어입니다. `'default'`는 브라우저의 로케일을 사용합니다. 뷰어 UI와 Element Plus 컴포넌트 모두에 영향을 줍니다.                                              |
| `url`               | `string`                    | `undefined` | CAD 파일(DWG/DXF)의 원격 URL입니다. 제공되면 마운트 시 파일을 가져와 자동으로 엽니다. 이 속성을 업데이트하면 파일이 동적으로 다시 로드됩니다. |
| `localFile`         | `File`                      | `undefined` | `File` 객체로 된 로컬 CAD 파일입니다. 마운트 시 자동으로 열리고 변경되면 다시 로드됩니다. 둘 다 제공된 경우 **`url`보다 우선합니다**.        |
| `background`        | `number`                    | `undefined` | 24비트 16진수 RGB 값(예: `0x000000`)으로 된 CAD 뷰의 배경색입니다. 변경되면 동적으로 업데이트됩니다.                                  |
| `baseUrl`           | `string`                    | `undefined` | 폰트, 템플릿 및 예제 파일과 같은 외부 리소스를 로드하는 데 사용되는 기본 URL입니다. CDN에 자산을 호스팅할 때 유용합니다.                               |
| `useMainThreadDraw` | `boolean`                   | `false`     | 렌더링 모드를 제어합니다. `false`는 Web Worker를 사용합니다(대규모 도면에 권장). `true`는 메인 스레드에서 렌더링을 강제합니다.                          |
| `theme`             | `'light' | 'dark'`         | `'dark'`    | 뷰어의 초기 테마입니다. 어두운 모드와 밝은 모드를 전환하기 위해 동적으로 업데이트할 수 있습니다.      

### 컴포넌트 이벤트

`MlCadViewer`는 수명 주기 이벤트를 발생시켜 상위 컴포넌트가 뷰어의 생성 및 소멸에 연결할 수 있게 합니다.

| 이벤트     | 페이로드 | 설명                                                                           |
| --------- | ------- | ------------------------------------------------------------------------------------- |
| `create`  | `void`  | CAD 뷰어가 완전히 초기화되어 사용할 준비가 된 후에 발생합니다.          |
| `destroy` | `void`  | CAD 뷰어가 소멸되고 내부 리소스가 해제되기 직전에 발생합니다. |

### UI 설정

`MlCadViewer`는 전역 `AcApSettingManager`(`@mlightcad/cad-simple-viewer`에서 제공)에서 UI 표시 여부를 읽습니다. 뷰어를 렌더링하기 전에 어디서든 이러한 플래그를 구성하여 UI를 사용자 정의할 수 있습니다.

| 설정                  | 유형      | 기본값 | 설명                                                                |
| ------------------------ | --------- | ------- | -------------------------------------------------------------------------- |
| `isShowToolbar`          | `boolean` | `true`  | 메인 툴바의 표시 여부를 제어합니다                                |
| `isShowMainMenu`         | `boolean` | `true`  | 메인 메뉴의 표시 여부를 제어합니다                                   |
| `isShowCommandLine`      | `boolean` | `true`  | 명령줄 인터페이스의 표시 여부를 제어합니다                      |
| `isShowCoordinate`       | `boolean` | `true`  | 좌표 표시의 표시 여부를 제어합니다                          |
| `isShowEntityInfo`       | `boolean` | `true`  | 엔티티 정보 카드의 표시 여부를 제어합니다                     |
| `isShowFileName`         | `boolean` | `true`  | 현재 열린 파일 이름의 표시 여부를 제어합니다               |
| `isShowLanguageSelector` | `boolean` | `true`  | 언어 선택기의 표시 여부를 제어합니다                           |
| `isShowStats`            | `boolean` | `false` | 성능 통계(FPS, 렌더링 시간 등)의 표시 여부를 제어합니다

#### 예제(권장)
```vue
<template>
  <!-- Local file loading - users can open files via main menu -->
  <MlCadViewer locale="en" />
  
  <!-- Remote file loading - automatically loads from URL -->
  <!-- <MlCadViewer 
    locale="en" 
    :url="'https://example.com/drawing.dwg'" 
  /> -->
  
  <!-- Local file loading - automatically loads from File object -->
  <!-- <MlCadViewer 
    locale="en" 
    :local-file="selectedFile" 
  /> -->
  
  <!-- Custom baseUrl for fonts and templates -->
  <!-- <MlCadViewer 
    locale="en" 
    :base-url="'https://my-cdn.com/cad-data/'"
  /> -->
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// Configure global UI flags before the viewer mounts
AcApSettingManager.instance.isShowCommandLine = false
// Optional toggles
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = true
// AcApSettingManager.instance.isShowCoordinate = false
</script>
```

#### 참고 사항

- 설정은 전역이며 `MlCadViewer`에 즉시 반영됩니다.
- 동일한 `AcApSettingManager.instance` 참조를 사용하여 런타임에 변경할 수 있습니다.

### 기본 URL 구성

`baseUrl` 속성을 사용하면 CAD 뷰어가 폰트, 템플릿 및 예제 파일을 로드하는 위치를 사용자 정의할 수 있습니다. 이는 특히 다음과 같은 경우에 유용합니다:

- **자체 호스팅 리소스**: CDN이나 서버에 자체 폰트와 템플릿을 호스팅합니다
- **기업 환경**: CAD 리소스에 내부 서버를 사용합니다
- **오프라인 배포**: 로컬 파일 시스템에서 리소스를 제공합니다
- **사용자 정의 브랜딩**: 자체 템플릿과 폰트를 사용합니다

#### 기본 동작
`baseUrl`이 제공되지 않으면 뷰어는 기본 URL인 `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`을 사용합니다

#### 리소스 구조
사용자 정의 `baseUrl`을 사용할 때 서버에 다음 구조가 있는지 확인하십시오:
```
your-base-url/
├── fonts/           # Font files for text rendering
├── templates/       # Drawing templates (e.g., acadiso.dxf)
└── examples/        # Example CAD files
```

#### 예제: 사용자 정의 기본 URL
```vue
<template>
  <MlCadViewer 
    :base-url="'https://my-company.com/cad-resources/'"
    :url="'https://my-company.com/drawings/project.dwg'"
  />
</template>
```

이 구성은 다음과 같이 동작합니다:
- `https://my-company.com/cad-resources/fonts/`에서 폰트를 로드합니다
- `https://my-company.com/cad-resources/templates/`에서 템플릿을 로드합니다
- "Quick New" 작업에 사용자 정의 기본 URL을 사용합니다

### 컴포넌트 기능

`MlCadViewer` 컴포넌트는 다음을 포함합니다:

- **메인 메뉴** - 파일 작업(로컬 파일 열기 포함), 뷰 제어 및 설정
- **툴바** - 그리기 도구, 확대 제어 및 선택 도구
- **레이어 관리자** - 레이어 가시성 및 속성 관리
- **명령줄** - AutoCAD 스타일 명령 입력
- **상태 표시줄** - 현재 위치, 확대 수준 및 시스템 상태
- **대화상자 관리자** - 다양한 작업을 위한 모달 대화상자
- **파일 리더** - 파일 대화상자 및 드래그 앤 드롭을 통한 로컬 파일 로딩
- **엔티티 정보** - 선택한 엔티티에 대한 상세 정보
- **언어 선택기** - UI 언어 전환
- **테마 지원** - 어두운/밝은 모드 전환

### 이벤트 처리

컴포넌트는 다양한 이벤트를 자동으로 처리합니다:

- **파일 로딩** - 로컬 파일 로딩(파일 대화상자 경유), 드래그 앤 드롭 및 URL 기반 파일 로딩을 지원합니다
- **오류 메시지** - 실패한 작업에 대해 사용자 친화적인 오류 메시지를 표시합니다
- **폰트 로딩** - 누락된 폰트를 적절한 알림과 함께 처리합니다
- **시스템 메시지** - 상태 업데이트 및 작업 피드백을 표시합니다

### 고급 사용법

다음 고급 사용법을 알아보려면 [Vue 컴포넌트 통합](./)을 참조하십시오.

- DWG 형식의 도면을 표시하기 위해 DWG 변환기 등록
- 자체 서버에서 폰트를 로드하기 위한 폰트 로더 정의
- 도면 생성 또는 도면 수정

## 사용 가능한 내보내기

### 메인 컴포넌트

- `MlCADViewer` - 메인 CAD 뷰어 컴포넌트

### 명령

- `AcApLayerStateCmd` - 레이어 상태 명령
- `AcApLogCmd` - 로그 명령
- `AcApMissedDataCmd` - 누락된 데이터 명령
- `AcApPointStyleCmd` - 점 스타일 명령

### 컴포넌트

- `MlPointStyleDlg` - 점 스타일 대화상자
- `MlReplacementDlg` - 대체 대화상자
- 다양한 레이아웃 및 UI 컴포넌트

### 컴포저블

- `useCommands` - 명령 관리
- `useCurrentPos` - 현재 위치 추적
- `useDark` - 어두운 모드 지원
- `useDialogManager` - 대화상자 관리
- `useFileTypes` - 파일 형식 유틸리티
- `useLayers` - 레이어 관리
- `useLayouts` - 레이아웃 관리
- `useMissedData` - 누락된 데이터 처리
- `useSettings` - 설정 관리
- `useSystemVars` - 시스템 변수

### 로케일

- `i18n` - 국제화 인스턴스
- 영어 및 중국어 언어 파일

### 스타일

- 스타일링을 위한 CSS 및 SCSS 파일
- 어두운 모드 지원
- Element Plus 통합
