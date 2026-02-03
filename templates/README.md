# 학습 노트 자동화 템플릿

새 프로젝트에 학습 노트 자동화를 설정할 때 사용하는 템플릿 파일들입니다.

## 사용 방법

### 방법 1: /init-learning 명령어 (권장)
프로젝트에서 Claude Code 실행 후:
```
/init-learning
```

### 방법 2: 수동 복사
1. 이 폴더의 파일들을 프로젝트에 복사
2. GitHub Secrets에 `LEARNING_REPO_TOKEN` 설정

## 파일 구조

```
templates/
├── DEVLOG.md                    # 개발 로그 템플릿
├── .claude/commands/
│   ├── devlog.md                # /devlog 명령어
│   ├── sync-learning.md         # /sync-learning 명령어
│   └── init-learning.md         # /init-learning 명령어
└── .github/workflows/
    └── sync-learning.yml        # GitHub Actions 워크플로우
```

## 설정 필요 사항

### GitHub Personal Access Token
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Generate new token
3. Repository access: `claude-learning` 선택
4. Permissions: Contents (Read and write)
5. 토큰 복사

### Repository Secret
1. 프로젝트 레포 → Settings → Secrets and variables → Actions
2. New repository secret
   - Name: `LEARNING_REPO_TOKEN`
   - Value: 위에서 복사한 토큰
