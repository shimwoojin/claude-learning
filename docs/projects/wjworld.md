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
- **구매 시스템 (Lobby 전용)**: `FPlaceableObjectDefinition.CoinPrice/SteamItemDefId/MaxPlacementCount`, `DeveloperSettings.MaxTotalLobbyPlacedObjects`
  - **소유권**: `CosmeticSubsystem.GetItemQuantityByDefId()` (AllItemQuantities 캐시)
  - **구매**: `CurrencySubsystem.PurchasePlacementObject()` → Steam ExchangeItems / 비Steam GConfig
  - **제한**: SelectObject() 소유권 게이트, ConfirmPlacement()+GameStateLobby 서버 측 수량 검증
  - **UI**: PopulateCatalog()에서 소유/가격/수량 표시, 미소유 클릭→구매
  - **비Steam 폴백**: GConfig `[PlacementInventory]` 섹션
  - **테스트**: `Placement_Buy`, `Placement_PrintInventory`, `Placement_GrantItem` 콘솔 명령어

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

### 재화 시스템
`UWjWorldCurrencySubsystem` — Coin/Gem 재화 관리. Steam Inventory 기반 + 비Steam GConfig 폴백.
- **잔액 조회**: `GetBalance()`, `GetAllBalances()` — Steam 환경에서 `GetAllItems` 단일 패스로 잔액 + 인스턴스 ID 동시 캐싱
- **미니게임 보상**: `TriggerMatchReward()` → Steam `TriggerItemDrop` / 비Steam 로컬 부여
- **코스메틱 구매**: `PurchaseItemWithCurrency()` → Steam `ExchangeItems` (캐시된 인스턴스 ID 사용) / 비Steam 로컬 차감
- **유료 재화 팩**: `PurchaseGemPack()` → Steam `StartPurchase` → 오버레이 결제 UI
- **폴링**: Exchange 결과 0.5초, Gem 구매 1초 주기 폴링 + 300초 타임아웃
- **로컬 저장**: `GGameUserSettingsIni` (cross-session 안정)
- **테스트**: `Currency_GrantCoin/Gem`, `Currency_SetCoin/Gem`, `Currency_Print/Refresh`, `Steam_ConsumeCurrency`, `Steam_ConsumeAllItems` 콘솔 명령어

### 보물상자 시스템
`AWjWorldTreasureChestActor` — `AWjWorldPlacedObjectActor` 서브클래스. 로비 배치 상호작용 오브젝트.
- **상호작용**: BoxComponent 오버랩 → EnableInput + EnhancedInput BindAction(F키) → OnInteract
- **보상**: Steam `TriggerItemDrop`(ChestIndex별 독립 generator DefId 300~309) / 비Steam `GrantCurrencyLocally`
- **쿨타임**: `FDateTime CachedLastOpenedTime` 인메모리 캐시 + `GGameUserSettingsIni` 영속 저장, 위치 해시 키 (`Chest_X_Y_Z`)
- **비주얼**: DMI 어두운 회색 틴트 (쿨타임 중), UI 프롬프트 (InteractionWidget), 뚜껑 Roll 애니메이션
- **ActorClassOverride**: `FPlaceableObjectDefinition`에 스폰 클래스 분기 필드 → GameStateLobby에서 사용
- **DeveloperSettings**: `TreasureChest` 카테고리 (CoinReward, CooldownSeconds, InteractAction, WidgetClass, GeneratorStartDefId)
- **테스트**: `TreasureChest_ClearCooldowns` 콘솔 명령어

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
- 배치 오브젝트 에디터 설정 필요: DataAsset에서 각 오브젝트의 CoinPrice/SteamItemDefId/MaxPlacementCount 입력, BP 위젯에 TotalPlacementCountText 바인딩

