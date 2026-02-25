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
벽이 다가오며 안전 구역으로 이동하는 PvP. BrickSpawner(비동기 8개/틱) → BrickMovement(단일 방향 선택) → WallManager(레벨별 속도). 12초마다 레벨업, Flood Fill 안전 구역 축소, TileActor 폭탄 신호.

### Sumo Knockoff 미니게임
원형 플랫폼 PvP 서바이벌. Z 낙하 감지 Eliminate, GA_Push(넉백+킬 추적), 3라운드 시스템, FloorRing(외곽→파괴), PowerUp(Speed/SuperPush/Shield), MapOption(Default/Bridge/Obstacle).

### JumpMap 미니게임
장애물 코스 타임어택. 시간 제한 120초, 체크포인트 리스폰, 완주 순서 추적.
- **장애물**: KillZone, MovingPlatform(서버 시간 동기화), RotatingObstacle(서버 시간 동기화), PushWind, Checkpoint, End, GrapplePoint
- **장애물 동기화**: `ServerElapsedTime` Replicated + `CalculatePositionFromTime()`/`CalculateRotationFromTime()` 순수 함수 → 클라/서버 동일 위치
- **어빌리티**: GA_Dash(Shift), GA_Grapple(E), GA_DoubleJump
- **CSV 레이아웃**: `JumpMapLayoutDataAsset` 내장+유저 로드, `#META:MapName:` 헤더, CustomProperties 11번째 컬럼
- **액터 직렬화**: JumpMapActorBase의 JumpMapObjectId + Get/ApplySerializableProperties, 7개 서브클래스 구현
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
- **SceneCapture**: `PRM_UseShowOnlyList` + `SCS_FinalToneCurveHDR` + `ClearColor::Transparent` + `bAlwaysPersistRenderingState = true`
- **실시간 캡처**: `bCaptureEveryFrame = true` (SetupFromPawn 완료 후 활성화, Idle 모션 반영)
- **투명 배경**: `r.PostProcessing.PropagateAlpha=1` (DefaultEngine.ini) — post-processing alpha 보존
- **RenderTarget**: `RTF_RGBA16f` + `InitCustomFormat(W, H, PF_FloatRGBA, false)` — alpha 완전 보존
- **RenderTarget 적용**: `UImage::SetBrushResourceObject(RT)` 패턴

### 설정 시스템
`USettingsWidget` — 로비/대기실 설정 팝업. ShowPopup/ClosePopup 패턴.
- **그래픽 품질**: `UGameUserSettings::SetOverallScalabilityLevel()` (Low/Medium/High/Epic), `SaveSettings()` 영속
- **마스터 볼륨**: `GConfig` (`GGameUserSettingsIni`, `[WjWorldSettings]` 섹션, `MasterVolume` 키)
- **볼륨 적용**: `FAudioDeviceHandle::SetTransientPrimaryVolume()` — static `ApplySavedMasterVolume()`
- **즉시 적용**: Apply 버튼 없이 변경 시 바로 반영
- **시작 시 복원**: `GameInstance::Init()` → `ApplySavedMasterVolume()`
- **HUD 연동**: LobbyHUDWidget, WaitingRoomHUDWidget에서 `SettingsWidgetClass`/`SettingsWidgetInstance` 관리

### 채팅 시스템
`UChatWidget` — 멀티플레이어 채팅. HUDBase에서 생성, 모든 컨텍스트(Lobby, WaitingRoom, Play) 공용.
- **RPC 흐름**: PlayerControllerBase.SendChatMessage() → Server RPC → GameStateBase.MulticastReceiveChatMessage() → OnChatMessageReceived 델리게이트
- **위젯**: ScrollBox(메시지 목록) + EditableTextBox(입력), Enter 키 전송, `IsChatInputFocused()` API
- **글로벌 Enter 키**: PlayerControllerBase에서 Enter → `ChatWidget.FocusChatInput()` (이미 포커스 중이면 스킵)
- **DeveloperSettings**: `ChatWidgetClass` (UI 카테고리)
- **UMG Blueprint 필요**: `WBP_ChatWidget` 생성 필요 (ChatScrollBox, ChatInputBox BindWidget)

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
- **UMG Blueprint 필요**: `WBP_CoinGainNotification` 생성 필요 (NotificationText BindWidget)

