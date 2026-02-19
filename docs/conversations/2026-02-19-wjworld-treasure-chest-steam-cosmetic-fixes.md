# 보물상자 Steam 보안 강화 + 코스메틱 인벤토리/장착 버그 수정

- **날짜**: 2026-02-19
- **프로젝트**: WjWorld
- **태그**: #TreasureChest #SteamInventory #Cosmetic #bugfix #Security #GConfig #FDateTime

## 개요
보물상자(TreasureChestActor) 로비 배치 오브젝트 구현 완료 후, Steam 환경 테스트에서 발견된 3가지 버그를 수정하고 보안을 강화했다. Steam TriggerItemDrop으로 서버 사이드 쿨타임 적용, 코스메틱 인벤토리 초기 로드 누락 수정, 장착 상태 즉시 저장으로 영속성 보장.

## 작업 내용

### 세션 1: 보물상자 구현 (fe33d07)
- `FPlaceableObjectDefinition`에 `ActorClassOverride` 필드 추가 → 배치 시스템에서 서브클래스 스폰 분기
- `WjWorldTreasureChestActor` 신규 생성 (AWjWorldPlacedObjectActor 서브클래스)
- BoxComponent 오버랩 → EnableInput + EnhancedInput(F키) → OnInteract 상호작용 패턴
- per-player GConfig 쿨타임 + InteractionWidget UI 프롬프트
- LidMeshComponent 뚜껑 Roll 회전 애니메이션 (0 → -120도, Tick 기반)

### 세션 2: Steam 보안 + 버그 수정 (e4c0918)
- **Steam TriggerItemDrop 적용**: playtimegenerator로 서버 사이드 쿨타임 강제 (로컬 config 조작 방지)
- **ChestIndex별 독립 DefId**: StartDefId(300) + ChestIndex → 상자별 독립 쿨타임
- **itemdefs.json**: 보물상자 playtimegenerator 10개 추가 (DefId 300-309)
- **FDateTime 파싱 버그**: `Parse()` → `ParseIso8601()` 교체
- **인벤토리 초기 로드 누락**: `CosmeticSubsystem::Initialize()`에 `RequestInventoryRefresh()` 추가
- **장착 영속성 수정**: EquipItem/UnequipSlot에서 즉시 `SaveLoadoutToLocal()` 호출

## 학습 내용

### Steam TriggerItemDrop 서버 사이드 쿨타임
- `playtimegenerator` 타입 ItemDef에 `drop_interval` 설정 → Steam 서버가 쿨타임 강제
- `drop_interval: 1440` = 24시간(분 단위), `drop_max_per_window: 1` = 윈도우당 1회 제한
- 로컬 GConfig 쿨타임은 UI 표시용으로만 유지, 실제 보안은 Steam 서버 담당
- `TriggerItemDrop()` 반환값으로 성공/실패(쿨타임 활성) 즉시 판단 가능

### FDateTime::Parse vs ParseIso8601
- `FDateTime::Parse()`: UE 자체 포맷만 처리 (`YYYY.MM.DD-HH.MM.SS`)
- `FDateTime::ToIso8601()` 출력: `2026-02-19T10:33:16.000Z` (ISO 8601 형식)
- **반드시 `FDateTime::ParseIso8601()`으로 파싱해야 함** — `Parse()`는 실패
- 함수 시그니처: `FDateTime::ParseIso8601(const TCHAR* DateTimeString, FDateTime& OutDateTime)`

### UGameInstanceSubsystem::Deinitialize() 신뢰성
- Steam 패키지 빌드에서 `Deinitialize()`가 안정적으로 호출되지 않을 수 있음
- **중요 데이터는 변경 시점에 즉시 저장**하는 패턴 권장
- GConfig 기반 로컬 저장: `GConfig->Flush(false, ConfigPath)` 즉시 디스크 기록

