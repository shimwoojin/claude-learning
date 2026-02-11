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
미니게임을 정의하기 위한 규칙 시스템. `UWjWorldGameRuleBase`를 상속받아 각 미니게임의 규칙을 구현.
- **라이프사이클**: `Initialize()` → `OnGameReady()` → `OnGameStart()` → `OnGameEndPredict()` → `OnGameEnd()`
- **플레이어 이벤트**: `OnPlayerJoined()`, `OnPlayerLeft()`
- **승리 조건**: `CheckWinCondition()`, `GetWinner()`
- **틱 처리**: `GameModePlay::Tick()`에서 `TickGameRule()` 직접 호출
- **동적 조회**: `MinigameCatalog`에서 `GameModeId`로 `GameRuleClass` 조회 (BP_GameModePlay 단일 사용)

### GameData 컴포넌트 시스템
게임/플레이어별 데이터를 관리하는 컴포넌트 시스템. GameplayTag 기반 타입 세이프 데이터 저장.
- `GameStatePlay`에 게임 전체 데이터 (예: 웨이브 타이밍)
- `PlayerStatePlay`에 플레이어별 데이터 (예: 점수, 상태)
- 리플리케이션 지원
- **ApproachingWallGameDataComponent**: `CurrentWallName`, `WallBrickSize`, `WallCenterOffset`, `WallColumnNum`, `WallRowNum` 리플리케이트 (클라이언트 WallDesc 로드용 + CSV 미보유 대응)

### 미니게임 카탈로그 시스템
`UWjWorldMinigameDataAsset` 기반 미니게임 정의 및 동적 조회.
- **FWjWorldMinigameDefinition**: DisplayName, GameModeId, LevelPath, GameRuleClass, MapOptions, AllowedAbilityTags, StatNamespace
- **FWjWorldMinigameMapOption**: 맵 변형 옵션 (예: 기본, 랜덤)
- **AllowedAbilityTags**: 미니게임별 허용 어빌리티 태그 (빈 = 전부 허용, 하위 호환)
- **StatNamespace**: 미니게임별 스탯 키 접두사 (예: "AW", "Sumo")
- **동적 GameRule 조회**: `GameModePlay::InitGame()`에서 URL Options의 `GameModeId`로 카탈로그 조회
- **DeveloperSettings 참조**: `MinigameCatalog` 소프트 참조

### 다중 컨텍스트 배치 시스템
Lobby / ApproachingWall / JumpMap 3개 컨텍스트를 지원하는 확장된 배치 시스템.
- **EPlacementContext**: `None`, `Lobby`, `ApproachingWall`, `JumpMap` 열거형
- **IWjWorldPlacementDataProvider**: GameState 추상화 인터페이스 (AddPlacedObject, RemovePlacedObjectAt, GetPlacedObjects)
- **PlacementComponent**: 컨텍스트 지원, `SaveLayoutToSlot()`/`LoadLayoutFromSlot()`/`DeleteLayoutSlot()`, `GetSavedLayoutSlots()`, `LoadedSlotName` 추적
- **PlacementPreviewActor**: 배치 프리뷰 (유효/무효 색상), `FStreamableManager` 비동기 메시 로드
- **PlacedObjectActor**: 실제 배치된 오브젝트, 삭제 모드 하이라이트
- **PlaceableObjectDataAsset**: 컨텍스트별 배치 가능 오브젝트 카탈로그 (`FPlaceableObjectDefinition`)
- **LayoutSaveGame**: `USaveGame` 기반 레이아웃 저장/로드 (컨텍스트별 SaveSlot: `LobbyLayout`, `ApproachingWallLayout`, `JumpMapLayout`)
- **GameStateLobby**: 배치 오브젝트 리플리케이션 (`TArray<FPlacedObjectSaveEntry>`)
- **입력**: LMB(배치), R(회전), DEL(삭제), ESC(종료)
- **에디터 모드**: AWEditor, JumpMapEditor 전용 GameMode/GameState/HUD
- **WallLayoutConverter**: AW 컨텍스트용 배치 오브젝트 → WallLayout CSV 변환, 외부/내부 영역 구분 유효성 검사
- **CSV 내보내기**: `ExportLayoutAsCSV()` - SaveGame 저장 시 CSV 파일도 자동 내보내기 (`Content/WallLayouts/User/`)
- **유저 레이아웃 자동 스캔**: `WallDescriptionDataAsset`에서 유저 CSV 디렉토리 런타임 스캔, 내장+유저 레이아웃 통합 지원

