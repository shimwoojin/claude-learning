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
`UWjWorldMinigameDataAsset` — `FWjWorldMinigameDefinition`(DisplayName, GameModeId, LevelPath, GameRuleClass, MapOptions, AllowedAbilityTags, StatNamespace, DefaultCameraMode). `GameModePlay::InitGame()`에서 URL Options 기반 동적 조회. `DefaultCameraMode`는 `GameRuleBase::OnGameReady()`에서 `GameStatePlay`에 리플리케이션.

### 다중 컨텍스트 배치 시스템
Lobby / ApproachingWall / JumpMap 3개 컨텍스트 지원.
- **EPlacementContext** 열거형, **IWjWorldPlacementDataProvider** GameState 인터페이스
- **PlacementComponent**: 컨텍스트별 저장/로드/삭제, `ValidateJumpMapLayout()` 검증 (JumpMap 에디터 저장 시 검증 실패 → 차단)
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
벽이 다가오며 안전 구역으로 이동하는 PvP. BrickSpawner(비동기 8개/틱) → WallManager(레벨별 속도). 12초마다 레벨업, Flood Fill 안전 구역 축소(4방향 인접), TileActor 폭탄 신호.
- **벽 이동 알고리즘**: 중앙 할당 방식 — `AssignBrickTargets()`가 `ShrinkSafeZones()` 후 각 FloodFillPoint에 맨해튼 거리 기준 Greedy로 가장 가까운 Standard 벽돌 배정 → `BrickMovement.SetAssignedTarget()` 주입 → 4방향 제한 이동 (2칸 이상 거리 시 2칸 이동)

### Sumo Knockoff 미니게임
원형 플랫폼 PvP 서바이벌. Z 낙하 감지 Eliminate, GA_Push(넉백+킬 추적), 3라운드 시스템, FloorRing(외곽→파괴), PowerUp(Speed/SuperPush/Shield), MapOption(Default/Bridge/Obstacle).

### JumpMap 미니게임
장애물 코스 타임어택. 시간 제한 120초, 체크포인트 리스폰, 완주 순서 추적.
- **장애물**: KillZone, MovingPlatform(서버 시간 동기화 + OriginalLocation 리플리케이션), RotatingObstacle(서버 시간 동기화), PushWind, Checkpoint, End, GrapplePoint. Checkpoint/KillZone/PushWind는 커스텀 프로퍼티에서 BoxExtent 직렬화
- **장애물 동기화**: `ServerElapsedTime` Replicated + `CalculatePositionFromTime()`/`CalculateRotationFromTime()` 순수 함수 → 클라/서버 동일 위치
- **어빌리티**: GA_Dash(Shift), GA_Grapple(E), GA_DoubleJump
- **CSV 레이아웃**: `JumpMapLayoutDataAsset` 내장+유저 로드, `#META:MapName:` 헤더, CustomProperties 11번째 컬럼
- **액터 직렬화**: JumpMapActorBase의 JumpMapObjectId + Get/ApplySerializableProperties. KillZone, MovingPlatform, RotatingObstacle, PushWind, Checkpoint, End, GrapplePoint 7개 서브클래스 모두 구현 완료
- **에디터**: WjWorldEditor 모듈 — JumpMapLevelEditorSubsystem + SJumpMapLayoutPanel

