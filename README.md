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
