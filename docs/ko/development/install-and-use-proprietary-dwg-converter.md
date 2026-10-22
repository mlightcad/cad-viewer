---
title: "독점 DWG 변환기 설치 및 사용"
---

# 독점 DWG 변환기 설치 및 사용

이 가이드는 독점 DWG 파서 패키지 **`@mlightcad/dwg-converter`**를 cad-viewer 데이터 모델에 **설치**하고 **등록**하는 방법을 설명합니다.

라이선스, 평가판 액세스, 가격 및 GPL 준수에 대해서는 메인 저장소의 [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md)를 참조하십시오.

> **전제 조건:** GitHub 계정이 이미 비공개 패키지에 대한 **읽기 액세스** 권한을 보유해야 합니다(평가판 또는 구매 승인 후 부여됨).

## 개요

- `@mlightcad/dwg-converter`는 **GitHub Packages**에 게시됩니다.
- 다른 `@mlightcad/*` 패키지(예: `@mlightcad/data-model`, `@mlightcad/cad-viewer`)는 공개 **npm 레지스트리**에 게시됩니다.
- npm과 pnpm은 **스코프 수준**의 레지스트리 매핑만 지원합니다 — 동일한 스코프 내에서 **공식적인 패키지 수준** 레지스트리 매핑은 **없습니다**.

즉, 다음을 사용하여

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

`@mlightcad/dwg-converter`만 가져올 수는 **없습니다**. 그렇게 하면 **모든** `@mlightcad/*` 패키지가 GitHub Packages로 라우팅되어 공개 패키지 설치가 중단됩니다.

**버전 참고:** 아래 예제의 `1.2.3`(및 모든 tarball 해시)을 **귀하에게 전달된 정확한 버전**으로 교체하십시오.

## `read:packages` 권한이 있는 `GITHUB_TOKEN` 생성

현재 GitHub Packages는 **개인 액세스 토큰(classic)**으로 인증합니다. 세분화된 토큰은 npm 레지스트리에 지원되지 않습니다.

