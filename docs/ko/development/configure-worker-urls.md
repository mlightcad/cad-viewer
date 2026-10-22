---
title: "Worker URL 구성"
---

# Worker URL 구성

이 페이지는 **cad-viewer**를 사용할 때, 특히 현대적인 SPA + 번들러 환경(Vite / Webpack / Rollup)에서 **Web Worker URL을 올바르게 설정하는 방법**을 설명합니다.

이 주제는 자주 오해되며 다음과 같은 문제의 근본 원인이 됩니다:

-   개발 환경에서는 Worker가 동작하지만 프로덕션에서 로드에 실패하는 문제
-   `xxx-worker.js`에 대한 404 오류
-   해시 라우팅(`#/route`) 사용 시 Worker가 중단되는 문제
-   상대 경로에 대한 잘못된 가정

[**Issue #54**](https://github.com/mlightcad/cad-viewer/issues/54)의 논의가 이 가이드의 배경을 제공합니다.

## cad-viewer에서 Worker URL이 사용되는 방식

cad-viewer에서는 여러 기능(dwg/dxf 파싱, mtext 렌더링 등)이 성능을 위해 **Web Worker**에 의존합니다.

```ts
/**
 * Defines URLs for Web Worker JavaScript bundles used by the CAD viewer.
 *
 * Each entry points to a standalone worker script responsible for
 * off-main-thread processing such as file parsing or text rendering.
 */
export interface AcApWebworkerFiles {
  /**
   * URL of the Web Worker bundle responsible for parsing DXF files.
   *
   * This worker performs DXF decoding and entity extraction in a
   * background thread to avoid blocking the UI.
   */
  dxfParser?: string | URL

  /**
   * URL of the Web Worker bundle responsible for parsing DWG files.
   *
   * DWG parsing is computationally expensive and must be executed
   * in a Web Worker to maintain UI responsiveness.
   */
  dwgParser?: string | URL

  /**
   * URL of the Web Worker bundle responsible for rendering MTEXT entities.
   *
   * This worker handles MTEXT layout, formatting, and glyph processing
   * independently from the main rendering thread.
   */
  mtextRender?: string | URL
}
```

AcApDocManager의 인스턴스를 생성할 때 다음과 같이 Worker URL을 구성할 수 있습니다:

```
AcApDocManager.createInstance({
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dxfParser: './workers/dxf-parser-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})
```

그러면 다음과 같이 Worker를 생성합니다:

```
new Worker(workerUrl, { type: 'module' })
```

⚠️ `workUrl`은 JS 모듈이 아닌 문서(HTML 페이지)를 기준으로 해석됩니다.

## Worker URL 옵션 비교

현재 페이지 URL이 `https://localhost/app/`이고 메인 모듈이 `https://localhost/app/assets/main.js`에서 로드되는 경우, workerUrl은 다음과 같이 해석됩니다.

| workerUrl 값                          | 해석 기준            | 해석된 URL 예시        |
| ------------------------------------- | -------------------- | ---------------------- |
| 'workers/worker.js'                   | 현재 페이지 URL      | /app/workers/worker.js |
| './workers/worker.js'                 | 현재 페이지 URL      | /app/workers/worker.js |
| '/workers/worker.js'                  | 사이트 루트          | /workers/worker.js     |
| 'https://localhost/workers/worker.js' | 절대 경로            | /workers/worker.js     |

## `import.meta.url` 사용 피하기

또 다른 방법은 다음과 같이 Worker URL을 생성하는 것입니다:

```
new URL('./xxx-worker.js', import.meta.url)
```

`import.meta.url`은 **현재 모듈의 URL**을 가리킵니다. 따라서 개발 모드와 프로덕션 모드에서 이상한 동작을 초래할 수 있습니다.

예를 들어, 현재 페이지 URL이 `https://localhost`이고 메인 모듈이 `https://localhost/assets/main.js`에서 로드되는 경우, `Vite dev mode`에서 workerUrl은 다음과 같이 해석됩니다.

| workerUrl 값                          | 해석 기준              | 개발 모드에서 해석됨   | 프로덕션 모드에서 해석됨  |
| ------------------------------------- | ---------------------- | ---------------------- | ------------------------- |
| 'workers/worker.js'                   | 현재 모듈 URL          | /src/workers/worker.js | /assets/workers/worker.js |
| './workers/worker.js'                 | 현재 모듈 URL          | /src/workers/worker.js | /assets/workers/worker.js |
| '/workers/worker.js'                  | 사이트 루트            | /@fs/workers/worker.js | /workers/worker.js        |
| 'https://localhost/workers/worker.js' | 절대 경로              | /workers/worker.js     | /workers/worker.js        |

개발 모드와 프로덕션 모드에서 서로 다른 로직을 만들어야 합니다. `import.meta.url` 사용을 피하십시오.

```ts
const isDev =
  typeof window !== 'undefined' &&
  !!window.location &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
if (isDev) {
  ...
} else {
  ...
}
```
