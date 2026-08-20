# CAD-Viewer（한국어）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

cad-viewer는 `백엔드 서비스에 전혀 의존하지 않고 완전히 브라우저에서 동작하는 세계 최초의 웹 기반 DXF/DWG 뷰어 및 에디터`입니다.
DWG/DXF 파싱, 지오메트리 처리, 렌더링을 브라우저에서 직접 수행함으로써 cad-viewer는 진정한 서버리스 CAD 보기 및 편집을 가능하게 하며, 클라우드 앱, 오프라인 사용, 개인정보에 민감한 워크플로에 이상적입니다.

또한 다른 CAD 뷰어에서는 거의 찾아볼 수 없는 기능을 제공합니다—**클릭 한 번으로 단일 자체 포함 HTML 파일로 내보내기**. 다운로드한 `.html`에는 도면 스냅샷과 경량 뷰어 런타임이 내장되어 있어, 수신자는 **CAD 앱, 서버, 설치 없이** 모든 최신 브라우저에서 열어 팬, 줌, 레이어 전환, 거리 측정을 할 수 있습니다. 대부분의 데스크톱 및 웹 CAD 뷰어는 자사 제품 내에서만 보기를 허용합니다. cad-viewer는 라이브 도면을 이메일로 보내거나, 보관하거나, 정적 파일 호스트에 올릴 수 있는 휴대용 오프라인 산출물로 바꿉니다—클라이언트 공유, 규정 준수 아카이브, 에어갭 워크플로에 이상적입니다. 오프라인 뷰어는 동일한 도면을 열 때 기존 데스크톱 도구보다 훨씬 적은 메모리를 사용합니다(아래 [메모리 비교](#자체-포함-html-메모리-사용량) 참조).

- [**🌐 홈페이지**](https://mlightcad.com/)
- **🌐 라이브 데모**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API 문서**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (버전별) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/docs/) (최신/dev) · [MCP 서버](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### cad-viewer 기반 앱

[Thingraph](https://cad.thingraph.site/) 팀은 cad-viewer 위에 프로덕션급 DWG/DXF 뷰어와 플랫폼 통합을 구축하여 전 세계 수만 명의 사용자에게 서비스를 제공합니다:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — 전 세계 엔지니어링 팀이 빠르고 서버리스하게 도면에 접근하는 데 사용하는 브라우저 기반 DWG/DXF 뷰어. 플랫폼별 설치:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — **Open with**로 Drive에서 DWG/DXF 열기
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — `.dwg` / `.dxf` 읽기 전용 커스텀 에디터
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — Open VSX를 통한 동일 확장
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — 페이지에 DWG/DXF 미리보기 임베드
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — 파일 탐색기에서 썸네일 및 미리보기

커뮤니티 앱 및 통합:

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — DWG, DXF, DWF, DWFx, XPS용 프로덕션 지향 브라우저 CAD 뷰어 ([라이브 데모](https://cad-viewer-iys.pages.dev))
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — 브라우저에서 DWG/DXF를 보는 Nextcloud 네이티브 앱 ([앱 스토어](https://apps.nextcloud.com/apps/cad_viewer))

커뮤니티 Linux 데스크톱 패키지:

- [CAD Viewer AppImage](https://github.com/pass-wind/cad-viewer-appimage) — Linux용 Electron 기반 AppImage(약 114 MB), Fedora에서 테스트됨
- [cad-viewer (AUR)](https://aur.archlinux.org/packages/cad-viewer) — 시스템 Electron을 사용하는 Arch Linux 소스 패키지(약 5.4 MB)
- [cad-viewer-bin (AUR)](https://aur.archlinux.org/packages/cad-viewer-bin) — 완전 오프라인 도면 열기를 위한 번들 폰트/템플릿이 포함된 Arch Linux 바이너리 패키지

![CAD-Viewer Quick Demo](./assets/cad-viewer.gif)

## 기능

- **고성능** — 대용량 DWG/DXF 파일을 60+ FPS로 부드럽게 렌더링
- **백엔드 불필요** — 파일을 브라우저에서 완전히 파싱 및 처리
- **향상된 데이터 보안** — 파일이 기기를 떠나지 않아 완전한 프라이버시 보장
- **쉬운 통합** — 서버 설정이나 백엔드 인프라 불필요
- 서드파티 통합을 위한 모듈형 아키텍처
- **오프라인 HTML로 내보내기** — 현재 도면을 내장 뷰어(팬/줌, 범위 줌, 레이어, 거리 측정, EN/ZH UI)가 포함된 단일 자체 포함 `.html` 파일로 내보내기. 모든 브라우저에서 오프라인으로 열림. cad-viewer 인스턴스나 백엔드 불필요.
- 오프라인 및 온라인 편집 워크플로
- 고급 최적화 기법을 적용한 THREE.js 3D 렌더링 엔진
- CMS, Notion, WeChat 등 플랫폼과의 확장 및 통합을 위해 설계

## 한 줄 코드로 DWG/DXF 임베드

단일 `<iframe>`만으로 어떤 웹사이트에도 DWG/DXF 보기를 추가할 수 있습니다. CAD 백엔드가 필요 없고, 도면을 타사 클라우드에 업로드할 필요도 없습니다. 파일은 **당신 소유의 URL**에서 가져와 방문자의 브라우저에서만 파싱·렌더링되며, 검토 도구(팬, 줌, 측정, 주석)가 바로 제공됩니다.

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1"
  style="width:100%;height:600px;border:0"
  allowfullscreen>
</iframe>
```

상세 안내와 체험: [Embed DWG/DXF on Your Website Without Uploading a Single Byte](https://medium.com/@mlightcad/embed-dwg-dxf-on-your-website-without-uploading-a-single-byte-cf5f6ad484c4).

## 시작하기

### 사전 요구 사항

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### 설치

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### 개발

```bash
# 전체 기능 뷰어(cad-viewer) 시작
pnpm dev

# 또는 간단한 뷰어 시작
pnpm dev:simple
```

### 빌드

```bash
pnpm build
```

### 미리보기

```bash
# 전체 기능 뷰어 미리보기
pnpm preview

# 간단한 뷰어 미리보기
pnpm preview:simple
```

## 사용 방법

### 데스크톱 브라우저 조작
- **선택**: 엔티티를 왼쪽 클릭
- **확대/축소**: 마우스 휠 위/아래 스크롤
- **팬**: 가운데 마우스 버튼을 누른 채 드래그
- **지우기**: 엔티티를 선택한 후 `Del` 키 누르기

### 태블릿/모바일 브라우저 조작
- **선택**: 엔티티 탭
- **줌**: 두 손가락으로 핀치
- **팬**: 한 손가락으로 드래그

## 플러그인 시스템

CAD-Viewer는 [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer)의 모듈형 **플러그인 시스템**을 중심으로 구축됩니다. 플러그인은 `AcApPlugin` 인터페이스를 구현하고 `onLoad` / `onUnload`를 통해 뷰어 생명주기에 연결됩니다—일반적으로 명령 등록, UI 추가, 내보내기/가져오기 파이프라인 연결에 사용됩니다.

`AcApDocManager.instance.pluginManager`(`loadPlugin`, `registerLazyPlugin`, 또는 문서 관리자 생성 시 `plugins.fromConfig`)를 통해 플러그인을 로드합니다. 내보내기 지향 플러그인은 **지연 로딩**을 지원합니다: 작은 stub을 먼저 등록하고, 사용자가 관련 명령(예: `-chtml`, 또는 `cad-viewer`의 `chtml` 대화상자에서 내보내기 확인)을 실행할 때만 무거운 번들을 다운로드합니다.

모노레포에는 여러 퍼스트파티 플러그인이 포함되어 있습니다. 각각 하나의 관심사에 집중하며, 필요에 따라 조합할 수 있습니다. **설치, 등록, API 세부 사항은 각 패키지 README**에 있습니다—아래 링크를 참조하세요.

### 공식 플러그인

| 패키지 | 역할 | 명령 / 기능 |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | `cad-simple-viewer`용 **툴바·레이어 관리자·검토 팔레트 UI**(순수 DOM, Vue/React 없음) | `layer`, `markuppanel`, 기본 툴바(보기, 측정, 내보내기, 검토, 테마, 로케일) |
| [`@mlightcad/cad-agent-plugin`](packages/cad-agent-plugin) | **자연어 CAD 에이전트**(AI 채팅 패널 + 도면 도구 호출) | `agent` |
| [`@mlightcad/cad-html-plugin`](packages/cad-html-plugin) | 도면을 **자체 포함 오프라인 HTML**로 내보내기 | `chtml` (`cad-viewer` 대화상자), `-chtml` (명령줄) |
| [`@mlightcad/cad-pdf-plugin`](packages/cad-pdf-plugin) | **PDF 내보내기 및 가져오기**(벡터 파이프라인) | `cpdf`, `ipdf` |
| [`@mlightcad/cad-svg-plugin`](packages/cad-svg-plugin) | **SVG 내보내기** 및 공유 벡터 렌더러(PDF 내보내기에서도 사용) | `csvg` |

### `@mlightcad/cad-simple-ui-plugin` — 간단한 뷰어용 UI 크롬

[`cad-simple-viewer`](packages/cad-simple-viewer)는 의도적으로 **애플리케이션 UI 없이** 캔버스와 CAD 코어만 제공합니다. 자체 웹 앱에 간단한 뷰어를 임베드하고 전체 Vue 기반 [`cad-viewer`](packages/cad-viewer) 셸을 채택하지 않으려면 **`cad-simple-ui-plugin`이 의도된 UI 레이어**입니다.

제공 기능:

- **구성 가능한 툴바**(임의의 가장자리 배치, 기본 CAD 명령, 중첩 메뉴, 커스텀 항목)
- **독 패널**: **레이어 관리자** 탭(레이어 켜기/끄기, ACI 색상 선택기, 더블클릭으로 레이어로 줌)과 **검토 팔레트** 탭(마크업 목록, 상태, 댓글)
- **`COLORTHEME` sysvar 및 호스트 요소의 `--ml-ui-*` CSS 토큰과 테마 동기화**
- **`AcApI18n`과 로케일 동기화**(영어 / 중국어 / 체코어 / 터키어)

모든 위젯은 프레임워크에 독립적(순수 DOM)입니다. 전체 Vue [`cad-viewer`](packages/cad-viewer) 앱은 자체 Element Plus UI가 있으며 이 플러그인이 필요하지 않습니다. `cad-simple-viewer`를 직접 기반으로 구축할 때 `cad-simple-ui-plugin`을 사용하세요.

→ **빠른 시작, 툴바 커스터마이징, 옵션:** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI 도면 어시스턴트

[`cad-agent-plugin`](packages/cad-agent-plugin)은 `cad-simple-viewer` 기반 앱에 **자연어 CAD 에이전트**를 추가합니다. 사용자가 일반 언어로 원하는 것을 설명하면, 에이전트가 CAD 도구를 호출하여 도면을 검사하고 지오메트리를 생성하거나 수정합니다.

제공 기능:

- **지연 로딩** `AcApPlugin`(트리거 명령: `agent`) — AI 번들이 크리티컬 패스에 포함되지 않음
- Vercel AI SDK(`Experimental_Agent` + `@ai-sdk/vue`) 기반 **Vue 채팅 패널**(`AgentChatPanel`)
- **브라우저 측 LLM 구성** — OpenAI, Anthropic 또는 OpenAI 호환 엔드포인트용 API 키가 클라이언트에 유지(`localStorage`에 암호화 저장)
- **1단계 CAD 도구** — `get_drawing_context`; `draw_line`, `draw_circle`, `draw_arc`, `draw_rectangle`, `draw_polyline`, `draw_text`; `set_current_layer`, `create_layer`, `zoom_extents`
- 플러그인 i18n 레이어를 통한 **영어 / 중국어 / 터키어 / 체코어** UI 문자열

전체 Vue [`cad-viewer`](packages/cad-viewer) 앱은 패키지가 설치되면 에이전트를 자동 등록합니다(팔레트 탭). [`cad-simple-viewer-example`](packages/cad-simple-viewer-example)은 `cad-simple-ui-plugin`을 통해 도킹 탭에 연결합니다. 호스트 앱은 `registerLazyAgentPlugin`과 `setAgentPaletteOpener`를 호출하여 원하는 위치에 패널을 마운트합니다.

→ **설치, 등록, 도구 목록:** [packages/cad-agent-plugin/README.md](packages/cad-agent-plugin/README.md)

### 내보내기 플러그인(HTML / PDF / SVG)

이 플러그인들은 동일한 플러그인 관리자에 내보내기(및 PDF 가져오기) 명령을 추가합니다. **지연 로딩**되어 초기 페이지 용량을 작게 유지합니다. [`cad-simple-viewer-example`](packages/cad-simple-viewer-example) 데모는 세 내보내기 플러그인, `cad-simple-ui-plugin`, `cad-agent-plugin`을 모두 등록합니다. 전체 [`cad-viewer`](packages/cad-viewer) 앱은 부트스트랩에서 내보내기 플러그인과(설치 시) 에이전트 플러그인을 등록합니다.

- **HTML** — 공유 및 아카이브용 단일 파일 오프라인 뷰어: [packages/cad-html-plugin/README.md](packages/cad-html-plugin/README.md)  
  (동일 파이프라인의 헤드리스 CLI: [packages/cad-simple-viewer-cli/README.md](packages/cad-simple-viewer-cli/README.md))
- **PDF** — 벡터 PDF 내보내기 및 PDF-to-CAD 가져오기: [packages/cad-pdf-plugin/README.md](packages/cad-pdf-plugin/README.md)
- **SVG** — 벡터 SVG 내보내기: [packages/cad-svg-plugin/README.md](packages/cad-svg-plugin/README.md)

#### 자체 포함 HTML 메모리 사용량

샘플 도면 [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg)를 열 때 메모리 소비량은 대략 다음과 같습니다:

| 뷰어 | 메모리 소비량 |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| 자체 포함 HTML(측정 모드) | 56 MB |
| 자체 포함 HTML(보기 모드) | 33 MB |

오프라인 HTML 뷰어는 보기 모드에서 AutoCAD 2020보다 약 **83% 적은** 메모리, GstarCAD Viewer보다 약 **77% 적은** 메모리를 사용하면서도 팬/줌, 레이어 전환, 거리 측정(측정 모드)을 지원합니다.

## 성능

CAD-Viewer는 **탁월한 성능**을 위해 설계되었으며, 높은 프레임률을 유지하면서 매우 큰 DXF/DWG 파일을 처리할 수 있습니다. 여러 고급 렌더링 기술로 성능을 최적화합니다:

- **커스텀 셰이더 머티리얼**: GPU 가속 셰이더 머티리얼로 복잡한 선종과 해치 채우기 패턴을 효율적으로 렌더링
- **지오메트리 배칭**: 동일 머티리얼의 점, 선, 영역을 병합하여 드로우 호출을 크게 줄임
- **인스턴스 렌더링**: 인스턴싱 기법으로 반복 지오메트리 렌더링 최적화
- **버퍼 지오메트리 최적화**: 효율적인 메모리 관리 및 지오메트리 병합으로 GPU 오버헤드 감소
- **머티리얼 캐싱**: 유사 엔티티 간 머티리얼 재사용으로 상태 변경 최소화
- **WebGL 최적화**: 최신 WebGL 기능으로 하드웨어 가속 렌더링 활용

이러한 최적화를 통해 CAD-Viewer는 수천 개의 엔티티가 있는 복잡한 CAD 도면을 부드럽게 렌더링하면서 반응성 있는 사용자 상호작용을 유지합니다.

## 알려진 문제

기본 오픈소스 DWG 경로는 선택적 `@mlightcad/libredwg-converter` 패키지를 통해 [LibreDWG](https://github.com/LibreDWG/libredwg)를 사용합니다. 많은 도면에서 잘 동작하지만, 엔티티 커버리지는 여전히 제한적이고 WASM 번들은 훨씬 크며, 시작이 느리고, 메모리 사용량이 높으며, 매우 큰 DWG 파일에서는 메모리 부족 오류가 발생할 수 있습니다. 또한 상용 클로즈드소스 제품에는 GPL 라이선스 고려 사항이 있습니다. `@mlightcad/cad-simple-viewer`는 기본적으로 해당 컨버터에 **의존하거나 등록하지 않습니다** — 호스트 앱(예제 패키지 참조)이 명시적으로 옵트인합니다.

더 나은 호환성, 낮은 메모리 사용량, 대용량 파일 지원, 또는 더 명확한 상용 라이선스가 필요하면 [**프로프라이어터리 DWG 파서**](./PROPRIETARY-PARSER.md)를 참조하세요.

| 항목 | LibreDWG 기반 파서 | 프로프라이어터리 DWG 파서 |
|------|------------------------|------------------------|
| 지원 엔티티 | 제한적 커버리지 | 더 넓은 커버리지 |
| 번들 크기 | ~13 MB | ~437 KB |
| 로드 속도 | 느린 시작 | 훨씬 빠른 시작 |
| 메모리 사용량 | 높음 | 낮음 |
| 대용량 DWG 파일 | 대용량 파일에서 OOM 가능 | 해당 문제 없음 |
| 라이선스 | GPL 전파 위험 | GPL 전파 문제 없음 |

## 로드맵

이 프로젝트의 목표는 모듈형 아키텍처와 프레임워크에 독립적인 통합을 갖춘 **브라우저의 풀 기능 2D AutoCAD 유사 시스템**(뷰어 + 에디터)을 만드는 것입니다.

범례:
- [x] 완료
- [ ] 계획됨
- [ ] ⏳ 진행 중

### 핵심 파일 및 데이터 레이어

#### 파일 지원

* [x] DXF 로딩
* [x] DWG 로딩
* [x] 자체 포함 오프라인 HTML로 내보내기(내장 뷰어)
* [x] 대용량 파일 스트리밍 / 증분 로딩
* [ ] ⏳ 파일 버전 호환성(R12–Latest)

#### 데이터 모델

* [x] 통합 엔티티 데이터 모델
* [x] 레이어 테이블 지원
* [x] 블록 / 삽입 구조
* [ ] ⏳ Handle 및 객체 ID 관리: 현재 objectId는 handle과 동일하며 bigint(int64) 대신 하나의 문자열로 표현됨.
* [ ] ⏳ XData / 확장 사전 지원
* [ ] 프록시 엔티티 처리

### 렌더링 및 성능

#### 렌더링 엔진

* [x] WebGL 기반 렌더링(Three.js)
* [x] 2D 전용 최적화 파이프라인
* [x] 레이어 기반 씬 구성
* [x] 레이아웃 / 용지 공간 렌더링
* [ ] 뷰포트 엔티티 지원

#### 성능 최적화

* [x] 지오메트리 병합 및 배칭
* [x] 공간 인덱싱(기본)
* [x] 고급 공간 인덱스(R-tree / BVH)
* [ ] LOD(Level-of-detail) 렌더링
* [ ] 매우 큰 도면용 멀티 캔버스 / 타일 렌더링

### 보기 및 탐색

#### 뷰 컨트롤

* [x] 팬
* [x] 줌(휠 / 박스 줌)
* [x] 뷰 맞춤 / 범위
* [ ] 명명된 뷰
* [ ] 뷰 히스토리(뷰 변경 실행 취소 / 다시 실행)

#### 표시 컨트롤

* [x] 레이어 표시/숨김
* [x] 레이어 동결 / 잠금
* [x] 선 두께 표시
* [ ] 선종 스케일링
* [x] 배경 / 테마 전환

### 선택 및 상호작용

#### 선택

* [x] 단일 엔티티 선택
* [x] 선택된 엔티티 강조
* [x] 윈도우 선택
* [x] 크로싱 선택
* [x] 선택 필터(유형 / 레이어별)
* [x] 선택 순환

#### 스냅(OSNAP)

* [x] 끝점
* [x] 중점
* [x] 중심
* [x] 교차점
* [ ] 수직 / 접선
* [x] 최근접
* [ ] 스냅 추적


### 편집 및 수정

#### 기본 편집

* [x] 엔티티 편집 프레임워크
* [x] 이동
* [x] 복사
* [x] 회전
* [ ] 축척
* [x] 삭제
* [x] 실행 취소 / 다시 실행

#### 지오메트리 편집

* [x] 그립 포인트
* [ ] 스트레치
* [ ] 트림
* [ ] 연장
* [x] 오프셋
* [ ] 분해
* [ ] 결합 / 필렛 / 모따기(2D)

### 그리기 및 생성 도구

#### 기본 엔티티

* [x] 선
* [x] 폴리라인
* [x] 스플라인
* [x] 원
* [x] 호
* [x] 타원
* [x] 사각형 / 다각형

#### 고급 엔티티

* [x] 해치
* [ ] 텍스트(한 줄 / 여러 줄)
* [ ] 치수(선형, 정렬, 각도)
* [ ] 블록 생성 및 삽입

### 측정

* [x] 거리
* [x] 호 길이
* [x] 면적
* [x] 각도
* [ ] 좌표
* [ ] 엔티티 통계(길이, 면적, 개수)

### 치수

* [x] 선형 치수
* [ ] 각도 치수
* [ ] 좌표

### 속성 및 UI 패널

#### 속성 팔레트

* [x] 선택된 엔티티 속성
* [ ] 레이어, 색상, 선종 편집
* [x] 변경 시 실시간 업데이트

#### 패널 및 UI

* [x] 레이어 관리자
* [ ] 블록 관리자
* [x] 명령 히스토리 / 콘솔
* [x] 상태 표시줄(스냅, 직교, 그리드)

#### 명령 시스템

* [x] 명령 레지스트리
* [x] 명령 별칭
* [x] 명령 프롬프트(AutoCAD 스타일)

### 통합 및 확장성

#### 프레임워크 통합

* [x] 프레임워크에 독립적인 코어
* [ ] React 통합 예제
* [x] Vue 통합 예제
* [ ] OpenLayers / 지도 통합
* [ ] CMS / Notion 임베딩

#### 플러그인 시스템

* [x] 플러그인 API
* [ ] 커스텀 엔티티 지원
* [x] 커스텀 명령

### 오프라인 및 온라인 편집

#### 오프라인 에디터

* [x] 브라우저 로컬 편집
* [x] DXF로 저장
* [ ] 변경 세트 / diff 저장
* [ ] IndexedDB 영속성

#### 온라인 에디터

* [ ] 백엔드 API 설계
* [ ] 사용자 인증
* [ ] 파일 버전 관리
* [ ] 다중 사용자 접근 제어
* [ ] 실시간 협업(향후)

### 플랫폼 목표

* [ ] ⏳ Google Drive 통합
* [ ] WeChat 미니 프로그램 뷰어
* [ ] 모바일 브라우저 지원(읽기 전용)

### 문서 및 커뮤니티

* [x] 아키텍처 문서
* [x] API 레퍼런스
* [ ] 기여 가이드
* [x] 예제 프로젝트
* [x] 로드맵 및 변경 로그 유지

이 로드맵은 기여자가 **무엇이 있는지**, **무엇이 없는지**, **어디에 도움이 필요한지**를 명확히 볼 수 있도록 의도적으로 세분화되어 있습니다.

## 기여

기여를 환영합니다! 버그 수정, 새 기능, 제안을 위해 이슈나 풀 리퀘스트를 열어 주세요. 버그 리포트의 경우, 문제가 있는 도면 링크를 제공하면 재현 및 수정에 도움이 됩니다.

## 라이선스

cad-viewer 모노레포는 주로 [MIT](LICENSE) 라이선스입니다.

DXF 로딩은 `@mlightcad/data-model`의 내장 MIT 파서를 사용합니다. DWG 로딩은 **옵트인**입니다: `@mlightcad/cad-simple-viewer`는 GPL LibreDWG 패키지에 의존하지 않습니다. 오픈소스 DWG 지원이 필요한 호스트는 직접 `@mlightcad/libredwg-converter`(GPL-3.0)를 추가하고, worker + wasm을 배포한 뒤 컨버터를 등록합니다. 클로즈드소스 제품을 배포하고 고객에게 GPL 코드를 배포할 수 없다면, [**프로프라이어터리 DWG 파서**](./PROPRIETARY-PARSER.md)를 대신 사용하세요.

→ **상용 파서:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (범위, 라이선스, 가격, 통합, GPL 준수, 지원)
