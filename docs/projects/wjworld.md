# WjWorld

## 프로젝트 개요

## 프로젝트 개요
- **엔진**: Unreal Engine 5.7
- **언어**: C++
- **IDE**: Visual Studio 2022
- **목적**: 허브 공간, 미니게임, 멀티플레이어 기능을 갖춘 개인 학습 프로젝트
- **배포**: Steam (무료 출시, 코스메틱 유료 판매)


## 핵심 시스템

## 핵심 시스템

### GameRule 시스템
- **라이프사이클**: `Initialize()` → `OnGameReady()` → `OnGameStart()` → `OnGameEndPredict()` → `OnGameEnd()`
- **플레이어 이벤트**: `OnPlayerJoined()`, `OnPlayerLeft()` / **승리**: `CheckWinCondition()`, `GetWinner()`
- **동적 조회**: `MinigameCatalog`에서 `GameModeId`로 `GameRuleClass` 조회 (BP_GameModePlay 단일 사용)

### GameData 컴포넌트 시스템
GameplayTag 기반 타입 세이프 데이터. `GameStatePlay`에 게임 데이터, `PlayerStatePlay`에 플레이어 데이터. 리플리케이션 지원.

### 미니게임 카탈로그
`UWjWorldMinigameDataAsset` — `FWjWorldMinigameDefinition`(DisplayName, GameModeId, LevelPath, GameRuleClass, MapOptions, AllowedAbilityTags, StatNamespace). `GameModePlay::InitGame()`에서 URL Options 기반 동적 조회.

### 다중 컨텍스트 배치 시스템
Lobby / ApproachingWall / JumpMap 3개 컨텍스트 지원.
- **EPlacementContext** 열거형, **IWjWorldPlacementDataProvider** GameState 인터페이스
- **PlacementComponent**: 컨텍스트별 저장/로드/삭제, `ValidateJumpMapLayout()` 검증
- **PreviewActor**: 유효/무효 색상, 비동기 메시 로드, 회전 축(Yaw/Pitch/Roll) 전환
- **PlacedObjectActor**: ObjectId 저장, 삭제 하이라이트
- **LayoutSaveGame**: `FPlacedObjectSaveEntry.CustomProperties` (JumpMap CheckpointOrder 등)
- **입력**: LMB(배치), R(회전), T(축 전환), G(각도 전환), DEL(삭제), F(공중모드), ESC(종료)
- **CSV 내보내기**: AW(`Content/WallLayouts/User/`), JumpMap(`Content/JumpMapLayouts/User/`, 11번째 Properties 컬럼)
- **유저 레이아웃**: `WallDescriptionDataAsset`/`JumpMapLayoutDataAsset`에서 유저 CSV 런타임 스캔

### Approaching Wall 미니게임
벽이 다가오며 안전 구역으로 이동하는 PvP. BrickSpawner(비동기 8개/틱) → BrickMovement(단일 방향 선택) → WallManager(레벨별 속도). 12초마다 레벨업, Flood Fill 안전 구역 축소, TileActor 폭탄 신호.

### Sumo Knockoff 미니게임
원형 플랫폼 PvP 서바이벌. Z 낙하 감지 Eliminate, GA_Push(넉백+킬 추적), 3라운드 시스템, FloorRing(외곽→파괴), PowerUp(Speed/SuperPush/Shield), MapOption(Default/Bridge/Obstacle).

### JumpMap 미니게임
장애물 코스 타임어택. 시간 제한 120초, 체크포인트 리스폰, 완주 순서 추적.
- **장애물**: KillZone, MovingPlatform, RotatingObstacle, PushWind, Checkpoint, End, GrapplePoint
- **어빌리티**: GA_Dash(Shift), GA_Grapple(E), GA_DoubleJump
- **CSV 레이아웃**: `JumpMapLayoutDataAsset` 내장+유저 로드, `#META:MapName:` 헤더, CustomProperties 11번째 컬럼
- **액터 직렬화**: JumpMapActorBase의 JumpMapObjectId + Get/ApplySerializableProperties, 7개 서브클래스 구현
- **에디터**: WjWorldEditor 모듈 — JumpMapLevelEditorSubsystem + SJumpMapLayoutPanel