### WjWorldDeveloperSettings
Project Settings > Game > WjWorld. 맵 경로, GameMode 클래스, 캐릭터 기본값, 미니게임 에셋, 배치 카탈로그, 카메라 InputAction, 보물상자 설정, MaxDailyMatchRewards.
**설정 우선순위**: BP 서브클래스 UPROPERTY 값 우선 → DeveloperSettings 폴백

### 패키징 주의사항
- 새 레벨/맵 → Packaging > maps list에 추가 필수
- Non-asset 파일(.csv 등) → `DefaultGame.ini` `DirectoriesToAlwaysStageAsNonUFS`
- FFilePath → 패키지 빌드에서 `FPaths::ProjectContentDir()` 기준 변환

## 진행 중 / 미구현
- Steam 정식 출시 준비
- AW 벽 이동 알고리즘 재설계 필요: 현재 FloodFill 독립 방향 선택 → 벽돌 간 간격 발생, 목표 그리드 좌표 1:1 할당 방식으로 변경 검토
- 솔로 컨텐츠 기획 필요: 봇 시스템, 솔로 모드, 또는 싱글 미니게임 추가
- Skeletal mesh 코스메틱 확장: 코드 인프라 준비 완료, 에셋 제작 + itemdefs.json 등록 필요
- 게임 진행 중 방 노출 + 중간 입장 처리: bAllowJoinInProgress/bInProgress 존재, UI 시각 구분 및 모드별 정책 미구현
- UMG Blueprint 생성 필요: WBP_ChatWidget (ChatScrollBox, ChatInputBox), WBP_CoinGainNotification (NotificationText) + DeveloperSettings 설정

