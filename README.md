# Claude Learning Docs

Claude Code와 함께한 프로젝트별 학습 기록을 관리하는 문서 사이트입니다.

**배포 URL**: https://claude-learning-three.vercel.app

## 시스템 개요

프로젝트별 개발 로그, 학습 노트, 대화 기록을 체계적으로 관리하는 자동화 시스템입니다.

```
[프로젝트]                    [claude-learning]
CLAUDE.md ──push──→ GitHub Actions ──→ docs/projects/*.md
DEVLOG.md ─────────────────────────→

/save-conversation ─────────────────→ docs/conversations/*.md

세션 종료 ──Hook──→ docs/conversations/sessions/ (raw)
```

---

## 세팅 완료된 프로젝트 사용법

### 수동으로 해야 할 것

| 명령어 | 언제 | 하는 일 |
|--------|------|---------|
| `/devlog` | 작업 끝날 때 | DEVLOG.md에 오늘 작업 내용 추가 |
| `/save-conversation` | 대화 끝날 때 | 대화 내용 요약해서 저장 |
| `git push` | 커밋 후 | GitHub에 푸시 (Actions 트리거) |

### 자동으로 이루어지는 것

| 트리거 | 자동 동작 |
|--------|-----------|
| `CLAUDE.md` 또는 `DEVLOG.md` push | GitHub Actions → 학습 노트 동기화 |
| 세션 종료 | SessionEnd Hook → transcript 자동 백업 |

### 일반적인 작업 흐름

```
1. 작업 진행
2. 커밋
3. /devlog 실행 → DEVLOG.md 업데이트
4. git push → GitHub Actions 자동 실행
5. (선택) /save-conversation → 대화 기록 저장
6. 세션 종료 → Hook이 자동으로 transcript 백업
```

---

## 새 프로젝트 시작 방법

### Step 1: 초기 설정
```bash
# 프로젝트 폴더에서 Claude Code 실행 후
/init-learning
```

자동으로 생성되는 파일:
- `DEVLOG.md` - 일일 개발 로그
- `.claude/commands/` - 프로젝트 레벨 명령어
- `.github/workflows/sync-learning.yml` - GitHub Actions
- claude-learning 인덱스 업데이트

### Step 2: GitHub Secret 설정
```
프로젝트 레포 → Settings → Secrets → Actions
→ New repository secret
→ Name: LEARNING_REPO_TOKEN
→ Value: (Personal Access Token)
```

토큰 생성 방법:
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Repository access: `claude-learning` 선택
3. Permissions: Contents (Read and write)

### Step 3: 완료
```bash
git add -A
git commit -m "학습 노트 자동화 설정"
git push
```

---

## 전체 시스템 구조

```
[글로벌 스킬] ~/.claude/skills/
├── init-learning/     → 새 프로젝트 초기 설정
├── devlog/            → 일일 개발 로그 작성
├── sync-learning/     → 학습 노트 수동 동기화
└── save-conversation/ → 대화 기록 저장

[글로벌 Hook] ~/.claude/
├── hooks/auto-save-conversation.sh
└── settings.json (SessionEnd Hook 설정)

[프로젝트] (예: WjWorld)
├── CLAUDE.md         → 프로젝트 컨텍스트
├── DEVLOG.md         → 일일 개발 로그
└── .github/workflows/sync-learning.yml

[claude-learning 레포]
├── docs/
│   ├── index.md              → 홈 (프로젝트 목록)
│   ├── projects/
│   │   ├── index.md          → 카테고리별 목록
│   │   └── *.md              → 프로젝트별 학습 노트
│   └── conversations/
│       ├── index.md          → 대화 기록 인덱스
│       ├── *.md              → 대화 기록
│       └── sessions/         → Hook 자동 저장 (raw)
└── templates/                → 새 프로젝트용 템플릿
```

---

## 명령어 요약

| 명령어 | 설명 | 위치 |
|--------|------|------|
| `/init-learning` | 새 프로젝트 자동화 설정 | 글로벌 |
| `/devlog` | 일일 개발 로그 작성 | 글로벌 |
| `/sync-learning` | 학습 노트 수동 동기화 | 글로벌 |
| `/save-conversation` | 대화 기록 저장 | 글로벌 |

---

## 수동 vs 자동

| 구분 | 수동 | 자동 |
|------|------|------|
| 개발 로그 | `/devlog` | - |
| 학습 노트 동기화 | `/sync-learning` 또는 `git push` | GitHub Actions |
| 대화 기록 (요약) | `/save-conversation` | - |
| 대화 기록 (raw) | - | SessionEnd Hook |
| 새 프로젝트 설정 | `/init-learning` + Secret | - |

---

## 기술 스택

- **문서 사이트**: VitePress
- **배포**: Vercel
- **자동화**: GitHub Actions, Claude Code Hooks
- **명령어**: Claude Code Custom Skills

---

## Claude Code 활용 팁

<details>
<summary><strong>키보드 단축키</strong></summary>

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
<summary><strong>슬래시 명령어</strong></summary>

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
<summary><strong>Hooks 시스템</strong></summary>

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
<summary><strong>권한 모드</strong></summary>

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
<summary><strong>비용 절감 팁</strong></summary>

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
<summary><strong>프롬프트 최적화</strong></summary>

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
<summary><strong>MCP 서버 연동</strong></summary>

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
<summary><strong>설정 파일 구조</strong></summary>

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
