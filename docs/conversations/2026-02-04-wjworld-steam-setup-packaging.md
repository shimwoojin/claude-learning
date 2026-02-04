# Steam 테스트 환경 구축 및 패키징 빌드 이슈 해결

- **날짜**: 2026-02-04
- **프로젝트**: WjWorld
- **태그**: #steam #packaging #unreal-engine #multiplayer #debugging

## 개요
Steam 테스트 환경을 구축하고 멀티플레이어 테스트 중 발견된 패키징 빌드 전용 버그(벽돌 스폰 안됨)를 해결. Non-asset 파일의 패키징 포함 및 FFilePath 경로 변환 문제가 원인이었음.

## 작업 내용
- Steam 앱 설정 완료 (AppID: 4399350, DepotID: 4399351)
- VDF 스크립트 생성 및 SteamCMD 기반 빌드 업로드
- Steam Inventory Service 설정 (itemdefs.json)
- AddPromoItem/AddAllPromoItems 테스트 함수 추가
- 패키징 이슈 수정 (ToolWidgets 모듈 제거, 비디오 폴백)
- **벽돌 스폰 버그 해결** (핵심 작업)
- 두 번째 Steam 계정으로 멀티플레이어 테스트 환경 구축

## 학습 내용

### Steam 설정
- **Dev Comp Package**: Steamworks 파트너 그룹 계정에게 무료로 앱 접근 권한 부여
- **itemdefs.json**: 모든 값은 문자열이어야 함 (`false` → `"false"`)
- Steam Inventory의 `AddPromoItem()` API로 테스트 아이템 지급 가능

### 패키징 빌드 차이점
| 빌드 타입 | 파일 시스템 접근 |
|-----------|------------------|
| DebugGameEditor | 개발 PC 파일 시스템 직접 접근 |
| DebugGame | 개발 PC 파일 시스템 직접 접근 |
| Development/Shipping | .pak 파일 사용, 쿠킹된 에셋만 접근 |

### Non-asset 파일 패키징
- `.txt`, `.csv`, `.json` 등 non-asset 파일은 자동으로 패키지에 포함되지 않음
- `DefaultGame.ini`에 명시적 설정 필요:
```ini
[/Script/UnrealEd.ProjectPackagingSettings]
+DirectoriesToAlwaysStageAsNonUFS=(Path="GamePlay/Wall")
```

### FFilePath 경로 문제
- `FFilePath`는 에디터에서 **절대 경로** 저장 (예: `C:\UEProjects\...\Content\...`)
- 패키지 빌드에서는 이 경로가 유효하지 않음
- **해결책**: Content 상대 경로로 변환 후 `FPaths::ProjectContentDir()` 기준으로 조합

## 결정 사항
| 결정 | 이유 |
|------|------|
| Config 설정으로 non-asset 파일 패키징 | DataAsset에 데이터 직접 저장보다 기존 구조 유지가 간단 |
| 경로 변환 로직 추가 | 에디터/패키지 양쪽 호환성 유지 |
| 2차 시도로 원본 경로 폴백 | 에디터에서도 정상 동작 보장 |

## 생성/수정된 파일
- `Config/DefaultGame.ini` - Non-asset 디렉토리 패키징 설정
- `Config/DefaultEngine.ini` - Steam 설정
- `Source/WjWorld/GamePlay/Wall/WjWorldWallDescriptionDataAsset.cpp` - 경로 변환 로직
- `Source/WjWorld/Cosmetic/WjWorldCosmeticSubsystem.h/cpp` - AddPromoItem 함수
- `Source/WjWorld/Core/Base/WjWorldPlayerControllerBase.h/cpp` - 콘솔 명령어
- `Source/WjWorld/UI/Intro/IntroWindow.cpp` - 비디오 폴백
- `Steam/scripts/app_build_4399350.vdf` - 빌드 스크립트
- `Steam/itemdefs.json` - 인벤토리 아이템 정의

## 유용한 코드/명령어

### 경로 변환 패턴 (FFilePath → 패키지 호환)
```cpp
FString FilePath = WallLayoutFilePath.FilePath;

// Content 상대 경로 추출
int32 ContentIndex = FilePath.Find(TEXT("/Content/"), ESearchCase::IgnoreCase);
if (ContentIndex == INDEX_NONE)
    ContentIndex = FilePath.Find(TEXT("\\Content\\"), ESearchCase::IgnoreCase);

if (ContentIndex != INDEX_NONE)
{
    FString ContentRelativePath = FilePath.RightChop(ContentIndex + 9);
    ContentRelativePath = ContentRelativePath.Replace(TEXT("\\"), TEXT("/"));

    // 패키지 호환 경로
    FString ResolvedPath = FPaths::ProjectContentDir() / ContentRelativePath;
}
```

### Steam 업로드 명령어
```batch
steamcmd.exe +login %USERNAME% +run_app_build "%SCRIPT_PATH%\app_build_4399350.vdf" +quit
```

## 다음 단계
- [ ] Approaching Wall 종료 후 WaitingRoom 복귀 실패 문제 해결
- [ ] LobbyLayout SaveGame 주체 문제 해결
- [ ] WaitingRoom 코스메틱 리플리케이션 문제 해결

---
*저장 시간: 2026-02-04 21:30*
