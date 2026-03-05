# Destructible 벽돌 단계별 파괴 연출 + 벽돌 머티리얼 시스템

- **날짜**: 2026-03-05
- **프로젝트**: WjWorld
- **태그**: #ApproachingWall #Destructible #Niagara #Material #DeveloperSettings #ModelingMode #MeshSwap

## 개요
Destructible 벽돌(기본 HP 3)이 공격받을 때 메시가 점점 깨진 형태로 교체되고 파편 파티클이 튀는 시각적 피드백을 추가. 벽돌 타입별 머티리얼 시스템도 DeveloperSettings로 분리.

## 작업 내용
- DeveloperSettings에 `DestructibleBrickDamageStageMeshes` (단계별 손상 메시 배열) + `BrickDamageHitEffect` (타격 파편 Niagara) 추가
- BrickActor에 `MulticastSpawnDamageHitEffect()` NetMulticast RPC 추가
- BrickComponent `ApplyDamage()`에 HP > 0 시 히트 이펙트 호출 추가
- BrickComponent `UpdateDamageVisuals()`에 메시 교체 로직 삽입 (DamageTaken-1 인덱스 기반)
- 벽돌 타입별 머티리얼 DeveloperSettings 분리 (Standard/Explosive/Moving/Destructible)
- `GetBrickMaterial()` static 함수 추가 + BeginPlay에서 타입별 머티리얼 적용
- 미사용 에셋 정리 + Modeling Mode 플러그인 활성화

## 학습 내용

### UE Modeling Mode
- 에디터 내장 메시 편집 도구 — 상단 Select Mode 드롭다운 → Modeling
- 또는 상단 메뉴 Tools > Modeling Mode
- 플러그인 비활성 시: Edit > Plugins > "Modeling Tools Editor Mode" 체크 + 에디터 재시작
- **MeshBoolean**: 구/박스로 모서리/면 깎아내기
- **DisplaceMesh**: 노이즈로 표면 울퉁불퉁하게
- **PolyEdit**: 버텍스/폴리곤 직접 편집
- 1인 개발 시 간단한 변형 메시는 Blender/Maya 없이 에디터 내에서 충분히 제작 가능
- Fab에서 에셋 구하는 것보다 규격 맞는 변형 메시 제작이 더 효율적

### 메시 교체 + MID 재생성 패턴
- `SetStaticMesh()` 후 기존 MaterialInstanceDynamic이 무효화됨
- 반드시 `CreateAndSetMaterialInstanceDynamic(0)` 재호출하여 MID 재생성 필요
- 이후 DynamicMaterial 파라미터(BaseColor, CrackIntensity) 재적용

### 하위 호환 설계
- 배열 비어있으면 메시 교체 스킵, 이펙트 미설정이면 스폰 스킵
- 기존 동작에 영향 없이 점진적 기능 추가 가능

## 결정 사항
| 결정 | 이유 |
|------|------|
| DamageStageMeshes를 TArray로 | HP 값에 따라 유동적인 단계 수 지원 |
| MulticastSpawnDamageHitEffect를 Unreliable로 | 기존 DestroyEffect 패턴과 일관성, 시각 이펙트는 손실 허용 |
| MID 재생성 방식 | SetStaticMesh 후 기존 MID 무효 → 재생성 필수 |
| Modeling Mode 사용 | 1인 개발자 — Blender/Fab보다 에디터 내 직접 제작이 효율적 |

## 생성/수정된 파일
- `Source/WjWorld/Setting/WjWorldDeveloperSettings.h` - DamageStageMeshes, BrickDamageHitEffect, 타입별 머티리얼 4종 추가
- `Source/WjWorld/GamePlay/Wall/WjWorldBrickActor.h` - MulticastSpawnDamageHitEffect 선언
- `Source/WjWorld/GamePlay/Wall/WjWorldBrickActor.cpp` - MulticastSpawnDamageHitEffect 구현
- `Source/WjWorld/GamePlay/Wall/WjWorldBrickComponent.h` - GetBrickMaterial() static 함수 추가
- `Source/WjWorld/GamePlay/Wall/WjWorldBrickComponent.cpp` - ApplyDamage 히트이펙트 + UpdateDamageVisuals 메시교체

## 유용한 코드/명령어
```cpp
// 메시 교체 + MID 재생성 패턴
BrickMeshComponent->SetStaticMesh(StageMesh);
BrickMeshComponent->CreateAndSetMaterialInstanceDynamic(0);
// 이후 DynamicMaterial 파라미터 재적용

// DamageStageMeshes 인덱싱: DamageTaken(1,2,...) → StageIndex(0,1,...)
const int32 DamageTaken = MaxHP - CurrentHP;
const int32 StageIndex = DamageTaken - 1;
```

## 다음 단계
- [ ] Modeling Mode로 Cube_Damaged 1~3 메시 제작 (모서리 깎기 → 면 파손)
- [ ] BrickDamageHitEffect Niagara 시스템 제작 (작은 큐브 파편 + Gravity)
- [ ] 에디터에서 DeveloperSettings에 메시/이펙트 등록 후 인게임 테스트

---
*저장 시간: 2026-03-05*
