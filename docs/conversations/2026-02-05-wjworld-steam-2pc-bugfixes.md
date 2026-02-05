# Steam 2PC 테스트 버그 수정

- **날짜**: 2026-02-05
- **프로젝트**: WjWorld
- **태그**: #Multiplayer #Replication #Debugging #GAS #Animation

## 개요
Steam 2PC 테스트에서 발견된 4개 버그 수정 및 LiftBrick 애니메이션/색상 리플리케이션 구현.

## 작업 내용
- [버그] Approaching Wall 종료 후 WaitingRoom 복귀 실패 수정
- [버그] LobbyLayout SaveGame 호스트 전용으로 수정
- [버그] WaitingRoom 3자 캐릭터 코스메틱 리플리케이션 수정
- [버그] LiftBrick/SpawnBrick 클라이언트 프리뷰 색상 오류 수정
- WjWorldAnimInstance 생성 (LiftBrickBlendWeight)
- LiftBrick 벽돌 색상 리플리케이션 구현

## 학습 내용

### Timer 람다에서 this 캡처 문제
```cpp
// 문제 코드 - this가 소멸 후 호출될 수 있음
World->GetTimerManager().SetTimer(Handle, FTimerDelegate::CreateLambda([this]() {
    GetWorld()->ServerTravel(URL); // 크래시!
}), Delay, false);

// 해결 - 값 캡처 + TWeakObjectPtr
FString TravelURL = GetTravelURL();
TWeakObjectPtr<UWorld> WeakWorld = World;
World->GetTimerManager().SetTimer(Handle, FTimerDelegate::CreateLambda([WeakWorld, TravelURL]() {
    if (UWorld* ValidWorld = WeakWorld.Get())
    {
        ValidWorld->ServerTravel(TravelURL);
    }
}), Delay, false);
```

### GetAuthGameMode() 클라이언트 제한
- `GetAuthGameMode()`는 서버에서만 유효, 클라이언트에서는 null 반환
- 클라이언트가 필요한 데이터는 GameState의 리플리케이트된 컴포넌트로 전달
- 예: `ApproachingWallGameDataComponent`에 `CurrentWallName` 추가

### 3자 캐릭터 PlayerState 검색
```cpp
// GetPawn()은 자신의 Pawn만 반환, 3자 캐릭터는 null
// TActorIterator로 World의 모든 캐릭터를 순회하여 PlayerState 매칭
for (TActorIterator<ACharacter> It(World); It; ++It)
{
    if (It->GetPlayerState() == this)
    {
        OwnerPawn = *It;
        break;
    }
}
```

### ServerTravel URL 경로 포맷
- `GetAssetPathString()`: `/Game/Map/Lobby.Lobby` (에셋 경로)
- `GetLongPackageName()`: `/Game/Map/Lobby` (순수 패키지 경로)
- ServerTravel에는 `GetLongPackageName()` 사용 필요

### NetMode 기반 호스트 체크
```cpp
ENetMode NetMode = World->GetNetMode();
if (NetMode != NM_Standalone && NetMode != NM_ListenServer)
{
    // 클라이언트는 스킵
    return;
}
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| CurrentWallName을 GameDataComponent에 리플리케이트 | 클라이언트 어빌리티에서 WallDesc 필요, GameMode 접근 불가 |
| TActorIterator로 3자 캐릭터 검색 | GetPawn() 한계, PlayerState → Character 역방향 매핑 필요 |
| AnimInstance에서 GameplayTag 직접 체크 | ABP에서 태그 기반 상태 전환 간결하게 처리 |

## 생성/수정된 파일
- `Animation/WjWorldAnimInstance.h/.cpp` - 신규 생성, LiftBrickBlendWeight
- `WjWorldGameRuleBase.cpp` - Timer 람다 수정
- `WjWorldPlacementComponent.cpp` - NetMode 체크 추가
- `WjWorldCosmeticComponent.cpp` - 로컬 플레이어 체크
- `WjWorldPlayerStateBase.cpp` - TActorIterator 3자 캐릭터 검색
- `ApproachingWallGameDataComponent.h/.cpp` - CurrentWallName 추가
- `WjWorldGameRuleApproachingWall.cpp` - WallName 설정
- `GA_LiftBrick.cpp` - WallName 기반 WallDesc 로드
- `GA_SpawnBrick.cpp` - WallName 기반 WallDesc 로드
- `WjWorldCharacterPlay.h/.cpp` - CarriedBrickColor 리플리케이션

## 유용한 코드/명령어

### GameplayTag 기반 AnimInstance 상태
```cpp
void UWjWorldAnimInstance::NativeUpdateAnimation(float DeltaSeconds)
{
    Super::NativeUpdateAnimation(DeltaSeconds);

    if (CachedASC.IsValid())
    {
        bool bHasTag = CachedASC->HasMatchingGameplayTag(
            WjWorldGameplayTag::State_LiftBrickCarry());
        TargetBlendWeight = bHasTag ? 1.0f : 0.0f;
    }

    // 부드러운 보간
    LiftBrickBlendWeight = FMath::FInterpTo(
        LiftBrickBlendWeight,
        TargetBlendWeight,
        DeltaSeconds,
        BlendSpeed);
}
```

### Dynamic Material 런타임 색상 변경
```cpp
UMaterialInstanceDynamic* DynMat = MeshComp->CreateAndSetMaterialInstanceDynamic(0);
DynMat->SetVectorParameterValue(FName("BaseColor"), BrickColor);
```

## 다음 단계
- [x] 에셋 작업: AnimMontage, GameplayCue 사운드
- [x] AnimBP LiftBrickCarry 포즈 설정
- [ ] 추가 미니게임 구현
- [ ] Steam 정식 출시 준비

---
*저장 시간: 2026-02-05 10:15*
