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
