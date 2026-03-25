# W3_Jungle_Team6 (3D Editor Engine)

## 프로젝트 개요
- **엔진**: DirectX 11 + ImGui 기반 자체 제작 3D 에디터 엔진
- **언어**: C++17
- **IDE**: Visual Studio 2022 (v143 toolset)
- **목적**: Actor/Component 아키텍처의 WYSIWYG 씬 에디터. Ray-casting 오브젝트 선택, 멀티 씬 지원, JSON 기반 씬 직렬화

## 핵심 학습 내용

### 아키텍처/패턴

#### 커스텀 RTTI 시스템
- `DECLARE_CLASS` / `DEFINE_CLASS` 매크로를 통한 자체 리플렉션 구현
- `UObject` 기반 상속 체계: `UObject → AActor / UActorComponent → USceneComponent → UPrimitiveComponent`
- `UObjectManager` 싱글톤으로 오브젝트 생명주기 관리, `ObjectFactory<T>`로 다형적 생성

#### DirectX 11 렌더링 파이프라인
- 커맨드 버퍼 패턴: `RenderCollector` → `RenderBus` → `Renderer`
- 멀티 패스 렌더링: component, depth-less, editor, grid, outline, overlay 패스 분류
- HLSL 셰이더 런타임 컴파일 (`Shader.h/cpp`)

#### 에디터 시스템
- `EditorEngine`: 메인 에디터 런타임 (월드 관리, 에디터 카메라, 씬 전환)
- `EditorMainPanel`: ImGui 기반 UI
- `EditorViewportClient`: 3D 뷰포트 + Ray-cast 기반 오브젝트 피킹
- `GizmoComponent`: 트랜스폼 조작 핸들

#### 입력 & 물리
- `InputSystem`: Windows 메시지 기반 키보드/마우스 (드래그 감지)
- `CollisionManager`: AABB 충돌 감지
- Ray-triangle intersection으로 뷰포트 오브젝트 선택

#### 직렬화
- `FSceneSaveManager`: JSON 기반 `.Scene` 파일 읽기/쓰기 (SimpleJSON 라이브러리)
- 액터, 컴포넌트, 트랜스폼, 카메라 상태 저장

### 기술 스택
- **그래픽스**: DirectX 11, HLSL
- **UI**: ImGui
- **직렬화**: SimpleJSON (json.hpp)
- **빌드**: MSBuild, Visual Studio 2022
- **버전 관리**: Git

## 최근 진행 상황
- 텍스처 아틀라스 최적화 (4096 → 2048)
- 그리드 색상 개선 (회색으로 변경)
- SubUV 시스템 추가 (bLoop, 렌더 패스 순서)
- 바운딩 볼륨 ShowFlag + Save/Load + ImGui 토글 추가
- Batcher 리팩토링: SRV 종류별 DrawCall 최적화
- 텍스트 렌더러 Outline/AABB 정렬 동기화
- 와이어프레임 모드에서 Outline 패스 Solid 유지
- InputSystem 윈도우 포커스 처리 수정
- README.md 작성

## 유용한 코드 스니펫

### 커스텀 RTTI 매크로 패턴
```cpp
// Object/Object.h
DECLARE_CLASS(UMyClass, UParentClass)
// Object/Object.cpp
DEFINE_CLASS(UMyClass)
```

### 렌더 패스 분류 패턴
```
RenderCollector → RenderBus (패스별 정렬)
  ├── Component Pass (일반 메시)
  ├── Depth-less Pass
  ├── Editor Pass
  ├── Grid Pass
  ├── Outline Pass
  └── Overlay Pass
```

### MSBuild 명령어
```bash
msbuild W3_Jungle_Team6.sln /p:Configuration=Debug /p:Platform=x64
```

---
*마지막 동기화: 2026-03-26*
*소스: [W3_Jungle_Team6](https://github.com/chodott/W3_Jungle_Team6)*