### Approaching Wall 미니게임
첫 번째 미니게임. 벽이 점진적으로 다가오며 플레이어들이 안전 구역으로 이동해야 하는 PvP 게임.
- **BrickSpawner**: 데이터 에셋 기반 비동기 벽돌 스폰 (8개/틱), 내장+유저 레이아웃 통합 지원
- **WallDescriptionDataAsset**: 내장 레이아웃 + 유저 레이아웃 자동 스캔 (`ScanUserWallLayouts()`, `GetWallDescriptionByNameIncludingUser()`)
- **BrickMovement**: 개별 벽돌 이동 로직 (경로 탐색)
- **WallManager**: 벽 이동 진행 관리 (레벨별 속도 조절)
- **레벨 시스템**: 12초마다 레벨업, 이동 시간 5초→1초 (10레벨)
- **안전 구역**: Flood Fill 알고리즘으로 축소
- **TileActor**: 안전 구역 타일, 폭탄 신호 시스템 (3초 차징), 노랑→빨강 색상 전환, 방향별 오버랩 체크
- **BrickPreviewActor**: 어빌리티 배치 프리뷰, 유효(초록)/무효(빨강) 색상 표시, 동적 머티리얼

### Sumo Knockoff 미니게임
두 번째 미니게임. 원형 플랫폼 위에서 상대를 밀어 떨어뜨리는 PvP 서바이벌.
- **WjWorldGameRuleSumo**: TickGameRule에서 매 프레임 Z 위치 체크, FallThresholdZ(-500) 미만 시 Eliminate
- **GA_Push**: 전방 구형 오버랩 → LaunchCharacter() 넉백, SetLastAttacker() 킬 추적, SuperPush 배율, CameraShake 피격 피드백
- **SumoGameDataComponent**: AlivePlayerCount, TotalPlayerCount, KillFeed (LastKillFeedText+Counter), Round (CurrentRound/MaxRounds), FSumoPlayerScore 배열 (모두 Replicated)
- **SumoPlayerDataComponent**: bIsAlive, TotalScore (Replicated + OnRep + Delegate)
- **SumoFloorRingActor**: 축소 플랫폼 링 (ESumoRingState: Active/Warning/Destroyed), RingOrder 기반 외곽부터 파괴
- **SumoPowerUpActor**: 파워업 픽업 (ESumoPowerUpType: SpeedBoost/SuperPush/Shield), SphereComponent 오버랩, AddLooseGameplayTag 버프
- **라운드 시스템**: 3라운드, 탈락 순서 기반 점수 배분, 라운드 간 링/파워업/플레이어 리셋
- **승리 조건**: 라운드 내 AlivePlayerCount <= 1, 최종 TotalScore 기준 우승자
- **맵 변형**: MapOption URL 파라미터 (Default/Bridge/Obstacle), 맵별 설정 분기
- **엣지 케이스**: 솔로 자동 승리, 동시 탈락, 전원 이탈
- **상태**: C++ 코드 완료, 에디터 세팅 필요 (BP 프로퍼티, 링 배치, HUD 위젯, 파워업 BP)

