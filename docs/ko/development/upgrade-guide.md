---
title: "cad-simple-viewer 및 cad-viewer 업그레이드"
---

# cad-simple-viewer 및 cad-viewer 업그레이드

이 가이드는 `@mlightcad/cad-simple-viewer`와 `@mlightcad/cad-viewer`를 안전하게 업그레이드하는 방법을 설명합니다. 즉, 왜 이들을 개별적으로 올릴 수 없는지, 어떤 관련 패키지가 함께 이동해야 하는지, 그리고 주어진 릴리스에 대해 올바른 호환 버전 집합을 확인하는 두 가지 신뢰할 수 있는 방법을 다룹니다.

## 개요

`@mlightcad/cad-simple-viewer`와 `@mlightcad/cad-viewer`는 **독립형 패키지가 아닙니다**. 이들은 공통 코드베이스와 릴리스 주기를 공유하는 긴밀히 통합된 생태계의 일부입니다. 각 릴리스는 플러그인, 렌더러, 데이터 모델 패키지, 텍스트 렌더링 라이브러리, 서드파티 UI 프레임워크에 걸친 조정된 업데이트 집합을 묶어 제공합니다.

**`cad-simple-viewer` 또는 `cad-viewer`만 개별적으로 업그레이드하면 미묘한 런타임 실패가 발생할 수 있습니다**, 예를 들어:

- 플러그인 인터페이스가 최신(또는 이전) 코어 버전에서 변경된 API 시그니처를 기대함
- 코어가 기대하는 데이터 모델 형태와 이전 파서/렌더러가 생성하는 형태 간의 불일치
- libredwg-converter 업그레이드 후 WebAssembly 또는 Worker 호환성 누락
- `mtext-renderer` / `mtext-parser` 버전이 어긋날 때 텍스트 렌더링 문제
- 렌더러 계층 전반에 걸쳐 일치하지 않는 Three.js의 호환성 파괴 또는 동작 변경

항상 **관련 패키지 전체 집합을 함께 업그레이드**하십시오. 올바른 버전을 확인하는 두 가지 신뢰할 수 있는 방법은 아래에 설명되어 있습니다.

---

## 생태계 한눈에 보기

업그레이드 전에 어떤 패키지가 조정된 릴리스에 속하고 어떤 것이 서드파티인지 아는 것이 도움이 됩니다. 다음 범주는 동일한 cad-viewer 릴리스로 동기화됩니다:

### 코어 뷰어 패키지

| 패키지 | 역할 |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | 프레임워크 독립적 코어(문서 관리, 명령 스택, 렌더링 연결) |
| `@mlightcad/cad-viewer` | cad-simple-viewer 위에 구축된 Vue 3 + Element Plus UI 래퍼 |

### 플러그인 — **cad-simple-viewer 버전과 정확히 일치해야 함**

| 패키지 | 목적 |
| --- | --- |
| `@mlightcad/cad-html-plugin` | 원클릭 자체 포함 HTML 내보내기 |
| `@mlightcad/cad-pdf-plugin` | PDF 내보내기 및 PDF 언더레이 가져오기 |
| `@mlightcad/cad-svg-plugin` | SVG 내보내기 |
| `@mlightcad/cad-simple-ui-plugin` | 순수 DOM 툴바, 레이어 관리자, 도킹 패널 |
| `@mlightcad/cad-agent-plugin` | AI 에이전트 기반 상호 작용 |
| `@mlightcad/cad-onedrive-plugin` | OneDrive 통합 |
| `@mlightcad/cad-google-drive-plugin` | Google Drive 통합 |

> **경험칙:** 위 목록의 모든 플러그인은 업그레이드 대상인 `cad-simple-viewer`와 **정확히 동일한 버전 번호**(예: `1.7.5`)로 고정해야 합니다.

### 내부 렌더러 계층(코어와 동일 버전, 별도 게시)

| 패키지 | 목적 |
| --- | --- |
| `@mlightcad/three-renderer` | THREE.js 기반 2D/3D 렌더링 엔진 |
| `@mlightcad/pdf-renderer` | cad-pdf-plugin이 PDF 콘텐츠 생성에 사용하는 백엔드 |

이들은 플러그인과 cad-simple-viewer에서 내부적으로 사용됩니다. 일반적으로 직접 설치하지 **않지만**, 해당 버전은 설치하는 플러그인과 호환되어야 합니다.

### 저수준 데이터 및 텍스트 계층 — **릴리스의 버전과 일치해야 함**

| 패키지 | 비고 |
| --- | --- |
| `@mlightcad/data-model` | 코어 엔티티/데이터베이스 타입; 모든 릴리스가 뷰어와 함께 이 패키지를 올립니다 |
| `@mlightcad/libredwg-converter` | DWG 파싱 WebAssembly 래퍼 — DWG 지원이 이에 의존합니다 |
| `@mlightcad/mtext-parser` | MTEXT 콘텐츠 파서 |
| `@mlightcad/mtext-renderer` | MTEXT → THREE 형상 렌더러 |
| `@mlightcad/mtext-input-box` | 캔버스 내 MTEXT 편집기 위젯 |

