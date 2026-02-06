# AW Editor CSV 내보내기 & 유효성 검사 버그 수정

- **날짜**: 2026-02-06
- **프로젝트**: WjWorld
- **태그**: #Placement #CSV #WallLayout #FloodFill #Agent #UE5

## 개요
AW Editor에서 저장한 벽 레이아웃을 실제 Approaching Wall 게임플레이에서 사용할 수 있도록 CSV 내보내기 기능을 구현하고, 유효성 검사 로직의 버그를 수정했다.

## 작업 내용
- PlacementComponent에 AW 컨텍스트용 CSV 내보내기 기능 추가
- WallDescriptionDataAsset에 유저 레이아웃 자동 스캔 기능 추가
- BrickSpawner에서 유저 레이아웃 지원
- WallLayoutConverter 외부/내부 영역 구분 버그 수정
- /log 스킬 및 ue-log-analyzer 에이전트 생성
- ue-build-runner 에이전트 제약 조건 추가

## 학습 내용

### 에이전트 제약의 중요성
에이전트에 `tools: Bash` 권한이 있으면 sed, echo 등으로 파일 수정이 가능하다. 빌드 검증만 요청했는데 ue-build-runner가 프로젝트 파일을 수정(UE 5.7 → 5.5 다운그레이드 시도)하는 문제가 발생했다.

**해결**: SKILL.md에 명시적 제약 추가
```markdown
## 중요 제약 (반드시 준수)
- **절대로 파일을 수정하지 마세요** - 분석과 보고만 수행
- 프로젝트 파일(.uproject, Target.cs, Build.cs) 수정 금지
- 소스 코드(.h, .cpp) 수정 금지
- sed, echo, cat 등으로 파일 내용 변경 금지
```

### 벽 레이아웃 유효성 검사 (Flood Fill)
**문제**: 첫 번째 -1 셀을 시작점으로 Flood Fill → 외곽 빈 공간이 시작점이 되어 모든 레이아웃이 "열려있음"으로 오판

**예시**:
```
Padding 추가 후 결과:
-1 -1 -1 -1 -1
-1  1  1  1 -1
-1  1 -1  1 -1  ← 내부 빈 공간 (여기가 플레이 영역)
-1  1  1  1 -1
-1 -1 -1 -1 -1
    ↑
  외곽 빈 공간 (경계에 연결됨)
```

**해결**: 외부/내부 영역 분리 로직
1. `MarkExteriorCells()`: 경계(가장자리)에서 Flood Fill 시작 → 경계에 연결된 모든 빈 셀을 "외부"로 마킹
2. `FindInteriorEmptyCell()`: 외부가 아닌 빈 셀 찾기 → 벽으로 둘러싸인 "내부" 영역

```cpp
void FWjWorldWallLayoutConverter::MarkExteriorCells(
    const TArray<TArray<int32>>& WallLayout,
    TSet<FIntPoint>& OutExteriorCells)
{
    // 경계(가장자리)에 있는 모든 빈 셀을 시작점으로 추가
    // 상단/하단 행, 좌측/우측 열의 빈 셀들

    // Flood Fill: 경계에서 연결된 모든 빈 셀을 외부로 마킹
    while (!Queue.IsEmpty())
    {
        // ... 4방향 탐색, 벽이 아니면 외부로 마킹
    }
}

bool FWjWorldWallLayoutConverter::FindInteriorEmptyCell(
    const TArray<TArray<int32>>& WallLayout,
    const TSet<FIntPoint>& ExteriorCells,
    int32& OutX, int32& OutY)
{
    // 빈 셀이면서 외부 영역이 아닌 경우 = 내부 영역
    if (WallLayout[Y][X] == WallCell_Empty && !ExteriorCells.Contains(FIntPoint(X, Y)))
    {
        return true;
    }
}
```

### AW Editor → 게임플레이 연동 아키텍처
```
[AW Editor]
PlacementComponent.SaveLayoutToSlot()
    ↓
SaveGame 저장 (에디터용)
    ↓
ExportLayoutAsCSV() 자동 호출
    ↓
Content/WallLayouts/User/{SlotName}.csv

[게임플레이]
WallDescriptionDataAsset.ScanUserWallLayouts()
    ↓
유저 CSV 디렉토리 스캔
    ↓
GetWallDescriptionByNameIncludingUser()
    ↓
BrickSpawner.SpawnBricksFromWallNameAsync()
```

## 결정 사항
| 결정 | 이유 |
|------|------|
| SaveGame + CSV 이중 저장 | SaveGame은 에디터 재편집용, CSV는 게임플레이용 |
| 유저 레이아웃 런타임 스캔 | DataAsset 수정 없이 유저 레이아웃 자동 발견 |
| 외부 영역 먼저 마킹 | 경계에서 시작해야 확실한 외부 판별 가능 |
| 에이전트 제약 명시 | Bash 권한 남용 방지 |

## 생성/수정된 파일
- `Source/WjWorld/GamePlay/Placement/WjWorldPlacementTypes.h` - AW 그리드 설정, ObjectId→BrickType 매핑
- `Source/WjWorld/GamePlay/Placement/WjWorldPlacementComponent.cpp` - ExportLayoutAsCSV() 추가
- `Source/WjWorld/GamePlay/Wall/WjWorldWallDescriptionDataAsset.cpp` - 유저 레이아웃 스캔
- `Source/WjWorld/GamePlay/Wall/WjWorldBrickSpawner.cpp` - 유저 레이아웃 검색 연동
- `Source/WjWorld/GamePlay/Wall/WjWorldWallLayoutConverter.cpp` - 외부/내부 영역 구분 로직
- `.claude/commands/log.md` - 로그 검토 스킬
- `.claude/agents/ue-log-analyzer/SKILL.md` - 로그 분석 에이전트
- `.claude/agents/ue-build-runner/SKILL.md` - 제약 조건 추가

## 유용한 코드/명령어

### ObjectId → BrickType 매핑
```cpp
inline int32 ObjectIdToBrickTypeValue(FName ObjectId)
{
    FString IdStr = ObjectId.ToString();
    if (IdStr.Contains(TEXT("Standard"))) return 1;
    else if (IdStr.Contains(TEXT("Explosive"))) return 2;
    else if (IdStr.Contains(TEXT("Moving"))) return 3;
    else if (IdStr.Contains(TEXT("Destructible"))) return 4;
    return 1;  // 기본값: Standard
}
```

### 유저 레이아웃 경로
```cpp
inline FString GetUserWallLayoutDirectory()
{
    return FPaths::ProjectContentDir() / TEXT("WallLayouts") / TEXT("User");
}
```

## 다음 단계
- [ ] AW Editor에서 실제 테스트 (CSV 내보내기 → 게임플레이 로드)
- [ ] 유저 레이아웃 선택 UI 추가 (게임 시작 전 레이아웃 선택)
- [ ] JumpMap Editor 동일 패턴 적용

---
*저장 시간: 2026-02-06 저녁*
