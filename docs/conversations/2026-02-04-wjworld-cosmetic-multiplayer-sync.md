# 코스메틱 멀티플레이어 동기화 수정

- **날짜**: 2026-02-04
- **프로젝트**: WjWorld
- **태그**: #Cosmetic #Multiplayer #Replication #UnrealEngine #Network

## 개요
멀티플레이어 환경에서 코스메틱 동기화 버그를 수정하고, Steam Inventory 폴링 콜백 시스템을 구현했다.

## 작업 내용
- **Steam Inventory 폴링 콜백 구현**
  - `CosmeticSubsystem`: 타이머 기반 폴링 (0.1초 간격)
  - `PurchaseSubsystem`: 구매 결과 폴링 추가
- **코스메틱 테스트 콘솔 명령어 추가** (PlayerControllerBase)
  - `Cosmetic_GrantItem`, `Cosmetic_GrantAll`, `Cosmetic_ClearInventory`
  - `Cosmetic_PrintInventory`, `Cosmetic_PrintLoadout`
  - `Cosmetic_Equip`, `Cosmetic_Unequip`, `Cosmetic_RefreshInventory`
- **코스메틱 상점 UI 마무리**
  - 상점 모드에서 소유 아이템 장착/해제 기능 추가
- **멀티플레이어 코스메틱 동기화 버그 수정**
  - OnLoadoutChanged 브로드캐스트가 모든 Pawn에 영향 → IsLocallyControlled() 체크
  - WaitingRoom 3자 코스메틱 미동기화 → CharacterBase.OnRep_PlayerState() 추가
- **CLAUDE.md 갱신** 및 `/update-claude-md` 스킬 생성

## 학습 내용

### Steam Inventory API 비동기 처리
Steam Inventory API는 비동기로 동작하여 콜백 기반 처리가 필요하다.
```cpp
// 폴링 기반 콜백 패턴
void UWjWorldCosmeticSubsystem::RequestInventoryRefresh()
{
#if WITH_STEAM
    ISteamInventory* SteamInv = SteamInventory();
    if (SteamInv && SteamInv->GetAllItems(&PendingResultHandle))
    {
        StartInventoryPolling();  // 0.1초 간격 타이머 시작
    }
#endif
}

void UWjWorldCosmeticSubsystem::PollSteamInventoryResult()
{
#if WITH_STEAM
    EResult Status = SteamInventory()->GetResultStatus(PendingResultHandle);
    if (Status == k_EResultOK)
    {
        ParseInventoryResult();  // 결과 파싱
        StopInventoryPolling();
        OnInventoryUpdated.Broadcast();
    }
    else if (Status != k_EResultPending)
    {
        StopInventoryPolling();  // 실패 시 중단
    }
#endif
}
```

### 멀티플레이어 코스메틱 동기화 아키텍처

#### 문제점
1. `OnLoadoutChanged` 브로드캐스트가 모든 Pawn의 CosmeticComponent에 전달됨
2. WaitingRoom에서 3자 캐릭터의 코스메틱이 적용되지 않음

#### 해결책
```
[서버 측 - PossessedBy]
Character.PossessedBy() → PlayerStateBase.OnPawnSet()
    ↓ (bPendingCosmeticApply 체크)
CosmeticComponent.ApplyLoadout()

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
CosmeticComponent.ApplyLoadout()
```

### OnRep_PlayerState 활용
- `OnRep_PlayerState()`는 Pawn에 PlayerState가 설정될 때 호출
- **자신의 캐릭터와 3자 캐릭터 모두에게 호출됨**
- 3자 캐릭터 초기화에 활용하기 좋은 타이밍

```cpp
void AWjWorldCharacterBase::OnRep_PlayerState()
{
    Super::OnRep_PlayerState();

    // 코스메틱 카탈로그 설정
    if (CosmeticComponent)
    {
        if (UWjWorldCosmeticSubsystem* CosmeticSub = GetGameInstance()->GetSubsystem<UWjWorldCosmeticSubsystem>())
        {
            CosmeticComponent->SetCatalog(CosmeticSub->GetCatalog());
        }
    }

    // PlayerState에 Pawn 설정 알림 → 대기 중인 코스메틱 적용
    if (AWjWorldPlayerStateBase* PS = GetPlayerState<AWjWorldPlayerStateBase>())
    {
        PS->OnPawnSet(nullptr, this);
    }
}
```

