# CraftonEngine (3D Editor Engine)

## 프로젝트 개요
- **엔진**: DirectX 11 + ImGui 기반 자체 제작 3D 에디터 엔진
- **언어**: C++20 (x64) / C++17 (Win32)
- **IDE**: Visual Studio 2022 (v143 toolset)
- **목적**: Actor/Component 아키텍처의 WYSIWYG 씬 에디터. Ray-casting 오브젝트 선택, 멀티 씬 지원, JSON 기반 씬 직렬화
- **리네이밍**: W3_Jungle_Team6 → CraftonEngine (Week4)

## 핵심 학습 내용

### 아키텍처/패턴

#### 커스텀 RTTI 시스템
- `DECLARE_CLASS` / `DEFINE_CLASS` 매크로를 통한 자체 리플렉션 구현
- `IMPLEMENT_CLASS` = `DEFINE_CLASS` + `REGISTER_FACTORY` 통합 매크로 (cpp에서 사용)
- `FTypeInfo` 체인 기반 `IsA()`, `Cast()` 지원
- `UObjectManager` 싱글톤으로 오브젝트 생명주기 관리, `FObjectFactory`로 다형적 생성
- **Name Hiding 이슈**: `DECLARE_CLASS`의 static Cast가 `UObject::Cast` 템플릿을 숨겨 빌드 오류 발생 → 전역 `Cast` 함수로 해결

#### DirectX 11 렌더링 파이프라인
- 커맨드 버퍼 패턴: `RenderCollector` → `RenderBus` → `Renderer`
- 멀티 패스 렌더링: Opaque → Font → SubUV → Translucent → StencilMask → Outline → Editor → Grid → DepthLess
- HLSL 셰이더 런타임 컴파일
- **오프스크린 렌더링**: `FViewport`가 D3D11 RT/SRV/DSV를 소유, ImGui::Image로 표시
- **렌더 파이프라인 리팩토링 (Week4)**: EPrimitiveType/ERenderCommandType enum 제거, typed batcher entry 및 command builder 도입
- **FBatcherBase / FDynamicBuffer**: Batcher 공통 베이스 클래스 및 동적 버퍼 추상화
- **렌더 수집 책임 이동**: RenderCollector → 각 컴포넌트가 자체 렌더 커맨드 수집
- **HLSL 셰이더 구조 개편**: `Common/` include 계층 구조로 재구성

#### 뷰포트 아키텍처 (UE 스타일)
- `FViewport` / `FViewportClient` / `FLevelEditorViewportClient` 계층 분리
- `FLevelViewportLayout`: SSplitter 트리 기반 12가지 뷰포트 레이아웃 관리
- `SSplitter`: 재귀적 레이아웃 계산, `ESplitOrientation` enum으로 H/V 분기
- `SWidget → SWindow → SSplitter` 상속 계층
- **뷰포트별 독립 렌더 옵션**: `FViewportRenderOptions` (ViewMode, ShowFlags, Grid, Camera)
- **카메라 프리셋**: `ELevelViewportType` (Perspective / Top / Bottom / Left / Right / Front / Back)
- Orthographic 뷰: WASDQE 차단, 우클릭 드래그 → OrthoWidth 비례 패닝

#### 에디터 시스템
- `UEditorEngine`: 메인 에디터 런타임 (월드 관리, 에디터 카메라, 씬 전환)
- `FEditorMainPanel`: ImGui 기반 UI (도킹 위젯)
- `FEditorViewportClient`: 3D 뷰포트 + Ray-cast 기반 오브젝트 피킹
- `GizmoComponent`: 트랜스폼 조작 핸들
- **패인별 툴바 오버레이**: ImGui 오버레이 윈도우(NoDecoration)로 각 뷰포트 패인 위에 Layout/Settings UI 배치