### JumpMap 미니게임
세 번째 미니게임. 장애물 코스를 통과하여 결승점에 도달하는 타임어택 레이스.
- **WjWorldGameRuleJumpMap**: 시간 제한(120초), Z 낙하 감지, 체크포인트 리스폰, 완주 순서 추적
- **체크포인트 시스템**: CheckpointOrder 기반 진행 관리, 역주행 방지, 사망 시 마지막 체크포인트에서 리스폰
- **장애물 액터**: KillZone (즉사), MovingPlatform (왕복 이동), RotatingObstacle (회전+킬/넉백), PushWind (방향성 바람)
- **맵 구조 액터**: Checkpoint, End (도착 트리거), GrapplePoint (그래플 대상)
- **어빌리티**: GA_Dash (Ability8/Shift), GA_Grapple (Ability9/E), GA_DoubleJump (Ability10)
- **JumpMapGameDataComponent**: ElapsedTime, TimeLimit, PlayerFinishOrder (모두 Replicated)
- **JumpMapPlayerDataComponent**: CurrentCheckpointIndex, DeathCount, bHasFinished, FinishTime (모두 Replicated)
- **JumpMapLayoutDataAsset**: 내장+유저 CSV 레이아웃 로드, `#META:MapName:` 헤더 지원
- **승리 조건**: 전원 완주 or 시간 초과, 최단 시간 플레이어 우승
- **엣지 케이스**: 솔로 자동, 전원 이탈, 플레이어 없음
- **상태**: C++ 코드 완료 + 에디터 세팅 완료 (MinigameCatalog, InputMapping, CharacterPlaySetup, HUDPlay)

### Gameplay Ability System
GAS 기반 어빌리티 시스템. `UWjWorldGameplayAbilityBase`를 상속받아 각 어빌리티 구현.
- **AbilityBase 공통 기능**: AbilityName, AbilityIcon (UI 메타), GetPromptDescription(), 충전 시스템 인터페이스 (IsChargeBased, GetCurrentCharges, GetMaxCharges, GetChargeRefillTimeRemaining)
- **AbilityBase 어빌리티 제한**: `CanActivateAbility()` 오버라이드 - GameState의 `AllowedAbilityTags` 체크 (빈 = 전부 허용)
- **GA_NormalAttack**: 4방향 스냅(Yaw 기반) 벽돌 공격, BrickType별 처리 (Standard 파괴 불가, Explosive/Moving/Destructible)
- **GA_SpawnBrick**: 충전 기반 벽돌 배치, Preview → Confirm/Cancel 패턴, GE 기반 충전 리필, 어트리뷰트 변경 위임
- **GA_LiftBrick**: 벽돌 재배치 어빌리티, Moving/Destructible 벽돌 들어올리기, Cancel 시 원래 위치 복원, 들고 있는 벽돌 색상 리플리케이션, ServerLiftBrickAtGridIndex RPC (클라이언트 그리드 좌표 전송)
- **GA_Push**: Sumo 넉백 어빌리티, 전방 구형 오버랩 → LaunchCharacter(), PushForce=1200, CooldownDuration=1.5s, SetLastAttacker(), SuperPushMultiplier(2x), PushHitCameraShake
- **GA_Jump**: Sumo 점프 어빌리티, UE CharacterJump 패턴 기반, LocalPredicted, CommitAbility(), Character->Jump()/StopJumping(), 가변 높이 점프, InputReleased로 종료
- **GA_Dash**: JumpMap 대시 어빌리티, LaunchCharacter 전방 발사, DashDistance=600, DashDuration=0.2s, CooldownDuration=2s, 타이머 기반 EndAbility
- **GA_Grapple**: JumpMap 그래플 어빌리티, 카메라 라인트레이스→JumpMapGrapplePointActor 감지, 히트 시 LaunchCharacter 당김 + 도착 체크, 미스 시 쿨다운 없이 종료 (CommitAbility 미호출)
- **GA_DoubleJump**: GA_Jump 확장, 공중에서 1회 추가 점프, CanActivateAbility에서 GA_Jump의 CanJump() 우회 → UWjWorldGameplayAbilityBase 직접 호출, CurrentJumpCount 기반 허용
- **AttributeSet**: HP, MaxSpawnBrickCharges, SpawnBrickCharges, OnRep 콜백
- **Effects**: GE_AbilityCooldown (쿨다운), GE_SpawnBrickChargeCost (충전 비용), GE_SumoSpeedBoost/SuperPush/Shield (참조용 GE, 실제 버프는 AddLooseGameplayTag)

