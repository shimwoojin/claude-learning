# 재화 시스템 구현 + JumpMap 버그 수정 모음

- **날짜**: 2026-02-13
- **프로젝트**: WjWorld
- **태그**: #Currency #SteamInventory #JumpMap #bugfix #Replication #InputMode #GameRule #EditorSubsystem

## 개요
Steam Inventory 통합 재화 시스템(Coin/Gem) 전체 구현 및 JumpMap 관련 버그 6건 수정. 재화 시스템은 CurrencySubsystem으로 구현하여 CosmeticSubsystem과 연동.

## 작업 내용

### 재화 시스템 신규 구현
- `WjWorldCurrencyTypes.h` — ECurrencyType(Coin/Gem), FCurrencyBalance 구조체
- `WjWorldCurrencySubsystem.h/.cpp` — GameInstanceSubsystem
  - GetBalance, TriggerMatchReward, PurchaseItemWithCurrency, PurchaseGemPack
  - Steam: TriggerItemDrop(무료 재화), ExchangeItems(재화→코스메틱), StartPurchase(Gem 팩)
  - 비Steam: GConfig 기반 로컬 잔액 (CurrencyBalance.ini)
  - CosmeticSubsystem.OnInventoryUpdated 구독하여 자동 갱신
- `WjWorldDeveloperSettings.h` — Currency 카테고리 (SteamItemDefId, RewardDefId 설정)
- `WjWorldCosmeticDataAsset.h` — FCosmeticItemDefinition에 CoinPrice/GemPrice 추가
- `Steam/itemdefs.json` — 재화 아이템, playtimegenerator, Gem 팩, exchange 레시피
- `WjWorldGameStatePlay.cpp` — 게임 종료 시 TriggerMatchReward 호출
- `WjWorldLogCategories` — LogWjWorldCurrency 추가

### JumpMap 버그 수정
- 방 만들기 UI에서 JumpMap 유저 맵 미노출 → AddUserMapOptions JumpMap 분기 구현
- TMap 리플리케이션 에러 → WjWorldGameDataComponent TMap UPROPERTY 제거
- JumpMap 에디터 서브시스템 → CSV에서 DataAsset BuiltInLayouts 기반으로 리팩토링
- bIsDefaultPlacement 플래그 → JumpMapActorBase에 추가, 에디터 Save/Clear에서 제외
- Default 맵 미로딩 → GameRuleJumpMap에서 Default=BuiltInLayouts[0] 로드로 수정
- GameModePlay InputMode → PlayerControllerPlay BeginPlay에서 FInputModeGameOnly 설정

## 학습 내용

### UE TMap 리플리케이션 제한
- TMap은 UE 리플리케이션 미지원 — SetIsReplicated(true) 컴포넌트에 TMap UPROPERTY가 있으면 런타임 에러
- `NotReplicated` UPROPERTY 지정자는 USTRUCT 멤버에만 사용 가능, UActorComponent에서는 UHT 에러
- 해결: UPROPERTY 매크로 자체를 제거하거나, 별도 리플리케이션 메커니즘 사용

### Steam Inventory 재화 설계 패턴
- `item` + `auto_stack: true` = 수량 기반 재화 아이템 (Coin, Gem)
- `playtimegenerator` + `TriggerItemDrop` = 시간/횟수 제한 보상 지급
- `ExchangeItems` = 재화 소비 + 아이템 획득 원자적 처리
- `drop_interval`/`drop_window`/`drop_max_per_window` = 일일 보상 상한 서버사이드 관리

### GameInstanceSubsystem 의존성
- `InitializeDependency<T>()` — Initialize() 내에서 다른 서브시스템 초기화 순서 보장
- CosmeticSubsystem의 OnInventoryUpdated 델리게이트 구독으로 잔액 자동 갱신

## 결정 사항
| 결정 | 이유 |
|------|------|
| 재화를 Steam Inventory item으로 관리 | auto_stack으로 서버사이드 수량 관리, ExchangeItems로 원자적 교환 |
| playtimegenerator로 무료 재화 지급 | Steam 서버사이드 일일 상한 관리, 치트 방지 |
| GConfig 기반 비Steam 폴백 | StatsSubsystem 패턴 일관성, 로컬 테스트 용이 |
| TMap UPROPERTY 제거 | NotReplicated가 컴포넌트에서 지원 안 됨, 서브클래스가 자체 리플리케이션 |
| JumpMap 에디터 → DataAsset BuiltInLayouts | 개발자 전용 에디터이므로 CSV가 아닌 DA에 직접 저장 |
| Default MapOption → BuiltInLayouts[0] | 항상 최소 하나의 레이아웃이 DA에 존재한다고 가정 |

## 생성/수정된 파일
- `Source/WjWorld/Currency/WjWorldCurrencyTypes.h` - 재화 타입 정의 (신규)
- `Source/WjWorld/Currency/WjWorldCurrencySubsystem.h/.cpp` - 재화 서브시스템 (신규)
- `Source/WjWorld/Setting/WjWorldDeveloperSettings.h` - Currency 설정 추가
- `Source/WjWorld/Cosmetic/WjWorldCosmeticDataAsset.h` - CoinPrice/GemPrice 필드
- `Steam/itemdefs.json` - 재화/보상/팩 아이템 정의
- `Source/WjWorld/Core/Play/WjWorldGameStatePlay.cpp` - 게임 종료 재화 보상
- `Source/WjWorld/WjWorldLogCategories.h/.cpp` - LogWjWorldCurrency
- `Source/WjWorld/UI/Session/CreateRoomWindow.cpp` - JumpMap 유저 맵 노출
- `Source/WjWorld/Core/GameData/WjWorldGameDataComponent.h` - TMap UPROPERTY 제거
- `Source/WjWorldEditor/JumpMap/JumpMapLevelEditorSubsystem.h/.cpp` - DA 기반 리팩토링
- `Source/WjWorld/GamePlay/JumpMap/JumpMapActorBase.h` - bIsDefaultPlacement
- `Source/WjWorld/Core/GameRule/WjWorldGameRuleJumpMap.cpp` - Default 맵 로딩 수정
- `Source/WjWorld/Core/Play/WjWorldPlayerControllerPlay.h/.cpp` - InputMode GameOnly

## 유용한 코드/명령어
```cpp
// Steam Inventory 재화 잔액 파싱
SteamItemDetails_t Details;
if (Details.m_iDefinition == CoinDefId)
{
    CoinBalance = static_cast<int32>(Details.m_unQuantity);
}

// ExchangeItems로 재화→코스메틱 교환
SteamInventory()->ExchangeItems(
    &ResultHandle,
    &OutputItemDefId, &OutputQty, 1,    // 받을 아이템
    &InputItemInstanceId, &InputQty, 1   // 소비할 재화
);

// 비Steam GConfig 기반 로컬 잔액
GConfig->SetInt(TEXT("/WjWorld/Currency"), TEXT("CoinBalance"), NewBalance, CurrencyConfigPath);
GConfig->Flush(false, CurrencyConfigPath);
```

## 다음 단계
- [ ] 재화 UI 위젯 구현 (잔액 표시, 구매 확인 다이얼로그)
- [ ] 코스메틱 상점에 재화 가격 표시 연동
- [ ] Steam 환경에서 재화 시스템 E2E 테스트
- [ ] 보물 상자(Treasure Chest) 시스템 설계

---
*저장 시간: 2026-02-13 10:45*