### Gameplay Ability System
`UWjWorldGameplayAbilityBase` — AbilityName/Icon UI 메타, 충전 인터페이스, AllowedAbilityTags 제한, GamePhase 체크.
- **AW 어빌리티**: GA_NormalAttack(4방향), GA_SpawnBrick(충전+Preview), GA_LiftBrick(ServerRPC 패턴)
- **Sumo 어빌리티**: GA_Push(넉백+SuperPush), GA_Jump(CharacterJump 패턴)
- **JumpMap 어빌리티**: GA_Dash(LaunchCharacter), GA_Grapple(라인트레이스→당김), GA_DoubleJump(공중 1회)
- **GameplayTag**: `State_*`, `Cooldown_*`, `Ability_*`, `Buff_*`, `GameplayCue_*` 접두사 패턴
- **주요 패턴**: Preview+Confirm/Cancel, 클라이언트 그리드좌표→Server RPC (LocalPredicted 위치 불일치 해결)

### 코스메틱 시스템
ItemId(FName) 기반. `ECosmeticSlot`(Head/Body/Back/Effect), 비동기 메시 로드, Steam Inventory 폴링.
- **리플리케이션**: PlayerStateBase → OnRep_CosmeticLoadout → CosmeticComponent.ApplyLoadout()
- **3자 동기화**: CharacterBase.OnRep_PlayerState() → PS->OnPawnSet() → 적용
- **구매**: PurchaseSubsystem → Steam MicroTransaction API → 콜백 → InventoryRefresh
- **테스트**: `Cosmetic_Grant*/Clear*/Print*/Equip*/Unequip` 콘솔 명령어

### Stats 시스템
`WjWorldStatsSubsystem` — Steam User Stats + GConfig 폴백. 네임스페이스 기반(`WjWorldStats::AW/Sumo/JumpMap`). GameStatePlay에서 게임 종료 시 자동 기록.

### 세션 관리
`USessionManager` — Steam OSS 우선 → NULL 폴백. LAN/Steam 모드 분기, 검색 큐, 호스트 마이그레이션.

### Steam 설정
- **AppID**: 4399350, `WITH_STEAM` 매크로 (Win64), `Steam/itemdefs.json`
- **네트워킹**: Steam=SteamNetDriver, LAN=WjWorldLanNetDriver(`PLATFORM_SOCKETSUBSYSTEM` 명시)
- **Config**: DriverClassName `/Script/ModuleName.ClassName` 정규 경로 필수
- **LAN 소켓 충돌**: SocketSubsystemSteamIP가 기본 소켓 오버라이드 → WjWorldLanNetDriver로 해결

### WjWorldDeveloperSettings
Project Settings > Game > WjWorld. 맵 경로, GameMode 클래스, 캐릭터 기본값, 미니게임 에셋, 배치 카탈로그, 카메라 InputAction.
**설정 우선순위**: BP 서브클래스 UPROPERTY 값 우선 → DeveloperSettings 폴백

### 패키징 주의사항
- 새 레벨/맵 → Packaging > maps list에 추가 필수
- Non-asset 파일(.csv 등) → `DefaultGame.ini` `DirectoriesToAlwaysStageAsNonUFS`
- FFilePath → 패키지 빌드에서 `FPaths::ProjectContentDir()` 기준 변환

## 진행 중 / 미구현
- Steam 정식 출시 준비

## 잔존 버그
- (현재 없음)

## 확인 필요 사항
- Room 목록 스케일링 — 1000+ 방 표시 시 부하 체크
- Sumo FloorRing 디자인 변경 검토 — 개별 타일 랜덤 파괴 전환 시 리플리케이션 비용
- 에셋 커밋 전략 수립 — LFS 정책, 브랜치 전략, 에셋 전용 커밋 분리

## 코딩 컨벤션
- 언리얼 엔진 코딩 표준 준수
- 클래스 접두사: `A` (Actor), `U` (UObject), `F` (구조체)
- 프로젝트 접두사: `WjWorld`
- 한글 주석 사용 가능

## 빌드 명령어
- Visual Studio에서 F5 (DebugGame Editor)
- `Batch/`: GenerateProjectFiles, OpenSolution, PackageDebugGame, PackageAndUploadSteam, RebuildProject, RunDebugEditor, GenerateDocs

## 게임 플로우
```
인트로 → 로그인 → 로비 → 방 생성(OpenLevel Lobby?game=WaitingRoom?Listen) → 대기실
    ↓
ServerTravel(PlayMap?game=GameModePlay?GameModeId=xxx?MapOption=yyy)
    ↓
GameModePlay: MinigameCatalog → GameRule 생성 → OnGameReady → 카운트다운 → OnGameStart
    ↓
TickGameRule → CheckWinCondition → OnGameEnd → 스탯 기록 → ServerTravel → 대기실 복귀
```

