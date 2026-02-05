# Steam P2P 네트워킹 (SteamNetDriver) 문제 해결

- **날짜**: 2026-02-05
- **프로젝트**: WjWorld (UE 5.7)
- **태그**: #steam #networking #netdriver #ue5 #multiplayer #config

## 개요
Steam 멀티플레이어에서 SteamNetDriver가 로딩되지 않아 IpNetDriver로 폴백되는 문제를 단계적으로 디버깅하여 해결. OSS 초기화 실패, 세션 설정 불일치, 검색 타이밍, NetDriver config 형식 문제까지 총 5가지 이슈를 수정.

## 작업 내용
- SessionManager::Initialize() Steam→NULL OSS fallback 추가
- steam_appid.txt 패키징 빌드 누락 해결
- bUsesPresence/bUseLobbiesIfAvailable 매칭 수정
- 세션 검색 타이밍 이슈 해결 (wait-and-queue 패턴)
- SteamNetDriver 로딩 근본 원인 3가지 수정
- PackageAndUploadSteam.bat 빌드 자동화 생성

## 학습 내용

### SocketSubsystemSteamIP 모듈 동작 조건
- 에디터에서 자동 비활성화 (`IsRunningDedicatedServer() || IsRunningGame()` 체크)
- `[OnlineSubsystemSteam]`에 `bUseSteamNetworking=true` 필요 (Steam 소켓 서브시스템 등록 트리거)
- `SteamNetDriver::IsAvailable()`은 Steam 소켓 서브시스템 등록 여부로 판단
- `SteamShared` 모듈이 Steam DLL 로드 담당, OnlineSubsystemSteam이 이미 활성화되어 있으면 자동 로드됨

### UE Config NetDriverDefinitions
- BaseEngine.ini에서 `[/Script/Engine.Engine]` 섹션에 정의됨
- `StaticLoadClass()`로 클래스 로드 → `/Script/ModuleName.ClassName` 정규 경로 형식 필수
- 짧은 형식 `ModuleName.ClassName`은 `LOAD_Quiet` 플래그로 실패해도 로그 없이 폴백
- `!NetDriverDefinitions=ClearArray`로 엔진 기본값 제거 후 재정의 가능
- ClearArray 시 BeaconNetDriver, DemoNetDriver도 재정의해야 함

### Config 섹션 상속 규칙
- `NetDriverDefinitions`는 `UEngine`에 선언됨
- `UGameEngine`은 `UEngine` 상속 → 이론적으로 `[/Script/Engine.GameEngine]`에서도 동작
- 실무적으로는 BaseEngine.ini와 동일한 `[/Script/Engine.Engine]` 섹션 사용이 안전

### CancelFindSessions 주의
- `CancelFindSessions()` 호출 시 `OnCancelFindSessionsComplete` 콜백 발생
- `OnFindSessionsComplete`는 호출되지 않음 → 대기열 패턴에서 사용 금지
- 대안: `bIsSearchInProgress` 플래그 + `PendingSearchRequest` 큐로 wait-and-queue 패턴

### Steam 세션 설정 규칙
- `bUsesPresence`와 `bUseLobbiesIfAvailable`은 반드시 같은 값이어야 함 (Steam OSS 제약)
- LAN: `bIsLANMatch=true`, `bUsesPresence=false`
- Steam: `bIsLANMatch=false`, `bUsesPresence=true`, `bUseLobbiesIfAvailable=true`

## 결정 사항
| 결정 | 이유 |
|------|------|
| Steam→NULL OSS fallback 패턴 | Steam 미사용 환경(에디터 등)에서도 세션 관리 가능하도록 |
| CancelFindSessions 제거, wait-and-queue 패턴 | CancelFindSessions가 다른 콜백을 트리거하여 행/크래시 유발 |
| `/Script/` 접두사 정규 경로 사용 | StaticLoadClass가 기대하는 형식, LOAD_Quiet로 실패 시 로그 없음 |
| `[/Script/Engine.Engine]` 섹션 사용 | BaseEngine.ini와 동일 섹션으로 config 오버라이드 안정성 보장 |
| SocketSubsystemSteamIP 플러그인 사용 | UE 5.7에서 SteamNetDriver가 이 플러그인에 분리되어 있음 |

## 생성/수정된 파일
- `Config/DefaultEngine.ini` - NetDriverDefinitions 수정, bUseSteamNetworking 추가
- `Source/WjWorld/Core/Session/SessionManager.h` - bIsSearchInProgress, PendingSearchRequest 추가
- `Source/WjWorld/Core/Session/SessionManager.cpp` - Steam→NULL fallback, 검색 큐, bUsesPresence 수정
- `WjWorld.uproject` - SocketSubsystemSteamIP 플러그인 추가
- `Batch/PackageAndUploadSteam.bat` - 빌드 자동화 (패키징→복사→업로드)

## 유용한 코드/명령어

### DefaultEngine.ini SteamNetDriver 설정 (UE 5.7)
```ini
[/Script/Engine.Engine]
!NetDriverDefinitions=ClearArray
+NetDriverDefinitions=(DefName="GameNetDriver",DriverClassName="/Script/SocketSubsystemSteamIP.SteamNetDriver",DriverClassNameFallback="/Script/OnlineSubsystemUtils.IpNetDriver")
+NetDriverDefinitions=(DefName="BeaconNetDriver",DriverClassName="/Script/OnlineSubsystemUtils.IpNetDriver",DriverClassNameFallback="/Script/OnlineSubsystemUtils.IpNetDriver")
+NetDriverDefinitions=(DefName="DemoNetDriver",DriverClassName="/Script/Engine.DemoNetDriver",DriverClassNameFallback="/Script/Engine.DemoNetDriver")

[OnlineSubsystemSteam]
bEnabled=true
SteamDevAppId=XXXXXXX
bUseSteamNetworking=true

[/Script/SocketSubsystemSteamIP.SteamNetDriver]
NetConnectionClassName="/Script/SocketSubsystemSteamIP.SteamNetConnection"
```

### SessionManager 검색 큐 패턴
```cpp
// FindSessions()
if (bIsSearchInProgress)
{
    PendingSearchRequest = TPair<ENetworkMode, int32>(NetworkMode, MaxSearchResults);
    return true;
}
bIsSearchInProgress = true;

// OnFindSessionsComplete()
bIsSearchInProgress = false;
if (PendingSearchRequest.IsSet())
{
    ENetworkMode PendingMode = PendingSearchRequest.GetValue().Key;
    int32 PendingMax = PendingSearchRequest.GetValue().Value;
    PendingSearchRequest.Reset();
    FindSessions(PendingMode, PendingMax);
    return;
}
```

## 다음 단계
- [ ] 클라이언트 마우스 Control Rotation 미적용 (Camera Rig 노드 에러) 조사
- [ ] 비디오 플레이어 재생 안 됨 (Steam 다운로드 환경) 조사
- [ ] Lobby 맵 풍성하게 꾸미기
- [ ] Approaching Wall 나이아가라 에셋 폴리싱

---
*저장 시간: 2026-02-05*
