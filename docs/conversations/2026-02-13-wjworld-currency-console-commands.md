# Currency 디버그 콘솔 명령어 구현

- **날짜**: 2026-02-13
- **프로젝트**: WjWorld
- **태그**: #Currency #ConsoleCommand #UHT #DebugTools #UE5

## 개요
CurrencySubsystem의 디버그/테스트 메서드를 콘솔에서 호출할 수 있도록 Currency_* Exec 명령어 8개를 PlayerControllerBase에 추가. 기존 Cosmetic_* 11개 명령어와 동일한 패턴으로 구현.

## 작업 내용
- CurrencySubsystem에 `SetCurrencyLocally()` public 래퍼 추가 (private `SetBalance` 위임, DevelopmentOnly 메타)
- PlayerControllerBase에 Currency_* UFUNCTION(Exec) 명령어 8개 선언 및 구현
- 상태 변경 명령어 6개는 함수 본문 내부 `#if !UE_BUILD_SHIPPING` 가드
- 조회 전용 명령어 2개 (`Currency_Print`, `Currency_Refresh`)는 가드 없음

## 학습 내용

### UHT UFUNCTION 전처리기 가드 제약
- **UHT(Unreal Header Tool)는 `UFUNCTION`을 전처리기 블록 안에 허용하지 않음**
- `WITH_EDITORONLY_DATA`만 예외적으로 허용
- `#if !UE_BUILD_SHIPPING` 안에 `UFUNCTION(Exec)` 넣으면 에러:
  ```
  Error: 'UFUNCTION' must not be inside preprocessor blocks, except for WITH_EDITORONLY_DATA
  ```
- **해결**: 선언은 가드 없이 노출, 함수 본문 내부에서 `#if !UE_BUILD_SHIPPING` 처리
- Shipping 빌드에서는 함수가 존재하지만 본문이 비어있어 no-op

### Cosmetic_* 콘솔 명령어 패턴
- `UFUNCTION(Exec)` in PlayerControllerBase
- `GetGameInstance()->GetSubsystem<>()` 서브시스템 조회
- 로그 카테고리별 Warning/Log 분기

## 결정 사항
| 결정 | 이유 |
|------|------|
| SetCurrencyLocally() 래퍼 추가 (옵션 2) | GrantCurrencyLocally만으로는 정확한 잔액 설정 불가, 테스트 시 유용 |
| UFUNCTION 선언부 가드 제거, 본문 가드 | UHT 제약으로 선언부에 전처리기 가드 불가 |
| LogWjWorldCurrency 카테고리 사용 | 기존 CurrencySubsystem과 동일한 로그 카테고리 유지 |

## 생성/수정된 파일
- `Source/WjWorld/Currency/WjWorldCurrencySubsystem.h` - SetCurrencyLocally() 선언 추가
- `Source/WjWorld/Currency/WjWorldCurrencySubsystem.cpp` - SetCurrencyLocally() 구현 추가
- `Source/WjWorld/Core/Base/WjWorldPlayerControllerBase.h` - Currency_* 명령어 8개 선언
- `Source/WjWorld/Core/Base/WjWorldPlayerControllerBase.cpp` - Currency_* 명령어 8개 구현 + include 추가

## 유용한 코드/명령어

### 콘솔 명령어 목록
```
Currency_GrantCoin 100    # Coin +100
Currency_GrantGem 50      # Gem +50
Currency_SetCoin 500      # Coin = 500
Currency_SetGem 200       # Gem = 200
Currency_Print            # 잔액 출력
Currency_Refresh          # Steam 잔액 갱신
Currency_BuyGemPack 20    # Gem 팩 구매 테스트
Currency_SimulateReward 1 # 매치 보상 시뮬 (0=패, 1=승)
```

### UHT 안전 패턴 (Exec + Shipping 가드)
```cpp
// .h - 가드 없이 선언
UFUNCTION(Exec)
void Currency_GrantCoin(int32 Amount);

// .cpp - 본문 내부 가드
void AMyPC::Currency_GrantCoin(int32 Amount)
{
#if !UE_BUILD_SHIPPING
    // 실제 로직
#endif
}
```

## 다음 단계
- [ ] 에디터에서 콘솔 명령어 테스트 (Currency_Print → Currency_GrantCoin 100 → Currency_Print)
- [ ] Currency UI 위젯 구현 (잔액 표시, Gem 팩 상점)
- [ ] 코스메틱 상점에 재화 가격 표시 연동

---
*저장 시간: 2026-02-13 12:00*
