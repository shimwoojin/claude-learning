---
layout: home

hero:
  name: Claude Learning Docs
  text: AI와 함께한 개발 학습 기록
  tagline: Claude Code를 활용한 프로젝트별 학습 내용 정리
  actions:
    - theme: brand
      text: 학습 기록 보기
      link: /projects/
    - theme: alt
      text: GitHub
      link: https://github.com/shimwoojin

features:
  - icon: 📚
    title: 프로젝트별 정리
    details: 각 프로젝트에서 배운 내용을 체계적으로 정리
  - icon: 💡
    title: 실전 코드 예시
    details: 실제 구현한 코드와 함께 개념 설명
  - icon: 🔍
    title: 검색 가능
    details: 필요한 내용을 빠르게 찾아볼 수 있는 검색 기능
---

## 프로젝트 목록

| 프로젝트 | 기술 스택 | 주요 학습 내용 |
|---------|-----------|---------------|
| [Portfolio](/projects/portfolio) | React, Vite | 다국어 지원, PDF 생성, SEO, 애니메이션 |
| [WjWorld](/projects/wjworld) | Unreal Engine 5.7, C++ | GAS, 코스메틱 시스템, 미니게임, Steam 연동 |

---

<details>
<summary><strong>📖 학습 노트 시스템 사용 가이드</strong></summary>

### 세팅 완료된 프로젝트

#### 수동으로 해야 할 것

| 명령어 | 언제 | 하는 일 |
|--------|------|---------|
| `/devlog` | 작업 끝날 때 | DEVLOG.md에 오늘 작업 내용 추가 |
| `/save-conversation` | 대화 끝날 때 | 대화 내용 요약해서 저장 |
| `git push` | 커밋 후 | GitHub에 푸시 (Actions 트리거) |

#### 자동으로 이루어지는 것

| 트리거 | 자동 동작 |
|--------|-----------|
| `CLAUDE.md` 또는 `DEVLOG.md` push | GitHub Actions → 학습 노트 동기화 |
| 세션 종료 | SessionEnd Hook → transcript 자동 백업 |

#### 일반적인 작업 흐름

```
1. 작업 진행
2. 커밋
3. /devlog 실행 → DEVLOG.md 업데이트
4. git push → GitHub Actions 자동 실행
5. (선택) /save-conversation → 대화 기록 저장
6. 세션 종료 → Hook이 자동으로 transcript 백업
```

---

### 새 프로젝트 시작 방법

**Step 1**: 프로젝트 폴더에서 Claude Code 실행 후
```bash
/init-learning
```

**Step 2**: GitHub Secret 설정
```
프로젝트 레포 → Settings → Secrets → Actions
→ Name: LEARNING_REPO_TOKEN
→ Value: (Personal Access Token)
```

**Step 3**: 커밋 & 푸시
```bash
git add -A && git commit -m "학습 노트 자동화 설정" && git push
```

---

### 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `/init-learning` | 새 프로젝트 자동화 설정 |
| `/devlog` | 일일 개발 로그 작성 |
| `/sync-learning` | 학습 노트 수동 동기화 |
| `/save-conversation` | 대화 기록 저장 |

---

### 수동 vs 자동

| 구분 | 수동 | 자동 |
|------|------|------|
| 개발 로그 | `/devlog` | - |
| 학습 노트 동기화 | `/sync-learning` 또는 `git push` | GitHub Actions |
| 대화 기록 (요약) | `/save-conversation` | - |
| 대화 기록 (raw) | - | SessionEnd Hook |
| 새 프로젝트 설정 | `/init-learning` + Secret | - |

</details>

<details>
<summary><strong>⌨️ Claude Code 키보드 단축키</strong></summary>

| 단축키 | 기능 |
|--------|------|
| `Shift+Tab` | 권한 모드 전환 (Normal ↔ Plan ↔ Auto-Accept) |
| `Ctrl+O` | 상세 출력 토글 (숨겨진 도구 호출 표시) |
| `Ctrl+R` | 명령 히스토리 검색 |
| `Ctrl+C` | 현재 작업 취소 |
| `Ctrl+D` | 세션 종료 |
| `Esc` + `Esc` | 마지막 변경사항 되돌리기 (Rewind) |
| `Alt+P` | 모델 변경 |
| `Alt+T` | Extended Thinking 토글 |

</details>

