# Steam ExchangeItems 구현 + 보물상자 버그 수정 + 테스트 치트

- **날짜**: 2026-02-23
- **프로젝트**: WjWorld
- **태그**: #SteamInventory #ExchangeItems #TreasureChest #GConfig #bugfix #DebugTools #itemdefs

## 개요
CurrencySubsystem의 ExchangeItems stub을 실제 Steam API 호출로 교체하고, 보물상자 쿨타임/보상 관련 버그 3건을 수정하고, Steam 인벤토리 테스트용 치트 명령어를 추가했다.

## 작업 내용
- CurrencySubsystem: `PurchaseItemWithCurrency()` Steam 분기를 실제 `ExchangeItems()` 호출로 교체
- CurrencySubsystem: `RefreshBalancesFromInventory()`를 단일 `GetAllItems` 패스 + 인스턴스 ID 캐싱으로 리팩터
- TreasureChestActor: GConfig 커스텀 ini → `GGameUserSettingsIni`로 통일 (세션간 영속성)
- TreasureChestActor: `FDateTime CachedLastOpenedTime` 인메모리 캐시 추가 (GConfig read-back 불안정 해결)
- CosmeticSubsystem: 로컬 로드아웃 저장도 `GGameUserSettingsIni`로 통일
- itemdefs.json: playtimegenerator bundle weight/quantity 혼동 수정 — 중간 bundle 아이템 추가
- itemdefs.json: 보물상자 `drop_max_per_window` 100으로 변경 (테스트용)
- 치트 명령어 추가: `Steam_ConsumeAllItems`, `Steam_ConsumeCurrency`, `TreasureChest_ClearCooldowns`

## 학습 내용

### Steam playtimegenerator bundle 필드의 의미
`playtimegenerator`의 `"bundle": "1000x50"`에서 `x50`은 **수량이 아니라 weight(확률 가중치)**이다. 실제 수량 지급을 하려면 `type: "bundle"` 중간 아이템을 만들어서 거기서 `"bundle": "1000x50"` (이때는 수량 50)을 정의해야 한다.

- playtimegenerator → `"bundle": "52x1"` (weight 1로 bundle DefId 52 선택)
- bundle DefId 52 → `"bundle": "1000x50"` (WjCoin 50개 지급)

### GConfig 커스텀 ini의 한계
`FPaths::GeneratedConfigDir() + "Custom.ini"` 경로의 커스텀 ini 파일은 UE 재시작 시 자동 로드되지 않는다. `GGameUserSettingsIni`가 cross-session 안정적이다. 같은 세션 내에서도 `GConfig->SetString` 직후 `GetString`이 불안정할 수 있어 인메모리 캐시 병행이 안전하다.

### Steam drop_window 서버 측 제한
`drop_window`/`drop_max_per_window`는 Steam 서버 내부의 playtime accounting 시스템이 관리하며, 클라이언트 API나 Web API로 초기화가 불가능하다. 테스트 시 `drop_max_per_window`를 높은 값으로 설정하는 것이 유일한 우회법.

### Steam Web API vs Client API
- `IInventoryService/ConsumeItem` (Web API): Publisher API Key 필요 — 클라이언트 코드에 넣으면 보안 위험
- `ISteamInventory::ConsumeItem` (Client API): Key 불필요, 동일한 기능 수행 가능
- 인벤토리 전체 초기화: `GetAllItems` → 순회 → `ConsumeItem` 패턴으로 구현

### Steam StartPurchase 흐름
`ISteamInventory::StartPurchase`는 itemdefs.json에 `"price"` 필드가 있는 아이템에 대해 Steam 오버레이 결제 UI를 팝업시킨다. 실제 결제로 이어지며, 완료 후 Steam이 자동으로 인벤토리에 아이템 추가.

### Steamworks 파트너 사이트 인벤토리 관리
GUI 관리 도구는 없고, Web API(`IInventoryService`)를 서버에서 호출해야 한다. Publisher Web API Key + Steam64 ID 필요. `ConsumeItem`, `AddItem`, `GetInventory` 등 사용 가능.

