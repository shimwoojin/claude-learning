# 코스메틱 아이템 DefId 카테고리별 재넘버링

- **날짜**: 2026-02-23
- **프로젝트**: WjWorld
- **태그**: #SteamInventory #itemdefs #Cosmetic #Numbering

## 개요
Steam itemdefs.json의 코스메틱 아이템 DefId를 카테고리별 200 간격으로 재넘버링하고, FedoraHat 신규 아이템을 추가했다.

## 작업 내용
- 코스메틱 DefId 넘버링 규칙 수립: Head 2000~2199, Body 2200~2399, Back 2400~2599, Effect 2600~2799
- Military Hat: 100→2000, 개별 exchange 500코인 추가
- Fedora Hat: 신규 아이템 2001 (Head, 500코인)
- Delivery Bag: 120→2400, 기존 exchange 유지
- Hat Bundle(140) 삭제 — 번들 불필요, 개별 아이템으로 관리

## 학습 내용

### Steam itemdefs 넘버링 전략
- 카테고리별 충분한 간격(200)을 두면 향후 아이템 추가 시 재넘버링 불필요
- 기존 100번대는 배치 오브젝트(200+)와 너무 가까워서 혼동 소지 있었음
- 2000번대 시작으로 코스메틱 전용 영역 확보

### Steam bundle type vs 개별 아이템
- `type: "bundle"`은 구매 시 자동 언팩되어 구성 아이템이 인벤토리에 들어감
- 단순히 "옆번호로 묶는다"는 의미라면 bundle type이 아닌 개별 아이템으로 관리하는 게 적합
- bundle은 "세트 할인" 같은 실제 묶음 판매가 필요할 때만 사용

## 결정 사항
| 결정 | 이유 |
|------|------|
| 200 간격 넘버링 | 카테고리당 200개 아이템 수용 가능, 향후 확장 용이 |
| 2000번대 시작 | 배치 오브젝트(200+), 보물상자(300+), 재화(1000+)와 충돌 방지 |
| Hat Bundle 삭제 | 개별 아이템 구매가 의도된 디자인 |
| 각 모자 500코인 | exchange로 개별 구매 가능 |

## 생성/수정된 파일
- `Steam/itemdefs.json` — DefId 재넘버링 + FedoraHat 추가 + Hat Bundle 삭제

## 다음 단계
- [ ] DA_CosmeticCatalog에서 SteamItemDefId 매핑 업데이트 (2000, 2001, 2400)
- [ ] FedoraHat 메시/아이콘 에셋 추가
- [ ] 코스메틱 상점 UI에서 새 DefId 테스트

---
*저장 시간: 2026-02-23*
