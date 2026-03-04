# AW 폴리싱 + Steam TriggerItemDrop 결과 폴링 + 보상 중복 방지

- **날짜**: 2026-03-04
- **프로젝트**: WjWorld
- **태그**: #ApproachingWall #GAS #SteamInventory #TriggerItemDrop #Replication #bugfix #TreasureChest #Currency #Polishing

## 개요
Approaching Wall 미니게임 폴리싱 (LiftBrick/SpawnBrick 버그 수정, 벽돌 타입 토글) + Steam `TriggerItemDrop` 결과를 폴링으로 실제 지급 여부 확인하도록 개선 + 게임 결과 OnRep 중복 호출 방지. 출시 로드맵 수립.

## 작업 내용

### GA_LiftBrick 프리뷰 버그 수정
- **문제**: Brick이 없는 위치에서도 PreviewActor가 표시됨 (서버 응답 전에 클라이언트가 프리뷰 생성)
- **해결**: `ActivateAbility`에서 Server RPC 전 클라이언트 사전 오버랩 검증 추가
  - `OverlapMultiByObjectType`로 해당 그리드 위치에 Moving/Destructible 벽돌 존재 확인
  - 없으면 `EndAbility` 즉시 호출

### GA_SpawnBrick 벽돌 타입 토글
- **기존**: 서버에서 `FMath::RandBool()`로 랜덤 결정
- **변경**: 클라이언트에서 선택 + 토글, 서버는 검증만
  - `InputPressed()` 오버라이드로 Moving ↔ Destructible 토글
  - `BrickPreviewActor::SetBrickTypeColor()` — 타입별 색상 피드백
  - `ServerSpawnBrickAtGridIndex` RPC에 `uint8 BrickType` 파라미터 추가
  - 서버에서 Moving/Destructible만 허용, 그 외 Moving 폴백

### OnRep_GameResult 중복 실행 방지
- **문제**: `WinnerPlayerName`, `bGameHasWinner`, `bGameResultReady` 3개 프로퍼티가 모두 `ReplicatedUsing = OnRep_GameResult` → 2~3회 호출
- **영향**: 스탯 2배 기록, 보상 2배 요청 (TriggerItemDrop 두 번째는 drop_interval로 실패)
- **해결**: `bool bGameResultHandled = false` 가드 플래그

### Steam TriggerItemDrop 결과 폴링 (CurrencySubsystem)
- **기존**: `TriggerItemDrop(true)` → 즉시 `DestroyResult` → `ScheduleInventoryRefresh(2.5s, 5s)`
- **변경**: ResultHandle 보관 + 0.5초 `PollMatchRewardResult` 폴링
  - `GetResultStatus` → `k_EResultOK` 확인
  - `GetResultItems` → items > 0: 지급 확정 → 카운트 증가 + 인벤토리 갱신
  - items == 0: Steam drop 한도 → 카운트를 max로 설정
  - `bMatchRewardPending` 중복 방지
  - 일일 카운트 증가를 확인 후로 지연 (기존: 요청 즉시 증가)

### Steam TriggerItemDrop 결과 폴링 (TreasureChestActor)
- 동일 패턴 적용: ResultHandle 보관 + 0.5초 `PollChestRewardResult` 폴링
- items > 0: 인벤토리 갱신 (즉시 + 2초 재시도)
- items == 0 또는 오류: 로컬 폴백 Coin 지급
- `EndPlay`에서 ResultHandle + 타이머 정리

### itemdefs.json 수정
- Match Win/Loss Reward `drop_interval`: 15 → 1 (Steam 최소값)

## 학습 내용

### Steam TriggerItemDrop 반환값의 의미
- `TriggerItemDrop` 반환 `true` = "API 요청이 접수됨" (NOT "아이템이 지급됨")
- `false` = API 호출 자체 실패 (Steam API 미초기화 등)
- 실제 지급 확인: ResultHandle을 `GetResultStatus`로 폴링 → `k_EResultOK` 후 `GetResultItems`로 아이템 수 확인
- `k_EResultOK` + items == 0 = drop_window 한도 도달 (에러 아님, 정상 거부)

### ReplicatedUsing 다중 프로퍼티 주의
- 같은 `OnRep` 콜백을 공유하는 `UPROPERTY`가 여러 개이면, 각 프로퍼티 리플리케이션마다 콜백이 호출됨
- 네트워크 상황에 따라 2~3회 호출 가능
- **해결 패턴**: `bool bHandled = false` 가드 플래그로 1회만 실행