## 결정 사항
| 결정 | 이유 |
|------|------|
| ExchangeItems에 낙관적 로컬 업데이트 없음 | 서버 권한 우선, PollExchangeResult에서 완료 감지 후 인벤토리 갱신 |
| 커스텀 ini → GGameUserSettingsIni 통일 | 커스텀 ini는 세션간 자동 로드 안됨 |
| 인메모리 캐시 + GConfig 이중 저장 | GConfig read-back 불안정 보완 |
| 중간 bundle 아이템 도입 | playtimegenerator의 bundle은 weight이므로 수량 지급 불가 |
| Client API ConsumeItem 사용 | Web API는 Publisher Key 노출 위험, Client API로 동일 결과 |
| drop_max_per_window 100 (테스트용) | 반복 테스트 위해, 출시 전 1로 복원 필요 |

## 생성/수정된 파일
- `Source/WjWorld/Currency/WjWorldCurrencySubsystem.h` - 인스턴스 ID 캐시, DebugConsume 함수 추가
- `Source/WjWorld/Currency/WjWorldCurrencySubsystem.cpp` - ExchangeItems 실구현, RefreshBalances 리팩터, DebugConsume 구현
- `Source/WjWorld/GamePlay/TreasureChest/WjWorldTreasureChestActor.h` - CachedLastOpenedTime, ResetCooldown 추가
- `Source/WjWorld/GamePlay/TreasureChest/WjWorldTreasureChestActor.cpp` - 쿨타임 캐시, GGameUserSettingsIni, ResetCooldown 구현
- `Source/WjWorld/Cosmetic/WjWorldCosmeticSubsystem.cpp` - GGameUserSettingsIni로 통일
- `Source/WjWorld/Core/Base/WjWorldPlayerControllerBase.h` - 치트 명령어 선언
- `Source/WjWorld/Core/Base/WjWorldPlayerControllerBase.cpp` - 치트 명령어 구현
- `Steam/itemdefs.json` - 중간 bundle 아이템, drop_max_per_window 100
- `CLAUDE.md` - 출시 전 체크리스트 섹션 추가

## 유용한 코드/명령어

### Steam 인벤토리 전체 초기화 (Client API)
```cpp
// GetAllItems → 순회 → ConsumeItem
SteamInventoryResult_t AllItemsHandle;
SteamInv->GetAllItems(&AllItemsHandle);
// ... GetResultItems로 목록 획득
for (const SteamItemDetails_t& Detail : Items)
{
    SteamInventoryResult_t ConsumeHandle;
    SteamInv->ConsumeItem(&ConsumeHandle, Detail.m_itemId, Detail.m_unQuantity);
    SteamInv->DestroyResult(ConsumeHandle);
}
```

### Steam Web API curl (인벤토리 조작)
```bash
# 아이템 직접 부여
curl -X POST "https://partner.steam-api.com/IInventoryService/AddItem/v1/" \
  -d "key=YOUR_KEY&appid=4399350&steamid=YOUR_STEAM64ID&itemdefid[0]=1000&quantity[0]=100"

# 아이템 소비
curl -X POST "https://partner.steam-api.com/IInventoryService/ConsumeItem/v1/" \
  -d "key=YOUR_KEY&appid=4399350&steamid=YOUR_STEAM64ID&itemid=INSTANCE_ID&quantity=50"
```

### 콘솔 치트 명령어
```
Steam_ConsumeAllItems          # 인벤토리 전체 초기화
Steam_ConsumeCurrency          # Coin/Gem만 소비
TreasureChest_ClearCooldowns   # 보물상자 쿨타임 초기화
```

## 다음 단계
- [ ] Steam 빌드에서 ExchangeItems 구매 테스트 (500 Coin / 100 Gem)
- [ ] PurchaseGemPack Steam 오버레이 결제 동작 확인
- [ ] 출시 전 itemdefs.json `drop_max_per_window` 1로 복원

---
*저장 시간: 2026-02-23*