## 출시 전 체크리스트
- `Steam/itemdefs.json`: 보물상자(Treasure Chest #0~#9) `drop_max_per_window`를 `100` → `1`로 되돌리기 (현재 테스트용 100)

## 잔존 버그
- (현재 없음)

## 확인 필요 사항
- Room 목록 스케일링 — 1000+ 방 표시 시 부하 체크
- Sumo FloorRing 디자인 변경 검토 — 개별 타일 랜덤 파괴 전환 시 리플리케이션 비용
- 에셋 커밋 전략 수립 — LFS 정책, 브랜치 전략, 에셋 전용 커밋 분리
- BP_WaitingRoomHUDWidget에서 ProfileWidgetClass 설정 확인 — 3자 프로필이 안 보이는 문제 (코드 로직 정상)
- JumpMap GrapplePoint 콜리전 확인 — SphereComponent가 NoCollision, MeshComponent 콜리전으로 라인트레이스 감지되는지 테스트 필요

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

## 2026-02-25
### 작업 내용

#### 설정 UI 구현 (디스플레이 품질 + 마스터 볼륨)
- **SettingsWidget 신규** — `UI/Setting/SettingsWidget.h/.cpp` 생성
  - `UWjWorldUserWidgetBase` 상속, ShowPopup/ClosePopup 패턴
  - `GraphicsQualityComboBox` (Low/Medium/High/Epic) → `UGameUserSettings::SetOverallScalabilityLevel()` + `SaveSettings()`
  - `MasterVolumeSlider` (0.0~1.0) + `VolumePercentText` ("80%" 등)
  - 즉시 적용 패턴 (Apply 버튼 없음) — 슬라이더/콤보박스 변경 시 바로 반영
- **볼륨 영속** — `GConfig` (`GGameUserSettingsIni`, `[WjWorldSettings]` 섹션, `MasterVolume` 키)
- **볼륨 적용** — `static ApplySavedMasterVolume()` → `FAudioDeviceHandle::SetTransientPrimaryVolume()`
- **GameInstance::Init()** — 게임 시작 시 저장된 마스터 볼륨 자동 복원
- **LobbyHUDWidget** — `SettingsWidgetClass`/`SettingsWidgetInstance` 추가, `OnSettingsClicked()` 기존 품질 사이클링 코드 제거 → 설정 팝업 연동
- **WaitingRoomHUDWidget** — `SettingsButton` (BindWidgetOptional), `SettingsWidgetClass`/`SettingsWidgetInstance`, `OnSettingsClicked()` 추가
- **BP 작업** — `WBP_SettingsWidget` 위젯 블루프린트 생성, LobbyHUD/WaitingRoomHUD에 SettingsWidgetClass 설정

#### 코스메틱 구매 중복 방지 + Steam_GrantCoin 치트
- **CosmeticMainWindow** — ExchangePending 중 구매 버튼 중복 클릭 방지
- **CurrencySubsystem** — `IsExchangePending()` BlueprintCallable API 추가
- **PlayerControllerBase** — `Steam_GrantCoin` 콘솔 명령어 (GenerateItems)

#### 캐릭터 프리뷰 개선 (SceneCapture)
- **투명 배경** — `DefaultEngine.ini`에 `r.PostProcessing.PropagateAlpha=1` 추가, `ClearColor::Transparent` + `SCS_FinalColorLDR` 조합으로 배경 투명화
- **실시간 Idle 모션** — `SetupFromPawn()` 완료 후 `bCaptureEveryFrame = true` 활성화 (생성자에서는 false 유지)
- **Yaw 수정** — `PreviewMeshComponent->SetRelativeRotation(SourceMesh->GetRelativeRotation())` 로 ACharacter Yaw=-90° 보정값 복사
- **PlayerProfileWidget 간소화** — 0.5초 타이머 제거 → 즉시 `ApplyRenderTargetToImage()`, `SetBrushResourceObject(RT)` 패턴으로 통일

#### 비밀번호 방 시스템
- **SessionManager** — `CreateSession()`에서 `PASSWORD` 커스텀 설정 저장, `GetSessionPassword()` API 추가
- **PasswordInputWidget 신규** — ShowPopup/ClosePopup 패턴, Enter키 제출, 에러 메시지 표시, `OnPasswordSubmitted`/`OnPasswordCancelled` 델리게이트
- **RoomListEntryWidget** — `bIsPrivate` 확인 → 부모 `RoomListWindow::RequestJoinPrivateRoom()` 호출, `[Private]` 접두사 표시
- **RoomListWindow** — `JoinRoomWithPassword()` 비밀번호 대조 → 불일치 시 에러, 일치 시 `JoinRoom()`

#### 기타 개선
- **RoomListWindow** — `ShowPopup()`에서 `#if WITH_STEAM` → Steam 기본 모드
- **GA_Grapple** — `MaxPullDuration` (2초) 타임아웃 추가, 무한 풀 방지
- **WaitingRoomHUD** — `StartGameStatusText` 추가 (인원 부족/준비 대기 사유 표시)
- **PlayerProfileWidget** — LAN/NULL 환경에서 UniqueId 미유효 시 "Stats unavailable" 표시
- **메모 정리** — 12개 항목 검토, 완료 7건 / 추가 논의 6건 분류

#### 채팅 시스템 구현
- **RPC 파이프라인** — PC `SendChatMessage()` → Server RPC (`ServerSendChatMessage`) → GameState `MulticastReceiveChatMessage()` (NetMulticast) → `OnChatMessageReceived` 델리게이트 → ChatWidget UI
- **GameStateBase** — `FOnChatMessageReceived` 동적 멀티캐스트 델리게이트 + `MulticastReceiveChatMessage` NetMulticast RPC 추가
- **PlayerControllerBase** — `SendChatMessage()` (BlueprintCallable, 200자 제한) + `ServerSendChatMessage()` (Server, Reliable)
- **ChatWidget 신규** — `UI/Chat/ChatWidget.h/.cpp` 생성
  - `ChatScrollBox` (메시지 목록) + `ChatInputBox` (입력) BindWidget
  - Enter키 전송 (`OnTextCommitted` ETextCommit::OnEnter)
  - `AddChatMessage()`: TextBlock 동적 생성, ScrollBox 추가, 자동 스크롤, 50개 메시지 상한
- **HUDBase 연동** — DeveloperSettings `ChatWidgetClass` TSoftClassPtr → BeginPlay에서 CreateWidget + AddToViewport

#### Coin 획득 알림 UI
- **CoinGainNotificationWidget 신규** — `UI/HUD/CoinGainNotificationWidget.h/.cpp` 생성
  - `OnCurrencyBalanceChanged` 구독, 이전 잔액 캐싱 → 차액 계산
  - "+X Coin" 골드 텍스트 토스트, 3초 자동 숨김
- **HUDBase 연동** — DeveloperSettings `CoinGainNotificationWidgetClass` → BeginPlay에서 생성
- **Steam Inventory async 수정** — CurrencySubsystem이 CosmeticSubsystem의 `AllItemQuantities`/`AllItemInstanceIds` 캐시에서 읽도록 변경 (중복 async GetAllItems 호출 제거)

#### 게임 종료 시 호스트 조기 퇴장 → 클라 프리즈 수정
- **문제** — 게임 종료 후 ServerTravel 중 호스트가 나가면 클라가 30초 호스트 마이그레이션 타임아웃에 걸림
- **bGameEndTraveling 플래그** — `WjWorldGameInstance`에 추가
  - 서버: `EndGame()`에서 set
  - 클라: `OnRep_GamePhase(Finished)`에서 set
  - `HandleNetworkFailure`/`HandleTravelFailure`에서 체크 → 마이그레이션 스킵 → 즉시 로비 복귀
  - `CreateRoom()`/`MigrationFailed()`에서 reset

#### 호스트 마이그레이션 수정 (WaitingRoom)
- **NetworkMode 버그** — 클라의 `SessionManager.LastRoomSettings`가 JoinSession 시 미설정 → LAN 기본값 → 마이그레이션 검색 모드 오류
  - **수정**: `BeginHostMigration()`에서 `MigrationContext.CachedRoomSettings`로 `UpdateLastRoomSettings()` 동기화
- **PlayerList 버그** — `CachePlayerList()` 서버 전용 호출 → 모든 클라가 자신을 새 호스트로 판단
  - **수정**: `BeginHostMigration()`에서 `PlayerArray` fallback 빌드 + `OnRep_RoomSettings()`에서 `BroadcastPlayerListChanged()` 호출

### 변경 파일
- `Config/DefaultEngine.ini` — PropagateAlpha 추가
- `UI/Profile/CharacterPreviewActor.cpp` — 회전 복사 + 실시간 캡처
- `UI/Profile/PlayerProfileWidget.cpp` — 타이머 제거 + 브러시 간소화 + LAN 스탯 처리
- `UI/Session/PasswordInputWidget.h/.cpp` (신규)
- `UI/Session/RoomListEntryWidget.h/.cpp` — 비공개 방 표시 + 비밀번호 팝업 연동
- `UI/Session/RoomListWindow.h/.cpp` — Steam 기본 모드 + 비밀번호 검증 흐름
- `Core/Session/SessionManager.h/.cpp` — GetSessionPassword API
- `AbilitySystem/Abilities/GA_Grapple.h/.cpp` — MaxPullDuration 타임아웃
- `UI/WaitingRoom/WaitingRoomHUDWidget.h/.cpp` — StartGameStatusText
- `Core/Base/WjWorldGameStateBase.h/.cpp` — 채팅 RPC + 델리게이트
- `Core/Base/WjWorldPlayerControllerBase.h/.cpp` — SendChatMessage + ServerRPC
- `Core/Base/WjWorldHUDBase.h/.cpp` — ChatWidget + CoinGainNotification 생성
- `UI/Chat/ChatWidget.h/.cpp` (신규) — 채팅 위젯
- `UI/HUD/CoinGainNotificationWidget.h/.cpp` (신규) — 코인 획득 알림
- `Core/WjWorldGameInstance.h/.cpp` — bGameEndTraveling 플래그 + 마이그레이션 수정
- `Core/Play/WjWorldGameStatePlay.cpp` — OnRep_GamePhase에서 MarkGameEndTraveling
- `Core/Local/WaitingRoom/WjWorldGameStateWaitingRoom.cpp` — OnRep_RoomSettings PlayerList 동기화
- `Setting/WjWorldDeveloperSettings.h` — ChatWidgetClass 추가
- `Config/DefaultWjWorld.ini` — ChatWidgetClass 경로 추가
- `Memo/260225.txt` — 완료/미완료 분류 정리
- `CLAUDE.md` — 채팅/코인알림/폴더구조/패턴 문서 갱신

#### JumpMap 장애물 서버 동기화
- **문제** — MovingPlatform/RotatingObstacle이 클라이언트 독립 Tick → DeltaTime 차이로 위치 드리프트
- **MovingPlatform** — `ServerElapsedTime` (Replicated) 추가, 순수 함수 `CalculatePositionFromTime()` 으로 서버/클라 동일 위치 계산
  - 왕복 주기 = `TotalDistance / MoveSpeed * 2 + PauseTime * 2`, `fmod(Time, CycleTime)` → phase → 위치 보간

---
*마지막 동기화: 2026-02-25*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
