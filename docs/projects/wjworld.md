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
- **PlacedObjectActor**: ObjectId 저장, 삭제 하이라이트, `ActorClassOverride`로 서브클래스 스폰 분기
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

### 보물상자 시스템
`AWjWorldTreasureChestActor` — `AWjWorldPlacedObjectActor` 서브클래스. 로비 배치 상호작용 오브젝트.
- **상호작용**: BoxComponent 오버랩 → EnableInput + EnhancedInput BindAction(F키) → OnInteract
- **보상**: `CurrencySubsystem->GrantCurrencyLocally(Coin, RewardAmount)`
- **쿨타임**: per-player 로컬 GConfig (`TreasureChestCooldown.ini`), 위치 해시 키 (`Chest_X_Y_Z`)
- **비주얼**: DMI 어두운 회색 틴트 (쿨타임 중), UI 프롬프트 (InteractionWidget)
- **ActorClassOverride**: `FPlaceableObjectDefinition`에 스폰 클래스 분기 필드 → GameStateLobby에서 사용
- **DeveloperSettings**: `TreasureChest` 카테고리 (CoinReward, CooldownSeconds, InteractAction, WidgetClass)

### WjWorldDeveloperSettings
Project Settings > Game > WjWorld. 맵 경로, GameMode 클래스, 캐릭터 기본값, 미니게임 에셋, 배치 카탈로그, 카메라 InputAction, 보물상자 설정.
**설정 우선순위**: BP 서브클래스 UPROPERTY 값 우선 → DeveloperSettings 폴백

### 패키징 주의사항
- 새 레벨/맵 → Packaging > maps list에 추가 필수
- Non-asset 파일(.csv 등) → `DefaultGame.ini` `DirectoriesToAlwaysStageAsNonUFS`
- FFilePath → 패키지 빌드에서 `FPaths::ProjectContentDir()` 기준 변환

## 진행 중 / 미구현
- Steam 정식 출시 준비
- 보물상자 BP 작업 필요: PlaceableObjectDataAsset에 ObjectId 등록, ActorClassOverride 설정, InteractAction/WidgetClass 에디터 설정

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

## 2026-02-19
### 작업 내용 - 보물상자 로비 배치 오브젝트 구현

#### 배치 시스템 확장 — ActorClassOverride
- **`WjWorldPlaceableObjectDataAsset.h`** — `FPlaceableObjectDefinition`에 `TSubclassOf<AWjWorldPlacedObjectActor> ActorClassOverride` 필드 추가
- **`WjWorldGameStateLobby.cpp`** — `RespawnAllPlacedObjects()`에서 `ActorClassOverride` 설정 시 해당 클래스로 스폰, 미설정 시 기본 `AWjWorldPlacedObjectActor` 사용 (하위 호환)
- 향후 자판기, NPC 등 상호작용 배치 오브젝트 확장에 동일 패턴 적용 가능

#### TreasureChestActor 신규 구현
- **`GamePlay/TreasureChest/WjWorldTreasureChestActor.h/.cpp` 생성** — `AWjWorldPlacedObjectActor` 서브클래스
  - **상호작용**: BoxComponent 오버랩 → EnableInput + EnhancedInput BindAction(F키) → OnInteract
  - **보상**: `CurrencySubsystem->GrantCurrencyLocally(Coin, RewardAmount)` 호출
  - **쿨타임**: per-player GConfig 저장 (`TreasureChestCooldown.ini`), 위치 해시 키 (`Chest_X_Y_Z`), `FDateTime::UtcNow` ISO8601 저장
  - **비주얼**: DMI 어두운 회색 틴트 (쿨타임 중), InteractionWidget UI 프롬프트
  - **뚜껑 메시**: `LidMeshComponent` 추가 (`RelativeLocation(0,-60,-60)`), Roll 회전 애니메이션 (0 → -120도)
  - **애니메이션**: Tick 기반 보간 (200도/초), 완료 시 Tick 자동 비활성화, `BeginPlay`에서 쿨타임 상태 따라 즉시 열림/닫힘

