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
- **FWjWorldMinigameDefinition**: DisplayName, GameModeId, LevelPath, GameRuleClass, MapOptions
- **FWjWorldMinigameMapOption**: 맵 변형 옵션 (예: 기본, 랜덤)
- **동적 GameRule 조회**: `GameModePlay::InitGame()`에서 URL Options의 `GameModeId`로 카탈로그 조회
- **DeveloperSettings 참조**: `MinigameCatalog` 소프트 참조

### 로비 배치 시스템
로비에서 오브젝트를 배치/삭제하고 저장하는 시스템. 멀티플레이어 지원.
- **PlacementComponent**: `PlayerControllerLobby`에 부착, 배치 핵심 로직, EnhancedInput 바인딩
- **PlacementPreviewActor**: 배치 프리뷰 (유효/무효 색상), `FStreamableManager` 비동기 메시 로드
- **PlacedObjectActor**: 실제 배치된 오브젝트, 삭제 모드 하이라이트
- **PlaceableObjectDataAsset**: 배치 가능 오브젝트 카탈로그 (`FPlaceableObjectDefinition`)
- **LayoutSaveGame**: `USaveGame` 기반 레이아웃 저장/로드 (`LobbyLayout` 슬롯)
- **GameStateLobby**: 배치 오브젝트 리플리케이션 (`TArray<FPlacedObjectSaveEntry>`)
- **입력**: LMB(배치), R(회전), DEL(삭제), ESC(종료)

### Approaching Wall 미니게임
첫 번째 미니게임. 벽이 점진적으로 다가오며 플레이어들이 안전 구역으로 이동해야 하는 PvP 게임.
- **BrickSpawner**: 데이터 에셋 기반 비동기 벽돌 스폰 (8개/틱)
- **BrickMovement**: 개별 벽돌 이동 로직 (경로 탐색)
- **WallManager**: 벽 이동 진행 관리 (레벨별 속도 조절)
- **레벨 시스템**: 12초마다 레벨업, 이동 시간 5초→1초 (10레벨)
- **안전 구역**: Flood Fill 알고리즘으로 축소
- **TileActor**: 안전 구역 타일, 폭탄 신호 시스템 (3초 차징), 노랑→빨강 색상 전환, 방향별 오버랩 체크
- **BrickPreviewActor**: 어빌리티 배치 프리뷰, 유효(초록)/무효(빨강) 색상 표시, 동적 머티리얼

### Gameplay Ability System
GAS 기반 어빌리티 시스템. `UWjWorldGameplayAbilityBase`를 상속받아 각 어빌리티 구현.
- **AbilityBase 공통 기능**: AbilityName, AbilityIcon (UI 메타), GetPromptDescription(), 충전 시스템 인터페이스 (IsChargeBased, GetCurrentCharges, GetMaxCharges, GetChargeRefillTimeRemaining)
- **GA_NormalAttack**: 4방향 스냅(Yaw 기반) 벽돌 공격, BrickType별 처리 (Standard 파괴 불가, Explosive/Moving/Destructible)
- **GA_SpawnBrick**: 충전 기반 벽돌 배치, Preview → Confirm/Cancel 패턴, GE 기반 충전 리필, 어트리뷰트 변경 위임
- **GA_LiftBrick**: 벽돌 재배치 어빌리티, Moving/Destructible 벽돌 들어올리기, Cancel 시 원래 위치 복원, 들고 있는 벽돌 색상 리플리케이션
- **AttributeSet**: HP, MaxSpawnBrickCharges, SpawnBrickCharges, OnRep 콜백
- **Effects**: GE_AbilityCooldown (쿨다운), GE_SpawnBrickChargeCost (충전 비용)

### GameplayTag 정의
- `State_SpawnBrickPreview` - GA_SpawnBrick 활성 상태
- `State_LiftBrickCarry` - GA_LiftBrick 활성 상태
- `Cooldown_NormalAttack` - NormalAttack 쿨다운 태그
- `Cooldown_LiftBrick` - LiftBrick 쿨다운 태그

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
- **미니게임 스탯**: 네임스페이스 기반 (`WjWorldStats::ApproachingWall::Wins/Losses/Kills/GamesPlayed`)
- **FMinigameStatEntry**: 개별 스탯 항목
- **FMinigameStatDescriptor**: UI 표시용 스탯 설명자
- **자동 기록**: GameStatePlay에서 게임 종료 시 승/패/킬 자동 증가
- **WITH_STEAM 조건부 컴파일**: Steam API 사용, 비Steam 빌드는 TMap 폴백