### CosmeticSubsystem 인벤토리 초기화
- `Initialize()`에서 카탈로그 로드 + 로드아웃 복원만 하고 `RequestInventoryRefresh()` 미호출 시:
  - `CachedInventory` 빈 상태 유지 → 모든 아이템 미보유로 표시
  - Steam 환경에서만 문제 발생 (에디터에서는 콘솔 명령어로 수동 Grant)

## 결정 사항
| 결정 | 이유 |
|------|------|
| Steam TriggerItemDrop 서버 쿨타임 | 로컬 GConfig 파일은 유저가 직접 수정 가능 → 재화 파밍 방지 |
| ChestIndex 300번대 시작 | 10-19는 매치 보상, 20-29는 Gem 팩, 100-199는 코스메틱 → 300-399 보물상자 전용 |
| 보물상자는 개발자 직접 배치 | 유저 배치가 아닌 레벨에 하드코딩 → ChestIndex를 EditAnywhere로 인스턴스별 설정 |
| 장착 시 즉시 SaveLoadoutToLocal | Deinitialize 의존 → Steam 빌드에서 미호출 가능 → 변경 즉시 저장 |
| GConfig 쿨타임은 UI용으로 유지 | Steam 쿨타임만으로는 남은 시간 로컬 표시 불가 → 이중 기록(Steam 보안 + 로컬 UI) |

## 생성/수정된 파일
- `Source/WjWorld/GamePlay/TreasureChest/WjWorldTreasureChestActor.h` - Steam TriggerItemDrop, ChestIndex, TryGrantReward
- `Source/WjWorld/GamePlay/TreasureChest/WjWorldTreasureChestActor.cpp` - Steam/비Steam 분기, ParseIso8601 수정
- `Source/WjWorld/Cosmetic/WjWorldCosmeticSubsystem.cpp` - RequestInventoryRefresh 추가, 즉시 저장
- `Source/WjWorld/Setting/WjWorldDeveloperSettings.h` - TreasureChestGeneratorStartDefId
- `Steam/itemdefs.json` - 보물상자 playtimegenerator 10개 (DefId 300-309)
- `Config/DefaultWjWorld.ini` - TreasureChest InteractAction/WidgetClass 설정
- `Source/WjWorld/DataAsset/WjWorldPlaceableObjectDataAsset.h` - ActorClassOverride 필드
- `Source/WjWorld/Core/Local/Lobby/WjWorldGameStateLobby.cpp` - ActorClassOverride 스폰 분기

## 유용한 코드/명령어

### Steam TriggerItemDrop 패턴
```cpp
#if WITH_STEAM
ISteamInventory* SteamInv = SteamInventory();
if (SteamInv)
{
    SteamInventoryResult_t ResultHandle = k_SteamInventoryResultInvalid;
    SteamItemDef_t DropDef = static_cast<SteamItemDef_t>(GeneratorDefId);
    if (SteamInv->TriggerItemDrop(&ResultHandle, DropDef))
    {
        EResult Status = SteamInv->GetResultStatus(ResultHandle);
        SteamInv->DestroyResult(ResultHandle);
        if (Status == k_EResultOK) { /* 성공 */ }
        else { /* 쿨타임 활성 또는 실패 */ }
    }
}
#endif
```

### FDateTime ISO8601 저장/로드 패턴
```cpp
// 저장
GConfig->SetString(*Section, *Key, *FDateTime::UtcNow().ToIso8601(), ConfigPath);

// 로드 (ParseIso8601 사용!)
FString Str;
GConfig->GetString(*Section, *Key, Str, ConfigPath);
FDateTime Dt;
FDateTime::ParseIso8601(*Str, Dt);
```

## 다음 단계
- [ ] Steam 빌드에서 CosmeticLoadout.ini 생성 및 장착 영속성 검증
- [ ] BP 작업: PlaceableObjectDataAsset에 보물상자 ObjectId 등록, ActorClassOverride 설정
- [ ] LidMeshComponent에 뚜껑 StaticMesh 할당
- [ ] Steam 빌드에서 보물상자 TriggerItemDrop 정상 동작 확인

---
*저장 시간: 2026-02-19 14:25*