### GameplayTag 정의
- `State_SpawnBrickPreview` - GA_SpawnBrick 활성 상태
- `State_LiftBrickCarry` - GA_LiftBrick 활성 상태
- `Cooldown_NormalAttack` - NormalAttack 쿨다운 태그
- `Cooldown_LiftBrick` - LiftBrick 쿨다운 태그
- `Ability_Push` - GA_Push 어빌리티 태그
- `Cooldown_Push` - GA_Push 쿨다운 태그
- `GameplayCue_Ability_Push` - Push 이펙트/사운드
- `Buff_SpeedBoost` - Sumo 이동속도 버프
- `Buff_SuperPush` - Sumo 강화 넉백 버프 (1회 소모)
- `Buff_Shield` - Sumo 보호막 (제거 1회 무시)
- `GameplayCue_Sumo_PowerUp_Pickup` - 파워업 획득 이펙트
- `Ability_Jump` - GA_Jump 어빌리티 태그
- `Cooldown_Jump` - GA_Jump 쿨다운 태그
- `Ability_Dash` - GA_Dash 어빌리티 태그
- `Ability_Grapple` - GA_Grapple 어빌리티 태그
- `Ability_DoubleJump` - GA_DoubleJump 어빌리티 태그
- `Cooldown_Dash` - GA_Dash 쿨다운 태그
- `Cooldown_Grapple` - GA_Grapple 쿨다운 태그

### 코스메틱 시스템
Steam 무료 출시 후 유료 코스메틱 판매를 위한 시스템. ItemId(FName) 기반 플랫폼 독립 식별.
- **CosmeticTypes**: `ECosmeticSlot`(Head/Body/Back/Effect), `FCosmeticSlotEntry`, `FCosmeticLoadout`(TArray 기반 리플리케이션 지원)
- **CosmeticComponent**: 캐릭터에 부착, 비동기 에셋 로드(FStreamableManager), 슬롯별 메시 관리, 로컬 플레이어만 브로드캐스트 수신
- **CosmeticSubsystem**: GameInstanceSubsystem. 인벤토리 캐시, 로드아웃 관리, 로컬 저장(GConfig), Steam Inventory 폴링 콜백
- **CosmeticDataAsset**: 카탈로그. `FCosmeticItemDefinition`(ItemId, SteamItemDefId, 메시, 아이콘, 가격). 양방향 룩업
- **PurchaseSubsystem**: GameInstanceSubsystem. Steam MicroTransaction API 연동, 구매 상태 관리, 폴링 기반 결과 콜백
- **테스트 함수**: `GenerateTestItem()`, `GrantAllItemsLocally()`, `ClearLocalInventory()`, `DebugPrintInventory/Loadout()`
- **콘솔 명령어**: `Cosmetic_GrantItem`, `Cosmetic_GrantAll`, `Cosmetic_ClearInventory`, `Cosmetic_PrintInventory/Loadout`, `Cosmetic_Equip/Unequip`, `Cosmetic_RefreshInventory`

### 코스메틱 리플리케이션 흐름
```
[서버 측 - PossessedBy]
Character.PossessedBy() → PlayerStateBase.OnPawnSet()
    ↓ (bPendingCosmeticApply 체크)
CosmeticComponent.ApplyLoadout() (서버에서 즉시 적용)

[클라이언트 - 자신의 캐릭터]
PlayerStateBase.BeginPlay() → ServerSetCosmeticLoadout() RPC
    ↓
OnRep_CosmeticLoadout() → OnCosmeticLoadoutUpdated()
    ↓ (Pawn 없으면 bPendingCosmeticApply = true)
CharacterBase.OnRep_PlayerState() → PS->OnPawnSet() → 적용

[클라이언트 - 3자 캐릭터]
CharacterBase.OnRep_PlayerState() (PlayerState 복제 시 호출)
    ↓
CosmeticComponent.SetCatalog() + PS->OnPawnSet()
    ↓
CosmeticComponent.ApplyLoadout() (비동기 메시 로드)
    ↓
캐릭터 비주얼 적용
```

