# 학습 노트 자동화 시스템 구축

- **날짜**: 2026-02-03
- **프로젝트**: WjWorld
- **태그**: #automation #claude-code #github-actions #hooks #devops

## 개요
Claude Code로 진행하는 프로젝트들의 학습 및 진행 내용을 체계적으로 기록하기 위한 자동화 시스템을 구축했다. 수동 명령어와 자동 Hook을 조합하여 개발 로그, 학습 노트, 대화 기록을 관리한다.

## 작업 내용
- DEVLOG.md 파일 생성 (일일 개발 로그용)
- `/devlog` 슬래시 명령어 생성 (글로벌)
- `/sync-learning` 슬래시 명령어 생성 (글로벌)
- `/init-learning` 슬래시 명령어 생성 (글로벌)
- `/save-conversation` 슬래시 명령어 생성 (글로벌)
- GitHub Actions 워크플로우 생성 (자동 동기화)
- 글로벌 스킬로 전환 (모든 프로젝트에서 사용 가능)
- 템플릿 레포 구조 생성
- SessionEnd Hook 설정 (세션 종료 시 자동 저장)
- VitePress에 대화 기록 메뉴 추가

## 학습 내용

### Claude Code Custom Slash Commands
- **프로젝트 레벨**: `.claude/commands/<name>.md`
- **글로벌 레벨**: `~/.claude/skills/<name>/SKILL.md`
- 글로벌이 모든 프로젝트에서 사용 가능
- 프로젝트 레벨이 글로벌보다 우선 (오버라이드 가능)
- 세션 시작 시 로드되므로 새 명령어 추가 후 세션 재시작 필요

### GitHub Actions Cross-Repo 작업
- Personal Access Token (Fine-grained) 필요
- Repository access에서 대상 레포 선택
- Permissions: Contents (Read and write)
- Secrets에 `LEARNING_REPO_TOKEN`으로 저장
- 워크플로우 파일 자체가 트리거 조건을 포함

### GitHub Actions 트리거 설정
```yaml
on:
  push:
    branches: [master, main]
    paths:
      - 'CLAUDE.md'
      - 'DEVLOG.md'
```
- `paths:` 로 특정 파일 변경 시에만 트리거 가능
- `.github/workflows/` 폴더에 yml 파일로 정의

### Claude Code Hooks 시스템
- **설정 위치**: `~/.claude/settings.json` (글로벌) 또는 `.claude/settings.json` (프로젝트)
- **Hook 이벤트**: SessionStart, SessionEnd, PreToolUse, PostToolUse 등 12개
- **Hook 타입**: command (bash), prompt (LLM), agent
- **SessionEnd**: 세션 종료 시 실행, transcript 경로 전달받음

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$HOME/.claude/hooks/script.sh\""
          }
        ]
      }
    ]
  }
}
```

### Claude Code 대화 기록
- **저장 위치**: `~/.claude/sessions/` 또는 `AppData/Local/ClaudeCode/sessions/`
- **형식**: JSON (transcript.jsonl)
- **공식 export 기능**: 없음
- **대안**: Hook으로 자동 저장 또는 스킬로 수동 저장

## 결정 사항

| 결정 | 이유 |
|------|------|
| 프로젝트별 DEVLOG + 전체 학습 레포 분리 | 관리 효율성, 프로젝트 독립성 유지 |
| 글로벌 스킬 사용 | 모든 프로젝트에서 동일한 명령어 사용 |
| GitHub Actions 자동화 | 수동 작업 최소화, 일관성 유지 |
| VitePress 문서 사이트 | 웹에서 학습 내용 열람 가능 |
| SessionEnd Hook | 대화 기록 자동 백업, 데이터 손실 방지 |
| 수동 + 자동 조합 | 자동은 raw 데이터, 수동은 요약/정리 |

## 생성/수정된 파일

### WjWorld 프로젝트
| 파일 | 설명 |
|------|------|
| `DEVLOG.md` | 일일 개발 로그 |
| `.claude/commands/devlog.md` | 프로젝트 레벨 명령어 |
| `.claude/commands/sync-learning.md` | 프로젝트 레벨 명령어 |
| `.claude/commands/init-learning.md` | 프로젝트 레벨 명령어 |
| `.github/workflows/sync-learning.yml` | GitHub Actions |

### claude-learning 레포
| 파일 | 설명 |
|------|------|
| `docs/projects/wjworld.md` | WjWorld 학습 노트 |
| `docs/conversations/index.md` | 대화 기록 인덱스 |
| `docs/conversations/sessions/` | Hook 자동 저장 폴더 |
| `templates/` | 새 프로젝트용 템플릿 |
| `docs/.vitepress/config.js` | 사이드바 (conversations 추가) |

### 글로벌 설정 (~/.claude/)
| 파일 | 설명 |
|------|------|
| `skills/init-learning/SKILL.md` | 새 프로젝트 초기 설정 |
| `skills/devlog/SKILL.md` | 개발 로그 작성 |
| `skills/sync-learning/SKILL.md` | 학습 노트 동기화 |
| `skills/save-conversation/SKILL.md` | 대화 기록 저장 |
| `hooks/auto-save-conversation.sh` | 세션 종료 시 자동 저장 |
| `settings.json` | Hook 설정 추가 |

## 유용한 코드/명령어

### GitHub Actions - Cross-Repo Push
```yaml
- name: Checkout learning repo
  uses: actions/checkout@v4
  with:
    repository: owner/other-repo
    token: ${{ secrets.REPO_TOKEN }}
    path: other-repo
