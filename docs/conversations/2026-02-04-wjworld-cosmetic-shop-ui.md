# 코스메틱 상점 UI 구현 및 Socket 기반 부착 시스템

- **날짜**: 2026-02-04
- **프로젝트**: WjWorld
- **태그**: #Cosmetic #UI #Socket #UnrealEngine #UMG

## 개요
코스메틱 상점/인벤토리 통합 UI를 구현하고, 캐릭터에 코스메틱 아이템을 소켓 기반으로 부착하는 시스템을 완성했다.

## 작업 내용
- **코스메틱 상점 UI 구현** (6개 파일 생성)
  - `CosmeticItemEntryWidget` - 아이템 그리드 엔트리 (아이콘, 이름, 희귀도, 가격)
  - `CosmeticPreviewPanel` - 3D 캐릭터 프리뷰 (CharacterPreviewActor 재사용)
  - `CosmeticMainWindow` - 상점/인벤토리 통합 윈도우 (탭 전환, 4열 그리드)
  - `LobbyHUDWidget`에 코스메틱 버튼 추가
- **CosmeticSubsystem 초기화 개선**
  - DeveloperSettings에 `CosmeticCatalog` 프로퍼티 추가
  - Initialize()에서 자동 로드하도록 수정
- **CosmeticComponent 개선**
  - `OnLoadoutChanged` 델리게이트 구독 추가 (실시간 메시 반영)
  - `CharacterPlay` → `CharacterBase`로 이동 (모든 캐릭터에서 사용 가능)
- **Socket 기반 코스메틱 부착 시스템 구현**
  - `FCosmeticItemDefinition`에 부착 설정 추가
  - 슬롯별 기본 소켓 매핑 구현
  - 모자 메시 테스트 완료

## 학습 내용

### 코스메틱 부착 방식 비교

| 방식 | 용도 | 장점 | 단점 |
|------|------|------|------|
| **Socket Attachment** | 모자, 악세서리 | 간단, 본에 고정 | 변형 불가 |
| **Leader Pose** | 옷, 갑옷 | 애니메이션 동기화 | 추가 메시 컴포넌트 필요 |
| **Mesh Merge** | 고정 장비 세트 | 드로우콜 감소 | 교체 시 재머지 필요 |

### 슬롯별 권장 부착 방식
```
Head (모자)     → Socket Attachment (head 본)
Body (옷)       → Leader Pose 또는 메시 교체
Back (망토/배낭) → Socket + Leader Pose (spine_03)
Effect          → Socket Attachment (root)
```

### UE5 RenderTarget과 UImage
- `UImage::SetBrushFromTexture()`는 `UTexture2D*`만 지원
- `UTextureRenderTarget2D`는 `SetBrushResourceObject()` 사용 필요

## 결정 사항
| 결정 | 이유 |
|------|------|
| Socket 방식 먼저 구현 | 프로토타이핑에 적합, 나중에 Mesh Merge로 최적화 가능 |
| CosmeticComponent를 Base로 이동 | 로비, 대기실, 플레이 모든 캐릭터에서 코스메틱 사용 |
| DeveloperSettings에서 카탈로그 로드 | 중앙화된 설정 관리, Blueprint 설정 편의성 |

## 생성/수정된 파일
- `UI/Cosmetic/CosmeticItemEntryWidget.h/.cpp` - 아이템 엔트리 위젯
- `UI/Cosmetic/CosmeticPreviewPanel.h/.cpp` - 3D 프리뷰 패널
- `UI/Cosmetic/CosmeticMainWindow.h/.cpp` - 상점/인벤토리 윈도우
- `UI/Lobby/LobbyHUDWidget.h/.cpp` - 코스메틱 버튼 추가
- `Cosmetic/WjWorldCosmeticComponent.h/.cpp` - Socket 부착 로직
- `Cosmetic/WjWorldCosmeticDataAsset.h` - 부착 설정 프로퍼티 추가
- `Core/Base/WjWorldCharacterBase.h/.cpp` - CosmeticComponent 이동
- `Setting/WjWorldDeveloperSettings.h` - CosmeticCatalog 추가

## 유용한 코드/명령어

### Socket 기반 부착
```cpp
// 슬롯별 기본 소켓
FName UWjWorldCosmeticComponent::GetDefaultSocketName(ECosmeticSlot Slot)
{
    switch (Slot)
    {
    case ECosmeticSlot::Head:   return FName(TEXT("head"));
    case ECosmeticSlot::Body:   return NAME_None;  // 메시 교체
    case ECosmeticSlot::Back:   return FName(TEXT("spine_03"));
    case ECosmeticSlot::Effect: return FName(TEXT("root"));
    default:                    return NAME_None;
    }
}

// 소켓에 부착 + 오프셋 적용
SlotMesh->AttachToComponent(OwnerCharacter->GetMesh(),
    FAttachmentTransformRules::SnapToTargetNotIncludingScale, SocketName);
SlotMesh->SetRelativeLocation(Def->AttachLocationOffset);
SlotMesh->SetRelativeRotation(Def->AttachRotationOffset);
SlotMesh->SetRelativeScale3D(Def->AttachScale);
```

### 델리게이트 구독 패턴
```cpp
// BeginPlay에서 구독
CosmeticSub->OnLoadoutChanged.AddDynamic(this, &ThisClass::OnLoadoutChangedHandler);

// EndPlay에서 해제
CosmeticSub->OnLoadoutChanged.RemoveDynamic(this, &ThisClass::OnLoadoutChangedHandler);
```

## 다음 단계
- [ ] Blueprint 위젯 생성 (WBP_CosmeticMainWindow 등)
- [ ] Back 슬롯 테스트 (망토/배낭 메시)
- [ ] 추가 코스메틱 아이템 임포트 및 카탈로그 등록
- [ ] Mesh Merge 방식 성능 최적화 (필요 시)

---
*저장 시간: 2026-02-04 11:30*
