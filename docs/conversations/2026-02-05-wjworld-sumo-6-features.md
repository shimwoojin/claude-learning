# Sumo Knockoff 6대 기능 구현

- **날짜**: 2026-02-05
- **프로젝트**: WjWorld
- **태그**: #Minigame #Sumo #GAS #Replication #GameRule #PowerUp #UE5

## 개요
Sumo Knockoff 미니게임에 6대 핵심 기능(Push 히트 피드백, 킬피드, 축소 플랫폼, 라운드 시스템, 파워업, 맵 변형)을 C++로 구현하고, 빌드 검증 후 에디터 작업 목록을 정리한 세션.

## 작업 내용
- GA_Push에 CameraShake 피격 피드백 + SuperPush 배율 추가
- SumoGameDataComponent에 킬피드(ReplicatedUsing), 라운드, 점수 시스템 추가
- SumoPlayerDataComponent에 TotalScore, ResetForNewRound 추가
- SumoHUDWidget에 KillFeedText, RoundText (BindWidgetOptional) 추가
- SumoFloorRingActor 신규 생성 (축소 플랫폼 링, ESumoRingState)
- SumoPowerUpActor 신규 생성 (3종 파워업, AddLooseGameplayTag 기반)
- GE_SumoSpeedBoost/SuperPush/Shield 참조용 GE 3개 생성
- WjWorldGameRuleSumo 대규모 리팩토링 (라운드, 축소, 파워업, 킬피드, 맵변형)
- CharacterPlay::OnEliminated() AW 하드코딩 제거 + Shield 버프 체크
- GameplayTag 4개 추가 (Buff.SpeedBoost/SuperPush/Shield, GameplayCue.Sumo.PowerUp.Pickup)
- 빌드 오류 3회 수정 후 클린 빌드 확인
- 에디터 작업 목록 20개 항목 정리

## 학습 내용

### TArray<TObjectPtr<T>>::Sort() UE 5.7 호환성
- UE 5.7에서 `TObjectPtr` 생성자로부터의 reference 생성이 deprecated
- `TArray<TObjectPtr<T>>::Sort()` 사용 시 내부 swap에서 deprecation warning 발생
- 해결: `TArray<T*>`로 변경하면 warning 없이 동작
- `TArray<T*>::Sort()` 내부에서 `TDereferenceWrapper` 사용 → 람다 파라미터는 `const T&` (포인터 아님, `.` 연산자 사용)

### InheritableOwnedTagsContainer deprecated (UE 5.7)
- GE 생성자에서 `InheritableOwnedTagsContainer.AddTag()` 더 이상 사용 불가
- 대안: `AddLooseGameplayTag()`로 런타임에 ASC에 직접 태그 추가/제거
- Loose 태그는 GE 없이 동작, 일회성 버프(SuperPush, Shield)에 적합

### AddLooseGameplayTag vs GE 기반 태그
- **AddLooseGameplayTag**: ASC에 직접 추가, GE 불필요, 수동 제거 필요
- **GE 기반 태그**: GE 적용/제거로 자동 관리, 지속 시간/스택 지원
- 파워업처럼 단순 on/off 버프에는 Loose 태그가 간편

### CharacterPlay::OnEliminated() 범용화 패턴
- 기존: AW 전용 PlayerData->OnEliminated() 직접 호출 (하드코딩)
- 개선: OnEliminated()에서는 공통 로직만 (Shield 체크, bIsEliminated 설정)
- 각 GameRule의 OnPlayerEliminated()에서 게임별 PlayerData 업데이트 수행
- 미니게임 추가 시 CharacterPlay 수정 불필요

## 결정 사항
| 결정 | 이유 |
|------|------|
| Loose 태그 기반 버프 | GE의 InheritableOwnedTagsContainer가 UE 5.7에서 deprecated |
| FloorRings를 raw pointer로 변경 | TObjectPtr Sort deprecation warning 회피 |
| OnEliminated에서 AW 하드코딩 제거 | 미니게임 확장성 확보 (GameRule별 분리) |
| 탈락 순서 기반 점수 배분 | 라운드별 공정한 순위 반영 |
| MapOption URL 파라미터 기반 맵 변형 | 기존 MinigameCatalog 구조와 일관성 유지 |

## 생성/수정된 파일

### 신규 생성
- `GamePlay/Sumo/SumoFloorRingActor.h/.cpp` - 축소 플랫폼 링 액터
- `GamePlay/Sumo/SumoPowerUpActor.h/.cpp` - 파워업 픽업 액터
- `AbilitySystem/Effects/GE_SumoSpeedBoost.h/.cpp` - 이동속도 버프 GE
- `AbilitySystem/Effects/GE_SumoSuperPush.h/.cpp` - 강화 넉백 버프 GE
- `AbilitySystem/Effects/GE_SumoShield.h/.cpp` - 보호막 버프 GE

### 주요 수정
- `GA_Push.h/.cpp` - CameraShake, SuperPush 배율 추가
- `WjWorldGameRuleSumo.h/.cpp` - 라운드/축소/파워업/킬피드/맵변형 (~780줄)
- `SumoGameDataComponent.h/.cpp` - 킬피드, 라운드, 점수 데이터
- `SumoPlayerDataComponent.h/.cpp` - TotalScore, ResetForNewRound
- `SumoHUDWidget.h/.cpp` - KillFeedText, RoundText 바인딩
- `WjWorldCharacterPlay.cpp` - Shield 체크, AW 하드코딩 제거
- `WjWorldGameRuleApproachingWall.cpp` - 분리된 AW PlayerData 업데이트
- `WjWorldGameplayTag.h/.cpp` - Buff/GameplayCue 태그 4개 추가
- `DefaultGameplayTags.ini` - 태그 등록

## 유용한 코드/명령어

```cpp
// UE 5.7에서 TArray<T*>::Sort() 올바른 패턴
// TDereferenceWrapper가 포인터 역참조 → 람다는 const T& 받음
TArray<ASumoFloorRingActor*> FloorRings;
FloorRings.Sort([](const ASumoFloorRingActor& A, const ASumoFloorRingActor& B)
{
    return A.RingOrder > B.RingOrder;
});
```

```cpp
// AddLooseGameplayTag 기반 일회성 버프 패턴
// 적용
ASC->AddLooseGameplayTag(WjWorldGameplayTag::Buff_Shield());
// 소모
if (ASC->HasMatchingGameplayTag(WjWorldGameplayTag::Buff_Shield()))
{
    ASC->RemoveLooseGameplayTag(WjWorldGameplayTag::Buff_Shield());
    return; // 제거 무시
}
```

## 다음 단계
- [ ] BP_SumoPowerUpActor 생성 + BP_GameRuleSumo에 PowerUpActorClass 할당
- [ ] BP_SumoFloorRingActor에 WarningMaterial 할당
- [ ] 03-2_Sumo 맵에 FloorRing 동심원 배치 (RingOrder 설정)
- [ ] WBP_SumoHUD에 KillFeedText, RoundText 위젯 추가
- [ ] CameraShake BP 생성 + BPGA_Push에 할당
- [ ] 파워업 타입별 비주얼 구분 (색상/메시)
- [ ] 에디터에서 실제 플레이 테스트 및 밸런스 튜닝

---
*저장 시간: 2026-02-05*
