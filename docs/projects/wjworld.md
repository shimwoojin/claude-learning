# WjWorld

Unreal Engine 5.7 기반 멀티플레이어 미니게임 프로젝트

## 프로젝트 개요

- **엔진**: Unreal Engine 5.7
- **언어**: C++
- **IDE**: Visual Studio 2022
- **목적**: 허브 공간, 미니게임, 멀티플레이어 기능을 갖춘 개인 학습 프로젝트
- **배포**: Steam (무료 출시, 코스메틱 유료 판매)

## 핵심 학습 내용

### 아키텍처/패턴

#### GameRule 시스템
미니게임을 정의하기 위한 규칙 시스템. `UWjWorldGameRuleBase`를 상속받아 각 미니게임의 규칙을 구현.
- **라이프사이클**: `Initialize()` → `OnGameReady()` → `OnGameStart()` → `OnGameEndPredict()` → `OnGameEnd()`
- **동적 조회**: `MinigameCatalog`에서 `GameModeId`로 `GameRuleClass` 조회

#### GameData 컴포넌트 시스템
게임/플레이어별 데이터를 관리하는 컴포넌트 시스템. GameplayTag 기반 타입 세이프 데이터 저장.
- `GameStatePlay`에 게임 전체 데이터
- `PlayerStatePlay`에 플레이어별 데이터
- 리플리케이션 지원

#### Gameplay Ability System (GAS)
- **AbilityBase 공통 기능**: UI 메타데이터, 충전 시스템 인터페이스
- **Preview + Confirm/Cancel 패턴**: 배치/이동 어빌리티에서 프리뷰 후 확정/취소
- **AttributeSet**: HP, 충전량 등 캐릭터 속성 관리

#### 코스메틱 시스템
- **ItemId 기반 플랫폼 독립 식별**: Steam ItemDefId와 분리
- **리플리케이션 흐름**: CosmeticSubsystem → PlayerStateBase → CosmeticComponent
- **비동기 에셋 로드**: FStreamableManager 활용

#### 로비 배치 시스템
- **PlacementComponent**: PlayerController에 부착, 배치 핵심 로직
- **멀티플레이어 동기화**: GameStateLobby에서 배치 오브젝트 리플리케이션
- **저장/로드**: USaveGame 기반 레이아웃 저장

### 기술 스택

| 영역 | 기술 |
|------|------|
| 엔진 | Unreal Engine 5.7 |
| 네트워크 | 언리얼 리플리케이션 시스템 |
| 어빌리티 | Gameplay Ability System (GAS) |
| 저장 | USaveGame, GConfig |
| 플랫폼 | Steam (Inventory, MicroTransaction, User Stats) |
| 빌드 | WITH_STEAM 조건부 컴파일 |

## 주요 클래스 계층

```
GameMode: AWjWorldGameModeBase → Intro, Login, Lobby, WaitingRoom, Play
Character: AWjWorldCharacterBase → Lobby, WaitingRoom, Play
PlayerState: AWjWorldPlayerStateBase → Play (+ IAbilitySystemInterface)
GameRule: UWjWorldGameRuleBase → ApproachingWall
Subsystem: UGameInstanceSubsystem → Cosmetic, Purchase, Stats
```

## 최근 개발 로그

### 2026-02-03
- CLAUDE.md 문서 업데이트 - 배치 시스템, 카탈로그, 맵 전환 흐름 추가
- 로비 배치 시스템, GameRule 카탈로그 조회, Ready 버튼 피드백 수정
- 학습 노트 자동화 시스템 구축
  - `/devlog` 슬래시 명령어 (일일 개발 로그 작성)
  - `/sync-learning` 슬래시 명령어 (학습 레포 동기화)
  - GitHub Actions 워크플로우 (자동 동기화)

### 학습 메모
- Claude Code Custom Slash Commands: `.claude/commands/` 폴더에 마크다운 파일로 정의
- GitHub Actions cross-repo 작업 시 Personal Access Token (Fine-grained) 필요

## 구현 완료 기능

- 인트로/로그인/로비/대기실 게임모드
- 세션 관리 (방 생성/참가)
- GameRule 시스템 (미니게임 규칙 정의)
- Approaching Wall 미니게임 기본 구조
- Ability System Component 통합
- 코스메틱 시스템 (컴포넌트, 서브시스템, 리플리케이션)
- 스탯 시스템 (Steam User Stats 래핑)
- 로비 배치 시스템

## 유용한 패턴/코드

### 비동기 에셋 로드 (FStreamableManager)
```cpp
FStreamableManager& StreamableManager = UAssetManager::GetStreamableManager();
StreamableManager.RequestAsyncLoad(
    AssetPath,
    FStreamableDelegate::CreateUObject(this, &UMyClass::OnAssetLoaded)
);
```

### GameplayTag 기반 데이터 조회
```cpp
// 데이터 컴포넌트에서 태그로 값 조회
int32 Value = GameDataComponent->GetValue<int32>(FGameplayTag::RequestGameplayTag("Data.Score"));
```

---
*마지막 동기화: 2026-02-03*
*소스: [WjWorld](https://github.com/shimwoojin/WjWorld)*
