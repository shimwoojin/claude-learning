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
- **ApproachingWallGameDataComponent**: `CurrentWallName` 리플리케이트 (클라이언트 WallDesc 로드용)

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
- **PlacementComponent**: 컨텍스트 지원, `SaveLayoutToSlot()`/`LoadLayoutFromSlot()`, `GetSavedLayoutSlots()`, `LoadedSlotName` 추적
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

### Gameplay Ability System
GAS 기반 어빌리티 시스템. `UWjWorldGameplayAbilityBase`를 상속받아 각 어빌리티 구현.
- **AbilityBase 공통 기능**: AbilityName, AbilityIcon (UI 메타), GetPromptDescription(), 충전 시스템 인터페이스 (IsChargeBased, GetCurrentCharges, GetMaxCharges, GetChargeRefillTimeRemaining)
- **AbilityBase 어빌리티 제한**: `CanActivateAbility()` 오버라이드 - GameState의 `AllowedAbilityTags` 체크 (빈 = 전부 허용)
- **GA_NormalAttack**: 4방향 스냅(Yaw 기반) 벽돌 공격, BrickType별 처리 (Standard 파괴 불가, Explosive/Moving/Destructible)
- **GA_SpawnBrick**: 충전 기반 벽돌 배치, Preview → Confirm/Cancel 패턴, GE 기반 충전 리필, 어트리뷰트 변경 위임
- **GA_LiftBrick**: 벽돌 재배치 어빌리티, Moving/Destructible 벽돌 들어올리기, Cancel 시 원래 위치 복원, 들고 있는 벽돌 색상 리플리케이션
- **GA_Push**: Sumo 넉백 어빌리티, 전방 구형 오버랩 → LaunchCharacter(), PushForce=1200, CooldownDuration=1.5s, SetLastAttacker(), SuperPushMultiplier(2x), PushHitCameraShake
- **GA_Jump**: Sumo 점프 어빌리티, UE CharacterJump 패턴 기반, LocalPredicted, CommitAbility(), Character->Jump()/StopJumping(), 가변 높이 점프, InputReleased로 종료
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
- **미니게임 스탯**: 네임스페이스 기반 (`WjWorldStats::ApproachingWall`, `WjWorldStats::Sumo`)
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
- **배치 카탈로그**: LobbyPlaceableCatalog, ApproachingWallPlaceableCatalog, JumpMapPlaceableCatalog
- **기타 카탈로그**: MinigameCatalog, CosmeticCatalog
- **헬퍼 함수**: GetLobbyMapPath(), GetWaitingRoomOpenLevelURL(), GetPlayServerTravelURL(), GetPlaceableCatalogForContext(), GetEditorMapOpenLevelURL(), HasEditorMapForContext()

**설정 우선순위 패턴**: BP 서브클래스 UPROPERTY 값 우선 → DeveloperSettings 폴백


## 최근 개발 로그

# WjWorld 개발 로그

## 2026-02-07
### 작업 내용 - Steam 4차 버그 수정 + 코드 검증 + Agent Teams 테스트

#### 버그 수정 (커밋 263031b)

##### [해결] GamePhase 어빌리티 제한
- **증상**: 게임 시작 전/종료 후에도 어빌리티 사용 가능
- **수정**: `CanActivateAbility()`에서 `GamePhase != Playing` 체크 추가
- **파일**: `WjWorldGameplayAbilityBase.cpp`

##### [해결] 유저 맵 클라이언트 벽돌 스폰 위치 오류
- **증상**: 유저 커스텀 맵에서 클라이언트 벽돌이 엉뚱한 위치에 스폰
- **수정**: `GetWallDescriptionByName` → `GetWallDescriptionByNameIncludingUser`로 변경
- **파일**: `GA_SpawnBrick.cpp`, `GA_LiftBrick.cpp`

##### [해결] BrickComponent collision 분리
- **증상**: TileActor overlap 감지 실패 (나이아가라 근거없이 출력)
- **수정**: BrickMeshComponent를 QueryOnly+Overlap으로, BlockingCollisionComponent(95%)는 BlockAll로 분리
- **파일**: `WjWorldBrickComponent.cpp`

##### [해결] WaitingRoom 호스트 설정 UI
- **증상**: 호스트 설정 패널이 클라이언트에도 표시 + Apply 후 Display 미갱신
- **수정**: 패널 호스트 전용 표시 + Apply 후 `UpdateRoomInfo()` 명시적 호출
- **파일**: `WaitingRoomHUDWidget.cpp`

##### [해결] 3자 프로필 스탯 조회 실패
- **증상**: 타 플레이어 프로필 스탯이 "Loading..." 상태로 멈춤
- **원인**: `RequestUserStats()` 반환값 무시, CCallResult 미등록
- **수정**: `CCallResult<UWjWorldStatsSubsystem, UserStatsReceived_t>` 패턴 적용
- **파일**: `WjWorldStatsSubsystem.h/cpp`

