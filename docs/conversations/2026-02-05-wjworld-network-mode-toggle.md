# LAN/Steam 네트워크 모드 토글 기능 구현

- **날짜**: 2026-02-05
- **프로젝트**: WjWorld
- **태그**: #Network #Steam #Session #UI #Polishing

## 개요

Steam 출시 전 코드 폴리싱 작업과 LAN/Steam 네트워크 모드를 인게임에서 토글할 수 있는 기능을 구현했다.

## 작업 내용

### Steam 출시 Polishing
- Critical null 체크 추가 (6개 파일)
- 빈 Tick() 비활성화 (2개 파일)
- 로그 카테고리 일관성 (LogWjWorld → LogWjWorldStats)
- check() → ensureMsgf() 변경 (릴리스 빌드 크래시 방지)
- AttributeSet OnRep 매크로 추가 (GAMEPLAYATTRIBUTE_REPNOTIFY)

### LAN/Steam 네트워크 모드 토글
- ENetworkMode enum 추가 (SessionTypes.h)
- FRoomSettings에 NetworkMode 필드 추가
- SessionManager 네트워크 모드 분기 처리
- GameInstance.FindRooms() 파라미터 추가
- CreateRoomWindow/RoomListWindow에 NetworkModeComboBox 추가

## 학습 내용

### Steam vs LAN 세션 설정 차이점

| 설정 | LAN | Steam |
|------|-----|-------|
| bIsLANMatch | true | false |
| bUsesPresence | false | true |
| bUseLobbiesIfAvailable | false | true |
| bIsLanQuery (검색) | true | false |

### UE 5.7 API 변경사항
- `SEARCH_PRESENCE` 상수가 UE 5.7에서 변경됨
- 직접 사용 불가 → 제거하거나 문자열로 대체 필요
- Steam 검색에서는 `bUsesPresence=true` 설정이 더 중요

### BindWidgetOptional 패턴
```cpp
// BP에 위젯이 없어도 null 허용
UPROPERTY(meta = (BindWidgetOptional))
TObjectPtr<UComboBoxString> NetworkModeComboBox;

// 사용 시 null 체크 필수
if (NetworkModeComboBox)
{
    NetworkModeComboBox->AddOption(TEXT("LAN"));
}
```

### WITH_STEAM 조건부 컴파일
```cpp
void InitializeNetworkModeOptions()
{
    NetworkModeComboBox->AddOption(TEXT("LAN"));

    // Steam 옵션은 Steam 빌드에서만 표시
#if WITH_STEAM
    NetworkModeComboBox->AddOption(TEXT("Steam"));
#endif
}
```

## 결정 사항

| 결정 | 이유 |
|------|------|
| NetworkModeComboBox를 BindWidgetOptional로 | 기존 BP 호환성 유지, 점진적 UI 업데이트 가능 |
| 기본값 LAN | 로컬 테스트 환경에서 바로 사용 가능 |
| 모드 변경 시 자동 재검색 | UX 개선, 추가 클릭 불필요 |
| SEARCH_PRESENCE 제거 | UE 5.7 호환성, bUsesPresence로 충분 |

## 생성/수정된 파일

### 핵심 변경
- `Source/WjWorld/Network/SessionTypes.h` - ENetworkMode enum, FRoomSettings.NetworkMode 추가
- `Source/WjWorld/Core/Session/SessionManager.h/.cpp` - NetworkMode 분기 처리
- `Source/WjWorld/Core/WjWorldGameInstance.h/.cpp` - FindRooms() 파라미터 추가

### UI 변경
- `Source/WjWorld/UI/Session/CreateRoomWindow.h/.cpp` - NetworkModeComboBox 추가
- `Source/WjWorld/UI/Session/RoomListWindow.h/.cpp` - NetworkModeComboBox 추가

### Polishing 변경
- `Source/WjWorld/Core/Play/WjWorldGameStatePlay.cpp` - null 체크
- `Source/WjWorld/AbilitySystem/Abilities/GA_*.cpp` - null 체크
- `Source/WjWorld/Core/Base/WjWorldCharacterBase.cpp` - bCanEverTick = false

## 유용한 코드/명령어

### 네트워크 모드 분기 패턴
```cpp
// CreateSession에서
if (Settings.NetworkMode == ENetworkMode::Steam)
{
    SessionSettings.bIsLANMatch = false;
    SessionSettings.bUsesPresence = true;
    SessionSettings.bUseLobbiesIfAvailable = true;
}
else // LAN
{
    SessionSettings.bIsLANMatch = true;
    SessionSettings.bUsesPresence = false;
    SessionSettings.bUseLobbiesIfAvailable = false;
}

// FindSessions에서
if (NetworkMode == ENetworkMode::Steam)
{
    SessionSearch->bIsLanQuery = false;
    SessionSearch->QuerySettings.Set(SEARCH_LOBBIES, true, EOnlineComparisonOp::Equals);
}
else
{
    SessionSearch->bIsLanQuery = true;
    SessionSearch->QuerySettings.Set(SEARCH_LOBBIES, false, EOnlineComparisonOp::Equals);
}
```

### ComboBox 선택 변경 콜백
```cpp
UFUNCTION()
void OnNetworkModeSelectionChanged(FString SelectedItem, ESelectInfo::Type SelectionType)
{
    // 프로그램적 변경은 무시
    if (SelectionType == ESelectInfo::Direct)
    {
        return;
    }

    ENetworkMode NewMode = (SelectedItem == TEXT("Steam"))
        ? ENetworkMode::Steam
        : ENetworkMode::LAN;

    if (CurrentNetworkMode != NewMode)
    {
        CurrentNetworkMode = NewMode;
        StartSearching(); // 자동 재검색
    }
}
```

## 다음 단계

- [ ] BP에 NetworkModeComboBox 위젯 추가 (CreateRoomWindow, RoomListWindow)
- [ ] Steam 빌드에서 실제 Steam 세션 테스트
- [ ] Steam 스토어 페이지 준비

---
*저장 시간: 2026-02-05 11:18*
