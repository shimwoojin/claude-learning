# 공용 확인 다이얼로그 + Clear 기능 + 구매/설치 로직 수정

- **날짜**: 2026-02-23
- **프로젝트**: WjWorld
- **태그**: #PlacementSystem #UI #Widget #PurchaseSystem #DesignPattern

## 개요
배치 모드에 전체 삭제(Clear) 기능과 확인 다이얼로그를 추가하고, 유료 아이템의 "구매 수량 = 설치 상한" 로직을 수정했다.

## 작업 내용
- 공용 `ConfirmDialogWidget` 위젯 신규 생성 (`UI/Common/`)
- `PlacementComponent::ClearAllPlacedObjects()` 함수 추가
- `PlacementHUDWidgetBase`에 `ClearButton` (BindWidgetOptional) + 확인 다이얼로그 연동
- 유료 아이템 구매/설치 로직 수정: 1회 구매 = 1개 설치 권한 (이전: 1회 구매 → MaxPlacementCount까지 무제한)

## 학습 내용

### ConfirmDialogWidget 설계 패턴
- 기존 `PlacementSaveDialogWidget`/`PlacementLoadDialogWidget` 패턴 참고
- `ShowPopup()` = `AddToViewport(200)`, `ClosePopup()` = `RemoveFromParent()`
- NativeConstruct 전 호출 대비 캐시 패턴: `SetMessage()` 호출 시 `CachedMessage`에 저장 → NativeConstruct에서 위젯 바인딩 완료 후 재적용
- 확인 클릭 → `OnConfirmed.Broadcast()` → `ClosePopup()` 순서 (Broadcast 먼저, Close 나중)

### BindWidgetOptional 활용
- `ClearButton`을 `BindWidgetOptional`로 선언하면 AW/JumpMap 에디터 BP에 Clear 버튼이 없어도 크래시 없이 동작
- NativeConstruct에서 `if (ClearButton)` null 체크 후 바인딩

### MaxPlacementCount의 의미 변경
- **이전**: 설치 상한 (1회 구매로 MaxPlacementCount까지 설치 가능)
- **이후**: 구매 상한 (MaxPlacementCount번 구매 가능, 각 구매 = 1개 설치 권한)
- 유료 아이템의 실제 설치 상한 = `OwnedQty` (Steam Inventory 수량)
- 무료 아이템은 기존과 동일하게 `MaxPlacementCount`가 설치 상한

## 결정 사항
| 결정 | 이유 |
|------|------|
| ConfirmDialog를 `UI/Common/`에 배치 | 프로젝트 공용으로 재사용 가능하도록 (Placement 전용이 아님) |
| ClearButton은 BindWidgetOptional | AW/JumpMap 에디터 BP에는 Clear 버튼이 불필요 — 컨텍스트별 유연성 |
| ConfirmDialogClass는 EditDefaultsOnly | BP에서 다이얼로그 위젯 클래스를 설정. 미설정 시 확인 없이 바로 실행 |
| 유료 아이템 배치 제한을 OwnedQty로 | "구매 수량 = 설치 가능 수" 직관적 모델. Steam Inventory 수량 자체가 권한 |
| MaxPlacementCount=0 + 유료 → 1회 구매 무제한 설치 | 기존 호환성 유지용 엣지 케이스 처리 |

## 생성/수정된 파일
- `UI/Common/ConfirmDialogWidget.h/.cpp` — 공용 확인/취소 다이얼로그 (신규)
- `GamePlay/Placement/WjWorldPlacementComponent.h/.cpp` — ClearAllPlacedObjects() 추가 + ConfirmPlacement 유료 아이템 OwnedQty 제한
- `UI/Placement/PlacementHUDWidgetBase.h/.cpp` — ClearButton + ConfirmDialogClass + OnClearClicked/OnClearConfirmed + PopulateCatalog 구매 수량 로직 수정

## 유용한 코드/명령어

### 구매 수량 기반 배치 제한 (ConfirmPlacement)
```cpp
// 유료 아이템: 구매 수량(OwnedQty)이 배치 상한
if (Def->CoinPrice > 0 && Def->SteamItemDefId > 0 && Def->MaxPlacementCount > 0)
{
    UWjWorldCosmeticSubsystem* CosmeticSub = GI->GetSubsystem<UWjWorldCosmeticSubsystem>();
    if (CosmeticSub)
    {
        PlacementLimit = CosmeticSub->GetItemQuantityByDefId(Def->SteamItemDefId);
    }
}
```

### 추가 구매 가능 조건 (UI)
```cpp
const bool bCanBuyMore = bIsPaidItem
    && (Def.MaxPlacementCount > 0 ? OwnedQty < Def.MaxPlacementCount : !bOwned);
```

## 다음 단계
- [ ] WBP_ConfirmDialog BP 위젯 생성 (MessageText, ConfirmButton, CancelButton 바인딩)
- [ ] WBP_PlacementHUD에 ClearButton 추가 + ConfirmDialogClass에 WBP_ConfirmDialog 설정
- [ ] 구매 후 인벤토리 갱신 → UI 즉시 반영 테스트

---
*저장 시간: 2026-02-23*