##### [해결] ParseWallLayout 메타데이터 파싱 누락
- **증상**: 유저 커스텀 맵 preview offset 어긋남
- **수정**: `#META:CenterOffset:` 주석 라인 파싱 로직 추가
- **파일**: `WjWorldWallDescriptionDataAsset.cpp`

##### [해결] 제거 시 관전 전환 없음
- **증상**: 제거 후 화면 멈춤 (관전 시스템 미구현)
- **수정**: `HandleEliminationEffects()`에서 살아있는 플레이어로 `SetViewTargetWithBlend()` 전환
- **파일**: `WjWorldCharacterPlay.cpp`

##### [해결] Lobby HUD 정리
- **수정**: FindRoomButton 숨김 처리 (BindWidgetOptional), 그래픽 품질 사이클 설정 구현
- **파일**: `LobbyHUDWidget.h/cpp`

#### GAS 버그 수정 (커밋 0d323ff)

##### [해결] GA_Jump Super::ActivateAbility() 누락
- **증상**: LocalPredicted 정책에서 Prediction Key 생성 실패 가능
- **수정**: `Super::ActivateAbility()` 호출 추가
- **파일**: `GA_Jump.cpp`

#### 코드 검증 (4개 병렬 subagent)
- **네트워크 리플리케이션**: 문제 없음 (20+ 파일 검증)
- **GAS 어빌리티**: GA_Jump Super 누락 발견 → 즉시 수정
- **GameRule 라이프사이클**: 문제 없음 (프로덕션 레벨)
- **null 포인터/메모리 안전성**: BrickComponent GetGameModePlay() null 체크 권장 (실제 크래시 확률 낮음)

### 학습/메모
- **Claude Code Agent Teams**: Opus 4.6에서 실험적 기능으로 추가. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + `teammateMode` 설정 필요
  - `"tmux"`: split-pane 모드 (Windows 미지원)
  - `"in-process"`: 메인 터미널에서 실행 (Windows 권장)
  - Subagent vs Teams: 독립 작업은 subagent가 효율적, 상호 소통 필요한 대규모 작업은 teams
  - 자동 팀 구성은 불가 - 명시적 요청 필요
- **Steam CCallResult 패턴**: `SteamAPICall_t` 반환값을 `CCallResult<>.Set()`에 등록해야 콜백이 호출됨. 단순 함수 호출만으로는 비동기 콜백 미동작

### 이슈/해결
- settings.local.json `teammatemode` → `teammateMode` (camelCase) 오타 수정
- Background agent 출력 파일이 빈 파일로 생성되는 현상 → resume로 결과 확인 가능

---

## 2026-02-06
### 작업 내용 - Steam 2PC 버그 수정 (3차 - 전체 해결)

#### 버그 수정 완료

##### [해결] [Critical] 클라이언트 벽돌 스폰 안 됨
- **증상**: 클라이언트에서 GA_SpawnBrick 사용 시 벽돌이 서버에 스폰되지 않음
- **원인**: UObject(UGameplayAbility)에서 Server RPC 호출 불가 - AActor에서만 가능
- **수정**: `AWjWorldCharacterPlay::ServerSpawnBrick_Implementation()` 추가, GA에서 Character RPC 호출
- **파일**: `WjWorldCharacterPlay.h/cpp`, `GA_SpawnBrick.cpp`

##### [해결] [Critical] #14 호스트 설정 패널 값 반영 안 됨
- **증상**: 게임모드/맵 ComboBox 선택해도 게임 시작 시 반영 안 됨
- **원인**: ComboBox 선택 후 "Apply Settings" 버튼을 눌러야만 저장됨 → 사용자가 누르지 않고 바로 게임 시작
- **수정**: `OnStartGameClicked()`에서 `ApplyCurrentUISettings()` 자동 호출
- **파일**: `WaitingRoomHUDWidget.cpp`

##### [해결] #2 호스트 설정 패널 클라이언트 표시
- **증상**: 패널이 호스트만 보이도록 숨겨짐 (클라이언트 설정 확인 불가)
- **수정**: 패널은 전체 표시, 클라이언트는 ComboBox disabled + Apply 버튼 숨김
- **파일**: `WaitingRoomHUDWidget.cpp` (UpdateHostSettingsPanelVisibility)

##### [해결] #11 3자 프로필 조회 안 됨
- **증상**: 플레이어 버튼 클릭 시 프로필이 안 열림
- **원인**: `IsHovered()` 버튼 클릭 후 unreliable
- **수정**: `PlayerButtonToIDMap` (TMap<UButton*, int32>) 추가, `IsHovered() || HasMouseCapture()` 체크

---
*마지막 동기화: 2026-02-07*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