#### OBJ 임포터 & 메시 시스템 (Week4)
- OBJ/MTL 파일 파싱 및 유니코드 경로 처리
- 좌표계 변환 보정 (로컬 → 엔진 좌표계)
- `UStaticMesh` 바이너리 캐싱 (`FArchive` 직렬화) — 디버그/릴리즈 호환성 보장
- **머티리얼 오버라이드 시스템**: 컴포넌트 단위 머티리얼 교체 지원
- **ObjViewer 엔진**: 메시 프리뷰 전용 빌드 구성 (`ObjViewDebug`, `IS_OBJ_VIEWER=1`)

#### 입력 & 물리
- `InputSystem`: Windows 메시지 기반 키보드/마우스 (드래그 감지)
- Ray-triangle intersection으로 뷰포트 오브젝트 선택

#### 직렬화
- `FSceneSaveManager`: JSON 기반 `.Scene` 파일 읽기/쓰기 (SimpleJSON 라이브러리)
- 액터, 컴포넌트, 트랜스폼, 카메라 상태 저장

### 기술 스택
- **그래픽스**: DirectX 11, HLSL, WICTextureLoader (PNG 아이콘)
- **UI**: ImGui (도킹, 이미지 버튼, 팝업)
- **직렬화**: SimpleJSON (json.hpp)
- **빌드**: MSBuild, Visual Studio 2022, MultiProcessorCompilation (`/MP`)
- **버전 관리**: Git

## 최근 진행 상황 (Week4 — 2026-03-30)
- 렌더 파이프라인 대규모 리팩토링: enum 제거, collect 시그니처 통합, batcher 추상화
- HLSL 셰이더 `Common/` include 계층 구조 재구성
- OBJ 임포터 수정: 머티리얼 매핑/텍스처 로딩/좌표계/유니코드/성능
- 스태틱 메시 머티리얼 오버라이드 시스템 구현
- `UStaticMesh` 캐싱 + `FArchive` 직렬화 개선
- 디버그/릴리즈 `.bin` 캐시 호환성 및 힙 손상 버그 수정
- 액터 스폰 UI를 기본 프리미티브로 제한 및 구조화
- ObjViewer 엔진 추가 (ObjViewDebug 빌드)
- `PrimitiveActors` 삭제 (사용처 제거)
- MultiProcessorCompilation (`/MP`) 활성화
- 오브젝트+바이너리 드롭리스트 기능

## 유용한 코드 스니펫

### RTTI 매크로 패턴

```cpp
// Header (.h)
class UMyClass : public UParentClass {
    DECLARE_CLASS(UMyClass, UParentClass)
};

// Source (.cpp)
IMPLEMENT_CLASS(UMyClass, UParentClass)  // = DEFINE_CLASS + REGISTER_FACTORY
```

### 뷰포트별 렌더 옵션

```cpp
struct FViewportRenderOptions {
    EViewMode ViewMode;
    FShowFlags ShowFlags;
    float GridSpacing;
    int32 GridHalfLineCount;
    float CameraMoveSensitivity;
    float CameraRotateSensitivity;
    ELevelViewportType ViewportType;
};
```

### SSplitter 트리 기반 레이아웃

```
FourPanes2x2:
  H(Root) → V(Left)[W0/W2] | V(Right)[W1/W3]

ThreePanesLeft:
  H(Root) → W0 | V(Right)[W1/W2]
```

### ImGui 오버레이 윈도우 패턴

```cpp
ImGui::SetNextWindowPos(ImVec2(PaneRect.X, PaneRect.Y));
ImGui::SetNextWindowBgAlpha(0.4f);
ImGui::Begin("##Overlay", nullptr,
    ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_AlwaysAutoResize |
    ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoFocusOnAppearing |
    ImGuiWindowFlags_NoNav | ImGuiWindowFlags_NoMove);
```

### MSBuild 명령어

```bash
msbuild CraftonEngine.sln /p:Configuration=Debug /p:Platform=x64
```

---
*마지막 동기화: 2026-03-31*
*소스: [CraftonEngine](https://github.com/chodott/W3_Jungle_Team6)*
