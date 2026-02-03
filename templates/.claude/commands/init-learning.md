# /init-learning - 학습 노트 자동화 초기 설정

새 프로젝트에 학습 노트 자동화 시스템을 설정해줘.

## 설정할 항목

### 1. DEVLOG.md 생성
프로젝트 루트에 개발 로그 파일 생성:
```markdown
# {프로젝트명} 개발 로그

## {오늘 날짜}
### 작업 내용
- 학습 노트 자동화 시스템 초기 설정

### 학습/메모
-

---
```

### 2. .claude/commands/ 폴더 생성 및 명령어 복사
다음 파일들을 생성:

**devlog.md** - 일일 개발 로그 작성 명령어:
- git log로 오늘 커밋 확인
- DEVLOG.md에 날짜별 엔트리 추가
- 작업 내용, 학습/메모, 이슈/해결 섹션

**sync-learning.md** - 학습 노트 동기화 명령어:
- 대상 레포: https://github.com/shimwoojin/claude-learning.git
- 로컬 경로: C:\EtcProjects\claude-learning-docs
- CLAUDE.md, DEVLOG.md에서 내용 추출
- docs/projects/{project-name}.md로 동기화

### 3. .github/workflows/sync-learning.yml 생성
GitHub Actions 워크플로우:
- 트리거: CLAUDE.md 또는 DEVLOG.md push 시
- 동작: claude-learning 레포에 자동 동기화
- 필요: LEARNING_REPO_TOKEN secret 설정

### 4. VitePress 사이드바 업데이트
claude-learning 레포의 config.js에 새 프로젝트 링크 추가

## 완료 후 안내사항

설정 완료 후 사용자에게 안내:
1. GitHub 레포 Settings → Secrets → Actions에서 `LEARNING_REPO_TOKEN` 설정 필요
2. 토큰은 claude-learning 레포에 대한 Contents (Read and write) 권한 필요
3. `/devlog`, `/sync-learning` 명령어는 세션 재시작 후 사용 가능