### Gameplay Ability System
`UWjWorldGameplayAbilityBase` — AbilityName/Icon UI 메타, 충전 인터페이스, AllowedAbilityTags 제한, GamePhase 체크. `State_Eliminated`/`State_Staggered` ActivationBlockedTags 공통.
- **AW 어빌리티**: GA_NormalAttack(4방향 벽돌 + 플레이어 경직), GA_SpawnBrick(충전+Preview), GA_LiftBrick(ServerRPC 패턴)
- **NormalAttack 경직**: 피격 플레이어에 `GE_NormalAttackStagger` 적용 (1초 Duration, `State.Staggered` 태그) → 이동+어빌리티 차단, 서버에서 DisableMovement + 타이머 복원
- **Sumo 어빌리티**: GA_Push(넉백+SuperPush), GA_Jump(CharacterJump 패턴)
- **JumpMap 어빌리티**: GA_Dash(LaunchCharacter), GA_Grapple(라인트레이스→당김), GA_DoubleJump(공중 1회)
- **GameplayTag**: `State_*`(Eliminated, Staggered, SpawnBrickPreview, LiftBrickCarry), `Cooldown_*`, `Ability_*`, `Buff_*`, `GameplayCue_*` 접두사 패턴
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
- **비밀번호 방**: `CreateSession()`에서 PASSWORD 커스텀 설정 저장, `GetSessionPassword()`로 검색 결과에서 추출
- **비밀번호 검증 흐름**: RoomListEntryWidget → `bIsPrivate` 확인 → PasswordInputWidget 팝업 → RoomListWindow.JoinRoomWithPassword() → 클라이언트 사전 검증 → JoinSession
- **PasswordInputWidget**: `UI/Session/` — ShowPopup/ClosePopup 패턴, Enter키 제출, 에러 메시지 표시
- **[Private] 표시**: RoomListEntryWidget에서 비공개 방 이름 앞에 `[Private]` 접두사
- **게임 중 방 노출**: `IN_PROGRESS` 세션 커스텀 설정으로 실제 진행 상태 추적, `UpdateSessionInProgress()` — StartGame/EndGame에서 호출
- **[Playing] 표시**: RoomListEntryWidget에서 진행 중 방 이름 앞에 `[Playing]` 접두사, `bInProgress && !bAllowJoinInProgress` 시 Join 버튼 비활성화
- **중간 입장 관전자**: `GameModePlay::HandleStartingNewPlayer_Implementation()` — Playing/Finished 단계 입장 시 `StartSpectatingOnly()`, GameRule 3종(AW/Sumo/JumpMap)에서 `IsGameInProgress()` 가드로 관전자 참여 추적 방지

### Steam 설정
- **AppID**: 4399350, `WITH_STEAM` 매크로 (Win64), `Steam/itemdefs.json`
- **네트워킹**: Steam=SteamNetDriver, LAN=WjWorldLanNetDriver(`PLATFORM_SOCKETSUBSYSTEM` 명시)
- **Config**: DriverClassName `/Script/ModuleName.ClassName` 정규 경로 필수
- **LAN 소켓 충돌**: SocketSubsystemSteamIP가 기본 소켓 오버라이드 → WjWorldLanNetDriver로 해결
- **코스메틱 DefId 넘버링**: Head 2000~2199, Body 2200~2399, Back 2400~2599, Effect 2600~2799 (200 간격)

### 재화 시스템
`UWjWorldCurrencySubsystem` — Coin/Gem 재화 관리. Steam Inventory 기반 + 비Steam GConfig 폴백.
- **잔액 조회**: `GetBalance()`, `GetAllBalances()` — Steam 환경에서 `GetAllItems` 단일 패스로 잔액 + 인스턴스 ID 동시 캐싱
- **미니게임 보상**: `TriggerMatchReward()` → Steam `TriggerItemDrop` (실패 시 로컬 폴백) + 2.5s/5s 인벤토리 갱신 재시도
- **일일 보상 제한**: `TodayMatchRewardCount` + `LastRewardDate` GConfig 영속, `GetRemainingDailyRewards()`, `MaxDailyMatchRewards` (DeveloperSettings, 기본 10)
- **코스메틱 구매**: `PurchaseItemWithCurrency()` → Steam `ExchangeItems` (캐시된 인스턴스 ID 사용) / 비Steam 로컬 차감
- **유료 재화 팩**: `PurchaseGemPack()` → Steam `StartPurchase` → 오버레이 결제 UI
- **폴링**: Exchange 결과 0.5초, Gem 구매 1초 주기 폴링 + 300초 타임아웃
- **로컬 저장**: `GGameUserSettingsIni` (cross-session 안정)
- **테스트**: `Currency_GrantCoin/Gem`, `Currency_SetCoin/Gem`, `Currency_Print/Refresh`, `Steam_ConsumeCurrency`, `Steam_ConsumeAllItems` 콘솔 명령어