### IsLocallyControlled() 체크
브로드캐스트 수신 시 로컬 플레이어만 처리하도록 필터링:
```cpp
void UWjWorldCosmeticComponent::OnLoadoutChangedHandler(ECosmeticSlot Slot, FName ItemId)
{
    APawn* OwnerPawn = Cast<APawn>(GetOwner());
    if (!OwnerPawn || !OwnerPawn->IsLocallyControlled())
    {
        return;  // 로컬 플레이어가 아니면 무시
    }
    // ... 처리 로직
}
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| OnRep_PlayerState를 CharacterBase에 추가 | 모든 캐릭터 타입에서 3자 코스메틱 동기화 지원 |
| 폴링 방식 Steam 콜백 | Steam API의 비동기 특성상 직접 콜백 수신이 어려움 |
| Console Commands로 테스트 기능 제공 | Steam 연동 없이 코스메틱 시스템 테스트 가능 |

## 생성/수정된 파일
- `Core/Base/WjWorldCharacterBase.h/.cpp` - OnRep_PlayerState() 추가
- `Core/Base/WjWorldPlayerStateBase.h/.cpp` - OnPawnSet(), OnCosmeticLoadoutUpdated() 구현
- `Core/Play/WjWorldCharacterPlay.cpp` - 중복 코드 제거
- `Core/Local/WaitingRoom/WjWorldCharacterWaitingRoom.cpp` - PossessedBy() 추가
- `Cosmetic/WjWorldCosmeticComponent.cpp` - IsLocallyControlled() 체크 추가
- `Cosmetic/WjWorldCosmeticSubsystem.h/.cpp` - 폴링 콜백, 테스트 함수 추가
- `Cosmetic/WjWorldPurchaseSubsystem.h/.cpp` - 폴링 콜백 추가
- `Core/Base/WjWorldPlayerControllerBase.h/.cpp` - 콘솔 명령어 추가
- `UI/Cosmetic/CosmeticMainWindow.cpp` - 상점 모드 장착/해제 기능

## 유용한 코드/명령어

### 콘솔 테스트 명령어
```
Cosmetic_GrantAll           # 모든 아이템 로컬 지급
Cosmetic_PrintInventory     # 인벤토리 출력
Cosmetic_PrintLoadout       # 로드아웃 출력
Cosmetic_Equip 0 ItemName   # 슬롯 0에 아이템 장착
Cosmetic_Unequip 0          # 슬롯 0 해제
Cosmetic_RefreshInventory   # Steam 인벤토리 새로고침
```

### bPendingCosmeticApply 패턴
Pawn이 아직 없을 때 코스메틱 적용을 지연시키는 패턴:
```cpp
void AWjWorldPlayerStateBase::OnCosmeticLoadoutUpdated()
{
    if (APawn* OwnerPawn = GetPawn())
    {
        if (UWjWorldCosmeticComponent* CosmeticComp = OwnerPawn->FindComponentByClass<UWjWorldCosmeticComponent>())
        {
            CosmeticComp->ApplyLoadout(CosmeticLoadout);
        }
        bPendingCosmeticApply = false;
    }
    else
    {
        bPendingCosmeticApply = true;  // Pawn 설정 시 적용
    }
}

void AWjWorldPlayerStateBase::OnPawnSet(APawn* OldPawn, APawn* NewPawn)
{
    if (bPendingCosmeticApply && NewPawn)
    {
        if (UWjWorldCosmeticComponent* CosmeticComp = NewPawn->FindComponentByClass<UWjWorldCosmeticComponent>())
        {
            CosmeticComp->ApplyLoadout(CosmeticLoadout);
            bPendingCosmeticApply = false;
        }
    }
}
```

## 다음 단계
- [ ] Steam 실제 환경 테스트 (AppID 발급 후)
- [ ] 코스메틱 미리보기/시착 시스템 구현
- [ ] Approaching Wall 게임에서 코스메틱 동기화 최종 검증

---
*저장 시간: 2026-02-04 15:30*
