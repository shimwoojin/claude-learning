# JumpMap 동기화 + NormalAttack 경직 + 채팅/ESC UX + 코인 안정성 + 카메라 모드

- **날짜**: 2026-02-25
- **프로젝트**: WjWorld
- **태그**: #Replication #GAS #GameplayEffect #Input #ESC #Chat #Currency #SteamInventory #Camera #RenderTarget #JumpMap #Minigame

## 개요
플레이테스트 메모 11개 항목을 계획 → 구현. JumpMap 장애물 네트워크 동기화, NormalAttack 플레이어 경직, Enter/ESC 글로벌 입력, 코인 보상 안정성+일일 제한, 미니게임별 카메라 모드, PreviewActor 렌더링 수정, JumpMap 에디터 검증 차단까지 전부 완료.

## 작업 내용

### JumpMap MovingPlatform/RotatingObstacle 서버 동기화
- 문제: 클라이언트 독립 Tick 시뮬레이션 → DeltaTime 차이로 위치 드리프트
- `ServerElapsedTime` (Replicated) + 순수 함수 `CalculatePositionFromTime()` / `CalculateRotationFromTime()` 패턴
- MovingPlatform: 왕복 주기 계산 → `fmod(Time, CycleTime)` → phase → 위치 보간
- RotatingObstacle: `RotationAxis * RotationSpeed * Time` (누적 오차 없음)

### NormalAttack 플레이어 경직 (1초)
- `GE_NormalAttackStagger` 신규 C++ GameplayEffect — `HasDuration` 1초, `State.Staggered` 태그 부여
- `GA_NormalAttack::ExecuteAttack()` — 벽돌 이후 플레이어 감지 추가 (자기/탈락자 제외)
- 서버: `DisableMovement()` + 1초 타이머 복원 + ASC에 GE 적용
- `WjWorldGameplayAbilityBase` 생성자 — `State_Staggered` ActivationBlockedTags (전 어빌리티 공통)

### Enter 키 채팅 + ESC 팝업 닫기
- `PlayerControllerBase::SetupInputComponent()` — `BindKey(EKeys::Enter/Escape)` 글로벌 핫키
- `ChatWidget::IsChatInputFocused()` 체크 → 이미 포커스 중이면 스킵
- `HUDBase::TryCloseTopPopup()` 가상 함수 → Lobby/WaitingRoom HUD에서 팝업 우선순위 닫기
- `PlayerControllerPlay::OnEscapePressed()` override — LeaveDialog 전용 처리

### 코인 보상 안정성 + 일일 제한
- `TriggerItemDrop` 실패 시 `GrantCurrencyLocally()` 폴백 (CurrencySubsystem + TreasureChestActor)
- 인벤토리 갱신: 2.5초 1차 + 5초 재시도 (`ScheduleInventoryRefresh()`)
- 일일 보상: `TodayMatchRewardCount` + `LastRewardDate` GConfig 영속
- `GetRemainingDailyRewards()` BlueprintCallable API
- `DeveloperSettings.MaxDailyMatchRewards` (기본 10, 0=무제한)

### 미니게임별 카메라 모드
- `FWjWorldMinigameDefinition.DefaultCameraMode` 필드 추가
- `GameStatePlay.DefaultCameraMode` Replicated → `GameRuleBase::OnGameReady()` 에서 세팅
- `CharacterPlay` — `PossessedBy()` / `OnRep_PlayerState()` 에서 적용

### PreviewActor 렌더링 수정
- `InitAutoFormat` → `InitCustomFormat(W, H, PF_FloatRGBA, false)` + `RTF_RGBA16f` (alpha 보존)
- `bAlwaysPersistRenderingState = true` (씬 외부 렌더링 안정화)

### JumpMap 에디터 검증 차단
- `PlacementHUDWidgetJumpMapEditor::ExecuteSave()` — 검증 실패 시 `return` (기존: 경고만)

## 학습 내용

### 네트워크 동기화 — 시간 기반 패턴
Tick 기반 시뮬레이션은 클라이언트 프레임레이트 차이로 반드시 드리프트 발생. `ServerElapsedTime` Replicated + 순수 함수 `CalculateFromTime(float)` 패턴으로 서버/클라 동일 결과 보장. `fmod`로 주기 반복 처리.

### C++ GameplayEffect Duration 하드코딩
`DurationPolicy = HasDuration` + `DurationMagnitude.SetValue(1.0f)` 으로 C++ GE에서 기간 고정 가능. 블루프린트 GE 불필요.

### ActivationBlockedTags 상속
Base 어빌리티 생성자에서 태그 추가하면 모든 서브클래스에 자동 상속. 전역 상태 차단 (Eliminated, Staggered 등)에 유용.

### BindKey vs EnhancedInput
글로벌 핫키 (Enter, ESC)는 `InputComponent->BindKey(EKeys::Xxx)` 가 간결. InputAction 생성 불필요, IMC에 등록할 필요 없음.

### RenderTarget Alpha 보존
`InitAutoFormat`은 `PF_B8G8R8A8` 기본 → alpha 손상 가능. `InitCustomFormat(W, H, PF_FloatRGBA, false)` + `RTF_RGBA16f` 로 alpha 완전 보존. `r.PostProcessing.PropagateAlpha=1` 과 조합.

