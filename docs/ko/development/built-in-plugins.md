---
title: "내장 플러그인"
---

# 내장 플러그인

MLightCAD는 일련의 공식 플러그인을 제공합니다. 각 플러그인은 하나의 관심사(UI 프레임, AI 어시스턴트, 내보내기/가져오기 파이프라인, 클라우드 데이터 소스)에 집중하며 필요에 따라 조합할 수 있습니다.

플러그인 메커니즘 자체(`AcApPlugin`, 플러그인 관리자, 지연 로딩, 자신만의 플러그인 작성 방법)에 대해서는 [플러그인 시스템](./plugin-system)을 참조하십시오. 설치, 등록 및 전체 API 세부 사항은 각 패키지의 README에 있습니다 — 아래 링크를 참조하십시오.

## 플러그인 개요

| 패키지 | 역할 | 명령 / 기능 |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin) | `cad-simple-viewer`를 위한 **툴바, 레이어 관리자 및 리뷰 팔레트 UI**(순수 DOM, Vue/React 없음) | `layer`, `markuppanel`, 기본 툴바(뷰, 측정, 내보내기, 리뷰, 테마, 로캘) |
| [`@mlightcad/cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) | **자연어 CAD 에이전트**(AI 채팅 패널 + 도면 도구 호출) | `agent` |
| [`@mlightcad/cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) | **수동 CAD 스크립트 콘솔**(도면에 대해 검증된 스크립트 실행, LLM/API 키 불필요) | `cadscript` |
| [`@mlightcad/cad-html-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin) | 도면을 **자체 포함 오프라인 HTML**로 내보내기 | `chtml`(`cad-viewer`의 대화상자), `-chtml`(명령줄) |
| [`@mlightcad/cad-pdf-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin) | **PDF 내보내기 및 가져오기**(벡터 파이프라인) | `cpdf`, `ipdf` |
| [`@mlightcad/cad-svg-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin) | **SVG 내보내기** 및 공유 벡터 렌더러(PDF 내보내기에서도 사용) | `csvg` |
| [`@mlightcad/cad-onedrive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin) | **OneDrive 데이터 소스** — OneDrive/SharePoint에서 DWG/DXF 열기 | `AcApDataSource` 등록(`onedrive`); 2단계 로그인 → 열기(팝업 차단 안전) |
| [`@mlightcad/cad-google-drive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin) | **Google Drive 데이터 소스** — Google Drive에서 DWG/DXF 열기 | `AcApDataSource` 등록(`googledrive`); 2단계 로그인 → 열기(팝업 차단 안전) |

명령으로 트리거되는 모든 플러그인은 **지연 로드**됩니다: 작은 등록 스텁이 미리 등록되고, 무거운 번들은 사용자가 트리거 명령을 실행할 때만 다운로드됩니다. 등록 API에 대해서는 [플러그인 시스템 — 플러그인 등록](./plugin-system#플러그인-등록)을 참조하십시오.

---

## UI 플러그인

### `@mlightcad/cad-simple-ui-plugin` — simple viewer를 위한 UI 프레임

[`cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer)는 의도적으로 **애플리케이션 UI 없이** 출시됩니다 — 캔버스와 CAD 코어만 제공합니다. simple viewer를 자신의 웹 앱에 포함시키면서 완전한 Vue 기반 [`cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-viewer) 셸을 채택하지 않고 바로 사용할 수 있는 UI를 원한다면, **`cad-simple-ui-plugin`이 의도된 UI 레이어입니다**.

제공하는 기능:

- **구성 가능한 툴바**(어느 가장자리에든 배치 가능, 기본 CAD 명령, 중첩 메뉴, 사용자 정의 항목)
- **도크 패널** — **레이어 관리자** 탭(레이어 켜기/끄기, ACI 색상 선택기, 더블클릭 시 해당 레이어로 확대)과 **리뷰 팔레트** 탭(마크업 목록, 상태, 댓글)
- 호스트 엘리먼트의 `COLORTHEME` 시스템 변수 및 `--ml-ui-*` CSS 토큰과의 **테마 동기화**
- `AcApI18n`과의 **로캘 동기화**(영어/중국어/체코어/터키어)

모든 위젯은 프레임워크에 종속되지 않습니다(순수 DOM). 완전한 Vue `cad-viewer` 앱은 자체 Element Plus UI를 갖고 있어 이 플러그인이 필요하지 않습니다. `cad-simple-viewer`를 직접 기반으로 빌드할 때 `cad-simple-ui-plugin`을 사용하십시오.

→ **빠른 시작, 툴바 사용자 정의 및 옵션:** [packages/cad-simple-ui-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI 도면 어시스턴트

[`cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin)은 `cad-simple-viewer` 기반 앱에 **자연어 CAD 에이전트**를 추가합니다. 사용자는 원하는 것을 일상 언어로 설명하고, 에이전트는 CAD 도구를 호출하여 도면을 검사하고 지오메트리를 생성하거나 수정합니다.