### 보물상자 시스템
`AWjWorldTreasureChestActor` — `AWjWorldPlacedObjectActor` 서브클래스. 로비 배치 상호작용 오브젝트.
- **상호작용**: BoxComponent 오버랩 → EnableInput + EnhancedInput BindAction(F키) → OnInteract
- **보상**: Steam `TriggerItemDrop`(ChestIndex별 독립 generator DefId 300~309, 실패 시 로컬 폴백 + 2.5s/5s 재시도) / 비Steam `GrantCurrencyLocally`
- **쿨타임**: `FDateTime CachedLastOpenedTime` 인메모리 캐시 + `GGameUserSettingsIni` 영속 저장, 위치 해시 키 (`Chest_X_Y_Z`)
- **비주얼**: DMI 어두운 회색 틴트 (쿨타임 중), UI 프롬프트 (InteractionWidget), 뚜껑 Roll 애니메이션
- **ActorClassOverride**: `FPlaceableObjectDefinition`에 스폰 클래스 분기 필드 → GameStateLobby에서 사용
- **DeveloperSettings**: `TreasureChest` 카테고리 (CoinReward, CooldownSeconds, InteractAction, WidgetClass, GeneratorStartDefId)
- **테스트**: `TreasureChest_ClearCooldowns` 콘솔 명령어

### 캐릭터 프리뷰 시스템
`ACharacterPreviewActor` — 프로필/상점 UI용 3D 캐릭터 프리뷰. `UPlayerProfileWidget`, `UCosmeticPreviewPanel`에서 사용.
- **메시 복사**: `SetupFromPawn()` — SkeletalMesh + AnimBlueprint + RelativeRotation 복사 (Yaw=-90 보정 포함)
- **코스메틱 프리뷰**: `SetupPreview()` — 비동기 메시 로드 + Socket 부착 + ShowOnlyList
- **SceneCapture**: `PRM_UseShowOnlyList` + `SCS_FinalColorHDR` + `ClearColor::Transparent` + `bAlwaysPersistRenderingState = true`
- **실시간 캡처**: `bCaptureEveryFrame = true` (SetupFromPawn 완료 후 활성화, Idle 모션 반영)
- **투명 배경**: UI Material(`M_CharacterPreview`)에서 OneMinus로 alpha 반전 → `MaterialInstanceDynamic` → `Image::SetBrushResourceObject(MID)`
- **DeveloperSettings**: `CharacterPreviewMaterial` (UI 카테고리) — Material 경로 관리
- **RenderTarget**: `RTF_RGBA16f` + `InitCustomFormat(500, 1000, PF_FloatRGBA, false)`
- **스폰 위치**: `(0, 0, 15000)` — 월드와 겹치지 않는 상공

### 설정 시스템
`USettingsWidget` — 로비/대기실 설정 팝업. ShowPopup/ClosePopup 패턴.
- **그래픽 품질**: `UGameUserSettings::SetOverallScalabilityLevel()` (Low/Medium/High/Epic), `SaveSettings()` 영속
- **마스터 볼륨**: `GConfig` (`GGameUserSettingsIni`, `[WjWorldSettings]` 섹션, `MasterVolume` 키)
- **볼륨 적용**: `FAudioDeviceHandle::SetTransientPrimaryVolume()` — static `ApplySavedMasterVolume()`
- **즉시 적용**: Apply 버튼 없이 변경 시 바로 반영
- **시작 시 복원**: `GameInstance::Init()` → `ApplySavedMasterVolume()`
- **HUD 연동**: LobbyHUDWidget, WaitingRoomHUDWidget에서 `SettingsWidgetClass`/`SettingsWidgetInstance` 관리

### 채팅 시스템
`UChatWidget` — 멀티플레이어 채팅. HUDBase에서 `bCreateChatWidget=true`인 경우만 생성 (Lobby/WaitingRoom/Play). Intro/Login은 미생성.
- **RPC 흐름**: PlayerControllerBase.SendChatMessage() → Server RPC → GameStateBase.MulticastReceiveChatMessage() → OnChatMessageReceived 델리게이트
- **위젯**: ScrollBox(메시지 목록) + EditableTextBox(입력), Enter 키 전송, `IsChatInputFocused()` API
- **글로벌 Enter 키**: PlayerControllerBase에서 Enter → `ChatWidget.FocusChatInput()` (이미 포커스 중이면 스킵)
- **DeveloperSettings**: `ChatWidgetClass` (UI 카테고리)
- **UMG Blueprint**: `WBP_ChatWidget` (ChatScrollBox, ChatInputBox BindWidget)

### 글로벌 입력 시스템
`PlayerControllerBase::SetupInputComponent()` — Enter/ESC 키 바인딩. 모든 컨텍스트 공용.
- **Enter 키**: `OnEnterPressed()` → HUDBase → ChatWidget → `FocusChatInput()` (이미 포커스 중이면 스킵)
- **ESC 키**: `OnEscapePressed()` → HUDBase → `TryCloseTopPopup()` (가상 함수)
  - Lobby: Settings → Profile → Cosmetic → PlacementContextSelect 순서
  - WaitingRoom: Settings → Profile 순서
  - Play: `OnEscapePressed()` override → LeaveDialog 토글 (기존 동작 유지)