### 코인 보상 폴백 전략
Steam `TriggerItemDrop`은 네트워크 의존성 → 실패 시 로컬 폴백 + 지연 인벤토리 갱신(2.5s + 5s 재시도)이 실용적.

## 결정 사항
| 결정 | 이유 |
|------|------|
| ServerElapsedTime 리플리케이션 방식 | 서버 RPC 대비 대역폭 효율 + 자연스러운 보간 |
| C++ GE (GE_NormalAttackStagger) | 단순 1초 경직이라 BP 불필요, 코드에서 직접 생성 |
| PlayerControllerBase에 Enter/ESC 바인딩 | 모든 컨텍스트 공용, Play에서만 override |
| TryCloseTopPopup을 AHUD에 배치 | UUserWidget이 아닌 AHUD 계층에서 팝업 관리 → PC가 HUD에 접근 |
| TriggerItemDrop 실패 시 로컬 폴백 | 보상 미지급보다 로컬 부여가 UX 우선 |
| DefaultCameraMode를 GameStatePlay에 리플리케이션 | 서버에서 카탈로그 조회 → 클라에 전파, 클라는 BeginPlay 후 적용 |

## 생성/수정된 파일
- `AbilitySystem/Effects/GE_NormalAttackStagger.h/.cpp` (신규) — 1초 경직 GE
- `GamePlay/JumpMap/JumpMapMovingPlatformActor.h/.cpp` — ServerElapsedTime 리플리케이션
- `GamePlay/JumpMap/JumpMapRotatingObstacleActor.h/.cpp` — ServerElapsedTime 리플리케이션
- `AbilitySystem/Abilities/GA_NormalAttack.h/.cpp` — 플레이어 감지 + 경직
- `AbilitySystem/Abilities/WjWorldGameplayAbilityBase.cpp` — State_Staggered 블록
- `WjWorldGameplayTag.h/.cpp` — State_Staggered 태그
- `Core/Base/WjWorldPlayerControllerBase.h/.cpp` — Enter/ESC 바인딩
- `Core/Play/WjWorldPlayerControllerPlay.h/.cpp` — OnEscapePressed override
- `Core/Base/WjWorldHUDBase.h/.cpp` — TryCloseTopPopup
- `Core/Local/Lobby/WjWorldHUDLobby.h/.cpp` — TryCloseTopPopup 위임
- `Core/Local/WaitingRoom/WjWorldHUDWaitingRoom.h/.cpp` — TryCloseTopPopup 위임
- `UI/Chat/ChatWidget.h/.cpp` — IsChatInputFocused
- `UI/Lobby/LobbyHUDWidget.h/.cpp` — TryCloseTopPopup 구현
- `UI/WaitingRoom/WaitingRoomHUDWidget.h/.cpp` — TryCloseTopPopup 구현
- `Currency/WjWorldCurrencySubsystem.h/.cpp` — 폴백 + 재시도 + 일일 제한
- `GamePlay/TreasureChest/WjWorldTreasureChestActor.cpp` — 폴백 + 재시도
- `Setting/WjWorldDeveloperSettings.h` — MaxDailyMatchRewards
- `DataAsset/WjWorldMinigameDataAsset.h` — DefaultCameraMode 필드
- `Core/Play/WjWorldGameStatePlay.h/.cpp` — DefaultCameraMode 리플리케이션
- `Core/Play/WjWorldCharacterPlay.cpp` — 카메라 모드 적용
- `Core/GameRule/WjWorldGameRuleBase.cpp` — DefaultCameraMode 세팅
- `UI/Profile/CharacterPreviewActor.cpp` — RTF_RGBA16f + bAlwaysPersistRenderingState
- `UI/Placement/PlacementHUDWidgetJumpMapEditor.cpp` — 검증 차단

## 유용한 코드/명령어
```cpp
// ServerElapsedTime 기반 위치 계산 패턴
FVector AJumpMapMovingPlatformActor::CalculatePositionFromTime(float Time) const
{
    float CycleTime = (TotalDistance / MoveSpeed) * 2.f + PauseTime * 2.f;
    float Phase = FMath::Fmod(Time, CycleTime);
    // Phase → 이동/정지 구간 판별 → Alpha 계산 → Lerp
}

// C++ GameplayEffect Duration 하드코딩
UGE_NormalAttackStagger::UGE_NormalAttackStagger()
{
    DurationPolicy = EGameplayEffectDurationType::HasDuration;
    FScalableFloat DurationFloat;
    DurationFloat.SetValue(1.0f);
    DurationMagnitude = FGameplayEffectModifierMagnitude(DurationFloat);
    InheritableOwnedTagsContainer.AddTag(Tag::State_Staggered());
}

// RenderTarget alpha 보존 포맷
RenderTarget->RenderTargetFormat = RTF_RGBA16f;
RenderTarget->InitCustomFormat(Width, Height, PF_FloatRGBA, false);
```

## 다음 단계
- [ ] JumpMap에서 DefaultCameraMode를 ThirdPerson으로 설정 (MinigameCatalog 데이터 에셋 편집)
- [ ] 경직 효과 VFX/사운드 추가 (GameplayCue_NormalAttack_Stagger)
- [ ] 일일 보상 한도 도달 시 UI 메시지 표시 (OnRep_GameResult에서)
- [ ] 멀티플레이어 테스트 — MovingPlatform 위치 동기화 확인

---
*저장 시간: 2026-02-25 16:00*