제공하는 기능:

- AI 번들이 중요 경로에 포함되지 않도록 **지연 로드**되는 `AcApPlugin`(트리거 명령: `agent`)
- Vercel AI SDK(`Experimental_Agent` + `@ai-sdk/vue`)를 기반으로 구축된 **Vue 채팅 패널**(`AgentChatPanel`)
- **브라우저 측 LLM 구성** — OpenAI, Anthropic 또는 OpenAI 호환 엔드포인트의 API 키는 클라이언트에 유지됩니다(`localStorage`에 암호화)
- **1단계 CAD 도구** — `get_drawing_context`; `draw_line`, `draw_circle`, `draw_arc`, `draw_rectangle`, `draw_polyline`, `draw_text`; `set_current_layer`, `create_layer`, `zoom_extents`
- 플러그인 i18n 레이어를 통한 **영어/중국어/터키어/체코어** UI 문자열

완전한 Vue `cad-viewer` 앱은 패키지가 설치되어 있으면 에이전트를 자동으로 등록합니다(팔레트 탭). `cad-simple-viewer-example`은 `cad-simple-ui-plugin`을 통해 도크 탭에 연결합니다. 호스트 앱은 `registerLazyAgentPlugin`과 `setAgentPaletteOpener`를 호출하여 패널을 원하는 위치에 마운트합니다.

→ **설치, 등록 및 도구 목록:** [packages/cad-agent-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin/README.md)

### `@mlightcad/cad-script-plugin` — CAD 스크립트 콘솔