### 맵 전환 URL 패턴
- **방 생성**: `OpenLevel("/Game/Map/02-1_Lobby?game=BP_GameModeWaitingRoom_C?Listen")`
- **게임 시작**: `ServerTravel("{LevelPath}?game=BP_GameModePlay_C?GameModeId={id}?MapOption={opt}")`

## 최근 개발 로그

# WjWorld 개발 로그

## 2026-02-13
### 작업 내용 - 재화 시스템 구현 + JumpMap 버그 수정 모음

#### 재화 시스템 (Currency System) 신규 구현
- **`WjWorldCurrencyTypes.h` 생성** — `ECurrencyType` (Coin/Gem), `FCurrencyBalance` 구조체
- **`WjWorldCurrencySubsystem.h/.cpp` 생성** — GameInstanceSubsystem 기반
  - GetBalance, TriggerMatchReward, PurchaseItemWithCurrency, PurchaseGemPack, RefreshBalancesFromInventory
  - Steam Inventory API 연동 (TriggerItemDrop, ExchangeItems, StartPurchase)
  - 비Steam GConfig 기반 로컬 잔액 폴백
  - CosmeticSubsystem.OnInventoryUpdated 구독하여 잔액 자동 갱신
- **`WjWorldDeveloperSettings.h`** — Currency 카테고리 추가 (CoinSteamItemDefId, GemSteamItemDefId, MatchWin/LossRewardDefId)
- **`WjWorldCosmeticDataAsset.h`** — FCosmeticItemDefinition에 CoinPrice/GemPrice 필드 추가
- **`Steam/itemdefs.json` 확장** — WjCoin(1000), WjGem(1001), playtimegenerator(10/11), GemPack(20/21), exchange 레시피
- **`WjWorldGameStatePlay.cpp`** — 게임 종료 시 CurrencySubsystem.TriggerMatchReward() 호출 추가
- **`WjWorldLogCategories`** — LogWjWorldCurrency 카테고리 추가

#### JumpMap 버그 수정
- **방 만들기에서 JumpMap 유저 맵 미노출 수정** — `CreateRoomWindow::AddUserMapOptions`에 JumpMap 분기 구현
- **TMap 리플리케이션 에러 수정** — `WjWorldGameDataComponent`의 TMap UPROPERTY 제거 (TMap은 리플리케이션 미지원)
- **JumpMap 에디터 서브시스템 리팩토링** — CSV 기반에서 DataAsset BuiltInLayouts 기반으로 전환
- **bIsDefaultPlacement 플래그 추가** — JumpMapActorBase에 기본 배치 액터 보호 플래그, 에디터 Save/Clear에서 제외
- **Default 맵 로딩 수정** — `GameRuleJumpMap::LoadLayoutAndSpawnActors`에서 Default MapOption이 BuiltInLayouts[0] 로드하도록 수정
- **GameModePlay InputMode 수정** — PlayerControllerPlay BeginPlay에서 FInputModeGameOnly 설정

### 학습/메모
- UE TMap은 리플리케이션 미지원 → 컴포넌트에 UPROPERTY 제거하거나 USTRUCT 멤버에서 NotReplicated 사용
- Steam Inventory playtimegenerator의 drop_interval/drop_window/drop_max_per_window로 일일 보상 상한 제어
- ExchangeItems로 재화 소비 + 코스메틱 교환 원자적 처리 가능

### 이슈/해결
- **NotReplicated UHT 에러**: UActorComponent UPROPERTY에 NotReplicated 지정 시 "Only Struct members can be marked NotReplicated" 에러 → UPROPERTY 자체를 제거하여 해결

---

## 2026-02-12
### 작업 내용 - JumpMap 배치 모드 개선 (CustomProperties + 검증 + 유저 레이아웃 선택)

#### JumpMap 배치 에디터 CustomProperties + CSV 11번째 컬럼 (미커밋)
- **`FPlacedObjectSaveEntry`에 `TMap<FString, FString> CustomProperties` 필드 추가**
  - UPROPERTY Serialization으로 자동 처리, 빈 맵은 기존 세이브와 하위 호환
- **ConfirmPlacement에서 Checkpoint 배치 시 자동 CheckpointOrder 할당**
  - 기존 배치된 체크포인트의 최대 Order를 조회 후 +1 자동 부여
- **ExportJumpMapLayoutAsCSV에 11번째 Properties 컬럼 추가**
  - `Key=Value|Key=Value` 형식으로 CustomProperties 직렬화 (JumpMapLayoutDataAsset ParseLayoutCSV와 호환)
- **TickComponent에서 배치된 체크포인트 위에 `CP #N` 3D 텍스트 표시**
  - DrawDebugString으로 노란색 텍스트, JumpMap 컨텍스트에서만 렌더링