### 플레이어 프로필 시스템
- **PlayerProfileWidget**: 3D 캐릭터 프리뷰 + 미니게임별 스탯 표시, 비동기 스탯 로드, CosmeticLoadout 연동
- **CharacterPreviewActor**: SceneCaptureComponent2D로 오프스크린 3D 렌더링 (256x512), FStreamableManager 비동기 코스메틱 메시 로드, Socket 기반 부착 (GetDefaultSocketName), StaticMesh/SkeletalMesh 동시 지원, SetupFromPawn()으로 Pawn에서 메시/ABP 복사

### Steam 빌드 설정
- **AppID**: 4399350, **DepotID**: 4399351
- **조건부 컴파일**: `WITH_STEAM` 매크로 (Win64에서만 활성화)
- **모듈**: Steamworks, OnlineSubsystemSteam (Win64 전용)
- **플러그인**: OnlineSubsystemSteam 활성화
- **코스메틱/구매/스탯 코드**: `#if WITH_STEAM` 블록으로 Steam API 호출 분리
- **Inventory Service**: `Steam/itemdefs.json`에 아이템 정의
- **빌드 업로드**: `Steam/upload.bat` (SteamCMD 사용)

### 패키징 주의사항
- **Non-asset 파일** (`.txt`, `.csv` 등): `DefaultGame.ini`의 `DirectoriesToAlwaysStageAsNonUFS`로 명시적 포함 필요
- **FFilePath 경로**: 에디터에서 절대 경로 저장 → 패키지 빌드에서 `FPaths::ProjectContentDir()` 기준으로 변환 필요
- **Debug vs Development 빌드**: Debug는 개발 PC 파일 시스템 직접 접근, Development/Shipping은 .pak 파일 사용

### WjWorldDeveloperSettings (중앙 설정)
에디터에서 설정 가능한 중앙 집중식 에셋/클래스 참조. Project Settings > Game > WjWorld Developer Settings에서 설정.
- **맵**: LobbyMapPath
- **GameMode 클래스**: WaitingRoomGameModeClass, PlayGameModeClass
- **캐릭터 기본값**: DefaultCharacterMesh, DefaultAnimBlueprintClass, DefaultInputMappingContext
- **Approaching Wall**: BrickMesh, TileMesh, WallDescriptionAsset
- **카탈로그**: MinigameCatalog, CosmeticCatalog, PlaceableObjectCatalog
- **헬퍼 함수**: GetLobbyMapPath(), GetWaitingRoomOpenLevelURL(), GetPlayServerTravelURL()

**설정 우선순위 패턴**: BP 서브클래스 UPROPERTY 값 우선 → DeveloperSettings 폴백


## 최근 개발 로그

# WjWorld 개발 로그

## 2026-02-05
### 작업 내용 - Steam 2PC 테스트 버그 수정
- **[버그] Approaching Wall 종료 후 WaitingRoom 복귀 실패**
  - 원인: `OnGameEnd()` 타이머 람다에서 `this` 캡처 후 `GetWorld()` 호출
  - 수정: `TravelURL` 값 캡처 + `TWeakObjectPtr<UWorld>` 사용
  - 파일: `WjWorldGameRuleBase.cpp`
- **[버그] LobbyLayout SaveGame 주체 문제**
  - 원인: 클라이언트도 `SaveLayout()` 호출하여 호스트 레이아웃 덮어씀
  - 수정: `NetMode` 체크 추가 (`NM_Standalone` 또는 `NM_ListenServer`만 저장)
  - 파일: `WjWorldPlacementComponent.cpp`
- **[버그] WaitingRoom 코스메틱 리플리케이션 실패**
  - 원인: `GetPawn()` 3자 캐릭터에서 null 반환, 로컬 로드아웃이 모든 캐릭터에 적용
  - 수정: `TActorIterator`로 PlayerState 기반 캐릭터 검색, 로컬 플레이어만 초기 로드아웃 적용
  - 파일: `WjWorldCosmeticComponent.cpp`, `WjWorldPlayerStateBase.cpp`
- **[버그] LiftBrick/SpawnBrick 클라이언트 프리뷰 색상 오류**
  - 원인: `GetAuthGameMode()` 클라이언트에서 null → `CachedWallDesc` 미설정
  - 수정: `CurrentWallName` 리플리케이트 추가, `GameState`에서 `WallDesc` 로드
  - 파일: `ApproachingWallGameDataComponent.h/.cpp`, `WjWorldGameRuleApproachingWall.cpp`, `GA_LiftBrick.cpp`, `GA_SpawnBrick.cpp`
- **WjWorldAnimInstance 생성**
  - `LiftBrickBlendWeight` (0~1 float) GameplayTag 기반 블렌딩
  - `State.LiftBrickCarry` 태그 체크하여 부드러운 전환
  - 파일: `Animation/WjWorldAnimInstance.h/.cpp`
- **LiftBrick 벽돌 색상 리플리케이션**
  - `CarriedBrickColor` 리플리케이트 프로퍼티 추가
  - `LiftedBrickDynamicMaterial`로 런타임 색상 적용
  - 파일: `WjWorldCharacterPlay.h/.cpp`