- **HUD 위임 패턴**: `AWjWorldHUDBase::TryCloseTopPopup()` → HUD 서브클래스 override → 위젯 인스턴스 `TryCloseTopPopup()` 위임

### Coin 획득 알림 시스템
`UCoinGainNotificationWidget` — "+X Coin" 토스트 표시. HUDBase에서 생성.
- **구독**: OnCurrencyBalanceChanged 델리게이트 (CurrencySubsystem)
- **표시**: 이전 잔액 캐시 → 델타 계산 → 양수면 금색 텍스트 3초 표시
- **DeveloperSettings**: `CoinGainNotificationWidgetClass` (UI 카테고리)
- **UMG Blueprint**: `WBP_CoinGainNotification` (NotificationText BindWidget)

### WjWorldDeveloperSettings
Project Settings > Game > WjWorld. 맵 경로, GameMode 클래스, 캐릭터 기본값, 미니게임 에셋, 배치 카탈로그, 카메라 InputAction, 보물상자 설정, MaxDailyMatchRewards, CharacterPreviewMaterial.
**설정 우선순위**: BP 서브클래스 UPROPERTY 값 우선 → DeveloperSettings 폴백

### 패키징 주의사항
- 새 레벨/맵 → Packaging > maps list에 추가 필수
- Non-asset 파일(.csv 등) → `DefaultGame.ini` `DirectoriesToAlwaysStageAsNonUFS`
- FFilePath → 패키지 빌드에서 `FPaths::ProjectContentDir()` 기준 변환

## 진행 중 / 미구현
- Steam 정식 출시 준비
- 솔로 컨텐츠 기획 필요: 봇 시스템, 솔로 모드, 또는 싱글 미니게임 추가
- Skeletal mesh 코스메틱 확장: 코드 인프라 준비 완료, 에셋 제작 + itemdefs.json 등록 필요

## 출시 전 체크리스트
- (현재 없음)

## 잔존 버그
- (현재 없음)

## 확인 필요 사항
- Room 목록 스케일링 — 1000+ 방 표시 시 부하 체크
- Sumo FloorRing 디자인 변경 검토 — 개별 타일 랜덤 파괴 전환 시 리플리케이션 비용
- 에셋 커밋 전략 수립 — LFS 정책, 브랜치 전략, 에셋 전용 커밋 분리
- BP_WaitingRoomHUDWidget에서 ProfileWidgetClass 설정 확인 — 3자 프로필이 안 보이는 문제 (코드 로직 정상)

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

## 2026-03-04
### 작업 내용

#### 매치 보상 카운터 위젯 (MatchRewardCounterWidget)
- **목적**: 승리/패배 일일 보상 잔여 횟수를 Lobby/WaitingRoom HUD에 상시 표시
- **DeveloperSettings 확장**: `MaxWinRewardsPerDay(5)`, `MaxLossRewardsPerDay(10)`, `WinRewardCoinAmount(50)`, `LossRewardCoinAmount(10)` — Steam `drop_max_per_window` 미러링 상수
- **CurrencySubsystem 분리 추적**: `TodayWinRewardCount`/`TodayLossRewardCount` 멤버 + `FOnMatchRewardCountChanged` 델리게이트 추가
  - `TriggerMatchReward()`: bIsWinner에 따라 승리/패배 카운트 각각 증가, Steam TriggerItemDrop 실패 시 해당 카운트를 max로 보정
  - `LoadDailyRewardData()`/`SaveDailyRewardData()`/`CheckDailyReset()`: 분리 카운트 포함
- **MatchRewardCounterWidget**: `WinCountText`/`LossCountText` (BindWidget) + `WinRewardText`/`LossRewardText` (BindWidgetOptional)
  - NativeConstruct에서 초기 카운트 + 델리게이트 구독, 상한 도달 시 회색 처리
- **HUDBase**: `bCreateMatchRewardCounter` 플래그 — Lobby/WaitingRoom 생성자에서만 true 설정

