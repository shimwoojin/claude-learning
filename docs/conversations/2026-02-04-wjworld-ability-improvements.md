# Approaching Wall 어빌리티 개선 및 GameplayCue 구현

- **날짜**: 2026-02-04
- **프로젝트**: WjWorld
- **태그**: #GAS #GameplayCue #Replication #Animation #UE5

## 개요
Approaching Wall 미니게임의 어빌리티 시스템을 개선하고, GameplayCue를 통한 사운드/VFX 시스템을 구축함.

## 작업 내용
- Normal Attack Montage 지원 추가 (UAbilityTask_PlayMontageAndWait)
- Lift Brick 3자 Replicate 구현 (손에 들고 있는 벽돌 시각화)
- Z-Fight 수정 (이동 중 벽돌 Z 오프셋)
- 플레이어 끼임 케이스 처리 (벽에 밀려서 막힐 때 제거)
- GameplayCue 4개 태그 추가 및 어빌리티에서 호출

## 학습 내용

### UAbilityTask_PlayMontageAndWait
GAS에서 Montage를 비동기로 재생하는 표준 방법.
```cpp
UAbilityTask_PlayMontageAndWait* MontageTask = UAbilityTask_PlayMontageAndWait::CreatePlayMontageAndWaitProxy(
    this,
    NAME_None,
    AttackMontage,
    MontagePlayRate,
    NAME_None,
    true,   // bStopWhenAbilityEnds
    1.0f    // AnimRootMotionTranslationScale
);

MontageTask->OnCompleted.AddDynamic(this, &UGA_NormalAttack::OnMontageCompleted);
MontageTask->OnBlendOut.AddDynamic(this, &UGA_NormalAttack::OnMontageBlendOut);
MontageTask->OnInterrupted.AddDynamic(this, &UGA_NormalAttack::OnMontageInterrupted);
MontageTask->OnCancelled.AddDynamic(this, &UGA_NormalAttack::OnMontageCancelled);
MontageTask->ReadyForActivation();
```

**핵심 포인트**:
- `ReadyForActivation()` 호출 필수
- 게임 로직과 Montage 분리 권장 (로직 즉시 실행, Montage는 시각적 피드백만)
- EndAbility를 위한 Handle/ActorInfo/ActivationInfo 캐싱 필요

### 3자 캐릭터 메시 리플리케이션
```cpp
// 헤더
UPROPERTY(ReplicatedUsing = OnRep_IsCarryingBrick)
bool bIsCarryingBrick = false;

UPROPERTY(Replicated)
TObjectPtr<UStaticMesh> CarriedBrickMesh;

UPROPERTY(Replicated)
FVector CarriedBrickScale = FVector::OneVector;

// CPP - GetLifetimeReplicatedProps
DOREPLIFETIME(AWjWorldCharacterPlay, bIsCarryingBrick);
DOREPLIFETIME(AWjWorldCharacterPlay, CarriedBrickMesh);
DOREPLIFETIME(AWjWorldCharacterPlay, CarriedBrickScale);

// OnRep 콜백
void AWjWorldCharacterPlay::OnRep_IsCarryingBrick()
{
    if (bIsCarryingBrick && CarriedBrickMesh)
    {
        LiftedBrickMeshComponent->SetStaticMesh(CarriedBrickMesh);
        LiftedBrickMeshComponent->SetWorldScale3D(CarriedBrickScale);
        LiftedBrickMeshComponent->SetVisibility(true);
    }
    else
    {
        LiftedBrickMeshComponent->SetVisibility(false);
    }
}
```

### Z-Fight 해결 패턴
이동 중인 오브젝트에 미세한 Z 오프셋 적용:
```cpp
constexpr float MovingZOffset = 5.0f;

if (bIsMoving)
{
    NewLocation.Z += MovingZOffset;
}
else
{
    // 이동 완료 시 원래 위치로
    CurrentLocation.Z = TargetLocation.Z;
}
```

### GameplayCue 자동 매칭 시스템
태그와 BP 이름의 자동 매칭 규칙:
- 태그: `GameplayCue.Ability.NormalAttack`
- BP명: `GCN_Ability_NormalAttack`

**클래스 선택**:
- `GameplayCueNotify_Static`: 단발성 효과 → `OnExecute()` 오버라이드
- `GameplayCueNotify_Actor`: 지속 효과 → `OnActive()`/`WhileActive()`/`OnRemove()` 오버라이드

**C++에서 호출**:
```cpp
if (UAbilitySystemComponent* ASC = ActorInfo->AbilitySystemComponent.Get())
{
    FGameplayCueParameters CueParams;
    CueParams.Location = GetAvatarActorFromActorInfo()->GetActorLocation();
    ASC->ExecuteGameplayCue(WjWorldGameplayTag::GameplayCue_Ability_NormalAttack(), CueParams);
}
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| Montage와 게임 로직 분리 | Montage 없이도 기능 동작, 에셋 없을 때 대응 용이 |
| 손 소켓에 벽돌 부착 | hand_r 소켓이 자연스러운 들기 표현 |
| Z 오프셋 5.0f | 너무 크면 눈에 띄고, 너무 작으면 Z-Fight 발생 |
| GameplayCueNotify_Static 사용 | 사운드 효과는 단발성이므로 적합 |

## 생성/수정된 파일
- `GA_NormalAttack.h/cpp` - Montage 지원, GameplayCue 호출
- `GA_SpawnBrick.cpp` - GameplayCue 호출 추가
- `GA_LiftBrick.cpp` - 벽돌 시각화 연동, GameplayCue 호출
- `WjWorldCharacterPlay.h/cpp` - 들고 있는 벽돌 시각화 컴포넌트
- `WjWorldBrickMovement.cpp` - Z-Fight 수정, 끼임 체크
- `WjWorldGameplayTag.h/cpp` - GameplayCue 태그 4개 추가

## 유용한 코드/명령어
```cpp
// 태그 정의 (WjWorldGameplayTag.h)
static FGameplayTag GameplayCue_Ability_NormalAttack();
static FGameplayTag GameplayCue_Ability_SpawnBrick();
static FGameplayTag GameplayCue_Ability_LiftBrick();
static FGameplayTag GameplayCue_Ability_LiftBrick_Place();

// 태그 구현 (WjWorldGameplayTag.cpp)
FGameplayTag WjWorldGameplayTag::GameplayCue_Ability_NormalAttack()
{
    return FGameplayTag::RequestGameplayTag(TEXT("GameplayCue.Ability.NormalAttack"));
}
```

## 다음 단계
- [ ] 공격 AnimMontage 생성 및 BP_GA_NormalAttack에 할당
- [ ] AnimBP에서 LiftBrickCarry 포즈 설정 (State.LiftBrickCarry 태그 체크)
- [ ] GameplayCue 사운드 에셋 4개 생성 (NormalAttack, SpawnBrick, LiftBrick, LiftBrick.Place)

---
*저장 시간: 2026-02-04 15:30*