### cad-viewer 전용 Vue UI 의존성

이들은 `pnpm-workspace.yaml` overrides에 나타나지만 `@mlightcad/cad-viewer`(전체 Vue 3 UI)를 사용할 때만 필요합니다. Cad-simple-viewer 통합에서는 직접 설치하지 않습니다.

| 패키지 | 목적 |
| --- | --- |
| `@mlightcad/ribbon` | 리본 UI 컴포넌트 |
| `@mlightcad/ui-components` | 공유 Vue UI 프리미티브 |

### 서드파티 피어 의존성(릴리스에 고정된 버전 유지)

| 패키지 |
| --- |
| `three` |
| `vue`(cad-viewer 전용) |
| `element-plus`(cad-viewer 전용) |
| `vue-i18n`(cad-viewer 전용) |
| `lodash-es` |

---

## 방법 1 — 대상 버전의 `pnpm-workspace.yaml` 읽기

모든 릴리스의 표준 정보 출처는 해당 Git 태그의 모노레포 `pnpm-workspace.yaml` `overrides` 섹션입니다. 여기에는 릴리스가 테스트된 모든 `@mlightcad/*` 패키지와 서드파티 피어 의존성의 **정확한 버전**이 나열됩니다.

### 단계

1. 업그레이드하려는 버전의 태그를 찾습니다. 태그는 `vX.Y.Z` 패턴을 따릅니다(예: `v1.7.5`). 모든 태그는 메인 저장소에 있습니다:

   ```
   https://github.com/mlightcad/cad-viewer/tags
   ```

2. 해당 태그의 `pnpm-workspace.yaml`을 엽니다. URL 템플릿은 다음과 같습니다:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/vX.Y.Z/pnpm-workspace.yaml
   ```

   `vX.Y.Z`를 실제 버전 태그로 바꿉니다. 예를 들어:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/v1.7.5/pnpm-workspace.yaml
   ```

3. `overrides:` 블록을 자체 프로젝트의 `pnpm-workspace.yaml`에 복사합니다. 대략 다음과 같습니다(축약 예시):

   ```yaml
   overrides:
     '@mlightcad/data-model': '^1.15.4'
     '@mlightcad/libredwg-converter': '^3.15.4'
     '@mlightcad/mtext-input-box': '^0.3.3'
     '@mlightcad/mtext-parser': '^1.5.3'
     '@mlightcad/mtext-renderer': '^0.13.3'
     '@mlightcad/ribbon': '^0.1.13'
     '@mlightcad/ui-components': '^0.1.11'
     element-plus: '^2.12.0'
     lodash-es: '4.17.21'
     three: '^0.172.0'
     vue: '^3.4.21'
     vue-i18n: '^11.4.4'
   ```

