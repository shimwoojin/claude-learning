# 대화 기록

Claude Code와의 대화 내용을 정리한 기록입니다.

## 최근 대화

| 날짜 | 프로젝트 | 주제 | 태그 |
|------|----------|------|------|
| 2026-02-05 | WjWorld | [Steam P2P 네트워킹 (SteamNetDriver) 문제 해결](./2026-02-05-wjworld-steam-netdriver-fix.md) | #steam #networking #netdriver #multiplayer #config |
| 2026-02-05 | WjWorld | [LAN/Steam 네트워크 모드 토글 기능 구현](./2026-02-05-wjworld-network-mode-toggle.md) | #Network #Steam #Session #UI #Polishing |
| 2026-02-05 | WjWorld | [Steam 2PC 테스트 버그 수정](./2026-02-05-wjworld-steam-2pc-bugfixes.md) | #Multiplayer #Replication #Debugging #GAS #Animation |
| 2026-02-04 | WjWorld | [Steam 테스트 환경 구축 및 패키징 빌드 이슈 해결](./2026-02-04-wjworld-steam-setup-packaging.md) | #steam #packaging #unreal-engine #multiplayer #debugging |
| 2026-02-04 | WjWorld | [Approaching Wall 어빌리티 개선 및 GameplayCue](./2026-02-04-wjworld-ability-improvements.md) | #GAS #GameplayCue #Replication #Animation |
| 2026-02-04 | WjWorld | [코스메틱 멀티플레이어 동기화 수정](./2026-02-04-wjworld-cosmetic-multiplayer-sync.md) | #Cosmetic #Multiplayer #Replication #Network |
| 2026-02-04 | WjWorld | [코스메틱 상점 UI 구현 및 Socket 부착 시스템](./2026-02-04-wjworld-cosmetic-shop-ui.md) | #Cosmetic #UI #Socket #UnrealEngine |
| 2026-02-03 | WjWorld | [SessionEnd Hook 디버깅 및 스킬 파일 생성](./2026-02-03-wjworld-hook-debugging.md) | #hooks #debugging #skills |
| 2026-02-03 | WjWorld | [학습 노트 자동화 시스템 구축](./2026-02-03-wjworld-learning-automation.md) | #automation #hooks #github-actions |

## 태그별 분류

### #GAS
- [Approaching Wall 어빌리티 개선 및 GameplayCue](./2026-02-04-wjworld-ability-improvements.md) - UAbilityTask_PlayMontageAndWait, 어빌리티 로직 분리

### #GameplayCue
- [Approaching Wall 어빌리티 개선 및 GameplayCue](./2026-02-04-wjworld-ability-improvements.md) - 자동 매칭 규칙, Static vs Actor, ExecuteGameplayCue

### #Animation
- [Approaching Wall 어빌리티 개선 및 GameplayCue](./2026-02-04-wjworld-ability-improvements.md) - Montage 비동기 재생, 콜백 처리

### #Cosmetic
- [코스메틱 멀티플레이어 동기화 수정](./2026-02-04-wjworld-cosmetic-multiplayer-sync.md) - 멀티플레이어 동기화, Steam Inventory
- [코스메틱 상점 UI 구현 및 Socket 부착 시스템](./2026-02-04-wjworld-cosmetic-shop-ui.md) - 상점 UI, Socket 부착

### #Multiplayer
- [코스메틱 멀티플레이어 동기화 수정](./2026-02-04-wjworld-cosmetic-multiplayer-sync.md) - OnRep_PlayerState, 3자 캐릭터 동기화

### #Replication
- [Approaching Wall 어빌리티 개선 및 GameplayCue](./2026-02-04-wjworld-ability-improvements.md) - 3자 캐릭터 메시 리플리케이션, OnRep 패턴
- [코스메틱 멀티플레이어 동기화 수정](./2026-02-04-wjworld-cosmetic-multiplayer-sync.md) - PlayerState 리플리케이션, bPendingCosmeticApply 패턴

### #Network
- [코스메틱 멀티플레이어 동기화 수정](./2026-02-04-wjworld-cosmetic-multiplayer-sync.md) - Steam Inventory 폴링 콜백

### #UI
- [코스메틱 상점 UI 구현 및 Socket 부착 시스템](./2026-02-04-wjworld-cosmetic-shop-ui.md) - UMG 위젯 구현

### #Socket
- [코스메틱 상점 UI 구현 및 Socket 부착 시스템](./2026-02-04-wjworld-cosmetic-shop-ui.md) - Socket 기반 메시 부착

### #UnrealEngine
- [코스메틱 멀티플레이어 동기화 수정](./2026-02-04-wjworld-cosmetic-multiplayer-sync.md) - UE5 멀티플레이어 코스메틱
- [코스메틱 상점 UI 구현 및 Socket 부착 시스템](./2026-02-04-wjworld-cosmetic-shop-ui.md) - UE5 코스메틱 시스템

### #steam
- [Steam P2P 네트워킹 (SteamNetDriver) 문제 해결](./2026-02-05-wjworld-steam-netdriver-fix.md) - SteamNetDriver config, SocketSubsystemSteamIP, bUseSteamNetworking
- [Steam 테스트 환경 구축 및 패키징 빌드 이슈 해결](./2026-02-04-wjworld-steam-setup-packaging.md) - AppID 설정, Inventory Service, Dev Comp Package

### #netdriver
- [Steam P2P 네트워킹 (SteamNetDriver) 문제 해결](./2026-02-05-wjworld-steam-netdriver-fix.md) - NetDriverDefinitions, StaticLoadClass 경로 형식, CancelFindSessions 주의

### #packaging
- [Steam 테스트 환경 구축 및 패키징 빌드 이슈 해결](./2026-02-04-wjworld-steam-setup-packaging.md) - Non-asset 파일 패키징, FFilePath 경로 변환

### #debugging
- [Steam 테스트 환경 구축 및 패키징 빌드 이슈 해결](./2026-02-04-wjworld-steam-setup-packaging.md) - Debug vs Development 빌드 차이
- [SessionEnd Hook 디버깅 및 스킬 파일 생성](./2026-02-03-wjworld-hook-debugging.md) - Windows bash 경로 문제 해결

### #skills
- [SessionEnd Hook 디버깅 및 스킬 파일 생성](./2026-02-03-wjworld-hook-debugging.md) - save-conversation, today-todo 스킬 생성

### #automation
- [학습 노트 자동화 시스템 구축](./2026-02-03-wjworld-learning-automation.md) - 글로벌 스킬, Hook, GitHub Actions 설정

### #claude-code
- [학습 노트 자동화 시스템 구축](./2026-02-03-wjworld-learning-automation.md) - Custom Slash Commands, Skills, Hooks

### #github-actions
- [학습 노트 자동화 시스템 구축](./2026-02-03-wjworld-learning-automation.md) - Cross-repo 워크플로우

### #hooks
- [SessionEnd Hook 디버깅 및 스킬 파일 생성](./2026-02-03-wjworld-hook-debugging.md) - Windows 경로 문제 디버깅
- [학습 노트 자동화 시스템 구축](./2026-02-03-wjworld-learning-automation.md) - SessionEnd Hook으로 자동 저장

## 자동 저장된 세션

`sessions/` 폴더에는 SessionEnd Hook으로 자동 저장된 raw transcript 파일들이 있습니다.
