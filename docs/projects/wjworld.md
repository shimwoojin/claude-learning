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

## 2026-03-02
### 작업 내용

#### 버그 수정: 채팅 전송 후 키보드 조작 불능
- **증상**: Enter로 채팅 전송 후 WASD 등 키보드 조작이 안 됨 — 화면 클릭해야 복원
- **원인**: `SendCurrentMessage()`에서 텍스트만 클리어하고 포커스를 ChatInputBox에 남겨둠 → 키보드 입력이 계속 채팅 위젯으로 전달
- **수정**: `RestoreGameFocus()` 함수 추가 — `FSlateApplication::SetUserFocusToGameViewport(0)` 호출
  - 메시지 전송 후 + 빈 메시지 Enter 시 모두 포커스 복원

#### JumpMap 에셋 갱신 + GA_Grapple 감지 범위 확대
- GrappleRange 2000 → 3000 (감지 범위 확대)
- JumpMap BP 에셋 4개 (CheckPoint, End, GrapplePoint, RotatingObstacle) 갱신
- DA_JumpMapLayouts, DA_JumpMapPlaceableCatalog, DA_MinigameCatalog 갱신

#### UI 위젯 블루프린트 갱신 + 리소스 추가
- 위젯 블루프린트 16개 수정 (Chat, Cosmetic, Currency, Placement, Lobby, Profile, Session, Setting, WaitingRoom)
- 버튼 이미지 9개, 배경/아이콘 4개 (T_BG_1/2, T_Gem, T_Simple_BG_1), 머티리얼 1개 (M_InvAlpha) 신규 추가

### 학습/메모
- **UMG 포커스 관리**: `EditableTextBox::SetKeyboardFocus()` 호출 시 Slate가 UI 입력 모드로 전환됨. 전송 후 `FSlateApplication::SetUserFocusToGameViewport(0)`로 명시적 복원 필요
- **SetInputMode vs SetUserFocusToGameViewport**: `SetInputMode(FInputModeGameAndUI())`는 컨텍스트별 분기 필요하지만, `SetUserFocusToGameViewport`는 현재 InputMode를 유지하면서 포커스만 이동시켜 더 범용적

### 이슈/해결
- **채팅 포커스 복원**: `SetInputMode` 대신 `SetUserFocusToGameViewport` 사용 — Lobby(GameAndUI), Play(GameOnly), WaitingRoom(GameAndUI) 각각 다른 InputMode를 건드리지 않고 포커스만 게임으로 복원

---

## 2026-02-27
### 작업 내용

#### 버그 수정: JumpMap MovingPlatform 클라이언트 높이 불일치
- **증상**: 호스트에서 Z 0~300 왕복하는 발판이 클라이언트에서 300~600으로 관측됨
- **원인**: 클라이언트가 BeginPlay 시 `GetActorLocation()`으로 이미 이동 중인 위치를 `OriginalLocation`으로 캡처 → MoveOffset만큼 높은 곳에서 왕복
- **수정 과정** (3단계):
  1. MoveOffset/MoveSpeed/PauseTime Replicated 추가 → 미해결
  2. `SetReplicateMovement(false)` 추가 (ReplicatedMovement가 이동 중 위치 전달 차단) → 미해결
  3. `OriginalLocation`을 `ReplicatedUsing = OnRep_OriginalLocation`으로 변경 → **해결**
- 서버만 BeginPlay에서 정확한 스폰 위치 저장, 클라이언트는 OnRep에서 수신 후 타이밍 캐시 재계산

#### 버그 수정: 로비 배치오브젝트 클라이언트 추락 (45도 회전)
- **증상**: SaveGame으로 배치한 오브젝트 위에서 클라이언트만 추락 (90도는 정상, 45도에서 발생)
- **원인**: PlacedObjectActor의 MeshComponent가 Movable → CMC가 MovementBase로 추적 시도 → 비리플리케이션 액터라 클라에서 base 해석 실패
- **수정**: MeshComponent 모빌리티를 `Stationary`로 변경 + `InitializeFromSaveData`에서 동기 메시 로딩 (콜리전 즉시 생성)

#### JumpMap Checkpoint/KillZone/PushWind BoxExtent 직렬화 추가
- CSV 레이아웃에서 콜리전 박스 크기를 인스턴스별 저장/복원 가능
- Checkpoint: CheckpointTrigger BoxExtent 추가 (기존 CheckpointOrder, RespawnOffset에 병행)
- KillZone: GetSerializableProperties/ApplySerializedProperties 신규 오버라이드 + BoxExtent
- PushWind: WindZone BoxExtent 추가 (기존 WindForce에 병행)
- GrapplePoint: SphereComponent → 기존 GrappleRadius로 이미 직렬화됨

