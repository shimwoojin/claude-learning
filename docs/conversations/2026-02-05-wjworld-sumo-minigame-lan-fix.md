# Sumo Knockoff 미니게임 구현 & LAN SocketSubsystem 수정

- **날짜**: 2026-02-05
- **프로젝트**: WjWorld
- **태그**: #Minigame #GameRule #GAS #Networking #LAN #SocketSubsystem

## 개요
Sumo Knockoff 미니게임의 전체 코드를 구현하고(8개 신규 파일, 6+ 수정), LAN 모드에서 SocketSubsystemSteamIP 충돌 문제를 커스텀 NetDriver로 해결했다.

## 작업 내용

### Sumo Knockoff 미니게임 코드 구현
- GA_Push 어빌리티 (구형 오버랩 → LaunchCharacter 넉백)
- WjWorldGameRuleSumo (Z 위치 기반 낙하 감지, 제거, 승리 조건)
- SumoGameDataComponent / SumoPlayerDataComponent (리플리케이션)
- GameplayTag 추가 (Ability.Push, Cooldown.Push, GameplayCue.Ability.Push)
- WjWorldStatTypes에 Sumo 네임스페이스 추가

### 미니게임별 어빌리티 제한 시스템
- MinigameDataAsset에 AllowedAbilityTags, StatNamespace 필드 추가
- GameStatePlay에 Replicated 프로퍼티 추가
- GameRuleBase가 OnGameReady()에서 카탈로그 조회 → GameState에 설정
- AbilityBase의 CanActivateAbility()에서 AllowedAbilityTags 체크

### 스탯 네임스페이스 범용화
- OnRep_GameResult()에서 하드코딩된 ApproachingWall 대신 동적 StatNamespace 사용

### LAN SocketSubsystem 충돌 수정
- WjWorldLanNetDriver 생성 (UIpNetDriver 서브클래스)
- GetSocketSubsystem() → PLATFORM_SOCKETSUBSYSTEM 명시

## 학습 내용

### SocketSubsystemSteamIP의 기본 소켓 오버라이드
SocketSubsystemSteamIP 플러그인은 `RegisterSocketSubsystem()`으로 Steam 소켓을 **기본 소켓 서브시스템**으로 등록한다. 이후 `ISocketSubsystem::Get()`(인자 없음)은 Steam 소켓을 반환한다. IpNetDriver가 `GetSocketSubsystem()`에서 `Get()`을 호출하면 Steam 소켓을 받아 SteamSocketsP2P 주소로 바인딩을 시도, IPv4 소켓과 프로토콜 불일치가 발생한다.

**해결**: `ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)` 호출 시 원래 플랫폼(IPv4) 소켓 서브시스템이 반환됨. 커스텀 NetDriver 서브클래스에서 이를 명시적으로 호출하면 해결.

### UE 5.7 GetAssetTags() API 변경
UE 5.7에서 `UGameplayAbility::GetAssetTags()`는 `const FGameplayTagContainer&`를 직접 반환한다. 이전 버전의 출력 파라미터 방식이 아님.

### 새 레벨 패키징 필수 체크
레벨을 새로 추가하면 Project Settings > Packaging > List of maps to include in a packaged build에 반드시 추가해야 한다. 누락 시 `Failed to load package` 에러로 ServerTravel 실패.

## 결정 사항
| 결정 | 이유 |
|------|------|
| 커스텀 NetDriver (WjWorldLanNetDriver) 방식 | 기본 소켓 서브시스템을 전역 변경하는 것보다 안전하고 격리됨 |
| AllowedAbilityTags 빈 컨테이너 = 전부 허용 | 기존 ApproachingWall 미니게임 하위 호환성 보장 |
| StatNamespace를 MinigameDataAsset에 정의 | GameRule 클래스명 파싱보다 명시적이고 데이터 드리븐 |
| FallThresholdZ를 EditDefaultsOnly로 설정 | BP에서 맵에 맞게 조정 가능 |

## 생성/수정된 파일

### 신규 파일
- `Source/WjWorld/AbilitySystem/Abilities/GA_Push.h/.cpp` - Push 넉백 어빌리티
- `Source/WjWorld/Core/GameRule/WjWorldGameRuleSumo.h/.cpp` - Sumo 게임 규칙
- `Source/WjWorld/Core/GameData/SumoGameDataComponent.h/.cpp` - Sumo 게임 데이터
- `Source/WjWorld/Core/GameData/SumoPlayerDataComponent.h/.cpp` - Sumo 플레이어 데이터
- `Source/WjWorld/Network/WjWorldLanNetDriver.h/.cpp` - LAN 전용 NetDriver

### 수정된 파일
- `WjWorldGameplayTag.h/.cpp` - Ability_Push, Cooldown_Push, GameplayCue_Ability_Push
- `WjTypes.h` - Ability6 = 6
- `Config/DefaultGameplayTags.ini` - 새 태그 등록
- `WjWorldMinigameDataAsset.h` - AllowedAbilityTags, StatNamespace
- `WjWorldGameStatePlay.h/.cpp` - AllowedAbilityTags, StatNamespace (Replicated)
- `WjWorldGameRuleBase.cpp` - 카탈로그 조회 → GameState 설정
- `WjWorldGameplayAbilityBase.h/.cpp` - CanActivateAbility() 오버라이드
- `WjWorldStatTypes.h/.cpp` - Sumo 네임스페이스 + 디스크립터
- `SessionManager.h/.cpp` - ApplyNetDriverForMode() WjWorldLanNetDriver 사용
- `WjWorld.Build.cs` - Sockets, Networking 모듈 추가
- `Config/DefaultEngine.ini` - WjWorldLanNetDriver 설정 섹션

## 유용한 코드/명령어

### 커스텀 NetDriver로 소켓 서브시스템 오버라이드
```cpp
// WjWorldLanNetDriver.h
UCLASS(transient, config=Engine)
class UWjWorldLanNetDriver : public UIpNetDriver
{
    GENERATED_BODY()
public:
    virtual ISocketSubsystem* GetSocketSubsystem() override;
};

// WjWorldLanNetDriver.cpp
ISocketSubsystem* UWjWorldLanNetDriver::GetSocketSubsystem()
{
    return ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM);
}
```

### 런타임 NetDriver 전환
```cpp
for (FNetDriverDefinition& Def : GEngine->NetDriverDefinitions)
{
    if (Def.DefName == FName(TEXT("GameNetDriver")))
    {
        Def.DriverClassName = FName(TEXT("/Script/WjWorld.WjWorldLanNetDriver"));
        break;
    }
}
```

### 미니게임별 어빌리티 제한 패턴
```cpp
// AbilityBase::CanActivateAbility()
const FGameplayTagContainer& AllowedTags = GameState->GetAllowedAbilityTags();
if (AllowedTags.Num() > 0)
{
    const FGameplayTagContainer& AssetTags = GetAssetTags();
    if (!AllowedTags.HasAny(AssetTags))
        return false;
}
```

## 다음 단계
- [ ] Sumo 레벨 맵 생성 (Content/Map/03-2_Sumo)
- [ ] 패키징 맵 목록에 추가
- [ ] MinigameCatalog에 Sumo 엔트리 추가
- [ ] BP_GameRuleSumo 블루프린트 생성
- [ ] CharacterPlaySetupDataAsset에 GA_Push 추가
- [ ] IMC_Default에 IA_Ability6 InputAction + 키 바인딩
- [ ] LAN 2PC 테스트로 Sumo 게임플레이 검증

---
*저장 시간: 2026-02-05 17:00*