### Stats 시스템
Steam User Stats 래핑 + GConfig 폴백 (비Steam 빌드용). `UWjWorldStatsSubsystem` (GameInstanceSubsystem).
- **로컬 스탯**: ReadLocalStat, IncrementLocalStat, StoreStats (GConfig 또는 Steam API)
- **원격 스탯**: RequestUserStats() + OnUserStatsReceived 비동기 델리게이트
- **미니게임 스탯**: 네임스페이스 기반 (`WjWorldStats::ApproachingWall`, `WjWorldStats::Sumo`, `WjWorldStats::JumpMap`)
- **FMinigameStatEntry**: 개별 스탯 항목
- **FMinigameStatDescriptor**: UI 표시용 스탯 설명자
- **자동 기록**: GameStatePlay에서 게임 종료 시 `StatNamespace` 기반 동적 스탯 키로 승/패/킬 자동 증가
- **WITH_STEAM 조건부 컴파일**: Steam API 사용, 비Steam 빌드는 TMap 폴백

### 플레이어 프로필 시스템
- **PlayerProfileWidget**: 3D 캐릭터 프리뷰 + 미니게임별 스탯 표시, 비동기 스탯 로드, CosmeticLoadout 연동
- **CharacterPreviewActor**: SceneCaptureComponent2D로 오프스크린 3D 렌더링 (256x512), FStreamableManager 비동기 코스메틱 메시 로드, Socket 기반 부착 (GetDefaultSocketName), StaticMesh/SkeletalMesh 동시 지원, SetupFromPawn()으로 Pawn에서 메시/ABP 복사

### 세션 관리 시스템
`USessionManager` (UObject, GameInstance 소유). Online Subsystem Session 관리.
- **OSS 초기화**: Steam OSS 우선 → 실패 시 NULL OSS 폴백
- **세션 CRUD**: `CreateSession()`, `FindSessions()`, `JoinSession()`, `StartSession()`, `EndSession()`, `DestroySession()`
- **네트워크 모드**: `ENetworkMode::LAN` / `ENetworkMode::Steam` 분기
  - LAN: `bIsLANMatch=true`, `bUsesPresence=false`
  - Steam: `bIsLANMatch=false`, `bUsesPresence=true`, `bUseLobbiesIfAvailable=true` (반드시 매칭)
- **검색 큐**: `bIsSearchInProgress` 플래그 + `PendingSearchRequest` (이전 검색 완료 후 자동 실행)
- **호스트 마이그레이션**: `CreateMigrationSession()`, `FindMigrationSession()` (MIGRATION_TAG 커스텀 세팅)
- **델리게이트**: `OnRoomCreatedEvent`, `OnRoomsFoundEvent`, `OnRoomJoinedEvent`, `OnRoomDestroyedEvent`, `OnRoomStartedEvent`, `OnRoomEndedEvent`

### Steam 빌드 설정
- **AppID**: 4399350, **DepotID**: 4399351
- **조건부 컴파일**: `WITH_STEAM` 매크로 (Win64에서만 활성화)
- **모듈**: Steamworks, OnlineSubsystemSteam (Win64 전용)
- **플러그인**: OnlineSubsystemSteam, SocketSubsystemSteamIP 활성화
- **네트워킹**: Steam=SteamNetDriver, LAN=WjWorldLanNetDriver (런타임 전환 via ApplyNetDriverForMode)
- **코스메틱/구매/스탯 코드**: `#if WITH_STEAM` 블록으로 Steam API 호출 분리
- **Inventory Service**: `Steam/itemdefs.json`에 아이템 정의
- **빌드 업로드**: `Steam/upload.bat` (SteamCMD 사용)
- **빌드 자동화**: `Batch/PackageAndUploadSteam.bat` (패키징→복사→업로드)

