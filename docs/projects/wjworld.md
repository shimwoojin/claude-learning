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
  - **구매 수량 = 설치 상한**: 1회 구매 = 1개 설치 권한, `MaxPlacementCount`는 구매 상한 (무료 아이템은 `MaxPlacementCount`가 설치 상한)
  - **제한**: SelectObject() 소유권 게이트, ConfirmPlacement() 유료→OwnedQty/무료→MaxPlacementCount 검증, GameStateLobby 서버 측 수량 검증
  - **UI**: PopulateCatalog()에서 유료 `[배치수/OwnedQty]`/무료 `[배치수/MaxPlacementCount]` 표시, 구매 버튼은 `OwnedQty < MaxPlacementCount`일 때 표시
  - **전체 삭제**: ClearButton → ConfirmDialogWidget 확인 → `ClearAllPlacedObjects()` (DataProvider.ClearPlacedObjects + SaveLayout)
  - **비Steam 폴백**: GConfig `[PlacementInventory]` 섹션
  - **테스트**: `Placement_Buy`, `Placement_PrintInventory`, `Placement_GrantItem` 콘솔 명령어
- **공용 ConfirmDialogWidget**: `UI/Common/` — ShowPopup/ClosePopup + OnConfirmed/OnCancelled 델리게이트, NativeConstruct 전 호출 캐시 패턴

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
- **코스메틱 DefId 넘버링**: Head 2000~2199, Body 2200~2399, Back 2400~2599, Effect 2600~2799 (200 간격)

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
- Lobby/WaitingRoom 점프 검증 필요: Play에서 GA_Jump 정상 동작 확인, AW SpawnBrickPreview 중 점프 차단 확인

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

## 2026-02-23 (5)
### 작업 내용

#### Lobby/WaitingRoom 네이티브 점프 추가
- **배경** — Lobby/WaitingRoom에서 점프 불가. 점프는 GA_Jump(GAS 어빌리티)로만 존재하며 GAS는 Play 전용
- **방식** — GAS 도입 없이 CharacterBase에 네이티브 점프 바인딩 추가. 기존 auto-binding 시스템 활용
- **CharacterBase** — `Jump_Started()`, `Jump_Completed()` UFUNCTION 추가 → `IA_Jump` InputAction에 자동 바인딩. `CanNativeJump()` 가드 (기본 true)
- **CharacterPlay** — `CanNativeJump()` override → false 반환. 기존 GAS GA_Jump 경로 유지
- **BP 작업** — `IA_Jump` InputAction 생성, `IMC_Default`에 Space 키 바인딩 추가
- **키 충돌 해결** — Space는 `IA_Ability7`(GA_Jump)과 `IA_Jump`(네이티브) 모두 발동. Lobby에서는 GAS 미등록이라 네이티브만 동작, Play에서는 `CanNativeJump()=false`로 네이티브 차단

### 변경 파일
- `Core/Base/WjWorldCharacterBase.h/.cpp` — Jump_Started, Jump_Completed, CanNativeJump
- `Core/Play/WjWorldCharacterPlay.h/.cpp` — CanNativeJump override (false)
- `Content/Core/Input/InputAction/IA_Jump.uasset` (신규)
- `Content/Core/Input/IMC_Default.uasset`

### 학습/메모
- 기존 auto-binding 시스템(`SetupInputBindings`)이 IMC의 `IA_Jump` → `Jump_Started`/`Jump_Completed` 함수명 매칭을 자동 처리
- GAS를 비Play 컨텍스트에 도입하는 것보다 `CanNativeJump()` 가드 패턴이 훨씬 간결

---

## 2026-02-23 (4)
### 작업 내용

#### 코스메틱 아이템 DefId 카테고리별 재넘버링
- **넘버링 규칙** — 카테고리별 200 간격: Head 2000+, Body 2200+, Back 2400+, Effect 2600+
- **Military Hat** — 100→2000, 개별 `exchange: "1000x500"` 추가
- **Fedora Hat** — 신규 아이템 2001 (Head, 500코인)
- **Delivery Bag** — 120→2400, 기존 exchange 유지
- **Hat Bundle 삭제** — 140번 번들 제거 (불필요)
- 기존 100번대 코스메틱 DefId 전체 폐기

### 변경 파일
- `Steam/itemdefs.json`

### 학습/메모
- Steam itemdefs에서 `type: "bundle"`은 자동 언팩되는 묶음이라 개별 아이템으로 관리하는 게 맞음
- DefId 넘버링은 카테고리별 충분한 간격을 두면 향후 확장이 편리

---

## 2026-02-23 (3)
### 작업 내용

#### 공용 확인 다이얼로그 + Placement Clear 기능
- **ConfirmDialogWidget 신규** — `UI/Common/ConfirmDialogWidget.h/.cpp` 공용 확인/취소 팝업. `SetMessage()`, `SetButtonLabels()`, `OnConfirmed`/`OnCancelled` 델리게이트. NativeConstruct 전 호출 대비 캐시 패턴 적용
- **ClearAllPlacedObjects()** — `PlacementComponent`에 전체 삭제 함수 추가. DataProvider.ClearPlacedObjects() → RefreshVisuals → SaveLayout → OnObjectDeleted 브로드캐스트
- **PlacementHUD Clear 버튼** — `ClearButton`(BindWidgetOptional) + `ConfirmDialogClass`(EditDefaultsOnly) 추가. 클릭 → 확인 다이얼로그 → 전체 삭제. AW/JumpMap 에디터에는 버튼 없어도 정상 동작

#### 구매 수량 = 설치 상한 로직 수정
- **기존 문제** — 1회 구매로 MaxPlacementCount(5)만큼 무제한 설치 가능
- **수정 후** — 1회 구매 = 1개 설치 권한. 5회 구매(250 Coin) = 5개 설치 권한
- **PopulateCatalog UI** — 유료 아이템: `[배치수/OwnedQty]` 표시, 구매 버튼은 `OwnedQty < MaxPlacementCount`일 때 표시 (추가 구매 가능)
- **ConfirmPlacement 제한** — 유료 아이템: `OwnedQty`로 배치 제한, 무료 아이템: `MaxPlacementCount` 유지

### 변경 파일
- `UI/Common/ConfirmDialogWidget.h/.cpp` (신규)
- `GamePlay/Placement/WjWorldPlacementComponent.h/.cpp`
- `UI/Placement/PlacementHUDWidgetBase.h/.cpp`

### 학습/메모
- `MaxPlacementCount`의 역할이 "설치 상한"에서 "구매 상한"으로 의미 변경됨. 유료 아이템의 실제 설치 상한은 `OwnedQty`(구매 수량)
- 무료 아이템은 기존과 동일하게 `MaxPlacementCount`가 설치 상한
- BindWidgetOptional로 선언하면 컨텍스트별 BP에서 위젯이 없어도 크래시 없이 동작

---

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
*마지막 동기화: 2026-02-24*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