### Steam drop_interval 최소값
- `drop_interval: 0` 은 불가 — Steam이 기본값(60분)으로 처리
- 최소값은 `1` (1분)
- 서로 다른 generator DefId는 독립적으로 drop_interval 추적

### GAS InputPressed 패턴
- `UGameplayAbility::InputPressed()` — 어빌리티 활성 상태에서 바인딩된 입력 재입력 시 호출
- `AbilitySystemComponent->PressInputID()` 경유
- Preview+Confirm 패턴의 토글 확장에 활용

## 결정 사항
| 결정 | 이유 |
|------|------|
| TriggerItemDrop ResultHandle 폴링 방식 | 기존 즉시 파괴 → 지급 실패 감지 불가. ExchangeItems와 동일한 폴링 패턴으로 통일 |
| 일일 카운트 증가를 폴링 완료 후로 지연 | 요청 즉시 카운트 증가 시, 실패해도 카운트 소진됨. 확인 후 증가가 정확 |
| TreasureChest 실패 시 로컬 폴백 | Steam에서 거부해도 플레이어에게 보상 제공 (UX 우선). 로컬 폴백은 임시 표시이지만 현재 구조에서 최선 |
| OnRep_GameResult 가드 플래그 | 3개 프로퍼티 분리보다 간단. 한 번만 실행되면 충분 |

## 생성/수정된 파일
- `Source/WjWorld/AbilitySystem/Abilities/GA_LiftBrick.cpp` — 클라이언트 사전 오버랩 검증
- `Source/WjWorld/AbilitySystem/Abilities/GA_SpawnBrick.h/cpp` — InputPressed 토글, SelectedBrickType
- `Source/WjWorld/GamePlay/Wall/WjWorldBrickPreviewActor.h/cpp` — SetBrickTypeColor
- `Source/WjWorld/Core/Play/WjWorldCharacterPlay.h/cpp` — RPC에 BrickType 파라미터 추가
- `Source/WjWorld/Core/Play/WjWorldGameStatePlay.h/cpp` — bGameResultHandled 가드
- `Source/WjWorld/Currency/WjWorldCurrencySubsystem.h/cpp` — PollMatchRewardResult, MatchRewardResultHandle
- `Source/WjWorld/GamePlay/TreasureChest/WjWorldTreasureChestActor.h/cpp` — PollChestRewardResult, ChestRewardResultHandle
- `Steam/itemdefs.json` — drop_interval 15→1

## 유용한 코드/명령어

```cpp
// Steam TriggerItemDrop 결과 폴링 패턴
EResult Status = SteamInv->GetResultStatus(ResultHandle);
if (Status == k_EResultPending) return; // 아직 대기

if (Status == k_EResultOK)
{
    uint32 ItemCount = 0;
    SteamInv->GetResultItems(ResultHandle, nullptr, &ItemCount);
    if (ItemCount > 0)
    {
        // 아이템 실제 지급됨
    }
    else
    {
        // Steam drop_window 한도 도달 (정상 거부)
    }
}
SteamInv->DestroyResult(ResultHandle);
```

```cpp
// GAS InputPressed 토글 패턴
void UGA_SpawnBrick::InputPressed(const FGameplayAbilitySpecHandle Handle,
    const FGameplayAbilityActorInfo* ActorInfo,
    const FGameplayAbilityActivationInfo ActivationInfo)
{
    if (ActorInfo && ActorInfo->IsLocallyControlled())
    {
        ToggleSelectedBrickType();
        // UI 프롬프트 갱신
    }
}
```

## 다음 단계 (출시 로드맵)
- [ ] AW 폴리싱 — 벽돌 머티리얼 강화, Destructible 파괴 연출 에셋 적용, Explosive Brick 활용, Moving Brick 플레이어 밀기
- [ ] Sumo 폴리싱
- [ ] JumpMap 폴리싱
- [ ] 캐릭터 스킨 추가 (Body Slot)
- [ ] 판매 가능 Cosmetic 추가 + itemdefs.json
- [ ] 결제 및 Gem→Coin 구매 검증
- [ ] UI 폴리싱
- [ ] MiniGame Level 추가 및 폴리싱
- [ ] Steam 출시 준비

---
*저장 시간: 2026-03-04 20:20*
