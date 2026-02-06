# Steam 2PC 버그 수정 3차 (전체 해결)

- **날짜**: 2026-02-06
- **프로젝트**: WjWorld
- **태그**: #bugfix #multiplayer #collision #rpc #widget #metadata

## 개요
Steam 2PC 테스트에서 발견된 Critical 버그 2개와 일반 버그 5개를 모두 해결. Server RPC 제약, Box Collision half extent 개념, 위젯 버튼 클릭 판별 방법 등 핵심 학습.

## 작업 내용
- [Critical] 클라이언트 벽돌 스폰 버그 수정 (UObject→AActor RPC 이동)
- [Critical] #14 호스트 설정 패널 값 반영 버그 수정 (자동 적용)
- #2 호스트 설정 패널 클라이언트 표시 개선 (읽기 전용)
- #11 3자 프로필 조회 버그 수정 (TMap 매핑 + HasMouseCapture)
- #1 WaitingRoom UI 미갱신 수정 (직접 설정값 전달)
- #4 유저 커스텀 맵 preview offset 수정 (CSV 메타데이터)
- #8 TileActor collision 옆 칸 영향 수정 (half extent 수정)

## 학습 내용

### Server RPC 제약사항
- **UObject에서 Server RPC 호출 불가** - AActor에서만 가능
- UGameplayAbility는 UObject이므로 RPC 직접 호출 시 서버에 도달하지 않음
- **해결**: Character(AActor)에 RPC 함수 추가, Ability에서 Character RPC 호출

```cpp
// WjWorldCharacterPlay.h
UFUNCTION(Server, Reliable)
void ServerSpawnBrick(const FVector& Location, const FRotator& Rotation);

// GA_SpawnBrick.cpp - Ability에서 호출
if (AWjWorldCharacterPlay* CharacterPlay = Cast<AWjWorldCharacterPlay>(AvatarActor))
{
    CharacterPlay->ServerSpawnBrick(SpawnLocation, SpawnRotation);
}
```

### UBoxComponent::SetBoxExtent - Half Extent 개념
- `SetBoxExtent(FVector)`는 **half extent**(절반 크기)를 받음
- 타일 크기 100x100이면 `SetBoxExtent(50, 50, 50)` 필요
- **잘못된 코드**: `SetBoxExtent(InSize)` → 박스가 2배 커져서 인접 타일 침범

```cpp
// 잘못된 코드 (박스 200x200x200)
CenterHitBoxComponent->SetBoxExtent(InSize);

// 수정된 코드 (박스 100x100x100)
const FVector HalfExtent = InSize * 0.5f;
CenterHitBoxComponent->SetBoxExtent(HalfExtent);
```

### UMG 위젯 버튼 클릭 판별
- `IsHovered()`는 OnClicked 핸들러 내에서 unreliable
- **해결**: TMap으로 버튼→ID 매핑 + `IsHovered() || HasMouseCapture()` 체크

```cpp
// 버튼 생성 시 매핑 저장
TMap<UButton*, int32> PlayerButtonToIDMap;
PlayerButtonToIDMap.Add(PlayerButton, Info.PlayerID);

// 클릭 핸들러에서 매핑으로 판별
void OnAnyPlayerButtonClicked()
{
    for (const auto& Pair : PlayerButtonToIDMap)
    {
        if (Pair.Key && (Pair.Key->IsHovered() || Pair.Key->HasMouseCapture()))
        {
            ShowPlayerProfile(Pair.Value);
            return;
        }
    }
}
```

### CSV 메타데이터 활용
- `#`으로 시작하는 주석 줄을 메타데이터 저장용으로 활용
- 형식: `#META:Key:Value1,Value2,Value3`

```cpp
// 내보내기
CSVContent += FString::Printf(TEXT("#META:CenterOffset:%f,%f,%f\n"),
    GridOrigin.X, GridOrigin.Y, GridOrigin.Z);

// 파싱
if (Line.StartsWith(TEXT("#META:CenterOffset:")))
{
    FString OffsetStr = Line.RightChop(19);
    TArray<FString> Components;
    OffsetStr.ParseIntoArray(Components, TEXT(","));
    // Components[0], [1], [2] 사용
}
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| Ability→Character RPC 위임 | UObject에서 Server RPC 불가, AActor 필수 |
| 게임 시작 시 자동 설정 적용 | 사용자 실수 방지 (Apply 버튼 누르지 않는 경우) |
| 호스트 패널 전체 표시 + 입력 비활성화 | 클라이언트도 설정 확인 가능하게 |
| CSV 메타데이터 헤더 | 기존 파싱 로직과 호환성 유지하면서 추가 정보 저장 |

## 생성/수정된 파일
- `Source/WjWorld/Core/Play/WjWorldCharacterPlay.h/cpp` - ServerSpawnBrick RPC 추가
- `Source/WjWorld/AbilitySystem/Abilities/GA_SpawnBrick.cpp` - Character RPC 호출로 변경
- `Source/WjWorld/UI/WaitingRoom/WaitingRoomHUDWidget.h/cpp` - 버튼 매핑, 설정 자동 적용
- `Source/WjWorld/GamePlay/Placement/WjWorldPlacementComponent.cpp` - CSV 메타데이터 내보내기
- `Source/WjWorld/GamePlay/Wall/WjWorldWallDescriptionDataAsset.cpp` - 메타데이터 파싱
- `Source/WjWorld/GamePlay/Wall/WjWorldTileActor.cpp` - Box extent half size 수정

## 다음 단계
- [ ] Steam 빌드로 7개 버그 수정 검증 테스트
- [ ] #3 대각선 맵 movement 문제 조사
- [ ] Lobby HUD 로컬 방 찾기 버튼 제거
- [ ] 그래픽 설정 (상/중/하) 추가
- [ ] 게임 시작 전 어빌리티 사용 금지

---
*저장 시간: 2026-02-06 20:05*