### Steam 네트워킹 Config (DefaultEngine.ini)
```ini
[/Script/Engine.Engine]
!NetDriverDefinitions=ClearArray
+NetDriverDefinitions=(DefName="GameNetDriver",DriverClassName="/Script/SocketSubsystemSteamIP.SteamNetDriver",DriverClassNameFallback="/Script/OnlineSubsystemUtils.IpNetDriver")

[OnlineSubsystemSteam]
bEnabled=true
SteamDevAppId=4399350
bUseSteamNetworking=true

[/Script/SocketSubsystemSteamIP.SteamNetDriver]
NetConnectionClassName="/Script/SocketSubsystemSteamIP.SteamNetConnection"
```
- **DriverClassName 형식**: `/Script/ModuleName.ClassName` (StaticLoadClass 정규 경로, 짧은 형식 불가)
- **bUseSteamNetworking**: SocketSubsystemSteamIP 모듈이 Steam 소켓 서브시스템 등록하는 조건
- **에디터 제한**: SocketSubsystemSteamIP은 패키징된 빌드에서만 동작 (에디터에서 자동 비활성화)
- **LAN 소켓 충돌 해결**: SocketSubsystemSteamIP가 기본 소켓을 Steam으로 오버라이드 → IpNetDriver 사용 불가 → `WjWorldLanNetDriver`(UIpNetDriver 서브클래스)에서 `GetSocketSubsystem()` → `PLATFORM_SOCKETSUBSYSTEM` 명시

### 패키징 주의사항
- **새 레벨/맵 추가 시**: Project Settings > Packaging > List of maps to include in a packaged build에 반드시 추가. 누락 시 `Failed to load package` 에러로 ServerTravel 실패
- **Non-asset 파일** (`.txt`, `.csv` 등): `DefaultGame.ini`의 `DirectoriesToAlwaysStageAsNonUFS`로 명시적 포함 필요
- **FFilePath 경로**: 에디터에서 절대 경로 저장 → 패키지 빌드에서 `FPaths::ProjectContentDir()` 기준으로 변환 필요
- **Debug vs Development 빌드**: Debug는 개발 PC 파일 시스템 직접 접근, Development/Shipping은 .pak 파일 사용

### WjWorldDeveloperSettings (중앙 설정)
에디터에서 설정 가능한 중앙 집중식 에셋/클래스 참조. Project Settings > Game > WjWorld Developer Settings에서 설정.
- **맵**: LobbyMapPath, AWEditorMapPath, JumpMapEditorMapPath
- **GameMode 클래스**: WaitingRoomGameModeClass, PlayGameModeClass, AWEditorGameModeClass, JumpMapEditorGameModeClass
- **캐릭터 기본값**: DefaultCharacterMesh, DefaultAnimBlueprintClass, DefaultInputMappingContext
- **Approaching Wall**: BrickMesh, TileMesh, WallDescriptionAsset
- **JumpMap**: JumpMapLayoutDataAsset
- **배치 카탈로그**: LobbyPlaceableCatalog, ApproachingWallPlaceableCatalog, JumpMapPlaceableCatalog
- **기타 카탈로그**: MinigameCatalog, CosmeticCatalog
- **헬퍼 함수**: GetLobbyMapPath(), GetWaitingRoomOpenLevelURL(), GetPlayServerTravelURL(), GetPlaceableCatalogForContext(), GetEditorMapOpenLevelURL(), HasEditorMapForContext()

**설정 우선순위 패턴**: BP 서브클래스 UPROPERTY 값 우선 → DeveloperSettings 폴백


## 최근 개발 로그

# WjWorld 개발 로그

## 2026-02-11
### 작업 내용 - 레이아웃 삭제 기능 + AW 버그 3건 수정

