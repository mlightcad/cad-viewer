---
title: "파일 열기 패널(랜딩 UI)"
---

# 파일 열기 패널(랜딩 UI)

이 페이지는 **`/file-open-panel`** 서브경로를 통해 **`@mlightcad/cad-simple-viewer`** 를 크리티컬 경로에서 제외하는 **랜딩 페이지 파일 선택기** 구축 방법을 설명합니다.

**DocManager 호스트는 [`acuiCreateFileOpenSession`](#quick-start-recommended)을 우선**하십시오 — 랜딩 UI 마운트, 뷰어 지연 생성, 클라우드 소스 attach, 도면 열기를 처리합니다. 직접 열기 흐름을 제어할 때(예: Vue `MlCadViewer` props) [`AcUiFileOpenLanding`](#acuifileopenlanding-custom-open)을 사용하십시오. 사용자 지정 메뉴 배선이 필요할 때만 저수준 [`AcUiFileOpenPanel`](#low-level-acuifileopenpanel)을 사용하십시오.

클라우드 출처(OneDrive, Google Drive, 사용자 정의 소스) 구현은 [데이터 소스 플러그인](./data-source-plugin)을 참조하십시오.

---

## 왜 별도 엔트리인가?

**메인** `@mlightcad/cad-simple-viewer` 패키지에서 파일 열기 UI를 import하면 홈 / 업로드 화면 첫 페인트에 `AcApDocManager`, three.js, 명령/뷰 스택이 끌려 들어갔습니다.

**1.8.0**부터 DocManager 없는 서브경로를 사용하십시오:

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

session은 사용자가 무언가를 열 때만 `createDocManager`를 호출합니다 — 보통 메인 패키지의 동적 import입니다.

참고 앱:

- `packages/cad-simple-viewer-demo` — `acuiCreateFileOpenSession` + 지연 `AcApDocManager.createInstance`
- `packages/cad-editor-demo` — `AcUiFileOpenLanding` + `defineAsyncComponent(MlCadViewer)`

---

## 빠른 시작(권장) {#quick-start-recommended}

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'

const session = acuiCreateFileOpenSession({
  host: document.getElementById('file-open-host')!,
  theme: 'dark',
  showNewDrawing: true,
  createDocManager: async () => {
    const { AcApDocManager, AcApSettingManager } = await import(
      '@mlightcad/cad-simple-viewer'
    )
    AcApSettingManager.configure({ storageKey: 'my-app.settings' })
    if (!AcApDocManager.tryGetInstance()) {
      AcApDocManager.createInstance({ container: viewerEl /* … */ })
    }
    return AcApDocManager.instance
  },
  getOpenOptions: () => ({ mode: /* … */ })
})

// 선택적 클라우드 소스(동적 import로 SDK를 첫 페인트에서 제외):
const oneDriveEnv = /* … */
if (oneDriveEnv) {
  const { AcApOneDriveDataSource } = await import(
    '@mlightcad/cad-onedrive-plugin'
  )
  const source = new AcApOneDriveDataSource(oneDriveEnv, session.manager)
  session.registerSource(source)
  await source.restoreSession()
}
```

각 열기마다 session은:

1. `createDocManager`를 **한 번** 호출(이후 캐시)
2. `attachSourcesTo(docManager.dataSourceManager)`로 MSAL / GIS 클라이언트 재사용
3. `openDocument` / `openUrl` / `newDocument` 실행

선택적 훅: `onBeforeOpen`, `onPrepareOpen`(DocManager 준비 후), `onAfterOpen`.

랜딩 화면을 해제할 때 `session.dispose()`를 호출하십시오. 프로그램적 열기: `session.open({ kind: 'file' | 'url' | 'new', … })`.

---

## Session 옵션

| 옵션 | 설명 |
|--------|-------------|
| `host` | 패널 루트를 받는 요소 |
| `createDocManager` | DocManager 유사 객체 반환(`dataSourceManager` + 열기 API) |
| `getOpenOptions?` | openDocument / openUrl / newDocument에 전달 |
| `onBeforeOpen?` / `onPrepareOpen?` / `onAfterOpen?` | 수명 주기 훅 |
| `theme?` / `cardSize?` / `showUrl?` / `showNewDrawing?` / `manager?` / … | landing 파사드와 동일한 chrome 옵션 |

유용한 API: `landing`, `manager`, `registerSource()`, `open()`, `ensureDocManager()`, `dispose()`.

---

## `AcUiFileOpenLanding`(사용자 정의 열기) {#acuifileopenlanding-custom-open}

호스트가 직접 도면을 열 때(Vue store + `MlCadViewer`, 사용자 정의 진행 UI 등):

```ts
import {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenRequest
} from '@mlightcad/cad-simple-viewer/file-open-panel'

const landing = new AcUiFileOpenLanding({
  host,
  showNewDrawing: true,
  onOpen: (request: AcUiFileOpenRequest) => {
    void openWithViewer(request) // 사용자 코드
  }
})

// DocManager / 뷰어 존재 후:
landing.attachSourcesTo(AcApDocManager.instance.dataSourceManager)
// 또는: acuiAttachDataSources(landing.manager, …)
```

`AcUiFileOpenRequest`: `{ kind: 'file'; file }` | `{ kind: 'url'; url }` | `{ kind: 'new' }`.

---

## 패널 UI의 역할

session과 landing 모두 `AcUiFileOpenPanel`을 마운트합니다:

| 영역 | 동작 |
|------|------|
| 카드 본문 | 로컬 드롭존, URL 행, 또는 클라우드「파일 선택」/ 계정 chrome |
| 하단 chevron | **로컬**, **URL**, 등록된 클라우드 소스 |
| 선택 | **새 도면** 버튼 |

패널은 **절대** `AcApDocManager`에 직접 접근하지 않습니다.

---

## 지연 로드 참고

1. landing / session 코드는 `@mlightcad/cad-simple-viewer/file-open-panel`만 import.
2. `createDocManager`(또는 `onOpen` 핸들러)가 메인 패키지를 동적 import.
3. `createInstance` 이후 내보내기 플러그인 / OneDrive `/register` 등록; 클라우드 플러그인은 landing 레지스트리에서 이미 attach된 source 재사용 가능.

랜딩에 에디터 없이 Vue i18n이 필요하면 `@mlightcad/cad-editor/locale`을 우선하십시오.

---

## 저수준 `AcUiFileOpenPanel` {#low-level-acuifileopenpanel}

사용자 정의 `onDataSourceAction` / `onResult` 배선이 필요한 고급 호스트는 `AcUiFileOpenPanel`을 직접 사용할 수 있습니다. 새 통합은 session 또는 landing 파사드를 우선하십시오.

---

## 체크리스트

- [ ] 랜딩은 메인 패키지가 아닌 `/file-open-panel` import
- [ ] DocManager 호스트는 `acuiCreateFileOpenSession` 우선
- [ ] 사용자 정의 열기 호스트는 `AcUiFileOpenLanding` + `attachSourcesTo`
- [ ] 클라우드 플러그인 패키지는 동적 import
- [ ] 로그인과 선택은 별도 사용자 제스처 유지

---

## 관련 문서

- [데이터 소스 플러그인](./data-source-plugin) — `AcApDataSource`, 메뉴 헬퍼, 클라우드 플러그인 작성
- [Simple Viewer 통합](./integrate-simple-cad-viewer) — 랜딩 이후 `AcApDocManager`
- [Vue 컴포넌트 통합](./integrate-cad-viewer-component) — `MlCadViewer`
- [내장 플러그인](./built-in-plugins) — OneDrive / Google Drive 패키지
- [현지화](./localization) — `main.dataSource.*` 문자열
- [업그레이드](./upgrade-guide) — 1.8.0의 `/file-open-panel` 및 `/locale` 서브경로