## 출시 전 체크리스트
- `Steam/itemdefs.json`: 보물상자(Treasure Chest #0~#9) `drop_max_per_window`를 `100` → `1`로 되돌리기 (현재 테스트용 100)

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

## 2026-02-23 (2)
### 작업 내용

#### 로비 배치 오브젝트 구매 시스템 구현
- **데이터 모델 확장** — `FPlaceableObjectDefinition`에 `CoinPrice`, `SteamItemDefId`, `MaxPlacementCount` 추가. `DeveloperSettings`에 `MaxTotalLobbyPlacedObjects` 추가
- **소유권 추적** — `CosmeticSubsystem`의 `ParseInventoryResult()`에서 전체 DefId별 수량 캐시(`AllItemQuantities`) 추가. `GetItemQuantityByDefId()` API 추가
- **구매 흐름** — `CurrencySubsystem::PurchasePlacementObject()` 추가. 기존 `ExchangeItems` 인프라 공유, `bPendingIsPlacement` 분기로 `OnPlacementPurchaseComplete`/`OnCurrencyPurchaseComplete` 분리
- **배치 제한** — `PlacementComponent::SelectObject()`에 소유권 게이트, `ConfirmPlacement()`에 종류당/전체 수량 게이트 추가. `GameStateLobby::AddPlacedObject()`에 서버 측 동일 검증 추가
- **UI 갱신** — `PlacementHUDWidgetBase::PopulateCatalog()`에서 소유/미소유/가격/수량 표시. 미소유 클릭 시 구매 시도. `OnObjectPlaced`/`OnObjectDeleted`/`OnPlacementPurchaseComplete`/`OnInventoryUpdated` 구독으로 자동 리프레시
- **비Steam 폴백** — GConfig `[PlacementInventory]` 섹션에 `ObjectId=Quantity` 저장/로드. `LoadPlacementInventoryFromLocal()`로 초기화 시 `AllItemQuantities` 복원
- **Steam itemdefs** — DefId 200~202 (Chair, Table, Lamp) 배치 오브젝트 아이템 등록, `exchange: "1000x{가격}"`
- **테스트 치트** — `Placement_Buy <ObjectId>`, `Placement_PrintInventory`, `Placement_GrantItem <ObjectId> [Qty]` 콘솔 명령어

### 변경 파일
- `DataAsset/WjWorldPlaceableObjectDataAsset.h`
- `Setting/WjWorldDeveloperSettings.h`
- `Cosmetic/WjWorldCosmeticSubsystem.h/.cpp`
- `Currency/WjWorldCurrencySubsystem.h/.cpp`
- `GamePlay/Placement/WjWorldPlacementComponent.h/.cpp`
- `Core/Local/Lobby/WjWorldGameStateLobby.cpp`
- `UI/Placement/PlacementHUDWidgetBase.h/.cpp`
- `Core/Base/WjWorldPlayerControllerBase.h/.cpp`
- `Steam/itemdefs.json`

### 참고
- Lobby 컨텍스트만 구매/소유권 적용. AW/JumpMap은 기존대로 자유 배치
- `TotalPlacementCountText`는 BP 위젯에 바인딩 필요 (BindWidgetOptional이라 없어도 동작)
- DataAsset에서 실제 오브젝트의 CoinPrice/SteamItemDefId/MaxPlacementCount 설정은 에디터에서 수동 입력 필요

---

## 2026-02-23
### 작업 내용

#### Steam ExchangeItems 실제 구현 (CurrencySubsystem)
- **PurchaseItemWithCurrency() Steam 분기 교체** — stub(로컬 차감+GrantItemLocally)를 실제 `ISteamInventory::ExchangeItems()` 호출로 교체
- **RefreshBalancesFromInventory() 리팩터** — `GetItemQuantityFromInventory()` 2회 호출 → 단일 `GetAllItems` 패스로 잔액 + `SteamItemInstanceID_t` 동시 캐싱
- **인스턴스 ID 캐시 추가** — `CachedCoinInstanceId`, `CachedGemInstanceId` (`ExchangeItems`에 필수)
- **Deinitialize()** — 인스턴스 ID 리셋 추가

#### 보물상자 쿨타임/보상 버그 수정
- **GConfig 세션간 영속성 수정** — 커스텀 ini 파일 → `GGameUserSettingsIni`로 통일 (TreasureChest, Currency, Cosmetic 3곳)
- **인메모리 캐시 추가** — `FDateTime CachedLastOpenedTime`으로 GConfig read-back 불안정 해결, F키 스팸 방지
- **itemdefs.json 보상 수량 수정** — `playtimegenerator`의 `bundle` 필드는 weight(확률)임을 발견, 중간 bundle 아이템(DefId 50,51,52) 추가로 Coin 50개 정상 지급
- **drop_interval 수정** — 1440(24시간 플레이타임) → 1(1분)로 변경

#### 테스트 치트 명령어 추가
- `Steam_ConsumeAllItems` — 인벤토리 전체 초기화 (GetAllItems 순회 → ConsumeItem)
- `Steam_ConsumeCurrency` — Coin/Gem만 소비
- `TreasureChest_ClearCooldowns` — TActorIterator로 모든 보물상자 로컬 쿨타임 초기화
- `TreasureChestActor::ResetCooldown()` — 캐시 초기화 + GConfig 키 삭제 + 비주얼 복원

#### itemdefs.json 테스트 설정
- 보물상자 `drop_max_per_window`: 1 → 100 (테스트용, 출시 전 1로 복원 필요)
- CLAUDE.md에 출시 전 체크리스트 섹션 추가

### 학습/메모
- **Steam `playtimegenerator` bundle 필드**: `"1000x50"`에서 `x50`은 수량이 아니라 **weight(확률 가중치)**. 실제 수량 지급은 `type: "bundle"` 중간 아이템 필요
- **Steam `drop_window`/`drop_max_per_window`**: 서버 측 rate limit으로 클라이언트/Web API로 초기화 불가. 테스트 시 `drop_max_per_window`를 높이는 것이 유일한 우회법
- **GConfig 커스텀 ini**: `FPaths::GeneratedConfigDir() + "Custom.ini"`는 UE 재시작 시 자동 로드 안됨. `GGameUserSettingsIni`가 cross-session 안정적
- **Steam Web API vs Client API**: `IInventoryService/ConsumeItem` Web API는 Publisher Key 필요 (보안 위험). 클라이언트 `ISteamInventory::ConsumeItem`으로 동일 결과 가능
- **Steam `StartPurchase`**: `price` 필드가 있는 아이템에 대해 Steam 오버레이 결제 UI 팝업 → 실결제 진행

### 이슈/해결
- **Coin 1개만 지급**: playtimegenerator bundle의 weight/quantity 혼동 → 중간 bundle 아이템으로 해결
- **쿨타임 미저장 (세션간)**: 커스텀 ini 미로드 → GGameUserSettingsIni로 전환
- **쿨타임 미동작 (세션내)**: GConfig read-back 불안정 → FDateTime 인메모리 캐시로 해결
- **ExchangeItems stub**: 로컬 차감만 하고 서버 미반영 → 인스턴스 ID 캐싱 + 실제 API 호출로 교체

---

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


---
*마지막 동기화: 2026-02-23*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
