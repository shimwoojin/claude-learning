# JumpMap 배치 모드 개선 — CustomProperties + 검증 + 유저 레이아웃 선택

- **날짜**: 2026-02-12
- **프로젝트**: WjWorld
- **태그**: #PlacementSystem #JumpMap #CSV #Validation #WaitingRoom #GameRule #UE5

## 개요
JumpMap 배치 에디터에서 체크포인트 CheckpointOrder 저장, 레이아웃 유효성 검증, 대기실 유저 레이아웃 선택, GameRule CSV 로딩을 구현하여 AW(Approaching Wall)와 동일한 수준의 유저 레이아웃 파이프라인을 완성했다.

## 작업 내용
- `FPlacedObjectSaveEntry`에 `TMap<FString, FString> CustomProperties` 필드 추가
- ConfirmPlacement에서 Checkpoint 배치 시 자동 CheckpointOrder 순번 할당
- ExportJumpMapLayoutAsCSV에 11번째 Properties 컬럼 (`Key=Value|Key=Value`) 추가
- TickComponent에서 배치된 체크포인트 위에 `CP #N` 3D 텍스트 표시 (DrawDebugString)
- `ValidateJumpMapLayout()` 구현 — 체크포인트 최소 1개, 도착점 정확히 1개 검증
- JumpMapEditor HUD `ExecuteSave()` 오버라이드 — 검증 실패 시 경고 로그 (저장은 허용)
- JumpMapEditor 힌트 텍스트에 T/G/F 키 안내 추가
- `LoadLayoutAndSpawnActors()` 리팩토링 — MapOption 기반 CSV 레이아웃 로드
- `SpawnActorsFromLayout()` 신규 — CSV 엔트리 → 액터 스폰 + ApplySerializedProperties
- WaitingRoom HUD에 JumpMap 유저 레이아웃 콤보박스 옵션 추가

## 학습 내용

### TMap UPROPERTY 하위 호환성
`FPlacedObjectSaveEntry`에 TMap을 추가할 때 UPROPERTY Serialization이 자동 처리되므로 SaveVersion 변경 불필요. 빈 맵은 기존 세이브 파일과 완전히 하위 호환된다. UE의 Structured Archive는 필드 이름 기반으로 역직렬화하므로 새 필드가 없는 기존 데이터는 빈 맵으로 초기화됨.

### AW 유저 레이아웃 패턴 재사용
AW에서 확립한 패턴(DataAsset.ScanUserLayouts → WaitingRoom 콤보박스 → MapOption URL → GameRule 로딩)을 JumpMap에 그대로 적용. 일관된 아키텍처의 장점으로 새 미니게임에 동일 패턴을 빠르게 확장할 수 있었다.

### CSV 11번째 Properties 컬럼 왕복 직렬화
`JumpMapLayoutDataAsset::ParseLayoutCSV`가 이미 11번째 컬럼 `Key=Value|Key=Value` 파싱을 지원하고 있었으므로, 내보내기(ExportJumpMapLayoutAsCSV)만 추가하면 SaveEntry → CSV → LayoutEntry 완전한 왕복 직렬화가 완성됨.

### Plan Mode 활용
복잡한 다중 파일 변경을 Plan Mode로 사전 설계 후 구현하여, 8개 파일 변경을 한 번에 빌드 성공. 계획 단계에서 기존 코드의 패턴(AW 유저 레이아웃)을 분석하고 동일 패턴 적용 방향을 잡은 것이 효율적이었다.

## 결정 사항
| 결정 | 이유 |
|------|------|
| ValidateJumpMapLayout 실패 시 경고만 출력하고 저장은 허용 | 작업 중 중간 저장을 차단하면 UX가 나빠짐 |
| CheckpointOrder를 배치 시 자동 할당 | 수동 입력 UI 없이도 순서 관리 가능 |
| CSV Properties를 `Key=Value\|Key=Value` 형식 | 기존 ParseLayoutCSV와 호환, 파이프 구분자로 CSV 컬럼과 충돌 없음 |
| ObjectIdToActorClassMap BP 프로퍼티 우선, DeveloperSettings 폴백 | BP에서 쉽게 설정 변경 가능하면서도 중앙 관리 가능 |

## 생성/수정된 파일
- `Save/WjWorldLayoutSaveGame.h` - CustomProperties 필드 추가
- `GamePlay/Placement/WjWorldPlacementComponent.h` - ValidateJumpMapLayout 선언
- `GamePlay/Placement/WjWorldPlacementComponent.cpp` - CheckpointOrder 자동 할당, CSV Properties 컬럼, 3D 표시, 검증 구현
- `Core/GameRule/WjWorldGameRuleJumpMap.h` - SpawnActorsFromLayout 선언
- `Core/GameRule/WjWorldGameRuleJumpMap.cpp` - CSV 레이아웃 로딩, 액터 스폰 구현
- `UI/Placement/PlacementHUDWidgetJumpMapEditor.h` - ExecuteSave 오버라이드
- `UI/Placement/PlacementHUDWidgetJumpMapEditor.cpp` - 검증 후 저장, 힌트 텍스트 업데이트
- `UI/WaitingRoom/WaitingRoomHUDWidget.cpp` - JumpMap 유저 레이아웃 콤보박스 추가

## 유용한 코드/명령어
```cpp
// TMap CustomProperties를 CSV Key=Value|Key=Value 형식으로 직렬화
FString PropsStr;
for (const auto& Pair : Entry.CustomProperties)
{
    if (!PropsStr.IsEmpty()) PropsStr += TEXT("|");
    PropsStr += FString::Printf(TEXT("%s=%s"), *Pair.Key, *Pair.Value);
}

// 기존 배치된 체크포인트에서 최대 Order 조회 후 자동 할당
int32 MaxOrder = -1;
for (const FPlacedObjectSaveEntry& Obj : Existing)
{
    if (Obj.ObjectId.ToString().Contains(TEXT("Checkpoint")))
    {
        const FString* OrderStr = Obj.CustomProperties.Find(TEXT("CheckpointOrder"));
        if (OrderStr) MaxOrder = FMath::Max(MaxOrder, FCString::Atoi(**OrderStr));
    }
}
Entry.CustomProperties.Add(TEXT("CheckpointOrder"), FString::FromInt(MaxOrder + 1));
```

## 다음 단계
- [ ] 에디터에서 실제 테스트 (체크포인트 배치 → CSV 저장 → 대기실 선택 → 게임 진입)
- [ ] Steam 2PC 테스트로 멀티플레이어 CSV 레이아웃 로딩 확인
- [ ] CheckpointOrder 수동 편집 UI 검토 (필요시)

---
*저장 시간: 2026-02-12 18:00*