#### 레이아웃 삭제 기능 구현
- `WjWorldPlacementComponent::DeleteLayoutSlot()` 추가 — SaveGame + 컨텍스트별 CSV 파일 삭제
- `PlacementLoadDialogWidget` X 삭제 버튼 추가 — HorizontalBox 레이아웃 [슬롯이름(Fill) | X(Auto)]
- `PlacementHUDWidgetBase::OnSlotDeleteRequested()` 핸들러 — 삭제 후 다이얼로그 내 슬롯 목록 인플레이스 갱신
- `PlacementSaveDialogWidget` 슬롯 유효성 표시 개선

#### Bug 1: BrickMovement 대각선 이동 3-4칸 → 1칸 수정
- **원인**: `GetMovementVector()`에서 `GetNextDirections()`가 반환한 모든 방향을 for 루프로 전부 적용
- **수정**: 하나의 방향만 선택, 이전 이동 방향과 일치하는 방향 우선 (관성 유지)

#### Bug 2: 클라이언트 프리뷰 offset 50,50 수정
- **원인**: 클라이언트에서 유저 CSV 파일 부재 → 잘못된 WallDesc(CenterOffset)로 폴백
- **수정**: `ApproachingWallGameDataComponent`에 `WallBrickSize/WallCenterOffset/WallColumnNum/WallRowNum` 리플리케이트 추가
- `OnWallSpawnFinished()`에서 설정, GA_SpawnBrick/GA_LiftBrick에서 리플리케이트된 값으로 보정

#### Bug 3: 클라이언트 GA_LiftBrick 1프레임 취소 수정
- **원인**: 서버가 독립적으로 `CalculatePickupLocation()` 실행 시 네트워크 지연으로 다른 위치 계산 → 벽돌 미발견 → `EndAbility(replicate)` 취소
- **수정**: `ServerLiftBrickAtGridIndex` Server RPC 패턴 적용 (GA_SpawnBrick의 `ServerSpawnBrickAtGridIndex`와 동일)
  - 클라이언트: 그리드 인덱스 계산 → RPC 전송
  - 서버: 클라이언트 지정 인덱스로 벽돌 탐색/파괴 (`ServerHandleBrickPickup`)
  - `HasAuthority()` 블록 제거 → RPC 핸들러로 이전

### 학습/메모
- `LocalPredicted` 어빌리티에서 서버가 avatar 위치/회전을 기반으로 독립 판단하면 네트워크 지연으로 클라이언트와 불일치 발생 → 클라이언트가 계산한 결과를 Server RPC로 전달하는 패턴이 안정적
- `FIntPoint`에는 `IsZero()` 메서드가 없음 → `(X != 0 || Y != 0)` 으로 체크
- `BrickMovement::GetNextDirections()`는 FloodFill 경계점의 8방향 인접 셀을 모두 반환 — 이동 시 반드시 하나만 선택해야 함

### 이슈/해결
- 잔존 버그: #3(Sumo) Host 관전 Yaw, #4(Sumo) 유저 맵 클라이언트 벽돌 스폰 위치 — 미해결
- JumpMap 맵 레벨 생성 + 패키징 맵 목록 추가 필요

---

## 2026-02-10
### 작업 내용 - JumpMap 미니게임 전체 구현

#### JumpMap C++ 코드 구현 (Agent Teams 4병렬)
- GameRule: `WjWorldGameRuleJumpMap` — 시간 제한, 체크포인트 리스폰, 완주 추적, Z 낙하 감지
- GameData: `JumpMapGameDataComponent` (ElapsedTime, PlayerFinishOrder), `JumpMapPlayerDataComponent` (Checkpoint, DeathCount)
- 장애물 액터 7종: KillZone, MovingPlatform, RotatingObstacle, PushWind, Checkpoint, End, GrapplePoint
- 레이아웃: `JumpMapLayoutDataAsset` — 내장+유저 CSV 파싱 (`#META:MapName:` 지원)
- 어빌리티 3종: GA_Dash (전방 대시), GA_Grapple (라인트레이스→당김), GA_DoubleJump (공중 점프)
- HUD: `JumpMapHUDWidget` — 타이머, 체크포인트, 사망 횟수, 순위표
- 통합: WjTypes(Ability8/9/10), GameplayTags(5개), Stats(JumpMap 네임스페이스), DeveloperSettings, PlacementTypes