[`cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin)은 `cad-simple-viewer` 기반 앱을 위한 **수동 CAD 스크립트 콘솔**을 추가합니다. 에이전트 플러그인과 달리 모델과 통신하지 **않고** **API 키가 필요 없습니다**: 콘솔은 `@mlightcad/cad-agent-core`의 검증된 스크립트 호스트를 실행하며, 각 스크립트는 인자 하나(`cad`)를 받는 함수 본문으로 에이전트가 사용하는 것과 동일한 도면 도구에 프로그래밍 방식으로 접근할 수 있습니다.

- 지연 로드되는 `AcApPlugin`(트리거 명령: `cadscript`)
- `@mlightcad/cad-agent-core`의 CAD 도구를 재사용하며, 이 패키지는 패널과 명령만 추가합니다
- 호스트 앱은 `registerLazyCadScriptPlugin`을 호출하고 `new CadScriptPanel().element`를 마운트합니다(`cad-simple-viewer-example`에서는 도크 탭, `cad-viewer`에서는 도구 팔레트 탭). 탭이 제거될 때 `destroy()`를 호출합니다

→ **사용법:** [packages/cad-script-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin/README.md)

---

## 내보내기/가져오기 플러그인(HTML / PDF / SVG)

이 플러그인들은 동일한 플러그인 관리자에 내보내기(및 PDF 가져오기) 명령을 추가합니다. 초기 페이지 용량을 작게 유지하기 위해 **지연 로드**됩니다. `cad-simple-viewer-example` 데모는 세 가지 내보내기 플러그인과 UI/에이전트/스크립트 플러그인을 모두 등록하며, 완전한 `cad-viewer` 앱은 부트스트랩에서 내보내기 플러그인과 에이전트/스크립트 플러그인(설치된 경우)을 등록합니다.

### HTML(`@mlightcad/cad-html-plugin`)

공유 및 아카이빙을 위한 단일 파일 **오프라인 뷰어** — 내보낸 HTML에는 도면 데이터와 런타임 뷰어가 내장되며 서버가 필요하지 않습니다.

| 항목 | 값 |
|------|-------|
| 명령 | `chtml`(`cad-viewer`의 대화상자), `-chtml`(`cad-simple-viewer-cli`를 통한 명령줄) |
| 추가 구성 | `AcApDocManager.createInstance()`의 `htmlViewerRuntimeUrl` — `viewer-runtime.iife.js` URL(패키지 `dist/`에서 복사) |
| 공개 API | `registerLazyHtmlPlugin`, `createHtmlPlugin`, `AcApHtmlConvertor`, `packHtml`, 스냅샷 타입 |

→ **빌드 출력 및 통합:** [packages/cad-html-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin/README.md)
→ **동일한 파이프라인을 사용하는 헤드리스 CLI:** [packages/cad-simple-viewer-cli/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer-cli/README.md)

### PDF(`@mlightcad/cad-pdf-plugin`)

**벡터 PDF 내보내기 및 PDF를 CAD로 가져오기.**

| 항목 | 값 |
|------|-------|
| 명령 | `cpdf`(내보내기), `ipdf`(가져오기) |
| 공개 API | `registerLazyPdfPlugin`, `createPdfPlugin`, 컨버터 |

→ **빌드 출력 및 통합:** [packages/cad-pdf-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin/README.md)

### SVG(`@mlightcad/cad-svg-plugin`)

**벡터 SVG 내보내기** 및 PDF 내보내기에서 사용하는 공유 벡터 렌더러.

| 항목 | 값 |
|------|-------|
| 명령 | `csvg` |
| 공개 API | `registerLazySvgPlugin`, `createSvgPlugin`, `AcApSvgConvertor`, SVG 렌더러 유틸리티 |

→ **빌드 출력 및 통합:** [packages/cad-svg-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin/README.md)

---

## 데이터 소스 플러그인(OneDrive / Google Drive)

이 플러그인들은 명령을 등록하지 않습니다 — 사용자가 클라우드 스토리지에서 직접 DWG/DXF 도면을 열 수 있도록 [`AcApDataSource`](./data-source-plugin)를 등록합니다. 둘 다 팝업 차단기에 걸리지 않도록 설계된 **2단계 로그인 → 열기 흐름**을 사용합니다.

### `@mlightcad/cad-onedrive-plugin`

Microsoft File Picker v8 + MSAL 기반의 **OneDrive/SharePoint 데이터 소스**입니다. Azure 앱 등록(SPA, 위임된 `User.Read` + `Files.Read.All` 권한)이 필요합니다.

```typescript
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-azure-app-client-id'
})
```

→ **Azure 앱 설정 및 전체 통합:** [packages/cad-onedrive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin/README.md) 및 [데이터 소스 플러그인](./data-source-plugin)

### `@mlightcad/cad-google-drive-plugin`

동일한 `AcApDataSource` 계약을 갖는 **Google Drive 데이터 소스**입니다.

```typescript
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-google-oauth-client-id'
})
```

→ **Google Cloud 설정 및 전체 통합:** [packages/cad-google-drive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin/README.md)

---

## 각 앱은 어떤 플러그인을 등록하나요?

| 앱 | 등록된 플러그인 |
|-----|--------------------|
| `cad-simple-viewer` | 없음 — 코어만 포함하며 플러그인은 선택 사항 |
| `cad-simple-viewer-example` | 내보내기 플러그인(HTML/PDF/SVG), `cad-simple-ui-plugin`, `cad-agent-plugin`, `cad-script-plugin` |
| `cad-viewer`(Vue) | 내보내기 플러그인(HTML/PDF/SVG); 에이전트 및 스크립트 플러그인은 **설치된 경우** 자동으로 등록됩니다(선택적 피어) |

---

## 관련 문서

- [플러그인 시스템](./plugin-system) — `AcApPlugin` 인터페이스, 플러그인 관리자, 지연 로딩 및 자신만의 플러그인 작성
- [데이터 소스 플러그인](./data-source-plugin) — OneDrive/Google Drive 플러그인이 사용하는 `AcApDataSource` 메커니즘
- [명령](./command) — 명령 수명 주기와 `AcEdCommand`