### 학습/메모
- `GetAuthGameMode()`는 클라이언트에서 null 반환 → GameState의 리플리케이트된 데이터로 폴백
- ServerTravel URL 포맷: `GetAssetPathString()` (`.MapName` 포함) vs `GetLongPackageName()` (순수 경로)
- Timer 람다에서 `this` 캡처 주의 → 객체 소멸 후 호출 시 크래시, `TWeakObjectPtr` 사용

### 이슈/해결
- COMDAT 중복 링크 오류 → Intermediate 폴더 정리 후 재빌드

---

## 2026-02-04 (저녁)
### 작업 내용 - Steam 테스트 환경 구축
- **Steam 앱 설정 완료**
  - AppID: 4399350, DepotID: 4399351
  - VDF 스크립트 생성 (`Steam/scripts/`)
  - DefaultEngine.ini Steam 설정 추가
  - steam_appid.txt 생성 (로컬 테스트용)
- **Steam 빌드 업로드** (BuildID: 21779250)
  - SteamCMD 기반 업로드 스크립트 (`Steam/upload.bat`)
  - Dev Comp Package로 테스트 계정 접근 설정
- **Steam Inventory Service 설정**
  - itemdefs.json 생성 (100: Delivery Bag, 101: Military Hat)
  - AddPromoItem/AddAllPromoItems 함수 추가 (CosmeticSubsystem)
  - Cosmetic_AddPromo/Cosmetic_AddAllPromos 콘솔 명령어 추가
- **패키징 이슈 수정**
  - ToolWidgets 모듈 제거 (에디터 전용 모듈)
  - IntroWindow: 비디오 재생 실패 시 폴백 로직 추가
  - WjWorldGameModeIntro: IntroWidgetClass 미설정 시 스킵 로직 추가
- **멀티플레이어 테스트 환경**
  - 두 번째 Steam 계정으로 테스트 환경 구축
  - Steamworks 파트너 그룹에 테스트 계정 추가

### 이슈/해결 (진행 중)
- **[버그] Approaching Wall 벽돌 스폰 안됨** (Development/Shipping 빌드 전용)
  - 증상 정리:
    1. DebugGameEditor (에디터에서 실행, 리슨서버 2명) - **문제 없음**
    2. DebugGame 패키징 + VS 디버깅 - **문제 없음**
    3. Steam 빌드 (Development/Shipping) - **벽돌 스폰 안됨**
    4. Development 패키징 (로컬 실행) - **벽돌 스폰 안됨**
  - 시도한 수정:
    - `WjWorldBrickSpawner::CreateBrickSpawner()`: `LoadObject` → `LoadSynchronous()` 변경
    - 결과: 여전히 동일한 증상
  - **원인 확정**: WallLayout `.txt` 파일 경로 문제
    1. `FFilePath`에 저장된 절대 경로가 패키지 빌드에서 유효하지 않음
    2. `.txt` 파일이 자동으로 패키지에 포함되지 않음
  - **수정 내용**:
    1. `DefaultGame.ini`: `+DirectoriesToAlwaysStageAsNonUFS=(Path="GamePlay/Wall")` 추가
    2. `WjWorldWallDescriptionDataAsset.cpp`: 절대 경로 → Content 상대 경로 변환 로직 추가
  - **상태**: ✅ 해결 확인 (패키징 빌드에서 벽돌 스폰 정상 동작)

### 발견된 추가 이슈 (Steam 환경 2PC 테스트)
1. **[버그] Approaching Wall 종료 후 WaitingRoom 복귀 실패**
   - 증상: 게임 종료 후 WaitingRoom으로 ServerTravel 안됨
   - 추정 원인: 하드코딩 경로 수정 시 누락된 부분
   - 상태: 조사 필요

2. **[버그] LobbyLayout SaveGame 주체 문제**
   - 증상: 배치하지 않은 클라이언트 기준으로 SaveGame되는 경우 발생
   - 재현: 재접속 시 상대방의 일부 배치물이 보임
   - 추정 원인: SaveLayout() 호출 주체 검증 누락
   - 상태: 조사 필요

3. **[버그] WaitingRoom 코스메틱 리플리케이션 실패**
   - 증상: WaitingRoom에서 다른 플레이어 코스메틱이 보이지 않음
   - 참고: Lobby/Play에서는 정상 동작
   - 상태: 조사 필요

### 학습/메모
- Steam Dev Comp Package: 파트너 그룹 계정에게 무료로 앱 접근 권한 부여
- itemdefs.json: 모든 값은 문자열이어야 함 (`false` → `"false"`)
- **Non-asset 파일 패키징**: `.txt`, `.csv` 등은 `DirectoriesToAlwaysStageAsNonUFS`로 명시적 포함 필요

---
*마지막 동기화: 2026-02-05*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
