# 학습 노트 자동화 시스템 구축

- **날짜**: 2026-02-03
- **프로젝트**: WjWorld
- **태그**: #automation #claude-code #github-actions #devops

## 개요
Claude Code로 진행하는 프로젝트들의 학습 및 진행 내용을 체계적으로 기록하기 위한 자동화 시스템을 구축했다.

## 작업 내용
- DEVLOG.md 파일 생성 (일일 개발 로그용)
- `/devlog` 슬래시 명령어 생성
- `/sync-learning` 슬래시 명령어 생성
- `/init-learning` 슬래시 명령어 생성
- `/save-conversation` 슬래시 명령어 생성
- GitHub Actions 워크플로우 생성 (자동 동기화)
- 글로벌 스킬로 전환 (모든 프로젝트에서 사용 가능)
- 템플릿 레포 구조 생성

## 학습 내용

### Claude Code Custom Slash Commands
- 프로젝트 레벨: `.claude/commands/<name>.md`
- 글로벌 레벨: `~/.claude/skills/<name>/SKILL.md`
- 글로벌이 모든 프로젝트에서 사용 가능
- 프로젝트 레벨이 글로벌보다 우선 (오버라이드 가능)

### GitHub Actions Cross-Repo 작업
- Personal Access Token (Fine-grained) 필요
- Repository access에서 대상 레포 선택
- Permissions: Contents (Read and write)
- Secrets에 `LEARNING_REPO_TOKEN`으로 저장

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

### Claude Code 대화 기록
- 저장 위치: `~/.claude/sessions/` 또는 `AppData/Local/ClaudeCode/sessions/`
- JSON 형식으로 저장
- 공식 export 기능 없음 → 수동 또는 스킬로 저장

## 결정 사항

| 결정 | 이유 |
|------|------|
| 프로젝트별 DEVLOG + 전체 학습 레포 분리 | 관리 효율성, 프로젝트 독립성 유지 |
| 글로벌 스킬 사용 | 모든 프로젝트에서 동일한 명령어 사용 |
| GitHub Actions 자동화 | 수동 작업 최소화, 일관성 유지 |
| VitePress 문서 사이트 | 웹에서 학습 내용 열람 가능 |

## 생성/수정된 파일

### WjWorld
- `DEVLOG.md` - 개발 로그 파일
- `.claude/commands/devlog.md` - 프로젝트 레벨 명령어
- `.claude/commands/sync-learning.md` - 프로젝트 레벨 명령어
- `.claude/commands/init-learning.md` - 프로젝트 레벨 명령어
- `.github/workflows/sync-learning.yml` - GitHub Actions

### claude-learning
- `docs/projects/wjworld.md` - WjWorld 학습 노트
- `docs/conversations/` - 대화 기록 폴더
- `templates/` - 템플릿 파일들
- `docs/.vitepress/config.js` - 사이드바 업데이트

### 글로벌 (~/.claude/skills/)
- `init-learning/SKILL.md`
- `devlog/SKILL.md`
- `sync-learning/SKILL.md`
- `save-conversation/SKILL.md`

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

## 시스템 구조

```
[프로젝트] (예: WjWorld)
├── CLAUDE.md          # 프로젝트 컨텍스트
├── DEVLOG.md          # 일일 개발 로그
├── .github/workflows/
│   └── sync-learning.yml  # 자동 동기화
└── .claude/commands/  # 프로젝트 레벨 명령어 (선택)

[claude-learning 레포]
├── docs/projects/     # 프로젝트별 학습 노트
├── docs/conversations/ # 대화 기록
└── templates/         # 새 프로젝트용 템플릿

[글로벌 스킬] (~/.claude/skills/)
├── init-learning/     # 새 프로젝트 초기 설정
├── devlog/            # 개발 로그 작성
├── sync-learning/     # 학습 노트 동기화
└── save-conversation/ # 대화 기록 저장
```

## 다음 단계
- [ ] Hook 설정으로 세션 종료 시 자동 저장
- [ ] VitePress 사이드바에 conversations 추가
- [ ] 다른 프로젝트에서 /init-learning 테스트

---
*저장 시간: 2026-02-03 19:15*
