# Lobby 배치 모드 카메라 Pawn 구현 + 카메라 회전 버그 수정

- **날짜**: 2026-02-12
- **프로젝트**: WjWorld
- **태그**: #UE5 #PlayerController #Pawn #PlacementSystem #Camera #Input #GamePlayCamera #bugfix

## 개요
로비 배치 편집 모드에서 자유 비행 카메라 Pawn으로 전환하는 시스템 구현. 배치 모드 진입 시 기존 캐릭터에서 카메라 Pawn으로 Possess 전환, 종료 시 원래 캐릭터로 복귀. 이후 발견된 카메라 회전 불가 버그를 UE5.7 엔진 소스 분석을 통해 해결.

## 작업 내용
- AWjWorldPlacementCameraPawn 신규 클래스 생성 (자유 비행 카메라)
- PlayerControllerLobby에 SwitchToPlacementCamera/RestoreOriginalPawn 구현
- GameModeLobby에 OnPlacementModeChanged 델리게이트 기반 통합 종료 흐름 구현
- DeveloperSettings에 카메라 InputAction 소프트 참조 4개 추가
- 배치 모드 종료 후 카메라 회전 불가 버그 수정 (GamePlayCamera Deactivate)

## 학습 내용

### 1. APlayerController::SpawnLocation 이름 충돌
`APlayerController`에 `SpawnLocation` 멤버가 이미 존재. 로컬 변수명으로 사용하면 C4458 경고/에러. `CameraSpawnLoc` 등 대안 사용.

### 2. PlacementComponent는 Pawn 전환에서 생존, InputComponent는 불가
`CreateDefaultSubobject`로 PC에 생성한 컴포넌트는 `Possess()` 호출에도 유지. 하지만 `InputComponent`는 새 Pawn의 것으로 교체됨. `Possess()` 후 `BindInputActions()` 재호출 필요.

### 3. OnPlacementModeChanged 델리게이트로 통합 종료 경로
ESC키/HUD 버튼 등 모든 종료 경로를 단일 콜백으로 통합:

```cpp
PlacementComp->OnPlacementModeChanged.AddDynamic(
    this, &AWjWorldGameModeLobby::HandlePlacementModeChanged);

void AWjWorldGameModeLobby::HandlePlacementModeChanged(EPlacementMode NewMode)
{
    if (NewMode != EPlacementMode::None) return;
    LobbyPC->RestoreOriginalPawn();
    LobbyHUD->HidePlacementHUD();
    PlacementComp->OnPlacementModeChanged.RemoveDynamic(
        this, &AWjWorldGameModeLobby::HandlePlacementModeChanged);
}
```

### 4. FloatingPawnMovement 튜닝

| 파라미터 | 값 | 비고 |
|-----------|------|------|
| MaxSpeed | 1200 | 빠른 로비 이동 |
| Acceleration | 4000 | 반응성 좋은 시작 |
| Deceleration | 8000 | 즉각 정지, 드리프트 없음 |

### 5. RMB Hold + Mouse Look 패턴
`Started`/`Completed` 트리거 이벤트로 `bRightMouseHeld` 상태 추적, `HandleLookInput`에서 체크 후 회전 적용.

### 6. UGameplayCameraComponent Activate/Deactivate 라이프사이클 (핵심 버그)

**문제**: 배치 모드 종료 후 원래 캐릭터로 복귀했을 때 카메라 회전이 동작하지 않음.

**근본 원인 (엔진 소스 분석)**:
- `APawn::UnPossessed()` → `DestroyPlayerInputComponent()` (InputComponent 파괴)
- `APawn::PawnClientRestart()` → `SetupPlayerInputComponent()` 재호출 (정상)
- **BUT**: `UGameplayCameraComponentBase::Activate(false)` 내부에서 `ShouldActivate()` → `!IsActive()` 체크
- GamePlayCamera는 첫 Possess 시 활성화된 후, UnPossess 시 Deactivate 되지 않음
- 따라서 재 Possess 시 `Activate(false)`가 no-op → 카메라 평가 컨텍스트 미초기화

**해결**: `SwitchToPlacementCamera()`에서 Possess 전에 `GamePlayCamera->Deactivate()` 호출:

```cpp
void AWjWorldPlayerControllerLobby::SwitchToPlacementCamera()
{
    // ...
    // 캐릭터의 GamePlayCamera 비활성화
    // (Possess 전 해제해야 재 Possess 시 Activate()가 정상 동작)
    if (AWjWorldCharacterBase* CharBase = Cast<AWjWorldCharacterBase>(GetPawn()))
    {
        if (UGameplayCameraComponent* GamePlayCamera = CharBase->GetGamePlayCamera())
        {
            GamePlayCamera->Deactivate();
        }
    }
    // ... Possess(PlacementCameraPawn) ...
}
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| APawn 상속 (ACharacter 아님) | 비행 카메라는 CharacterMovement 불필요, FloatingPawnMovement로 충분 |
| bReplicates = false | 로컬 전용 카메라, 네트워크 불필요 |
| DeveloperSettings 소프트 참조 | 에디터에서 InputAction 설정 유연성 확보 |
| Possess 전 GamePlayCamera Deactivate | UE5.7 Activate(false) no-op 방지, 재활성화 보장 |
| 델리게이트 기반 종료 흐름 | ESC/HUD 버튼 등 모든 경로 통합, 코드 중복 제거 |

## 생성/수정된 파일
- `Source/WjWorld/GamePlay/Placement/WjWorldPlacementCameraPawn.h` - 신규, 자유 비행 카메라 Pawn
- `Source/WjWorld/GamePlay/Placement/WjWorldPlacementCameraPawn.cpp` - 신규, 카메라 Pawn 구현
- `Source/WjWorld/Core/Local/Lobby/WjWorldPlayerControllerLobby.h` - 카메라 전환 멤버/메서드 추가
- `Source/WjWorld/Core/Local/Lobby/WjWorldPlayerControllerLobby.cpp` - 카메라 전환/복귀 + Deactivate 수정
- `Source/WjWorld/Core/Local/Lobby/WjWorldGameModeLobby.h` - HandlePlacementModeChanged 추가
- `Source/WjWorld/Core/Local/Lobby/WjWorldGameModeLobby.cpp` - 델리게이트 기반 Enter/Exit 흐름
- `Source/WjWorld/Setting/WjWorldDeveloperSettings.h` - 카메라 InputAction 소프트 참조 4개

## 아키텍처 흐름

```
[진입] SwitchToPlacementCamera()
  → GamePlayCamera.Deactivate()
  → Spawn CameraPawn at camera pos
  → Possess(CameraPawn)
  → SetupPlayerInputComponent (자동)
  → EnterPlacementMode
  → Subscribe OnPlacementModeChanged

[종료] OnPlacementModeChanged(None)
  → RestoreOriginalPawn (Possess → GamePlayCamera.Activate 정상 작동)
  → Destroy CameraPawn
  → HidePlacementHUD
  → Unsubscribe delegate
```

## 다음 단계
- [ ] 에디터에서 IA 4개 생성 (CameraMove, CameraLook, CameraRightMouse, CameraVerticalMove)
- [ ] IMC_Placement에 매핑 추가
- [ ] DeveloperSettings에서 할당
- [ ] 인게임 테스트 (WASD/QE 이동, RMB+마우스 회전, 배치 기능, ESC 복귀)

---
*저장 시간: 2026-02-12*
