# JumpMap 미니게임 전체 구현

- **날짜**: 2026-02-10
- **프로젝트**: WjWorld
- **태그**: #Minigame #JumpMap #GameRule #GAS #Ability #TeamAgent #Layout #HUD #Replication

## 개요
세 번째 미니게임 "JumpMap" (타임어택 장애물 레이스) 전체 C++ 코드 구현. Agent Teams (4 병렬 에이전트)를 활용하여 32개 신규 파일 + 7개 수정 파일을 한 세션에서 완료. 에디터 세팅(BP, 맵, 카탈로그, 입력 바인딩)까지 완료.

## 작업 내용
- JumpMap GameRule 구현 (시간 제한, 체크포인트 리스폰, 완주 추적, Z 낙하 감지)
- JumpMap GameData/PlayerData 컴포넌트 구현 (리플리케이션)
- 장애물 액터 7종 구현 (KillZone, MovingPlatform, RotatingObstacle, PushWind, Checkpoint, End, GrapplePoint)
- JumpMap 레이아웃 DataAsset 구현 (내장+유저 CSV 파싱)
- 3개 신규 어빌리티 구현 (GA_Dash, GA_Grapple, GA_DoubleJump)
- JumpMap 전용 HUD 위젯 구현
- 스탯, 태그, InputID, DeveloperSettings, PlacementTypes 통합
- DefaultGameplayTags.ini에 5개 신규 태그 등록
- 에디터 세팅 완료 (MinigameCatalog, InputMapping, CharacterPlaySetup, HUDPlay)
- 코드 리뷰 중 4개 버그 수정

## 학습 내용

### Agent Teams 병렬 구현 패턴
- 4개 에이전트 병렬 실행 (Core, Actors, Abilities, HUD+Integration)
- 생성 후 반드시 코드 리뷰 필요 — 에이전트가 기존 패턴 대신 단순 구현으로 대체하는 경우 다수 발생
- KillZone/EndActor/RotatingObstacle이 `Character->OnEliminated()` (Sumo 영구 제거) 대신 `GameRule->OnPlayerDied()` (체크포인트 리스폰)를 호출해야 하는데, 에이전트가 잘못 구현 → 수동 수정
- CheckpointActor가 로그만 남기고 실제 PlayerData 갱신 누락 → 수동 수정

### JumpMap GameRule 아키텍처
- `TActorIterator<AJumpMapCheckpointActor>` / `<AJumpMapEndActor>`로 맵에 배치된 구조 액터 자동 수집
- CheckpointLocations: `TArray<FVector>` (CheckpointOrder 인덱스로 접근)
- OnPlayerDied: `PlayerData->GetCurrentCheckpointIndex()` → RespawnPlayerAtCheckpoint
- OnPlayerFinished: 완주 시간 기록 → GameData에 순서 추가 → 전원 완주 시 게임 종료

### GA_DoubleJump의 CanActivateAbility 우회
- GA_Jump의 `CanActivateAbility`는 `CanJump()` 체크 (공중이면 false)
- GA_DoubleJump는 `UWjWorldGameplayAbilityBase::CanActivateAbility` 직접 호출로 GA_Jump 체크 건너뜀
- 공중에서 `CurrentJumpCount < MaxJumpCount`일 때만 허용
- `mutable int32 CurrentJumpCount` — const CanActivateAbility에서 리셋 필요

### WjWorldGameplayTag 헬퍼 일관성
- 기존 어빌리티들은 `WjWorldGameplayTag::Ability_Push()` 등 static 헬퍼 사용
- 에이전트가 생성한 코드는 `FGameplayTag::RequestGameplayTag(TEXT("Ability.Dash"))` 직접 호출 → 수동 통일

## 결정 사항
| 결정 | 이유 |
|------|------|
| CheckpointOrder 기반 역주행 방지 | 낮은 번호 체크포인트로 되돌아가면 무시하여 악용 방지 |
| GA_Grapple 미스 시 쿨다운 미적용 | CommitAbility를 히트 확인 후 호출 (DontCommitOnMiss 패턴) |
| Ability10 = DoubleJump | Ability7(Jump) 재사용 대신 별도 InputID로 분리하여 바인딩 유연성 확보 |
| MovingPlatform FMath::VInterpConstantTo | VInterpTo 대신 일정 속도 이동으로 예측 가능한 플랫폼 동작 보장 |

## 생성/수정된 파일

### 신규 파일 (32개)
- `Core/GameRule/WjWorldGameRuleJumpMap.h/cpp` - 게임 규칙
- `Core/GameData/JumpMapGameDataComponent.h/cpp` - 게임 데이터
- `Core/GameData/JumpMapPlayerDataComponent.h/cpp` - 플레이어 데이터
- `GamePlay/JumpMap/JumpMapActorBase.h/cpp` - 액터 베이스
- `GamePlay/JumpMap/JumpMapKillZoneActor.h/cpp` - 킬 존
- `GamePlay/JumpMap/JumpMapMovingPlatformActor.h/cpp` - 무빙 플랫폼
- `GamePlay/JumpMap/JumpMapRotatingObstacleActor.h/cpp` - 회전 장애물
- `GamePlay/JumpMap/JumpMapPushWindActor.h/cpp` - 바람 구역
- `GamePlay/JumpMap/JumpMapCheckpointActor.h/cpp` - 체크포인트
- `GamePlay/JumpMap/JumpMapEndActor.h/cpp` - 도착 트리거
- `GamePlay/JumpMap/JumpMapGrapplePointActor.h/cpp` - 그래플 포인트
- `GamePlay/JumpMap/JumpMapLayoutDataAsset.h/cpp` - 레이아웃 CSV 로더
- `AbilitySystem/Abilities/GA_Dash.h/cpp` - 대시 어빌리티
- `AbilitySystem/Abilities/GA_Grapple.h/cpp` - 그래플 어빌리티
- `AbilitySystem/Abilities/GA_DoubleJump.h/cpp` - 이중 점프 어빌리티
- `UI/HUD/JumpMapHUDWidget.h/cpp` - HUD 위젯

### 수정 파일
- `WjTypes.h` - Ability8/9/10 InputID 추가
- `WjWorldGameplayTag.h/cpp` - 5개 태그 추가
- `WjWorldStatTypes.h/cpp` - JumpMap 스탯 네임스페이스
- `WjWorldPlacementTypes.h` - GetUserJumpMapLayoutDirectory()
- `WjWorldDeveloperSettings.h` - JumpMapLayoutDataAsset 참조
- `WjWorldPlacementComponent.h/cpp` - ExportJumpMapLayoutAsCSV()
- `Config/DefaultGameplayTags.ini` - 5개 태그 INI 등록

### 에디터 세팅 (.uasset)
- `DA_MinigameCatalog` - JumpMap 등록
- `DA_CharacterPlaySetup` - Dash/Grapple/DoubleJump 바인딩
- `IMC_Default` - Shift(Dash)/E(Grapple) 입력 매핑
- `BP_HUDPlay` - JumpMapHUDWidget 매핑

## 다음 단계
- [ ] JumpMap 맵 레벨 생성 + 패키징 맵 목록 추가
- [ ] BP_GameRuleJumpMap 생성 (ObjectIdToActorClassMap, TimeLimit 등 프로퍼티 설정)
- [ ] JumpMap PlaceableCatalog DataAsset 생성 (JM_Start, JM_End, JM_Checkpoint 등)
- [ ] 에디터 PIE 테스트 → 장애물/체크포인트/도착 동작 확인
- [ ] Steam 2PC 멀티플레이 테스트

---
*저장 시간: 2026-02-10 16:20*