```

### 글로벌 스킬 구조
```
~/.claude/skills/<skill-name>/SKILL.md
```

SKILL.md 프론트매터:
```yaml
---
name: skill-name
description: 스킬 설명
---
```

### SessionEnd Hook 스크립트
```bash
#!/bin/bash
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path')

if [ -f "$TRANSCRIPT_PATH" ]; then
  cp "$TRANSCRIPT_PATH" "/path/to/archive/"
fi
```

## 최종 시스템 구조

```
[프로젝트] (예: WjWorld)
├── CLAUDE.md              # 프로젝트 컨텍스트
├── DEVLOG.md              # 일일 개발 로그
├── .github/workflows/
│   └── sync-learning.yml  # 자동 동기화
└── .claude/commands/      # 프로젝트 레벨 명령어 (선택)

[claude-learning 레포]
├── docs/
│   ├── projects/          # 프로젝트별 학습 노트
│   └── conversations/     # 대화 기록
│       ├── index.md
│       ├── {date}-{project}-{topic}.md
│       └── sessions/      # Hook 자동 저장 (raw)
└── templates/             # 새 프로젝트용 템플릿

[글로벌 설정] (~/.claude/)
├── skills/
│   ├── init-learning/     # /init-learning
│   ├── devlog/            # /devlog
│   ├── sync-learning/     # /sync-learning
│   └── save-conversation/ # /save-conversation
├── hooks/
│   └── auto-save-conversation.sh
└── settings.json          # Hook 설정
```

## 사용 흐름

```
[일일 작업]
작업 완료 → /devlog → DEVLOG.md 업데이트 → push → GitHub Actions → claude-learning 자동 동기화

[대화 저장]
/save-conversation → 대화 요약 → conversations/{date}.md → push

[세션 종료]
세션 종료 → SessionEnd Hook → transcript 자동 저장 → sessions/

[새 프로젝트]
/init-learning → 모든 파일 자동 생성 → GitHub Secret 설정
```

## 완료된 항목
- [x] /devlog, /sync-learning, /init-learning 글로벌 스킬
- [x] /save-conversation 글로벌 스킬
- [x] GitHub Actions 워크플로우
- [x] SessionEnd Hook 설정
- [x] VitePress 사이드바에 conversations 추가
- [x] 템플릿 레포 구조

## 다음 단계
- [ ] 다른 프로젝트에서 /init-learning 테스트
- [ ] Hook 동작 확인 (세션 종료 시)
- [ ] 대화 기록 검색 기능 추가 (VitePress search)

---
*저장 시간: 2026-02-03 19:30*