#### GA_Grapple 감지 방식 변경 + GrapplePoint 범위 하이라이트
- **문제**: 기존 라인 트레이스(`ECC_WorldStatic`)가 0.3 스케일 MeshComponent를 정확히 조준해야 히트 — 사실상 불가능
- **GA_Grapple 감지 변경**: 라인 트레이스 → `TActorIterator<AJumpMapGrapplePointActor>` + `IsInRange(CharLoc)` + 카메라 방향 dot product 선택
  - 범위 내(1500cm) GrapplePoint 중 카메라 방향과 가장 잘 맞는 것 자동 선택 (72도 원뿔, dot > 0.3)
- **GrapplePointActor 시각적 피드백**:
  - SphereComponent: `NoCollision` → `QueryOnly` (Pawn 오버랩만)
  - BeginPlay에서 OnComponentBeginOverlap/EndOverlap 바인딩
  - 로컬 플레이어 범위 진입: `SetRenderCustomDepth(true)` + 메시 스케일 0.3→0.5 확대
  - 범위 이탈: 원상 복원

#### JumpMap 카메라 모드 타이밍 수정
- **문제**: MinigameCatalog에서 DefaultCameraMode=ThirdPerson 설정되어 있지만 실제 3인칭 미적용
- **원인**: `DefaultCameraMode`가 `Replicated`이지만 `OnRep` 없음 → `OnGameReady()`에서 값 설정 후 클라이언트 도착 시 캐릭터에 재적용 안됨. 호스트도 `PossessedBy()` 시점이 `OnGameReady()` 이전이라 기본값(TopDown) 읽음
- **수정** (`WjWorldGameStatePlay`):
  - `UPROPERTY(Replicated)` → `UPROPERTY(ReplicatedUsing = OnRep_DefaultCameraMode)`
  - `OnRep_DefaultCameraMode()`: 로컬 플레이어 캐릭터의 `SetCharacterViewMode()` 호출
  - `SetDefaultCameraMode()`: 서버에서도 즉시 OnRep 호출 (호스트용)

#### CosmeticThumbnailGenerator 에디터 도구
- PlacementThumbnailGenerator 패턴을 코스메틱 카탈로그에 적용
- 콘솔 명령 `Cosmetic_GenerateIcons` — CosmeticCatalog 순회 → StaticMesh/SkeletalMesh 썸네일 → UTexture2D 에셋 일괄 생성
- 저장 경로: `/Game/UI/Textures/Cosmetic/T_Cosmetic_{ItemId}`

#### Approaching Wall 미니게임 폴리싱 (진행 중)
- **GA_LiftBrick 버그 수정**: 실제 Brick 없이도 PreviewActor가 표시되던 문제 — 클라이언트 사전 오버랩 검증 추가 (Moving/Destructible 벽돌 존재 확인 후 PreviewActor 생성)
- **GA_SpawnBrick 벽돌 타입 토글**: 어빌리티 키 재입력 시 Moving ↔ Destructible 토글 기능 추가
  - `InputPressed()` 오버라이드, 시작 타입은 랜덤
  - BrickPreviewActor에 `SetBrickTypeColor()` 추가 — 타입별 색상 시각 피드백
  - Server RPC에 `BrickType` 파라미터 추가 (클라이언트 선택 → 서버 검증)
- **MatchRewardCounterWidget 2배 기록 버그**: `OnRep_GameResult`가 3개 `ReplicatedUsing` 프로퍼티에 의해 중복 호출 → `bGameResultHandled` 플래그로 1회만 실행되도록 수정

#### Steam TriggerItemDrop 결과 확인 개선
- **문제**: `TriggerItemDrop` 반환값 `true`는 "API 요청 접수"일 뿐, 실제 아이템 지급 여부 불확인. ResultHandle을 즉시 파괴하여 지급 실패를 감지 못함
- **CurrencySubsystem (매치 보상)**: ResultHandle 보관 + 0.5초 폴링 → `GetResultStatus` + `GetResultItems` 확인
  - items > 0: 지급 확정, 일일 카운트 증가 + 인벤토리 갱신
  - items == 0: Steam drop 한도 도달, 해당 카테고리 카운트를 max로 설정
  - `bMatchRewardPending` 중복 방지 플래그
- **TreasureChestActor (보물상자)**: 동일 폴링 패턴 적용
  - 성공: 인벤토리 갱신 (즉시 + 2초 재시도)
  - 실패: 로컬 폴백 Coin 지급
  - EndPlay에서 ResultHandle 정리

#### Steam itemdefs.json 수정
- Match Win/Loss Reward `drop_interval`: 15 → 1 (최소값)

