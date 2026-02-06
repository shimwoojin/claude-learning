# Steam 빌드 테스트 버그 수정 (#4, #5, #8, #12)

- **날짜**: 2026-02-06
- **프로젝트**: WjWorld
- **태그**: #bugfix #multiplayer #replication #networking

## 개요
Steam 2PC 빌드 테스트에서 발견된 High 우선순위 버그 4개를 수정. 멀티플레이어 동기화, 배열 초기화, GAS 태그 관리 관련 이슈 해결.

## 작업 내용
- #8 TileActor collision 버그 수정 (배열 초기화 누락)
- #12 Sumo 라운드 리셋 후 ability 발동 안 됨 수정 (State_Eliminated 태그)
- #4 클라이언트 벽돌 preview offset 문제 수정 (Server RPC)
- #5 늦은 클라이언트 카운트다운 동기화 수정 (서버 시간 기반)

## 학습 내용

### 1. 배열 초기화의 중요성
```cpp
// 잘못된 코드 - 가비지 값으로 인한 예측 불가 동작
int32 bIsOverlapBricks[EWjWorldDirection::Max];

// 올바른 코드
int32 bIsOverlapBricks[EWjWorldDirection::Max] = {0};
```
C++ 배열은 자동 초기화되지 않음. 특히 bool/int 배열에서 가비지 값이 true/1로 해석되어 의도치 않은 동작 발생.

### 2. GAS 태그와 캐릭터 리스폰
- ASC(AbilitySystemComponent)가 PlayerState에 있으면 캐릭터 리스폰해도 태그 유지
- 라운드 리셋 시 `State_Eliminated` 같은 상태 태그도 명시적 제거 필요
```cpp
// PlayerState에서 ASC 가져오기
UAbilitySystemComponent* ASC = PS->GetAbilitySystemComponent();
ASC->RemoveLooseGameplayTag(WjWorldGameplayTag::State_Eliminated());
```

### 3. 클라이언트-서버 위치 동기화
- 네트워크 지연으로 클라이언트/서버 캐릭터 위치 차이 발생
- 서버에서 클라이언트 캐릭터 위치로 재계산하면 오차 발생
- 해결: 클라이언트가 계산한 GridIndex를 Server RPC로 전달
```cpp
UFUNCTION(Server, Reliable)
void ServerSpawnBrickAtGridIndex(int32 GridX, int32 GridY);
```

### 4. 늦게 참여하는 클라이언트를 위한 시간 동기화
- `GetServerWorldTimeSeconds()`로 서버 시간 기록
- 클라이언트가 OnRep에서 경과 시간 계산하여 남은 시간 표시
```cpp
// 서버에서 시작 시간 기록
CountdownStartServerTime = GetServerWorldTimeSeconds();

// 클라이언트에서 남은 시간 계산
double Elapsed = CurrentServerTime - CountdownStartServerTime;
float RemainingTime = FMath::Max(0.0f, StartCountDownTime - Elapsed);
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| GridIndex를 Server RPC로 전달 | 서버 재계산보다 클라이언트 계산값이 정확 |
| CountdownStartServerTime을 Replicated로 | 늦은 클라이언트도 남은 시간 계산 가능 |
| State_Eliminated를 RemoveAllPlayerBuffs()에서 제거 | 라운드 리셋 시 한 번에 정리 |

## 생성/수정된 파일
- `WjWorldTileActor.h` - 배열 초기화 추가
- `WjWorldGameRuleSumo.cpp` - RemoveAllPlayerBuffs() 수정
- `GA_SpawnBrick.h/.cpp` - Server RPC 추가
- `WjWorldGameStatePlay.h/.cpp` - CountdownStartServerTime 추가

## 유용한 코드/명령어
```cpp
// 서버 월드 시간 가져오기 (GameStateBase 멤버)
double ServerTime = GetServerWorldTimeSeconds();

// Replicated 프로퍼티에서 서버 시간 활용
if (CountdownStartServerTime > 0.0)
{
    double Elapsed = GetServerWorldTimeSeconds() - CountdownStartServerTime;
    float RemainingTime = FMath::Max(0.0f, TotalTime - static_cast<float>(Elapsed));
}
```

## 다음 단계
- [x] #3 대각선 맵 movement 버그 조사 필요
- [ ] Medium 우선순위 버그 수정 (#1, #2, #10, #11, #13)

---
*저장 시간: 2026-02-06 오후*
