# /sync-learning - 학습 노트 동기화

현재 프로젝트의 학습 내용을 claude-learning 레포에 동기화해줘.

## 대상 레포
- GitHub: https://github.com/shimwoojin/claude-learning.git
- 로컬 경로: C:\EtcProjects\claude-learning-docs

## 수행할 작업

1. **claude-learning 레포 준비**
   - 로컬에 클론되어 있는지 확인
   - 없으면: `git clone https://github.com/shimwoojin/claude-learning.git`
   - 있으면: `git pull origin main`

2. **현재 프로젝트 정보 수집**
   - 프로젝트명: 현재 폴더명 또는 CLAUDE.md에서 추출
   - CLAUDE.md에서 핵심 시스템/패턴 추출
   - DEVLOG.md에서 최근 2주 내용 요약

3. **학습 노트 작성/업데이트**
   - `docs/projects/{project-name}.md` 파일 생성 또는 업데이트
   - 포맷:
   ```markdown
   # {프로젝트명}

   ## 프로젝트 개요
   [CLAUDE.md 프로젝트 개요 섹션]

   ## 핵심 학습 내용

   ### 아키텍처/패턴
   - [주요 시스템 요약]

   ### 기술 스택
   - [사용 기술]

   ## 최근 진행 상황
   [DEVLOG.md 최근 내용 요약]

   ## 유용한 코드 스니펫
   [재사용 가능한 패턴/코드]

   ---
   *마지막 동기화: YYYY-MM-DD*
   ```

4. **VitePress 사이드바 업데이트**
   - `docs/.vitepress/config.js`의 sidebar에 새 프로젝트 추가

5. **커밋 및 푸시**
   - `git add docs/projects/{project-name}.md docs/.vitepress/config.js`
   - `git commit -m "Update {project-name} learning notes"`
   - `git push origin main`

## 참고
- 동기화 전 변경 내용 미리보기 제공
- 충돌 시 사용자에게 확인 요청