#### DeveloperSettings 확장
- **`WjWorldDeveloperSettings.h`** — TreasureChest 카테고리 추가
  - `TreasureChestCoinReward` (기본 50), `TreasureChestCooldownSeconds` (기본 86400초=24시간)
  - `TreasureChestInteractAction` (F키 InputAction), `TreasureChestWidgetClass` (상호작용 UI)

#### CLAUDE.md 갱신
- 폴더 구조에 `TreasureChest/` 추가, 클래스 계층에 `PlacedObject → TreasureChestActor` 추가
- 보물상자 시스템 섹션 신규 작성, DeveloperSettings 설명 갱신
- 진행 중/미구현에 BP 작업 필요 항목 추가

### 학습/메모
- `FPlaceableObjectDefinition`에 `ActorClassOverride`를 두면 기존 배치 시스템 변경 없이 서브클래스 스폰 가능 — 확장 패턴으로 유용
- `EnableInput(PC)` → UE5에서 자동으로 EnhancedInputComponent 생성 → `BindAction` 가능 (InteractablePortal 참조)
- Tick 기반 애니메이션: `bStartWithTickEnabled=false`, 애니메이션 시작 시 `SetActorTickEnabled(true)`, 완료 시 false — 불필요한 Tick 비용 방지

### 남은 작업
- BP 작업: PlaceableObjectDataAsset에 보물상자 ObjectId 등록, ActorClassOverride 설정
- DeveloperSettings에 InteractAction / WidgetClass 에디터 설정
- LidMeshComponent에 뚜껑 StaticMesh 할당

---

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

#### Currency 콘솔 명령어 추가 (미커밋)
- **`WjWorldPlayerControllerBase`에 Currency_* Exec 명령어 8개 추가** — 기존 Cosmetic_* 패턴 동일
  - `Currency_GrantCoin/GrantGem` — 로컬 재화 부여
  - `Currency_SetCoin/SetGem` — 잔액 직접 설정
  - `Currency_Print` — 잔액 로그 출력
  - `Currency_Refresh` — Steam 잔액 갱신
  - `Currency_BuyGemPack` — Gem 팩 구매 테스트
  - `Currency_SimulateReward` — 매치 보상 시뮬레이션 (0=패배, 1=승리)
- **`WjWorldCurrencySubsystem`에 `SetCurrencyLocally()` public 래퍼 추가** — private SetBalance 위임, DevelopmentOnly 메타
- 상태 변경 명령어는 함수 본문 내부 `#if !UE_BUILD_SHIPPING` 가드 (UHT 제약으로 선언부 가드 불가)

### 학습/메모
- UE TMap은 리플리케이션 미지원 → 컴포넌트에 UPROPERTY 제거하거나 USTRUCT 멤버에서 NotReplicated 사용
- Steam Inventory playtimegenerator의 drop_interval/drop_window/drop_max_per_window로 일일 보상 상한 제어
- ExchangeItems로 재화 소비 + 코스메틱 교환 원자적 처리 가능
- **UHT는 `#if !UE_BUILD_SHIPPING` 내부의 `UFUNCTION` 선언을 허용하지 않음** — `WITH_EDITORONLY_DATA`만 예외. 가드는 함수 본문 내부에서 처리해야 함

### 이슈/해결
- **NotReplicated UHT 에러**: UActorComponent UPROPERTY에 NotReplicated 지정 시 "Only Struct members can be marked NotReplicated" 에러 → UPROPERTY 자체를 제거하여 해결
- **UFUNCTION 전처리기 가드 에러**: `UFUNCTION(Exec)`를 `#if !UE_BUILD_SHIPPING` 안에 넣으면 UHT 에러 → 선언은 가드 밖에, 구현 본문 내부에서 가드 처리로 해결

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

---
*마지막 동기화: 2026-02-19*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
