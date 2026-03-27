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
- `FTypeInfo` 체인 기반 `IsA<T>()`, `Cast<T>()` 지원
- `UObjectManager` 싱글톤으로 오브젝트 생명주기 관리, `FObjectFactory`로 다형적 생성
- **Name Hiding 이슈**: `DECLARE_CLASS`의 static Cast가 `UObject::Cast<T>` 템플릿을 숨겨 빌드 오류 발생 → 전역 `Cast<T>(UObject*)` 함수로 해결

#### DirectX 11 렌더링 파이프라인
- 커맨드 버퍼 패턴: `RenderCollector` → `RenderBus` → `Renderer`
- 멀티 패스 렌더링: Opaque → Font → SubUV → Translucent → StencilMask → Outline → Editor → Grid → DepthLess
- HLSL 셰이더 런타임 컴파일
- **오프스크린 렌더링**: `FViewport`가 D3D11 RT/SRV/DSV를 소유, ImGui::Image로 표시

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
- **빌드**: MSBuild, Visual Studio 2022
- **버전 관리**: Git

## 최근 진행 상황 (Week4)
- 프로젝트 리네이밍 W3_Jungle_Team6 → CraftonEngine
- UE 스타일 Viewport 아키텍처 적용 (오프스크린 렌더링, FViewport/FViewportClient 분리)
- SSplitter 트리 기반 12가지 뷰포트 레이아웃 + 분할 바 드래그
- 뷰포트별 독립 렌더 옵션 (FViewportRenderOptions)
- ELevelViewportType: Perspective + 6방향 Orthographic 프리셋
- Ortho 뷰: 회전 차단, 우클릭 패닝, OrthoWidth 비례 감도
- OnePane→분할 전환 시 Top/Front/Right 자동 배정
- IMPLEMENT_CLASS 매크로 통합
- Cast<T> name hiding 이슈 해결 (전역 함수)
- FObjectIterator 런타임 타입 필터링
- AStaticMeshActor UI 스폰 지원

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
    ELevelViewportType ViewportType;  // Perspective/Top/Bottom/Left/Right/Front/Back
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
*마지막 동기화: 2026-03-27*
*소스: [CraftonEngine](https://github.com/chodott/W3_Jungle_Team6)*
