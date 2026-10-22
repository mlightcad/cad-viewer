---
title: "아키텍처 개요"
---

# 아키텍처 개요

CAD-Viewer는 **백엔드 의존성 없이** 전적으로 브라우저에서 동작합니다. DWG/DXF 파일은 WebAssembly와 JavaScript를 사용하여 로컬에서 파싱되고 처리되므로 다음을 보장합니다:

- **서버 요구 사항 없음** - 정적 파일 호스팅만으로 어디에나 배포할 수 있습니다
- **완전한 데이터 프라이버시** - 파일이 사용자의 장치를 벗어나지 않습니다
- **즉시 통합** - 복잡한 백엔드 설정이나 API 구성이 필요하지 않습니다
- **오프라인 지원** - 인터넷 연결 없이도 동작합니다

CAD-Viewer는 시스템의 특정 측면을 담당하는 여러 하위 패키지로 구성됩니다:

- **cad-viewer**: UI 컴포넌트, 대화상자, 툴바, 상태 관리 및 렌더링 엔진과의 통합을 포함하는 메인 Vue 3 컴포넌트이자 프런트엔드 애플리케이션입니다.
- **cad-simple-viewer**: 문서 관리, 명령 처리 및 UI와 렌더링 엔진 간의 통합을 위한 핵심 로직입니다. 프레임워크에 독립적이며 UI가 없습니다(캔버스만 제공).
- **svg-renderer**: 내보내기 및 확장 가능한 2D 출력을 위해 DWG/DXF 엔티티를 SVG 그래픽으로 렌더링합니다.
- **three-renderer**: THREE.js를 사용하여 DWG/DXF 엔티티를 고급 시각화 및 사용자 정의 셰이더를 갖춘 대화형 2D/3D 그래픽으로 렌더링합니다.

## 아키텍처 개요

**CAD-Viewer**는 여러 CAD 데이터 형식의 로딩, 파싱, 렌더링 및 상호 작용을 지원하기 위해 모듈화되고 확장 가능한 아키텍처를 채택한 고성능 브라우저 전용 DWG/DXF 뷰어입니다. 시스템은 다음과 같은 핵심 계층으로 나뉩니다:

