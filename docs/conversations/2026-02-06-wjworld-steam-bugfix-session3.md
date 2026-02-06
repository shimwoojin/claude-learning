# Steam 2PC 버그 수정 2차 (#2, #11, #16)

- **날짜**: 2026-02-06
- **프로젝트**: WjWorld
- **태그**: #bugfix #multiplayer #cosmetic #stats #waitingroom

## 개요
Steam 2PC 테스트에서 발견된 Medium 우선순위 버그들 수정. 코스메틱 전이, 호스트 설정 패널 표시, 3자 프로필 스탯 조회 문제 해결.

## 작업 내용
- #16 Sumo 코스메틱 전이 버그 수정
- #2 호스트 설정 패널 클라이언트 표시 버그 수정
- #11 3자 프로필 스탯 조회 버그 수정
- #1, #10 디버깅용 로그 추가

## 학습 내용

### Sumo 코스메틱 전이 버그 (#16)
**문제**: 호스트가 Sumo에서 죽고 리스폰되면 호스트의 코스메틱이 다른 플레이어 캐릭터에게 적용됨

**원인 분석**:
- `PossessedBy()`에서 `CosmeticSub->GetLoadout()` 호출
- `CosmeticSubsystem`은 `GameInstanceSubsystem` → 서버(호스트)의 GameInstance에 존재
- 따라서 모든 캐릭터에 대해 서버의 로드아웃 반환 → 호스트 코스메틱이 모든 캐릭터에 적용

**해결**:
```cpp
// WjWorldCharacterPlay.cpp - PossessedBy()
if (PS->GetCosmeticLoadout().Entries.IsEmpty())
{
    // 최초 스폰: 로컬 서브시스템에서 로드아웃 가져옴 (서버 자신의 캐릭터만 해당)
    APlayerController* PC = Cast<APlayerController>(NewController);
    if (PC && PC->IsLocalController())
    {
        PS->SetCosmeticLoadout(CosmeticSub->GetLoadout());
    }
}
// 리스폰: 기존 PlayerState 로드아웃 유지
PS->OnPawnSet(nullptr, this);
```

### 호스트 설정 패널 클라이언트 표시 (#2)
**문제**: `SessionManager->IsHost()`가 클라이언트에서도 true 반환하는 경우 있음

**해결**: NetMode 이중 체크
```cpp
void UWaitingRoomHUDWidget::UpdateHostSettingsPanelVisibility()
{
    bool bIsHost = GameInstance->GetSessionManager()->IsHost();

    // 이중 체크: NetMode가 Client면 무조건 false
    if (World->GetNetMode() == NM_Client)
    {
        bIsHost = false;
    }

    HostSettingsPanel->SetVisibility(bIsHost ? ESlateVisibility::Visible : ESlateVisibility::Collapsed);
}
```

### 3자 프로필 스탯 조회 (#11)
**문제**: `OnSteamUserStatsReceived()` 콜백에서 빈 `FUniqueNetIdRepl` 브로드캐스트

**원인**: `FString::Printf(TEXT("%llu"), SteamId)`로 문자열만 생성하고 FUniqueNetIdRepl 객체를 올바르게 생성하지 않음

**해결**: Steam OSS IdentityInterface 사용
```cpp
#if WITH_STEAM
#include "OnlineSubsystem.h"
#include "OnlineSubsystemNames.h"
#include "Interfaces/OnlineIdentityInterface.h"
#endif

// OnSteamUserStatsReceived() 내부
FUniqueNetIdRepl UserIdRepl;
IOnlineSubsystem* OSS = IOnlineSubsystem::Get(STEAM_SUBSYSTEM);
if (OSS)
{
    IOnlineIdentityPtr IdentityInterface = OSS->GetIdentityInterface();
    if (IdentityInterface.IsValid())
    {
        UserIdRepl = FUniqueNetIdRepl(IdentityInterface->CreateUniquePlayerId(UserIdStr));
    }
}
OnUserStatsReceived.Broadcast(UserIdRepl);
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| 로드아웃 존재 여부 체크 | 리스폰 시 기존 로드아웃 유지, 덮어쓰기 방지 |
| IsLocalController() 체크 | 서버 자신의 캐릭터만 로컬 로드아웃 적용 |
| NetMode 이중 체크 | SessionManager 신뢰성 부족 시 보완 |
| OSS IdentityInterface 사용 | 플랫폼 독립적인 FUniqueNetIdRepl 생성 |

## 생성/수정된 파일
- `WjWorldCharacterPlay.cpp` - PossessedBy() 로드아웃 로직 수정
- `WaitingRoomHUDWidget.cpp` - UpdateHostSettingsPanelVisibility() NetMode 체크 추가
- `WjWorldStatsSubsystem.cpp` - OnSteamUserStatsReceived() FUniqueNetIdRepl 생성 수정
- `WjWorldCosmeticComponent.cpp` - ApplyLoadout() 디버깅 로그 추가

## 유용한 코드/명령어
```cpp
// 서버에서 로컬 플레이어 체크
APlayerController* PC = Cast<APlayerController>(NewController);
if (PC && PC->IsLocalController())
{
    // 서버 자신의 캐릭터
}

// NetMode 체크
ENetMode NetMode = GetWorld()->GetNetMode();
if (NetMode == NM_Client) { /* 순수 클라이언트 */ }
if (NetMode == NM_ListenServer) { /* Listen Server (호스트) */ }

// Steam SteamId → FUniqueNetIdRepl 변환
IOnlineSubsystem* OSS = IOnlineSubsystem::Get(STEAM_SUBSYSTEM);
IOnlineIdentityPtr Identity = OSS->GetIdentityInterface();
FUniqueNetIdRepl UniqueId = FUniqueNetIdRepl(Identity->CreateUniquePlayerId(SteamIdString));
```

## 다음 단계
- [ ] #1 WaitingRoom UI 미갱신 테스트
- [ ] #10 AW 코스메틱 3자에게 잠시 보임 테스트
- [ ] #3 대각선 맵 movement 조사

---
*저장 시간: 2026-02-06 오후*