<details>
<summary><strong>📝 슬래시 명령어 (내장)</strong></summary>

| 명령어 | 기능 |
|--------|------|
| `/compact [지침]` | 컨텍스트 압축 (토큰 절감) |
| `/cost` | 현재 세션 비용 확인 |
| `/context` | 컨텍스트 사용량 시각화 |
| `/clear` | 대화 히스토리 삭제 |
| `/resume [세션명]` | 이전 세션 재개 |
| `/rewind` | 이전 상태로 돌아가기 |
| `/memory` | CLAUDE.md 편집 |
| `/model` | 모델 변경 |
| `/plan` | Plan Mode 시작 |
| `/hooks` | 훅 설정 메뉴 |
| `/mcp` | MCP 서버 관리 |

</details>

<details>
<summary><strong>🔗 Hooks 시스템</strong></summary>

도구 호출 전후 또는 특정 이벤트에 자동으로 스크립트 실행

**훅 이벤트 종류**:
- `SessionStart` - 세션 시작/재개 시
- `PreToolUse` - 도구 실행 전 (실행 차단 가능)
- `PostToolUse` - 도구 실행 후
- `SessionEnd` - 세션 종료 시
- `PreCompact` - 컨텍스트 압축 전

**설정 예시** (`.claude/settings.json`):
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{"command": "npx prettier --write $file"}]
    }],
    "SessionEnd": [{
      "command": "bash ~/.claude/hooks/auto-save.sh",
      "timeout": 30
    }]
  }
}
```

</details>

<details>
<summary><strong>🔐 권한 모드</strong></summary>

**3가지 모드** (`Shift+Tab`으로 전환):

| 모드 | 설명 |
|------|------|
| **Normal** | 기본 모드, 위험한 작업 시 확인 요청 |
| **Plan Mode** | 읽기 전용, 코드 수정 불가, 계획 수립용 |
| **Auto-Accept** | 모든 권한 자동 승인, 무인 자동화용 |

**CLI 옵션**:
```bash
claude --permission-mode plan   # Plan Mode로 시작
claude --model haiku            # Haiku 모델로 시작
claude -c                       # 이전 세션 이어서
```

</details>

<details>
<summary><strong>💰 비용 절감 팁</strong></summary>

| 방법 | 효과 |
|------|------|
| `/compact` 자주 사용 | 30-50% 절감 |
| Haiku 모델 사용 (단순 작업) | 40% 절감 |
| 구체적인 요청 | 탐색 줄여 토큰 절감 |
| Plan Mode로 계획 후 실행 | 재작업 감소 |
| MCP 서버 최소화 | 10-20% 절감 |

**모델별 권장사항**:
- **Haiku** - 간단한 작업 (가장 저렴)
- **Sonnet** - 대부분의 개발 작업 (추천)
- **Opus** - 복잡한 아키텍처/다단계 추론 (가장 비쌈)

</details>

<details>
<summary><strong>💬 프롬프트 최적화</strong></summary>

**좋은 프롬프트 예시**:
```
❌ "코드 개선해줘"

✅ "auth.ts의 login 함수에 입력 검증 추가하고,
   test/auth.test.ts 테스트 통과시켜줘"
```

**효과적인 요청 방법**:
- 파일명, 함수명 명시
- 검증 기준 포함 (빌드, 테스트)
- 단계별로 요청
- 구체적인 범위 지정

</details>

<details>
<summary><strong>🔌 MCP 서버 연동</strong></summary>

외부 도구(GitHub, DB 등) 연결:

```bash
# 서버 추가
claude mcp add github https://api.github.com/mcp

# 설치된 서버 확인
claude mcp list

# 관리 메뉴
/mcp
```

**인기 MCP 서버**: GitHub, Sentry, PostgreSQL, Slack

</details>

<details>
<summary><strong>⚙️ 설정 파일 구조</strong></summary>

```
~/.claude/settings.json          # 전역 (모든 프로젝트)
  ↑
.claude/settings.json            # 프로젝트 (git 커밋 가능)
  ↑
.claude/settings.local.json      # 로컬 (gitignore)
```

**주요 설정 항목**:
```json
{
  "hooks": { /* 훅 설정 */ },
  "permissions": {
    "defaultMode": "plan",
    "allow": ["Bash(git push:*)"],
    "deny": ["Bash(rm -rf:*)"]
  }
}
```

</details>