1. 패키지 액세스 권한이 있는 계정으로 GitHub에 로그인합니다.
2. **Settings → Developer settings → Personal access tokens → Tokens (classic)**을 엽니다  
   (직접 링크: [https://github.com/settings/tokens](https://github.com/settings/tokens)).
3. **Generate new token → Generate new token (classic)**을 클릭합니다.
4. 토큰의 이름을 지정하고(예: `dwg-converter-install`) 보안 정책에 맞는 만료 기간을 설정합니다.
5. **Select scopes**에서 **`read:packages`**를 활성화합니다. 설치 전용 용도로는 `write:packages`나 `delete:packages`가 필요하지 않습니다.
6. **Generate token**을 클릭한 다음 즉시 복사합니다(한 번만 표시됨).
7. 이를 `GITHUB_TOKEN`으로 노출합니다:

   ```bash
   # macOS / Linux
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Windows PowerShell
   $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Windows CMD
   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

8. **클라이언트**가 GitHub Packages와 직접 통신하는 경우(아래 옵션 2), `.npmrc`에 **호스트 수준** 인증 항목을 추가합니다:

   ```ini
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

   이는 `npm.pkg.github.com`에 대해서만 자격 증명을 연결합니다. `@mlightcad` 스코프를 재매핑하지 **않습니다**. `@mlightcad:registry=https://npm.pkg.github.com`을 추가하지 **마십시오**.

   `pnpm install`은 이 파일을 읽습니다. `npm view`는 워크스페이스 패키지에서 실행할 때 이를 읽지 않습니다: npm 8.5 이후 CLI는 해당 패키지의 `.npmrc`를 무시하고(`ignoring workspace config`) `GITHUB_TOKEN`이 설정되어 있더라도 토큰 없이 요청을 전송합니다(`401 Unauthorized - authentication token not provided`). `npm view` 명령 자체에 토큰을 전달하십시오 — 옵션 2를 참조하십시오.

   모노레포에서는 이 파일을 **워크스페이스 루트**에 두십시오. 멤버 패키지 내부에만 있는 `.npmrc`는 npm이 건너뛰는 파일입니다.

   옵션 1(비공개 레지스트리 프록시)을 사용하는 경우 클라이언트는 일반적으로 이 줄이 **필요하지 않습니다** — 대신 프록시에 토큰을 두십시오.

**보안 참고 사항**

- 토큰을 비밀번호처럼 취급하십시오. git에 커밋하거나 공개 이슈에 붙여넣지 **마십시오**.
- `.npmrc`에 토큰을 하드코딩하는 대신 환경 변수(또는 CI 시크릿 저장소)를 선호하십시오.
- GitHub Actions에서는 설치 작업을 위해 리포지토리 시크릿(예: `GH_PACKAGES_TOKEN`)을 `GITHUB_TOKEN` / `NODE_AUTH_TOKEN`에 매핑하십시오.

## 설치 옵션

아래 방법 중 **하나**를 선택하십시오.

### 옵션 1: npm과 GitHub Packages를 프록시하는 통합 비공개 레지스트리

비공개 npm 레지스트리 — Verdaccio, JFrog Artifactory, Sonatype Nexus 또는 클라우드 벤더 npm 레지스트리 — 를 운영하거나 이미 사용 중이라면 클라이언트를 해당 레지스트리로 지정하고, 패키지별 업스트림을 레지스트리가 결정하도록 하십시오:

```text
                ┌── npmjs.org          (@mlightcad/data-model, …)
client ──→ private registry
                └── GitHub Packages    (@mlightcad/dwg-converter)
```

클라이언트 `.npmrc`:

```ini
registry=https://npm.example.com/
```

비공개 레지스트리를 다음과 같이 구성합니다:

| 패키지 | 업스트림 |
|---------|----------|
| `@mlightcad/foo`(공개 패키지) | `https://registry.npmjs.org` |
| `@mlightcad/dwg-converter` | `https://npm.pkg.github.com` |

그런 다음 정상적으로 설치합니다:

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

이는 이미 비공개 레지스트리를 유지 관리하고 있을 때 가장 깔끔한 장기 설정입니다. 하나 또는 두 개의 GitHub Packages만 필요한 소규모 프로젝트에는 옵션 2가 보통 더 가볍습니다.

### 옵션 2: `@mlightcad/dwg-converter`를 GitHub Packages tarball URL로 고정

패키지를 **tarball URL**로 `package.json`에 고정하여 패키지 관리자가 `@mlightcad` 스코프 레지스트리를 통해 해석하는 대신 해당 URL을 직접 다운로드하도록 합니다.

1. GitHub Packages에 인증합니다(tarball URL은 인증을 **우회하지 않습니다**):

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. 필요한 버전의 tarball URL을 확인합니다.

   이 명령에는 프로젝트 `.npmrc`에 의존하지 마십시오. `npm view`는 워크스페이스 패키지의 `.npmrc`를 무시하므로, 해당 파일의 `${GITHUB_TOKEN}`은 적용되지 않습니다. 명령줄에서 토큰을 전달하십시오:

   ```bash
   # macOS / Linux
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball \
     --registry=https://npm.pkg.github.com \
     --//npm.pkg.github.com/:_authToken="${GITHUB_TOKEN}"
   ```

   ```powershell
   # Windows PowerShell
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball `
     --registry=https://npm.pkg.github.com `
     --//npm.pkg.github.com/:_authToken="$env:GITHUB_TOKEN"
   ```

   ```bat
   REM Windows CMD
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=%GITHUB_TOKEN%
   ```

   단계 1의 `.npmrc` 항목은 여전히 필요합니다: `pnpm install`이 tarball을 다운로드할 때 이를 사용합니다.

   출력 예시:

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. 해당 URL을 `package.json`에 넣습니다(**귀하의** 버전과 tarball URL 사용):

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. 설치합니다:

   ```bash
   pnpm install
   ```

**주의 사항**

- 업그레이드하려면 새로운 tarball URL을 가져와 `package.json` / 잠금 파일을 업데이트해야 합니다.
- CI 및 로컬 설치에는 여전히 읽기 액세스 권한이 있는 유효한 GitHub 토큰이 필요합니다.
- `.npmrc`에 GitHub Packages 인증 항목을 유지하십시오.

옵션 2는 평가 및 소규모 팀에 적합합니다. 빈번한 업그레이드나 많은 비공개 패키지가 예상되는 경우 옵션 1(또는 GitHub Packages에 매핑된 `@mlightcad-private/*`와 같은 별도의 비공개 스코프)을 선호하십시오.

## 변환기 등록

독점 파서는 오픈 소스 스택과 동일한 파이프라인에 연결되는 **등록 가능한 변환기**입니다.

- 출력은 MIT 라이선스의 **`@mlightcad/data-model`**을 준수합니다: `AcDbDatabase`, `AcDb*` 엔티티, 레이어 테이블, 블록 및 관련 구조.
- `AcDbLibreDwgConverter`에서 사용하는 것과 동일한 메커니즘인 **`AcDbDatabaseConverterManager`**를 통해 등록합니다.
- 파싱 후에는 기존 MIT 렌더링, 레이어, 선택 및 상호 작용 파이프라인(`cad-simple-viewer`, `cad-viewer`, 플러그인 등)이 변경 없이 동작합니다.

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

이 패키지는 독립적인 "DWG 파싱" API를 **노출하지 않습니다**. 오픈 소스 [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter)와 마찬가지로 **`AcDbDatabaseConverter`**를 구현합니다. 변환 후에는 `@mlightcad/data-model`을 통해 결과 도면으로 작업하십시오.

규정 준수를 위해 독점 파서에 의존하는 경우 GPL 기반의 `libredwg-converter`를 **추가로 등록하지 마십시오**.

인증, Worker 자산, 등록 및 데이터베이스 탐색을 포함한 완전한 동작 예제는 [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example)을 참조하십시오.

## 관련 페이지

- [Worker URL 구성](./configure-worker-urls) — DWG/DXF 파서용 Worker URL 설정
- [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) — 상용 라이선스, 평가판 및 GPL 관련 참고 사항
- [개발 가이드](./) — 개발자 주제 색인