#### 기타
- **PlacementCatalogItemWidget**: MaxCount=0 시 `Collapsed` → `"X/∞"` (Unicode `\u221E`) 표시로 변경
- **Application.ico RC 빌드 에러 수정**: 1.6MB 파손 ICO 파일 → 엔진 기본 아이콘으로 교체

### 학습/메모
- **HUDBase 공통 위젯 패턴**: `bCreate*` protected bool 플래그 + 서브클래스 생성자에서 true 설정 → BeginPlay에서 조건부 생성. ChatWidget, MatchRewardCounterWidget 모두 동일 패턴
- **Steam drop_max_per_window 보정**: TriggerItemDrop 실패 = Steam 서버 한도 초과로 판단 → 로컬 카운트를 max로 보정하여 UI 즉시 반영
- **Replicated 프로퍼티 타이밍**: ServerTravel 후 초기화 순서에서 `PossessedBy()`가 `StartPlay()`/`OnGameReady()` 이전에 호출될 수 있음 → 중요한 값은 `ReplicatedUsing=OnRep_*`로 설정하여 도착 시 재적용 필요
- **라인 트레이스 vs 거리 기반 감지**: 작은 오브젝트를 정확히 조준하기 어려운 경우 `TActorIterator` + `IsInRange()` + dot product 방향 선택이 훨씬 실용적
- **Steam TriggerItemDrop 결과 확인**: `TriggerItemDrop(true)` ≠ 아이템 지급. ResultHandle을 `GetResultStatus` + `GetResultItems`로 폴링해야 실제 지급 여부 확인 가능. `k_EResultOK` + items == 0 → drop_window 한도 도달
- **ReplicatedUsing 다중 프로퍼티 주의**: 같은 `OnRep` 콜백을 공유하는 프로퍼티가 여러 개이면 네트워크 상황에 따라 콜백이 복수 호출됨 → 중복 실행 방지 플래그 필수

### 이슈/해결
- **RC 빌드 에러 (`Default.rc2`)**: `Application.ico is not in 3.00 format` — 1.6MB 파손 아이콘 파일이 원인. 엔진 기본 Default.ico로 교체하여 해결. 에디터 Project Settings > Windows에서 커스텀 아이콘 재설정 가능
- **MatchRewardCounter 2배 기록**: `OnRep_GameResult`가 `WinnerPlayerName`, `bGameHasWinner`, `bGameResultReady` 3개 프로퍼티에 의해 2~3회 호출 → `bGameResultHandled` 가드로 해결. 스탯/보상 모두 중복 지급 방지

### 출시 로드맵
1. **Approaching Wall 폴리싱** — 벽돌 머티리얼 시각 강화, Destructible 파괴 연출 적용 (코드 있으나 에셋 미적용), Explosive Brick 적극 활용 (현재 미사용), Moving Brick이 플레이어를 밀 수 있도록 대대적 변경 (현재 너무 정적)
2. **Sumo 폴리싱**
3. **JumpMap 폴리싱**
4. **캐릭터 스킨 추가** — Cosmetic Body Slot 에셋 제작
5. **판매 가능 Cosmetic 추가** — itemdefs.json 등록, 카탈로그 확장
6. **결제 및 Gem→Coin 구매 검증** — Steam 결제 플로우 E2E 테스트
7. **UI 폴리싱** — 전반적 UX 개선
8. **MiniGame Level 추가 및 폴리싱** — 맵 변형/추가
9. **Steam 출시 준비** — 스토어 페이지, 빌드 업로드, 최종 QA

---

## 2026-03-02
### 작업 내용

#### 버그 수정: 채팅 전송 후 키보드 조작 불능
- **증상**: Enter로 채팅 전송 후 WASD 등 키보드 조작이 안 됨 — 화면 클릭해야 복원
- **원인**: `SendCurrentMessage()`에서 텍스트만 클리어하고 포커스를 ChatInputBox에 남겨둠 → 키보드 입력이 계속 채팅 위젯으로 전달
- **수정**: `RestoreGameFocus()` 함수 추가 — `FSlateApplication::SetUserFocusToGameViewport(0)` 호출
  - 메시지 전송 후 + 빈 메시지 Enter 시 모두 포커스 복원

#### JumpMap 에셋 갱신 + GA_Grapple 감지 범위 확대
- GrappleRange 2000 → 3000 (감지 범위 확대)

---
*마지막 동기화: 2026-03-04*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
