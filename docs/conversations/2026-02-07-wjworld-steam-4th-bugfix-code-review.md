# Steam 4차 버그 수정 + 코드 검증 + Agent Teams

- **날짜**: 2026-02-07
- **프로젝트**: WjWorld
- **태그**: #bugfix #code-review #agent-teams #GAS #steam #spectating #graphics

## 개요
Steam 테스트 기록 기반 잔여 버그 8건을 수정하고, 4개 병렬 subagent로 전체 코드 검증을 수행. Claude Code Agent Teams 기능도 테스트.

## 작업 내용

### 버그 수정 (커밋 263031b - 11파일 변경)
- GamePhase 어빌리티 제한 (Playing 상태에서만 허용)
- 유저 맵 클라이언트 벽돌 스폰 (`GetWallDescriptionByNameIncludingUser`)
- BrickComponent collision 분리 (QueryOnly+Overlap / BlockAll 95%)
- WaitingRoom 호스트 설정 패널 호스트 전용 + Apply 갱신
- Steam CCallResult 패턴으로 타 유저 스탯 콜백 수정
- ParseWallLayout `#META:CenterOffset` 메타데이터 파싱
- 제거 시 살아있는 플레이어로 관전 전환
- FindRoomButton 숨김 + 그래픽 품질 사이클 설정

### GAS 버그 수정 (커밋 0d323ff)
- GA_Jump `Super::ActivateAbility()` 누락 수정

### 코드 검증 (4개 병렬 subagent)
- 네트워크 리플리케이션: 문제 없음
- GAS 어빌리티: GA_Jump Super 누락 발견 → 즉시 수정
- GameRule 라이프사이클: 프로덕션 레벨
- null 포인터/메모리 안전성: 방어적 개선 권장 (크래시 확률 낮음)

## 학습 내용

### Steam CCallResult 패턴
Steamworks 비동기 API 호출 시 반환값(`SteamAPICall_t`)을 `CCallResult<>` 템플릿에 등록해야 콜백이 호출됨. 단순 함수 호출만으로는 비동기 결과를 받을 수 없음.

```cpp
// 올바른 패턴
SteamAPICall_t hCall = SteamStats->RequestUserStats(SteamId);
UserStatsCallResult.Set(hCall, this, &UWjWorldStatsSubsystem::OnSteamUserStatsReceivedCallback);

// 헤더에 멤버 선언
CCallResult<UWjWorldStatsSubsystem, UserStatsReceived_t> UserStatsCallResult;
```

### Claude Code Agent Teams vs Subagent
| | Subagent | Agent Teams |
|---|---|---|
| 실행 방식 | 현재 세션 내 하위 프로세스 | 독립 Claude Code 세션 |
| 파일 편집 | 일부 agent만 가능 | 모든 도구 사용 |
| 상호 통신 | 불가 (결과만 반환) | 메일박스로 메시지 교환 |
| 비용 | 상대적 저렴 | 각각 풀 세션 (비용 높음) |
| 자동 구성 | 가능 (AI 판단) | 명시적 요청 필요 |

- Windows에서는 `teammateMode: "in-process"` 사용 (tmux 미지원)
- 독립적 작업은 subagent가 효율적, 상호 의존적 작업은 teams

### UE5 관전 시스템 (최소 구현)
```cpp
// GameState->PlayerArray 순회로 살아있는 플레이어 찾기
for (APlayerState* PS : GS->PlayerArray)
{
    AWjWorldCharacterPlay* OtherChar = Cast<AWjWorldCharacterPlay>(PS->GetPawn());
    if (OtherChar && !OtherChar->IsEliminated())
    {
        PC->SetViewTargetWithBlend(OtherChar, 0.5f);
        break;
    }
}
```
- `PlayerArray`는 서버/클라이언트 모두 사용 가능
- `PlayerControllerIterator`는 클라이언트에서 로컬 PC만 반환

### UE5 그래픽 설정 사이클
```cpp
UGameUserSettings* UserSettings = GEngine->GetGameUserSettings();
int32 CurrentLevel = UserSettings->GetOverallScalabilityLevel();
if (CurrentLevel < 0) CurrentLevel = 3; // 커스텀 → Epic 취급
int32 NextLevel = (CurrentLevel + 1) % 4; // Low→Medium→High→Epic→Low
UserSettings->SetOverallScalabilityLevel(NextLevel);
UserSettings->ApplySettings(false);
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| 호스트 설정 패널 호스트 전용 | 이전 3차에서 클라이언트 읽기전용으로 했으나, Display Text로 충분 |
| BrickComponent collision 이원화 | TileActor overlap + 대각선 이동 양립 불가 → QueryOnly/BlockAll 분리 |
| Agent Teams 대신 Subagent 사용 | 코드 검증은 독립 작업이므로 subagent가 효율적 |
| teammateMode in-process | Windows에서 tmux 미지원 |
| GA_Jump Super 호출 추가 | LocalPredicted에서 Prediction Key 생성 필수 |

## 생성/수정된 파일
- `WjWorldGameplayAbilityBase.cpp` - GamePhase 체크 추가
- `GA_SpawnBrick.cpp`, `GA_LiftBrick.cpp` - IncludingUser 검색
- `WjWorldBrickComponent.cpp` - collision 분리
- `WaitingRoomHUDWidget.cpp` - 호스트 전용 패널 + Apply 갱신
- `WjWorldStatsSubsystem.h/cpp` - CCallResult 패턴 적용
- `WjWorldWallDescriptionDataAsset.cpp` - #META 파싱
- `WjWorldCharacterPlay.cpp` - 관전 전환
- `LobbyHUDWidget.h/cpp` - FindRoom 숨김 + 그래픽 설정
- `GA_Jump.cpp` - Super::ActivateAbility() 추가
- `.claude/settings.local.json` - teammateMode 수정

## 다음 단계
- [ ] Steam 빌드 패키징 및 테스트 (5차)
- [ ] GA_SpawnBrick Listen Server 충전 중복 소모 확인
- [ ] BrickComponent GetGameModePlay() null 체크 추가 (방어적 개선)
- [ ] 관전 시스템 폴백 (마지막 생존자 자살 시 처리)
- [ ] Sumo Knockoff 에디터 세팅 (BP, 링 배치, HUD, 파워업)

---
*저장 시간: 2026-02-07*