#### JumpMap BP EndPoint 메시 위치 분석
- **문제**: 유저가 배치한 EndPoint 메시가 ~90 단위 아래로 스폰됨
- **원인**: PreviewActor는 메시=루트(오프셋 없음), 실제 BP는 MeshComponent RelativeLocation Z=-90
- **해결 방안**: BP에서 MeshComponent RelativeLocation을 (0,0,0)으로 통일, 필요시 GroundOffset 활용 (BP 에디터 작업)

### 학습/메모
- **UE 리플리케이션 초기 번들**: Actor channel 생성 시 현재 트랜스폼이 전달됨. `bReplicateMovement=true`면 ReplicatedMovement에 현재 위치가 포함되어 클라의 초기 위치가 스폰 위치와 다를 수 있음
- **ReplicatedUsing 활용**: 서버에서만 설정하는 값을 클라에 정확히 전달할 때 `UPROPERTY(ReplicatedUsing=OnRep_X)`가 `GetActorLocation()` 의존보다 안전
- **CMC MovementBase**: 비리플리케이션 Movable 액터는 클라에서 base 추적 실패 → Stationary로 변경하면 CMC가 base로 인식하지 않아 해결

### 이슈/해결
- **MovingPlatform 3단계 디버깅**: 프로퍼티 리플리케이션만으로는 부족, ReplicateMovement 비활성화도 부족, OriginalLocation 직접 리플리케이션이 최종 해결
- **하위 호환성**: BoxExtent 직렬화 추가 시 기존 CSV에는 해당 프로퍼티 없음 → `Find()` nullptr → 생성자 기본값 유지

---

## 2026-02-26
### 작업 내용

#### AW 벽 이동 알고리즘 재설계 (중앙 할당 방식)
- **AssignBrickTargets()** — `ShrinkSafeZones()` 후 FloodFillPoints에 맨해튼 거리 기준 Greedy로 가장 가까운 Standard 벽돌 배정
- **BrickMovement.SetAssignedTarget()** — 외부 타겟 주입, 기존 자체 방향 결정 로직 대체
- **4방향 제한** — 대각선 이동 제거, ShrinkSafeZones/PredictNextLevelIsLast도 4방향 인접으로 변경
- **2칸 이동** — 목표까지 거리 2 이상이면 한 번에 2칸 이동

#### 게임 중 방 노출 + 중간 입장 관전자 시스템
- **세션 IN_PROGRESS 상태** — `UpdateSessionInProgress()` 메서드 추가, GameInstance의 StartGame/EndGame에서 호출
- **방 목록 [Playing] 표시** — RoomListEntryWidget에 `[Playing]` 접두사, `bInProgress && !bAllowJoinInProgress` 시 Join 버튼 비활성화
- **중간 입장자 관전자** — `GameModePlay::HandleStartingNewPlayer()` override, GamePhase가 Playing/Finished면 `StartSpectatingOnly()`
- **GameRule 가드** — AW/Sumo/JumpMap 각 `OnPlayerJoined()`에 `IsGameInProgress()` 가드, `OnPlayerLeft()`에서 관전자 카운터 제외

#### 캐릭터 프리뷰 투명 배경 (Alpha 반전 머티리얼)
- **문제**: SceneCapture의 모든 CaptureSource 옵션에서 alpha 반전 발생 (메시=투명, 배경=불투명)
- **해결**: UI Material(`M_CharacterPreview`)에서 OneMinus로 alpha 반전 → MaterialInstanceDynamic으로 RenderTarget 전달
- **DeveloperSettings 연동** — `CharacterPreviewMaterial` TSoftObjectPtr 추가, 하드코딩 경로 제거
- **위젯 적용** — PlayerProfileWidget, CosmeticPreviewPanel 모두 MID 방식으로 변경 (폴백: 직접 RT)
- **스폰 위치** — `(0, 0, 15000)` 으로 통일 (기존 10000,10000,0 / 0,0,-10000)
- **RenderTarget 크기** — 500x1000으로 변경

#### HUDBase 채팅 위젯 필터링
- **bCreateChatWidget** — protected bool 플래그 추가 (기본 false)
- Lobby/WaitingRoom/Play HUD 생성자에서 `true` 설정 → Intro/Login에선 채팅 미생성

### 학습/메모
- **SceneCapture CaptureSource별 alpha 동작**:
  - `SCS_FinalToneCurveHDR` / `SCS_FinalColorHDR`: alpha 반전 (ShowFlags 조합과 무관)
  - `SCS_SceneColorHDR`: 메시 렌더링 불완전

---
*마지막 동기화: 2026-03-04*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