4. 사용하는 모든 `@mlightcad/cad-*-plugin`을 `cad-simple-viewer` / `cad-viewer`와 **동일한 버전**으로 업데이트합니다:

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-viewer": "1.7.5",
       "@mlightcad/cad-html-plugin": "1.7.5",
       "@mlightcad/cad-pdf-plugin": "1.7.5",
       "@mlightcad/cad-svg-plugin": "1.7.5",
       "@mlightcad/cad-simple-ui-plugin": "1.7.5",
       "@mlightcad/cad-agent-plugin": "1.7.5",
       "@mlightcad/cad-onedrive-plugin": "1.7.5",
       "@mlightcad/cad-google-drive-plugin": "1.7.5"
     }
   }
   ```

5. `pnpm install`(또는 `npm install`)을 실행하고 피어 의존성 경고 없이 앱이 로드되는지 확인합니다.

> 프로젝트가 일반 `npm` 또는 `yarn` 워크스페이스라면 동일한 `overrides`를 각각 `pnpm.overrides` / `resolutions` 블록에 복사하십시오. 중요한 것은 파일 형식이 아니라 버전 값입니다.

---

## 방법 2 — `cad-simple-viewer-example` 업그레이드 커밋 따르기

[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) 저장소는 `cad-simple-viewer`의 공식 최소 호스트입니다. 코어가 릴리스될 때마다 예제 프로젝트는 **모든 관련 의존성을 함께** 업데이트하는 `feat: upgrade to cad-simple-viewer vX.Y.Z` 제목의 커밋을 받습니다. 이 커밋은 해당 릴리스에서 유지 관리자가 사용한 정확한 버전을 보여 주는 실용적이고 구체적인 참조입니다.

### 단계

1. package.json 파일의 커밋 기록을 엽니다:

   ```
   https://github.com/mlightcad/cad-simple-viewer-example/commits/main/package.json
   ```

2. 대상 버전에 대해 메시지가 `feat: upgrade to cad-simple-viewer vX.Y.Z`인 커밋을 찾습니다.

3. 커밋을 클릭하여 diff를 확인합니다. diff는 다음에 걸친 조정된 버전 상승을 보여 줍니다:
   - 모든 플러그인(`cad-simple-viewer`와 동일한 버전으로)
   - `data-model`
   - `libredwg-converter`
   - `mtext-parser`
   - `mtext-renderer`
   - 그리고 변경된 모든 서드파티 패키지

4. diff의 버전을 자체 `package.json`에 기록합니다.

### 구체적 예시 — v1.7.3 → v1.7.4 업그레이드

다음은 예제 저장소의 [커밋 `492680a`](https://github.com/mlightcad/cad-simple-viewer-example/commit/492680a6b18d7683c457dbc6e689e035ac636fff)에서 가져온 실제 diff입니다. **모든 `@mlightcad/*` 패키지가 보조를 맞춰 이동**한 점에 주목하십시오:

```diff
 dependencies:
-    "@mlightcad/cad-html-plugin": "1.7.3",
-    "@mlightcad/cad-pdf-plugin": "1.7.3",
-    "@mlightcad/cad-svg-plugin": "1.7.3",
-    "@mlightcad/cad-simple-ui-plugin": "1.7.3",
-    "@mlightcad/cad-simple-viewer": "1.7.3",
-    "@mlightcad/data-model": "1.15.0",
-    "@mlightcad/libredwg-converter": "^3.15.0",
+    "@mlightcad/cad-html-plugin": "1.7.4",
+    "@mlightcad/cad-pdf-plugin": "1.7.4",
+    "@mlightcad/cad-svg-plugin": "1.7.4",
+    "@mlightcad/cad-simple-ui-plugin": "1.7.4",
+    "@mlightcad/cad-simple-viewer": "1.7.4",
+    "@mlightcad/data-model": "1.15.1",
+    "@mlightcad/libredwg-converter": "^3.15.1",
     "@mlightcad/mtext-parser": "^1.5.3",
-    "@mlightcad/mtext-renderer": "^0.13.1"
+    "@mlightcad/mtext-renderer": "^0.13.2"
```

> 이것이 바로 자체 프로젝트에서 수행해야 하는 조정된 업데이트의 전형입니다. `mtext-parser`는 `^1.5.3`으로 유지되었고(변경이 필요 없음), `mtext-renderer`는 `0.13.1`에서 `0.13.2`로 이동했습니다. 이러한 결정은 릴리스마다 내려지므로 추측하지 말고 이를 따르십시오.

---

## 업그레이드 후 — 간단한 정상 동작 확인

1. **설치** — 오래된 `node_modules`가 방해하지 않도록 깨끗하게 설치합니다:

   ```bash
   rm -rf node_modules pnpm-lock.yaml && pnpm install
   ```

2. **도면 열기** — DXF와 DWG 파일이 모두 로드되고, 팬/줌이 동작하며, 콘솔 오류가 표시되지 않는지 확인합니다.

3. **내보내기** — 내보내기 플러그인을 사용한다면 샘플 도면에서 HTML, PDF, SVG 내보내기를 테스트합니다.

4. **피어 의존성 경고 확인** — `peerDependencies`가 충족되지 않으면 `pnpm`이 경고합니다. 이를 반드시 수정해야 할 문제로 취급하십시오. 보통 플러그인 버전이 코어에서 벗어나면서 발생합니다.

5. **앱 빌드** — 전체 `vite build`(또는 동등한 것)는 뷰어 타입과 자체 통합 코드 간의 타입 불일치를 가장 빠르게 잡아내는 방법입니다.

---

## FAQ

**Q: `cad-simple-viewer@1.7.5`와 `cad-html-plugin@1.7.3`을 혼용할 수 있나요?**

A: 일반적으로 불가능합니다. 플러그인은 코어와 함께 릴리스되며, 마이너 버전 사이에 변경된 내부 API에 의존하는 경우가 많습니다. TypeScript가 컴파일되더라도 런타임 실패(예: 내보내기가 조용히 빈 출력을 생성하거나, 플러그인 등록이 오해를 유발하는 오류로 실패)를 겪을 수 있습니다.

**Q: 플러그인 없이 `cad-simple-viewer`만 사용한다면 어떻게 해야 하나요?**

A: 여전히 호환 버전의 `data-model`과 (DWG 파일을 로드한다면) `libredwg-converter`가 필요합니다. 대상 태그의 `pnpm-workspace.yaml`은 여전히 적용됩니다.

**Q: 시맨틱 버저닝이 보호해 주나요?**

A: Semver 범위(`^`, `~`)는 릴리스 계열 *내*의 패치 수준 상승에는 잘 동작합니다(예: `^1.7.0`은 `1.7.5`를 자동으로 선택). 그러나 **조정된 플러그인/data-model/libredwg-converter 버전**은 semver만으로는 알 수 없습니다. 이들은 릴리스 유지 관리자가 설정합니다. 주어진 마이너 업그레이드에 어떤 버전이 함께 가는지 알려면 여전히 위의 두 가지 방법 중 하나가 필요합니다.

**Q: pnpm 대신 npm/yarn을 사용합니다. 이것이 여전히 적용되나요?**

A: 예. 버전 조정은 패키지 관리자와 무관하게 동일합니다. `pnpm-workspace.yaml`의 값을 사용하여 `overrides`(pnpm), `resolutions`(yarn) 또는 `overrides`(npm)를 설정하거나, 단순히 `cad-simple-viewer-example` diff의 버전을 `package.json`에 고정하십시오.
