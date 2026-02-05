# GA_Jump 어빌리티 구현 & 패키징 빌드 스크립트 수정

- **날짜**: 2026-02-05
- **프로젝트**: WjWorld
- **태그**: #GAS #Ability #Jump #Packaging #BatchScript #UE5

## 개요
Sumo 미니게임 전용 점프 어빌리티(GA_Jump)를 UE 기본 CharacterJump 패턴 기반으로 구현하고, PackageAndUploadSteam.bat의 3가지 버그를 수정했다.

## 작업 내용
- GA_Jump 어빌리티 C++ 구현 (WjWorldGameplayAbilityBase 상속)
- GameplayTag 추가 (Ability.Jump, Cooldown.Jump)
- EWjWorldAbilityInputID::Ability7 추가
- DefaultGameplayTags.ini에 태그 등록
- PackageAndUploadSteam.bat 버그 3건 수정

## 학습 내용

### Batch 스크립트에서 .bat 호출 시 `call` 필수
- `.bat` 파일을 `call` 없이 실행하면 현재 스크립트가 종료되고 호출된 .bat로 제어권이 넘어감
- 호출된 .bat가 끝나면 원래 스크립트로 돌아오지 않음
- RunUAT.bat 같은 외부 .bat 호출 시 반드시 `call` 사용

### RunUAT `-build` 플래그와 `.target` 파일
- RunUAT Cook 단계에서 `{ProjectName}Editor.target` 파일을 찾아 에디터 경로 결정
- DebugGame 빌드만 있으면 `WjWorldEditor.target` (Development)이 없어서 `FileNotFoundException` 발생
- `-build` 플래그 추가하면 패키징 전 에디터+게임을 Development로 자동 빌드

### GA_Jump 설계 결정: LocalPredicted vs ServerInitiated
- 점프는 즉각적인 피드백이 중요 → `LocalPredicted` (클라이언트가 먼저 실행, 서버가 검증)
- 밀치기(GA_Push)는 서버 권한이 중요 → `ServerInitiated` (서버가 먼저 실행)

### CommitAbility() vs 직접 ApplyCooldown()
- `CommitAbility()`: Cost + Cooldown 한꺼번에 처리. 내부적으로 virtual `ApplyCooldown()` 호출하므로 베이스 클래스의 커스텀 쿨다운도 정상 동작
- GA_Push 패턴: 로직 실행 후 `ApplyCooldown()` 직접 호출
- 두 방식 모두 유효, UE 기본 GA_CharacterJump은 CommitAbility 패턴 사용

## 결정 사항
| 결정 | 이유 |
|------|------|
| `LocalPredicted` NetExecutionPolicy | 점프는 즉각 반응 필요, 서버 왕복 지연 불가 |
| `CommitAbility()` 패턴 사용 | UE 기본 GA_CharacterJump 패턴 준수 |
| CooldownDuration 기본 0 | BP에서 필요 시 설정, 기본 점프는 쿨다운 불필요 |
| `Character->Jump()` 사용 (LaunchCharacter 대신) | CMC의 JumpMaxCount, 가변 높이 점프 등 기본 시스템 활용 |

## 생성/수정된 파일
- `Source/WjWorld/AbilitySystem/Abilities/GA_Jump.h` - Jump 어빌리티 헤더 (신규)
- `Source/WjWorld/AbilitySystem/Abilities/GA_Jump.cpp` - Jump 어빌리티 구현 (신규)
- `Source/WjWorld/WjWorldGameplayTag.h` - Ability_Jump(), Cooldown_Jump() 추가
- `Source/WjWorld/WjWorldGameplayTag.cpp` - 태그 구현 추가
- `Source/WjWorld/WjTypes.h` - Ability7 = 7 추가
- `Config/DefaultGameplayTags.ini` - Ability.Jump, Cooldown.Jump 등록
- `Batch/PackageAndUploadSteam.bat` - call 추가, -build 추가, pause 추가

## 유용한 코드/명령어

### GA_Jump 핵심 패턴 (UE 기본 CharacterJump 기반)
```cpp
// CanActivateAbility - 바닥에 있을 때만
const ACharacter* Character = CastChecked<ACharacter>(ActorInfo->AvatarActor.Get(), ECastCheckedType::NullAllowed);
return Character && Character->CanJump();

// ActivateAbility - CommitAbility + Jump
if (HasAuthorityOrPredictionKey(ActorInfo, &ActivationInfo))
{
    if (!CommitAbility(Handle, ActorInfo, ActivationInfo)) { EndAbility(..., true); return; }
    ACharacter* Character = CastChecked<ACharacter>(ActorInfo->AvatarActor.Get());
    Character->Jump();
}

// InputReleased - 가변 높이 점프
Character->StopJumping();
EndAbility(Handle, ActorInfo, ActivationInfo, true, false);
```

### Batch 스크립트 .bat 호출 패턴
```bat
REM 잘못된 예 - 현재 스크립트가 종료됨
"%UE_ROOT%\Engine\Build\BatchFiles\RunUAT.bat" BuildCookRun ...

REM 올바른 예 - 현재 스크립트로 돌아옴
call "%UE_ROOT%\Engine\Build\BatchFiles\RunUAT.bat" BuildCookRun ...
```

## 다음 단계
- [ ] GA_Jump 에디터 세팅 (IA_Ability7, BP_GA_Jump, SetupDA, MinigameCatalog)
- [ ] 비디오 플레이어 버그 조사 (Steam 다운로드 환경)
- [ ] 파워업 타입별 비주얼 구분

---
*저장 시간: 2026-02-05*
