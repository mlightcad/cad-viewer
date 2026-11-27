# MLightCAD（한국어）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

MLightCAD는 `백엔드 서비스에 전혀 의존하지 않고 완전히 브라우저에서 동작하는 세계 최초의 웹 기반 DXF/DWG 보기·비교·편집 플랫폼`입니다.
DWG/DXF 파싱, 지오메트리 처리, 렌더링을 브라우저에서 직접 수행함으로써 MLightCAD는 진정한 서버리스 CAD 보기 및 편집을 가능하게 하며, 클라우드 앱, 오프라인 사용, 개인정보에 민감한 워크플로에 이상적입니다.

MLightCAD는 단순한 CAD 뷰어가 아니라 **브라우저 네이티브 CAD 인프라**입니다. 하나의 엔진 위에서 세 가지 제품 형태를 바로 사용할 수 있습니다:

| 하위 프로젝트 | 역할 | 패키지 |
| --- | --- | --- |
| **CAD Viewer** | 보기 및 검토: DWG/DXF를 열고 팬·줌, 측정, 주석 작성. 자체 제품에 내장하는 SDK로도 사용 가능 | [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer) |
| **CAD Diff Viewer** | 도면 리비전 비교: 나란히 또는 겹쳐서 표시하며 회색=변경 없음, 빨강=삭제, 초록=추가. 변경 세트에서 리비전 클라우드 생성 | [`@mlightcad/cad-diff-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-diff-viewer) |
| **CAD Editor** | 편집 및 작도: AutoCAD 스타일 메뉴, 리본, 명령줄, 상태 표시줄을 갖추고 도면을 열어 지오메트리를 직접 수정 | [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) |

세 제품은 동일한 엔티티 모델, 렌더링 엔진, 플러그인 버스를 공유합니다. UI, 내보내기, AI 기능은 필요할 때 로드되며 중복 구현되지 않습니다. 보기·비교·편집은 하나의 CAD 커널을 각기 다른 제품 형태로 제공한 것이지, 서로 무관한 도구가 아닙니다.

또한 MLightCAD는 다른 CAD 소프트웨어에서 거의 찾아볼 수 없는 기능을 제공합니다—**클릭 한 번으로 단일 자체 포함 HTML 파일로 내보내기**. 다운로드한 `.html`에는 도면 스냅샷과 경량 뷰어 런타임이 내장되어 있어, 수신자는 **CAD 앱, 서버, 설치 없이** 모든 최신 브라우저에서 열어 팬, 줌, 레이어 전환, 거리 측정을 할 수 있습니다. 대부분의 데스크톱 및 웹 CAD 도구는 자사 제품 내에서만 보기를 허용합니다. MLightCAD는 라이브 도면을 이메일로 보내거나, 보관하거나, 정적 파일 호스트에 올릴 수 있는 휴대용 오프라인 산출물로 바꿉니다—클라이언트 공유, 규정 준수 아카이브, 에어갭 워크플로에 이상적입니다. 오프라인 뷰어는 동일한 도면을 열 때 기존 데스크톱 도구보다 훨씬 적은 메모리를 사용합니다(아래 [메모리 비교](#자체-포함-html-메모리-사용량) 참조).

MLightCAD는 **서버 측 사전 렌더링**도 지원합니다. 도면은 서버에서 한 번만 파싱·처리되고, 클라이언트는 사전 렌더링된 결과를 그대로 표시하기만 하면 되므로 DWG/DXF를 다시 파싱하거나 지오메트리를 재구축할 필요가 없습니다. 이 방식은 클라이언트 메모리 사용량을 크게 줄이고 동일한 도면을 두 번째 이후에 열 때 속도를 크게 향상시켜 모바일 환경에서 도면을 보기에 특히 적합합니다.

- [**🌐 홈페이지**](https://mlightcad.com/)
- **🌐 라이브 데모**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API 문서**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (버전별) · [MCP 서버](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### MLightCAD 기반 앱

[Thingraph](https://cad.thingraph.site/) 팀은 MLightCAD 위에 프로덕션급 DWG/DXF 뷰어와 플랫폼 통합을 구축하여 전 세계 수만 명의 사용자에게 서비스를 제공합니다:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — 전 세계 엔지니어링 팀이 빠르고 서버리스하게 도면에 접근하는 데 사용하는 브라우저 기반 DWG/DXF 뷰어. 플랫폼별 설치:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — **Open with**로 Drive에서 DWG/DXF 열기
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — `.dwg` / `.dxf` 읽기 전용 커스텀 에디터
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — Open VSX를 통한 동일 확장
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — 페이지에 DWG/DXF 미리보기 임베드
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — 파일 탐색기에서 썸네일 및 미리보기

커뮤니티 앱 및 통합:

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — DWG, DXF, DWF, DWFx, XPS용 프로덕션 지향 브라우저 CAD 뷰어 ([라이브 데모](https://cad-viewer-iys.pages.dev))
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — 브라우저에서 DWG/DXF를 보는 Nextcloud 네이티브 앱 ([앱 스토어](https://apps.nextcloud.com/apps/cad_viewer))

공식 데스크톱 앱:

- [MLightCAD Studio](https://github.com/mlightcad/mlightcad-studio) — MLightCAD의 공식 데스크톱 버전으로, [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor)를 [Tauri 2](https://v2.tauri.app/) 셸로 감싸 완전 오프라인으로 동작합니다. Windows(NSIS / MSI), Linux(AppImage / deb), macOS(Universal DMG, Apple Silicon + Intel) 설치 파일을 제공합니다—[다운로드](https://github.com/mlightcad/mlightcad-studio/releases/).

### 데모 앱 (Demo Apps)

MLightCAD를 자체 제품에 통합하는 방법을 보여주는 공식 샘플 앱입니다:

- [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) — [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)용 최소 vanilla TypeScript 호스트. 로컬 또는 CDN DXF/DWG를 열고, 작은 툴바로 명령을 실행하며, 전체 Vue UI 없이 HTML/PDF/SVG 내보내기 플러그인을 지연 로드합니다.
- [cad-editor-demo](https://github.com/mlightcad/cad-viewer-example) — [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) 기반의 전체 기능 Vue 3 앱. 메뉴, 리본, 대화상자, 명령줄, 상태 표시줄 포함([라이브 데모](https://mlightcad.github.io/cad-viewer-example/)).
- [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) — Next.js “CAD 드라이브” 데모. DWG/DXF 청크 이어받기 업로드, SQLite 파일 목록과 미리보기, **브라우저 라이브 파싱**(`cad-simple-viewer`) 또는 **서버측 ACEX 프리렌더**(더 빠른 로딩, 낮은 메모리)로 도면 열기를 지원합니다.

![MLightCAD Quick Demo](./assets/cad-viewer.gif)

## 기능

- **고성능** — 대용량 DWG/DXF 파일을 60+ FPS로 부드럽게 렌더링
- **백엔드 불필요** — 파일을 브라우저에서 완전히 파싱 및 처리
- **향상된 데이터 보안** — 파일이 기기를 떠나지 않아 완전한 프라이버시 보장
- **쉬운 통합** — 서버 설정이나 백엔드 인프라 불필요
- 서드파티 통합을 위한 모듈형 아키텍처
- **플러그인 시스템** — 확장 가능한 플러그인 아키텍처로 UI, AI 어시스턴트, HTML/PDF/SVG 내보내기 공식 플러그인 제공. 자세한 내용은 [플러그인 시스템 개발 가이드](https://mlightcad.com/cad-viewer/docs/ko/development/plugin-system.html) 참조
- **모바일 레이아웃 및 터치** — `@mlightcad/cad-simple-viewer`에 반응형 폰/태블릿 UI와 터치 제스처(핀치 줌, 한 손가락 팬, 탭 선택)가 내장되어 별도 모바일 앱 없이 모바일 브라우저에서 사용 가능
- **오프라인 HTML로 내보내기** — 현재 도면을 내장 뷰어(팬/줌, 범위 줌, 레이어, 거리 측정, EN/ZH UI)가 포함된 단일 자체 포함 `.html` 파일로 내보내기. 모든 브라우저에서 오프라인으로 열림. MLightCAD 인스턴스나 백엔드 불필요.
- 오프라인 및 온라인 편집 워크플로
- 고급 최적화 기법을 적용한 THREE.js 3D 렌더링 엔진
- CMS, Notion, WeChat 등 플랫폼과의 확장 및 통합을 위해 설계

- **명확한 계층 아키텍처** — 모델 → 렌더링 → 뷰 → UI / 플러그인 계층으로, 하위 패키지가 상위 패키지에 의존하지 않으며 독립 배포 가능한 헤드리스 내보내기와 CLI도 제공합니다. 자세한 내용은 [아키텍처 개요](https://mlightcad.com/cad-viewer/docs/ko/development/architecture-overview.html)

## AI 기능

MLightCAD에는 AI를 위해 설계된 CAD 기능이 내장되어 있습니다. 스크립트와 도구 호출은 모두 로컬에서 실행되어 도면 데이터가 기기를 떠나지 않습니다.

### CAD 스크립트
- 샌드박스화된 JavaScript 스크립트 런타임이 내장되어 있으며, 통합된 `cad.*` 호스트 API를 통해 엔티티 조회, 작도, 수정, 측정, 내보내기를 수행합니다
- 하나의 스크립트로 필터링, 측정, 수정, 자가 검사를 한 번의 호출로 완료하여 도구 왕복과 토큰 소모를 줄입니다
- 실행 전 AST 검증을 수행하여 `import`, `eval`, 네트워크 및 페이지 접근을 차단하고, 스텝/타임아웃 예산과 스냅샷 개수 상한을 적용합니다
- 스크립트 콘솔에서 모델 개입 없이 직접 작성한 스크립트를 실행할 수 있으며, DXF / PDF / HTML 등의 형식으로 내보낼 수 있습니다

### AI 에이전트
- 자연어 대화 패널을 제공합니다. 요구사항을 설명하면 모델이 `cad.*` 스크립트를 작성하고 실행하여 작도, 조회, 편집을 수행합니다
- Vercel AI SDK를 기반으로 하며, 모델과 API Key는 통합된 AI 모델 설정에서 구성합니다
- Simple / High 두 가지 추론 모드를 제공하며, High 모드에서는 복잡한 작업 후 스크린샷을 찍어 시각적 검증을 수행합니다

### MCP
- `@mlightcad/cad-mcp-server`를 통해 동일한 스크립트 도구 카탈로그를 stdio MCP로 외부 AI 클라이언트(Claude Desktop, Cursor 등)에 노출합니다
- 외부 어시스턴트가 도면을 열고, 엔티티를 조회하고, 스크립트를 실행하여 결과를 저장할 수 있으며, 내장 에이전트와 동일한 기능을 제공합니다

### 스마트 블록
- 선택한 객체의 모든 동일한 복사본을 자동으로 찾아 블록 참조로 변환합니다
- 도면 전체에서 반복 객체를 찾아 일괄적으로 블록으로 변환할 수 있습니다
- 텍스트만 다른 복사본(예: 방 번호)은 블록 속성으로 자동 변환할 수 있으며, 최소 이득 임계값을 설정할 수 있습니다

### PDF 도면 복원
- PDF 페이지에서 벡터 지오메트리를 가져와 실제 CAD 엔티티를 재구성합니다——원/호/타원/스플라인, 벌지가 있는 폴리라인, 선가중치와 파선 선종류, 문자 스타일, 솔리드 및 해치 채우기, 이미지; 반복 그려지는 Form XObject는 자동으로 블록 참조로 복원됩니다
- 알려진 거리를 사용하여 가져온 도면의 축척을 보정할 수 있습니다
- 선으로 분해된 텍스트를 CAD 텍스트 엔티티로 인식하여 복원합니다. 먼저 내장 글리프 사전으로 로컬 인식을 수행한 뒤, 나머지는 OCR / 비전 모델로 일괄 인식합니다
- 화살표, 치수선, 텍스트에서 선형, 반지름, 지름, 각도 치수를 복원하고, 확인 패널에서 수치를 확인하거나 치수 스타일을 선택하거나 새로 만들 수 있습니다

## 한 줄 코드로 DWG/DXF 임베드

단일 `<iframe>`만으로 어떤 웹사이트에도 DWG/DXF 보기를 추가할 수 있습니다. CAD 백엔드가 필요 없고, 도면을 타사 클라우드에 업로드할 필요도 없습니다. 파일은 **당신 소유의 URL**에서 가져와 방문자의 브라우저에서만 파싱·렌더링되며, 검토 도구(팬, 줌, 측정, 주석)가 바로 제공됩니다.

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1
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

# 또는 도면 비교 뷰어(cad-diff-viewer) 실행
pnpm dev:diff
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

MLightCAD를 처음 사용하시나요? **[사용자 가이드](https://mlightcad.com/cad-viewer/docs/)**에서 뷰어 인터페이스, 데스크톱 및 터치 조작, 마크업, 측정 도구에 대한 단계별 안내를 확인하세요.

### 데스크톱 브라우저 조작
- **선택**: 엔티티를 왼쪽 클릭
- **확대/축소**: 마우스 휠 위/아래 스크롤
- **팬**: 가운데 마우스 버튼을 누른 채 드래그
- **지우기**: 엔티티를 선택한 후 `Del` 키 누르기

### 태블릿/모바일 브라우저 조작
- **선택**: 엔티티 탭
- **줌**: 두 손가락으로 핀치
- **팬**: 한 손가락으로 드래그

## 성능

MLightCAD는 **탁월한 성능**을 위해 설계되었으며, 높은 프레임률을 유지하면서 매우 큰 DXF/DWG 파일을 처리할 수 있습니다. 여러 고급 렌더링 기술로 성능을 최적화합니다:

- **커스텀 셰이더 머티리얼**: GPU 가속 셰이더 머티리얼로 복잡한 선종과 해치 채우기 패턴을 효율적으로 렌더링
- **지오메트리 배칭**: 동일 머티리얼의 점, 선, 영역을 병합하여 드로우 호출을 크게 줄임
- **인스턴스 렌더링**: 인스턴싱 기법으로 반복 지오메트리 렌더링 최적화
- **버퍼 지오메트리 최적화**: 효율적인 메모리 관리 및 지오메트리 병합으로 GPU 오버헤드 감소
- **머티리얼 캐싱**: 유사 엔티티 간 머티리얼 재사용으로 상태 변경 최소화
- **WebGL 최적화**: 최신 WebGL 기능으로 하드웨어 가속 렌더링 활용

이러한 최적화를 통해 MLightCAD는 수천 개의 엔티티가 있는 복잡한 CAD 도면을 부드럽게 렌더링하면서 반응성 있는 사용자 상호작용을 유지합니다.

#### 자체 포함 HTML 메모리 사용량

샘플 도면 [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg)를 열 때 메모리 소비량은 대략 다음과 같습니다:

| 뷰어 | 메모리 소비량 |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| 자체 포함 HTML(측정 모드) | 56 MB |
| 자체 포함 HTML(보기 모드) | 33 MB |

오프라인 HTML 뷰어는 보기 모드에서 AutoCAD 2020보다 약 **83% 적은** 메모리, GstarCAD Viewer보다 약 **77% 적은** 메모리를 사용하면서도 팬/줌, 레이어 전환, 거리 측정(측정 모드)을 지원합니다.

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

MLightCAD의 목표는 브라우저에서 동작하는 완전한 기능의 모듈식이며 프레임워크 독립적인 2D CAD 시스템입니다—보기·비교·편집이 같은 커널 위에서 이루어집니다.

로드맵은 Wiki에서 관리합니다. 아직 개발 중인 플랫폼 기능(LOD 렌더링, 명명된 뷰, 사용자 정의 엔티티 등)과 추진 중인 AI 방향(도면 이해, 자동 검토, 스캔 도면 인식, 검증 가능한 자연어 편집 등)을 담고 있습니다:

→ **[로드맵 (Wiki)](https://github.com/mlightcad/cad-viewer/wiki/Roadmap)**

## 기여

기여를 환영합니다! 버그 수정, 새 기능, 제안을 위해 이슈나 풀 리퀘스트를 열어 주세요. 버그 리포트의 경우, 문제가 있는 도면 링크를 제공하면 재현 및 수정에 도움이 됩니다.

## 라이선스

MLightCAD 모노레포는 주로 [MIT](LICENSE) 라이선스입니다.

DXF 로딩은 `@mlightcad/data-model`의 내장 MIT 파서를 사용합니다. DWG 로딩은 **옵트인**입니다: `@mlightcad/cad-simple-viewer`는 GPL LibreDWG 패키지에 의존하지 않습니다. 오픈소스 DWG 지원이 필요한 호스트는 직접 `@mlightcad/libredwg-converter`(GPL-3.0)를 추가하고, worker + wasm을 배포한 뒤 컨버터를 등록합니다. 클로즈드소스 제품을 배포하고 고객에게 GPL 코드를 배포할 수 없다면, [**프로프라이어터리 DWG 파서**](./PROPRIETARY-PARSER.md)를 대신 사용하세요.

→ **상용 파서:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (범위, 라이선스, 가격, 통합, GPL 준수, 지원)
