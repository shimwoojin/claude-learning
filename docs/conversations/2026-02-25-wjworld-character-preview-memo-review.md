# 캐릭터 프리뷰 개선 + 메모 전체 검토

- **날짜**: 2026-02-25
- **프로젝트**: WjWorld
- **태그**: #SceneCapture #CharacterPreview #PropagateAlpha #bCaptureEveryFrame #MemoReview #Steam #Session #PasswordRoom

## 개요
캐릭터 프리뷰 액터의 3가지 문제(Yaw 회전, 불투명 배경, 정적 캡처)를 수정하고, Memo/260225.txt의 12개 항목을 전수 검토하여 완료/미완료로 분류했다.

## 작업 내용
- CharacterPreviewActor에서 소스 메시 회전값 복사 (Yaw=-90 보정)
- `r.PostProcessing.PropagateAlpha=1` 설정으로 SceneCapture 투명 배경 활성화
- `bCaptureEveryFrame = true`로 실시간 Idle 모션 캡처 전환
- PlayerProfileWidget에서 0.5초 타이머 제거 + SetBrushResourceObject 패턴 간소화
- 메모 12개 항목 전수 검토 — 7개 완료 확인, 6개 추가 논의 필요로 분류
- 미완료 항목을 Memo/260225.txt에 기록

## 학습 내용

### SceneCapture 투명 배경
- `SCS_FinalColorLDR` + `ClearColor::Transparent` 조합만으로는 부족 — post-processing이 alpha=1.0으로 덮어씀
- `r.PostProcessing.PropagateAlpha=1` (DefaultEngine.ini)로 alpha 채널 보존 필요
- 이 설정은 프로젝트 전체에 영향 — 최초 적용 시 셰이더 재컴파일 발생

### bCaptureEveryFrame 타이밍
- 생성자에서 `false` 유지 (메시 설정 전 불필요한 캡처 방지)
- `SetupFromPawn()` 완료 후 `true`로 전환 — AnimBlueprint Idle 모션 실시간 반영
- 매 프레임 캡처이므로 에셋 비동기 로드 대기 타이머 불필요

### 소스 메시 회전 복사
- ACharacter의 SkeletalMesh는 기본 +Y 방향 → Yaw=-90 보정 적용됨
- 프리뷰 액터에 SkeletalMesh만 복사하면 회전 보정이 빠져 캐릭터가 옆을 바라봄
- `PreviewMeshComponent->SetRelativeRotation(SourceMesh->GetRelativeRotation())` 한 줄로 해결

### SetBrushResourceObject 패턴
- FSlateBrush 수동 생성 대신 `UImage::SetBrushResourceObject(RT)` 한 줄로 RenderTarget 적용 가능
- 코스메틱 상점에서 이미 사용 중인 패턴 — 프로필 위젯도 통일

## 결정 사항
| 결정 | 이유 |
|------|------|
| PropagateAlpha=1 사용 | SCS_SceneColorHDR 변경 시 조명 재보정 필요, LDR+PropagateAlpha가 가장 깔끔 |
| 타이머 제거 | bCaptureEveryFrame이 에셋 로드 대기를 자동 처리 |
| Memo 미완료 항목 기록 | 완료 항목 혼재 시 추적 어려움 — 분류 후 기록 |

## 생성/수정된 파일
- `Config/DefaultEngine.ini` - `r.PostProcessing.PropagateAlpha=1` 추가
- `Source/WjWorld/UI/Profile/CharacterPreviewActor.cpp` - 회전 복사 + bCaptureEveryFrame 활성화
- `Source/WjWorld/UI/Profile/PlayerProfileWidget.cpp` - 타이머 제거 + SetBrushResourceObject 간소화
- `Memo/260225.txt` - 완료/미완료 분류 결과 기록
- `DEVLOG.md` - 개발 로그 갱신

## 유용한 코드/명령어
```ini
# DefaultEngine.ini — SceneCapture 투명 배경
[/Script/Engine.RendererSettings]
r.PostProcessing.PropagateAlpha=1
```

```cpp
// 소스 메시 회전값 복사 (ACharacter Yaw=-90 보정 포함)
PreviewMeshComponent->SetRelativeRotation(SourceMesh->GetRelativeRotation());

// 메시 설정 완료 후 실시간 캡처 활성화
SceneCaptureComponent->bCaptureEveryFrame = true;

// RenderTarget을 UImage에 적용 (간소화 패턴)
CharacterPreviewImage->SetBrushResourceObject(RT);
```

## 메모 검토 결과 요약

### 완료 확인 (7건)
1. 설정 UI (디스플레이 품질 + 마스터 볼륨)
2. 스탯 Steam 저장
4. AW/Sumo 2인 이상 제한 + 1인 스탯 미기록
8. Steam 빌드 방 생성/찾기
9. 비밀번호 방
11. 프로필/상점 SceneCapture Yaw 수정
12. SceneCapture 투명 배경 + 실시간 Idle 모션

### 추가 논의 필요 (6건)
- 2-1: 3자 프로필 안 보이는 문제 (BP 설정 확인 필요)
- 3: AW 벽 이동 알고리즘 전면 변경 (목표 그리드 좌표 1:1 할당)
- 5: 솔로 컨텐츠 부족 (기획 필요)
- 6: Skeletal mesh 코스메틱 확장 (에셋 제작 필요)
- 7: JumpMap Grapple Point 동작 확인 (SphereComponent NoCollision 주의)
- 10: 게임 진행 중 방 노출 + 중간 입장 (모드별 정책 결정 필요)

## 다음 단계
- [ ] 에디터에서 BP_WaitingRoomHUDWidget의 ProfileWidgetClass 설정 확인
- [ ] GrapplePointActor 콜리전 테스트 (SphereComponent NoCollision → MeshComponent 감지 여부)
- [ ] AW 벽 이동 알고리즘 재설계 (목표 그리드 좌표 할당 방식)
- [ ] 솔로 컨텐츠 기획 (봇, 솔로 모드, 또는 싱글 미니게임)
- [ ] Skeletal mesh 코스메틱 에셋 제작 + itemdefs.json 등록

---
*저장 시간: 2026-02-25*
