# 설정 UI 구현 (디스플레이 품질 + 마스터 볼륨)

- **날짜**: 2026-02-25
- **프로젝트**: WjWorld
- **태그**: #UI #Settings #Audio #Graphics #GConfig #UGameUserSettings #DesignPattern

## 개요
로비/대기실에서 사용할 전용 설정 팝업 UI를 구현. 그래픽 품질 4단계(Low~Epic) ComboBox와 마스터 볼륨 슬라이더(0.0~1.0)를 제공하며, 즉시 적용 패턴으로 Apply 버튼 없이 변경 시 바로 반영.

## 작업 내용
- `SettingsWidget` 신규 생성 (`UI/Setting/SettingsWidget.h/.cpp`)
  - `UWjWorldUserWidgetBase` 상속, ShowPopup/ClosePopup 패턴
  - GraphicsQualityComboBox (Low/Medium/High/Epic)
  - MasterVolumeSlider (0.0~1.0) + VolumePercentText
  - CloseButton
- 그래픽 품질: `UGameUserSettings::SetOverallScalabilityLevel()` + `ApplySettings()` + `SaveSettings()`
- 마스터 볼륨: `GConfig` 영속 저장 + `FAudioDeviceHandle::SetTransientPrimaryVolume()` 즉시 적용
- `static ApplySavedMasterVolume()` — GameInstance::Init()에서 게임 시작 시 저장값 복원
- LobbyHUDWidget — 기존 품질 사이클링 코드 제거 → SettingsWidget ShowPopup 연동
- WaitingRoomHUDWidget — SettingsButton (BindWidgetOptional) + 설정 팝업 연동
- BP 작업 — WBP_SettingsWidget 위젯 블루프린트 생성 + HUD에 클래스 설정

## 학습 내용

### UE5 오디오 볼륨 제어
- `GEngine->GetMainAudioDevice()` → `FAudioDeviceHandle` 반환
- `SetTransientPrimaryVolume(float)` — 전체 오디오 볼륨 제어, Sound Class/Mix 불필요
- `#include "AudioDevice.h"` 필요

### GConfig 영속 저장 패턴
- `GConfig->SetFloat(Section, Key, Value, GGameUserSettingsIni)` — 값 설정
- `GConfig->GetFloat(Section, Key, Value, GGameUserSettingsIni)` — 값 로드
- `GConfig->Flush(false, GGameUserSettingsIni)` — 즉시 디스크에 저장
- `GGameUserSettingsIni` — `GameUserSettings.ini` 파일 경로 (cross-session 안정)
- 커스텀 섹션 `[WjWorldSettings]` 사용

### 즉시 적용 UI 패턴
- Apply 버튼 없이 `OnValueChanged`/`OnSelectionChanged` 콜백에서 바로 적용
- UX 단순화에 효과적 (설정 항목이 적을 때)
- `ESelectInfo::Direct` 체크로 프로그래밍적 변경 시 콜백 무시

### ShowPopup에서 InputMode 선택
- 설정 팝업: `FInputModeGameAndUI` 사용 (Lobby/WaitingRoom이 이미 GameAndUI 모드)
- CreateRoomWindow: `FInputModeUIOnly` 사용 (모달 팝업)
- 컨텍스트에 따라 적절한 InputMode 선택 중요

## 결정 사항
| 결정 | 이유 |
|------|------|
| Subsystem 없이 위젯에서 직접 처리 | 마스터 볼륨 1개 + 그래픽 품질 → 단순한 경우 Subsystem 오버엔지니어링 |
| 즉시 적용 패턴 (Apply 버튼 없음) | 설정 항목이 2개뿐이라 UX 단순화 우선 |
| GConfig 저장 (Sound Class/Mix 미사용) | 마스터 볼륨 하나에 Sound Mix 파이프라인 과잉 |
| static 함수 ApplySavedMasterVolume | GameInstance::Init()과 위젯 모두에서 재사용 |

## 생성/수정된 파일
- `Source/WjWorld/UI/Setting/SettingsWidget.h` (신규) - 설정 팝업 위젯 클래스
- `Source/WjWorld/UI/Setting/SettingsWidget.cpp` (신규) - 구현
- `Source/WjWorld/UI/Lobby/LobbyHUDWidget.h` - SettingsWidgetClass/Instance 추가
- `Source/WjWorld/UI/Lobby/LobbyHUDWidget.cpp` - OnSettingsClicked → 설정 팝업 연동
- `Source/WjWorld/UI/WaitingRoom/WaitingRoomHUDWidget.h` - SettingsButton, WidgetClass/Instance 추가
- `Source/WjWorld/UI/WaitingRoom/WaitingRoomHUDWidget.cpp` - SettingsButton 바인딩 + OnSettingsClicked
- `Source/WjWorld/Core/WjWorldGameInstance.cpp` - Init()에서 ApplySavedMasterVolume 호출
- `Content/UI/Blueprint/Setting/WBP_SettingsWidget.uasset` (신규) - BP 위젯

## 유용한 코드/명령어
```cpp
// 마스터 볼륨 저장 + 즉시 적용
void SaveAndApplyMasterVolume(float Volume)
{
    GConfig->SetFloat(TEXT("WjWorldSettings"), TEXT("MasterVolume"), Volume, GGameUserSettingsIni);
    GConfig->Flush(false, GGameUserSettingsIni);

    if (FAudioDeviceHandle AudioDevice = GEngine->GetMainAudioDevice())
    {
        AudioDevice->SetTransientPrimaryVolume(Volume);
    }
}

// 저장된 볼륨 복원 (GameInstance::Init 등에서 호출)
static void ApplySavedMasterVolume()
{
    float Volume = 1.0f;
    GConfig->GetFloat(TEXT("WjWorldSettings"), TEXT("MasterVolume"), Volume, GGameUserSettingsIni);
    if (FAudioDeviceHandle AudioDevice = GEngine->GetMainAudioDevice())
    {
        AudioDevice->SetTransientPrimaryVolume(Volume);
    }
}
```

## 다음 단계
- [ ] 설정 항목 추가 시 Subsystem 전환 검토 (SFX/BGM 분리 등)
- [ ] Play HUD에서도 설정 접근 가능하게 할지 검토
- [ ] 해상도/창 모드 설정 추가 검토

---
*저장 시간: 2026-02-25 06:00*