#### JumpMap 레이아웃 검증 시스템 (미커밋)
- **`ValidateJumpMapLayout()` 구현** — 저장 전 필수 오브젝트 유효성 검사
  - 체크포인트 최소 1개, 도착점 정확히 1개 검증
  - JumpMapEditor HUD의 `ExecuteSave()` 오버라이드에서 검증 후 경고 로그 출력 (작업 중 세이브는 허용)
- **JumpMapEditor 힌트 텍스트 업데이트** — T(축 전환), G(각도 전환), F(공중모드) 키 안내 추가

#### GameRuleJumpMap CSV 레이아웃 로딩 (미커밋)
- **`LoadLayoutAndSpawnActors()` 리팩토링** — MapOption 기반 CSV 레이아웃 로드 지원
  - Default/Random이 아닌 MapOption → JumpMapLayoutDataAsset에서 CSV 레이아웃 검색
  - CSV 레이아웃 없으면 기존 맵 배치 액터 사용 (폴백)
- **`SpawnActorsFromLayout()` 신규** — CSV 엔트리 → 액터 스폰 + ApplySerializedProperties
  - ObjectIdToActorClassMap(BP 프로퍼티) 우선, DeveloperSettings JumpMapObjectIdToClassMap 폴백

#### WaitingRoom JumpMap 유저 레이아웃 선택 (미커밋)
- **`UpdateMapComboBoxForGameMode()`에 JumpMap 유저 레이아웃 스캔 추가**
  - AW 패턴과 동일하게 `ScanUserJumpMapLayouts()` → `[User] {이름}` 형식 콤보박스 옵션

#### 빌드 검증
- 전체 빌드 성공 확인 (15 actions, 0 errors)

### 학습/메모
- `FPlacedObjectSaveEntry`에 TMap 추가 시 UPROPERTY 시리얼라이제이션으로 자동 처리되어 SaveVersion 변경 불필요 — 빈 맵은 기존 세이브와 하위 호환
- AW 유저 레이아웃 패턴(WallDescriptionDataAsset.ScanUserWallLayouts → WaitingRoom 콤보박스 → MapOption → GameRule 로딩)을 JumpMap에 그대로 적용 가능 — 일관된 아키텍처의 장점
- CSV 11번째 Properties 컬럼은 `JumpMapLayoutDataAsset::ParseLayoutCSV`가 이미 지원하므로 내보내기만 추가하면 완전한 왕복 직렬화 가능

---

### 작업 내용 - Lobby 배치 모드 카메라 Pawn 전환 + JumpMap 에디터 에셋/Intro 영상

#### JumpMap 에디터 에셋 + 에셋 팩 + Intro 영상 (커밋 7682d45)
- JumpMap 에디터 에셋 세팅 완료
- Platformer_8_Underworld 에셋 팩 추가
- Intro 영상 추가

#### Lobby 배치 모드 자유 비행 카메라 Pawn 구현
- **`AWjWorldPlacementCameraPawn`** 신규 생성 — APawn + UCameraComponent + UFloatingPawnMovement
  - WASD 수평 이동 (컨트롤러 Yaw 기준), Q/E 수직 이동
  - RMB 홀드 + 마우스 회전 (커서 유지), `bReplicates = false` 로컬 전용
  - MaxSpeed=1200, Accel=4000, Decel=8000 (부드러운 비행 조작감)
  - DeveloperSettings에서 InputAction 소프트 로드

- **`AWjWorldPlayerControllerLobby`** — 카메라 전환/복귀 함수 추가
  - `SwitchToPlacementCamera()`: 현재 카메라 위치에서 PlacementCameraPawn 스폰 + Possess
  - `RestoreOriginalPawn()`: 원래 캐릭터로 Possess 복귀 + 카메라 Pawn 파괴
  - `OriginalPawn` (TWeakObjectPtr), `PlacementCameraPawn` (TObjectPtr) 멤버 추가

- **`AWjWorldGameModeLobby`** — 배치 모드 Enter/Exit 흐름 리팩토링
  - `EnterPlacementMode()`: 카메라 전환 → 배치 모드 시작 → OnPlacementModeChanged 구독 → HUD 전환
  - `ExitPlacementMode()`: PlacementComp 종료만 호출 (나머지는 델리게이트에서 통합 처리)
  - `HandlePlacementModeChanged()` 신규: ESC/HUD Exit 모든 종료 경로 통합 (카메라 복귀 + HUD 복원 + 델리게이트 해제)


---
*마지막 동기화: 2026-02-13*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