![Architecture Overview](https://github.com/mlightcad/cad-viewer/blob/main/assets/arch-en.jpg?raw=true)

이 계층형 아키텍처는 **CAD-Viewer**가 다양한 데이터 규모, 렌더링 요구 사항 및 배포 환경을 처리할 때 고성능, 낮은 지연 시간 및 뛰어난 확장성을 유지할 수 있도록 보장합니다.

### **모델 계층**

- [`realdwg-web`](https://github.com/mlightcad/realdwg-web)의 [`@mlightcad/data-model`](https://github.com/mlightcad/realdwg-web) 모듈을 통해 파싱된 CAD 데이터(기하 엔티티, 레이어 정보, 뷰 매개변수 등 포함)를 설명하기 위한 통합 **데이터 모델**을 정의합니다.
- [`AcDbDatabaseConverter`](https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/database/AcDbDatabaseConverter.ts)를 통해 통합 CAD 파일 변환 인터페이스를 구현하여, 서로 다른 변환기가 CAD 데이터를 통합 데이터 모델로 변환할 수 있게 합니다.
- `realdwg-web`의 [`@mlightcad/libredwg-converter`](https://github.com/mlightcad/realdwg-web) 모듈을 통해 DWG 파싱 기능을 제공하여, DWG 파일을 통합 데이터 모델로 변환합니다.
- [`@mlightcad/dxf-json`](https://github.com/mlightcad/dxf-json) 모듈을 통해 DXF 파싱 기능을 제공하여, DXF 파일을 통합 데이터 모델로 변환합니다.
- `realdwg-web`의 [`@mlightcad/geometry-engine`](https://github.com/mlightcad/realdwg-web) 모듈을 통해 기하 엔진을 제공하여, 다양한 기하 계산(점, 선, 폴리라인, 스플라인, 원, 호, 타원, 타원 호)과 수학 연산(벡터, 행렬 등)을 지원합니다.

`AcDbDatabaseConverter` 인터페이스를 정의하는 이유를 간단히 설명하겠습니다. 시중의 기존 DXF/DWG 읽기/쓰기 및 변환 도구는 종종 불완전합니다. 저는 일부 오픈 소스 코드를 기반으로 `@mlightcad/libredwg-converter`와 `@mlightcad/dxf-json`을 구현했습니다. 그러나 실제로 사용 가능한 최고의 DWG/DXF 파싱 및 변환 도구는 [ODA](https://www.opendesign.com/products/drawings)입니다. 이를 사용하려면 라이선스를 구매하여 소스 코드에 접근해야 하며, 그로부터 DXF/DWG를 `@mlightcad/data-model`에 정의된 통합 데이터 모델로 변환하는 WebAssembly 모듈을 빌드할 수 있습니다. 누군가 ODA의 소스 코드를 저에게 공유해 준다면, 이를 기반으로 한 변환기도 구현할 수 있습니다.

### **렌더링 계층**

- `realdwg-web`의 [`@mlightcad/graphic-interface`](https://github.com/mlightcad/realdwg-web) 모듈을 통해 다양한 유형의 CAD 엔티티를 렌더링하기 위한 통합 렌더링 인터페이스를 정의합니다.
- `cad-viewer`의 [`@mlightcad/three-renderer`](https://github.com/mlightcad/cad-viewer) 모듈에서 렌더링 인터페이스를 구현하여, Three.js를 사용해 모든 엔티티 유형을 렌더링합니다.
- `cad-viewer`의 [`@mlightcad/svg-renderer`](https://github.com/mlightcad/cad-viewer) 모듈에서 렌더링 인터페이스를 구현하여, 도면을 SVG로 렌더링합니다.

### **뷰 계층**

- `cad-viewer`의 [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer) 모듈은 문서 관리, 명령 처리 및 UI와 렌더링 엔진 간의 조정 등 CAD 파일에 대한 핵심 보기 로직을 제공합니다. UI 프레임워크 의존성이 없으며 캔버스 외에는 UI 요소를 제공하지 않습니다.
- [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) 모듈은 `@mlightcad/cad-simple-viewer`를 기반으로 구축되어, 메뉴, 툴바, 명령줄, 상태 표시줄 및 밝은/어두운 테마를 갖춘 Vue 3 기반 UI를 제공합니다. 모든 핵심 기능을 손쉬운 통합을 위한 Vue 3 컴포넌트로 패키징합니다.

## 렌더링 엔진

DXF/DWG 파일을 렌더링하는 데는 몇 가지 과제가 있습니다:

- 다수의 엔티티를 포함하는 도면의 고성능 렌더링.
- AutoCAD의 텍스트 렌더링 효과 재현.
- 선 스타일 및 해치 패턴 지원.

### 고성능 렌더링

대규모 도면의 고성능 렌더링에서 핵심은 점, 선, 면을 병합하여 **Draw Call**을 줄이는 것입니다. THREE.js는 삼각형 메시를 병합하기 위한 [BatchedMesh](https://threejs.org/docs/index.html?q=Mesh#api/en/objects/BatchedMesh) 클래스를 통해 부분적인 해결책을 제공합니다. 그러나 점과 선의 병합은 지원하지 않으며, 면 병합조차도 요구 사항을 완전히 충족하지 못합니다. 따라서 우리는 `BatchedMesh`에서 영감을 받은 여러 클래스를 구현하여 점, 선, 면을 병합했습니다. [코드는 여기](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/batch)에서 확인할 수 있습니다.

### 텍스트 렌더링

AutoCAD는 서식 있는 텍스트를 위해 [`MText`](https://ezdxf.mozman.at/docs/dxfinternals/entities/mtext.html) 형식을 사용하고, 더 빠른 렌더링을 위해 특수 [SHX](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-DE941DB5-7044-433C-AA68-2A9AE98A5713) 폰트(선으로만 그려지는 스트로크 기반 폰트)를 사용합니다. 주요 과제는 다음과 같습니다:

- **MText 파싱** – [`@mlightcad/mtext-parser`](https://github.com/mlightcad/mtext-parser) 패키지로 구현되었습니다.
- **SHX 폰트 파싱** – [`@mlightcad/shx-parser`](https://github.com/mlightcad/shx-parser) 패키지로 구현되었습니다.
- **MText 렌더링** – [`@mlightcad/mtext-renderer`](https://github.com/mlightcad/mtext-renderer) 패키지로 구현되었습니다. 성능을 위해 파싱된 폰트 파일은 브라우저의 IndexedDB에 캐시되어, 한 번 다운로드하고 파싱한 후에는 이후 렌더링이 더 빨라집니다.

텍스트 렌더링을 디버깅하기 위해 THREE.js 기반의 서식 있는 텍스트 편집기인 [mtext-editor](https://github.com/mlightcad/mtext-editor)를 만들었습니다. 현재 THREE.js 기반의 다른 오픈 소스 서식 있는 텍스트 편집기는 없으므로, 이는 모든 렌더링 엔진의 텍스트 편집기로 재사용될 수 있습니다.

### 선 스타일 및 해치 패턴

AutoCAD는 사용자 정의 선 유형과 해치 패턴을 지원합니다. 우리는 그중 일부를 구현했습니다(텍스트를 포함하는 선 유형은 아직 지원되지 않음). 모든 선 스타일과 해치 효과는 THREE.js의 `ShaderMaterial`로 구현됩니다. [코드는 여기](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/style)에서 확인할 수 있습니다.
