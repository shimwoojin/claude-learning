# AW 벽 이동 재설계 + 중간 입장 관전자 + 프리뷰 투명 배경 + 채팅 필터링

- **날짜**: 2026-02-26
- **프로젝트**: WjWorld
- **태그**: #ApproachingWall #Algorithm #Spectator #SceneCapture #Material #MID #DeveloperSettings #HUD #ChatWidget

## 개요
AW 벽 이동 알고리즘을 자체 방향 결정에서 중앙 Greedy 할당 방식으로 재설계하고, 게임 중 방 노출 + 중간 입장 관전자 시스템을 구현했다. SceneCapture 투명 배경 문제를 UI Material alpha 반전으로 해결하고, Intro/Login에서 채팅 위젯 미생성 처리를 추가했다.

## 작업 내용

### AW 벽 이동 알고리즘 재설계
- `AssignBrickTargets()` — ShrinkSafeZones 후 FloodFillPoints에 맨해튼 거리 기준 Greedy로 가장 가까운 Standard 벽돌 배정
- `BrickMovement.SetAssignedTarget()` — 외부 타겟 주입, 기존 자체 방향 결정 로직 대체
- 4방향 제한 (대각선 제거), 2칸 이상 거리 시 2칸 이동
- ShrinkSafeZones/PredictNextLevelIsLast도 4방향 인접으로 변경

### 게임 중 방 노출 + 중간 입장 관전자
- 세션 IN_PROGRESS 커스텀 설정 + UpdateSessionInProgress() 메서드
- 방 목록 [Playing] 접두사 + Join 버튼 비활성화 조건
- GameModePlay::HandleStartingNewPlayer() — Playing/Finished 시 StartSpectatingOnly()
- GameRule(AW/Sumo/JumpMap) OnPlayerJoined에 IsGameInProgress() 가드, OnPlayerLeft에서 관전자 카운터 제외

### 캐릭터 프리뷰 투명 배경
- SceneCapture CaptureSource별 alpha 동작 테스트 (FinalToneCurveHDR, FinalColorHDR, SceneColorHDR, SceneColorSceneDepth)
- 최종 해결: UI Material에서 OneMinus로 alpha 반전 → MaterialInstanceDynamic으로 RenderTarget 전달
- DeveloperSettings에 CharacterPreviewMaterial TSoftObjectPtr 추가 (하드코딩 제거)
- 스폰 위치 (0,0,15000) 통일, RenderTarget 크기 500x1000

### HUD 채팅 위젯 필터링
- bCreateChatWidget protected bool (기본 false) → Lobby/WaitingRoom/Play에서 true
- Intro/Login에서 채팅 위젯 미생성

## 학습 내용

### SceneCapture CaptureSource별 Alpha 동작
- `SCS_FinalToneCurveHDR` / `SCS_FinalColorHDR`: PropagateAlpha=1 + ShowFlags 조합에서도 alpha 반전 발생 (메시=투명, 배경=불투명)
- `SCS_SceneColorHDR`: 메시 렌더링 불완전 (skeletal/static mesh 안 보임)
- `SCS_SceneColorSceneDepth`: alpha 채널에 depth 저장 → ClearColor::Transparent 무시, 배경 항상 불투명
- **결론**: CaptureSource 옵션만으로는 해결 불가 → UI Material OneMinus가 가장 안정적

### UI Material + MID 패턴
- Material Domain: User Interface, Blend Mode: Translucent
- TextureSampleParameter2D → RGB→FinalColor, Alpha→OneMinus→Opacity
- C++에서 `UMaterialInstanceDynamic::Create()` → `SetTextureParameterValue("PreviewTexture", RT)` → `Image->SetBrushResourceObject(MID)`

### Greedy 할당 알고리즘
- TActorIterator로 Standard 벽돌 수집 → 각 FloodFillPoint에 최근접 미배정 벽돌 매칭
- 맨해튼 거리 사용 (4방향 이동이므로 유클리드보다 적합)

## 결정 사항
| 결정 | 이유 |
|------|------|
| Material alpha 반전 방식 | CaptureSource 옵션 4가지 모두 alpha 문제 발생, Material이 가장 안정적 |
| DeveloperSettings에 Material 참조 | 하드코딩 경로 제거, 에디터에서 변경 가능 |
| Greedy 할당 (최적 매칭 아님) | 벽돌 수 적어서 Greedy로 충분, Hungarian 등 과도 |
| 4방향 제한 | 대각선 이동 시 벽돌 간 간격 발생 문제 해결 |
| bCreateChatWidget 패턴 | 기존 HUD 상속 구조 활용, Intro/Login은 base class 직접 사용 |

## 생성/수정된 파일
- `GamePlay/Wall/WjWorldBrickMovement.h/.cpp` — SetAssignedTarget, 4방향 제한
- `Core/GameRule/WjWorldGameRuleApproachingWall.h/.cpp` — AssignBrickTargets, 4방향 ShrinkSafeZones
- `Core/GameRule/WjWorldGameRuleBase.h/.cpp` — IsGameInProgress()
- `Core/GameRule/WjWorldGameRuleSumo.cpp` — 관전자 가드
- `Core/GameRule/WjWorldGameRuleJumpMap.cpp` — 관전자 가드
- `Core/Session/SessionManager.h/.cpp` — UpdateSessionInProgress
- `Core/WjWorldGameInstance.cpp` — StartGame/EndGame 세션 상태 업데이트
- `Core/Play/WjWorldGameModePlay.h/.cpp` — HandleStartingNewPlayer (관전자)
- `UI/Session/RoomListEntryWidget.cpp` — [Playing] 표시
- `Network/SessionTypes.h` — bAllowJoinInProgress 필드
- `UI/Profile/CharacterPreviewActor.h/.cpp` — GetPreviewMaterial, MID, DeveloperSettings
- `UI/Profile/PlayerProfileWidget.cpp` — MID 적용
- `UI/Cosmetic/CosmeticPreviewPanel.cpp` — MID 적용
- `Setting/WjWorldDeveloperSettings.h` — CharacterPreviewMaterial
- `Core/Base/WjWorldHUDBase.h/.cpp` — bCreateChatWidget
- `Core/Play/WjWorldHUDPlay.h/.cpp` — 생성자 추가

## 유용한 코드/명령어
```cpp
// UI Material + MID로 RenderTarget alpha 반전 적용
UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
MID->SetTextureParameterValue(FName("PreviewTexture"), RenderTarget);
Image->SetBrushResourceObject(MID);

// DeveloperSettings에서 Material 로드
const UWjWorldDeveloperSettings* Settings = GetDefault<UWjWorldDeveloperSettings>();
UMaterialInterface* Mat = Settings->CharacterPreviewMaterial.LoadSynchronous();

// Greedy 할당 핵심 패턴
for (FloodFillPoint : Points) {
    int32 BestDist = MAX_int32;
    for (Brick : UnassignedBricks) {
        int32 Dist = FMath::Abs(Delta.X) + FMath::Abs(Delta.Y); // Manhattan
        if (Dist < BestDist) { BestDist = Dist; BestBrick = Brick; }
    }
    BestBrick->SetAssignedTarget(Point);
}
```

## 다음 단계
- [ ] 에디터에서 M_CharacterPreview Material 생성 (UserInterface, Translucent, OneMinus alpha)
- [ ] DeveloperSettings에 Material 경로 설정
- [ ] 실제 투명 배경 동작 테스트

---
*저장 시간: 2026-02-26*