#### 코드 리뷰 중 버그 수정 (4건)
- KillZoneActor: `Character->OnEliminated()` → `GameRule->OnPlayerDied()` (영구 제거→체크포인트 리스폰)
- EndActor: GameRule 호출 누락 → `GameRule->OnPlayerFinished()` 추가
- RotatingObstacleActor: 킬 모드에서 동일 수정
- CheckpointActor: PlayerData 갱신 누락 → `SetCurrentCheckpointIndex()` + 역주행 방지 로직

#### 에디터 세팅 완료
- DA_MinigameCatalog에 JumpMap 등록
- DA_CharacterPlaySetup에 Dash/Grapple/DoubleJump 바인딩
- IMC_Default에 Shift(Dash)/E(Grapple) 입력 매핑
- BP_HUDPlay에 JumpMapHUDWidget 매핑

#### 태그/InputID 정리
- DefaultGameplayTags.ini에 5개 태그 등록 (Ability.Dash/Grapple/DoubleJump, Cooldown.Dash/Grapple)
- WjTypes.h에 Ability10(DoubleJump) 추가
- GA_Dash/Grapple/DoubleJump → `WjWorldGameplayTag::` 헬퍼 사용으로 통일

### 학습/메모
- Agent Teams 병렬 구현은 빠르지만, 기존 패턴(GameRule->OnPlayerDied vs Character->OnEliminated) 착오가 다수 발생 → 반드시 코드 리뷰 필요
- GA_DoubleJump의 CanActivateAbility: 부모(GA_Jump)의 CanJump() 우회를 위해 조부모(UWjWorldGameplayAbilityBase) 직접 호출 패턴 사용

---

## 2026-02-09
### 작업 내용 - 배치 에디터 BP 세팅 완료 + Steam 2PC 잔존 버그 확인

#### 배치 에디터 BP 세팅 완료
- 에디터 맵 생성
- BP_PlacementSaveDialogWidget, BP_PlacementLoadDialogWidget 생성
- 컨텍스트별 카탈로그 DataAsset 설정

#### LobbyHUDWidget 정리
- DirectConnectButton / OnDirectConnectClicked 제거
- FindRoomButton null 접근 버그 수정 (CreateRoomButton if 블록 안에서 null 체크 없이 접근)

#### Steam 2PC 테스트 — 잔존 버그 확인
- **#3 대각선 맵 movement** — 대각선 연결 맵에서 movement가 wall closed하게 움직이지 않음 (미해결)
- **#4 클라이언트 벽돌 preview offset** — 유저 커스텀 맵에서 50,50 어긋남 (미해결)
- **#11 3자 프로필 조회** — 타 플레이어 프로필 조회 실패 (미해결)
- **#3(Sumo) Host 관전 Yaw 미적용** — Host가 클라이언트 관찰 시 Yaw 미적용 (미해결)
- **#4(Sumo) 유저 맵 벽돌 스폰 위치** — 유저 AW 맵에서 클라이언트 벽돌 엉뚱한 위치 (미해결)

#### TODO
- Lobby HUD 설정 버튼에 그래픽 상/중/하 추가 (GPU 사용량 대비 간단한 설정 필요)

#### 확인 필요
- Room 목록 스케일링 (Steam 배포 시 다수 방 표시 및 부하)
- Sumo FloorRing 레벨 디자인 변경 (원형 축소 → 개별 타일 랜덤 파괴) 시 리플리케이션 비용

---

---
*마지막 동기화: 2026-02-11*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
