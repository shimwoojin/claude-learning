# Claude Learning Docs - Project Context

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | claude-learning-docs |
| 목적 | Claude Code와 함께한 프로젝트별 학습 기록 문서화 |
| GitHub | https://github.com/shimwoojin/claude-learning |
| 배포 | Vercel (설정 예정) |
| 현재 상태 | 초기 설정 완료, 포트폴리오 학습 기록 작성됨 |

## 기술 스택

- **문서 프레임워크**: VitePress 1.6.4
- **언어**: Markdown
- **배포**: Vercel (예정)

## 프로젝트 구조

```
claude-learning-docs/
├── docs/
│   ├── .vitepress/
│   │   └── config.js          # VitePress 설정 (nav, sidebar, theme)
│   ├── projects/
│   │   ├── index.md           # 프로젝트 목록 페이지
│   │   └── portfolio.md       # shimwoojin-portfolio 학습 기록
│   └── index.md               # 홈페이지 (hero section)
├── .gitignore
├── package.json
└── CLAUDE.md
```

## 개발 명령어

```bash
npm run docs:dev      # 개발 서버 (localhost:5173)
npm run docs:build    # 프로덕션 빌드
npm run docs:preview  # 빌드 미리보기
```

## 문서 작성 규칙

### 새 프로젝트 학습 기록 추가

1. `docs/projects/` 에 `{project-name}.md` 파일 생성
2. `docs/.vitepress/config.js`의 sidebar에 항목 추가:
```js
sidebar: {
  '/projects/': [
    {
      text: '프로젝트 학습 기록',
      items: [
        { text: '개요', link: '/projects/' },
        { text: 'Portfolio (React)', link: '/projects/portfolio' },
        { text: '새 프로젝트', link: '/projects/new-project' }  // 추가
      ]
    }
  ]
}
```

### 학습 기록 문서 구조

```markdown
# 프로젝트명

프로젝트 설명

## 프로젝트 개요
| 항목 | 내용 |
|------|------|
| 기간 | ... |
| 배포 | ... |

## 주요 기능 구현
### 1. 기능명
- 사용 라이브러리
- 핵심 코드
- 배운 점

## 핵심 개념 정리
## 회고
```

## 현재 작성된 학습 기록

### shimwoojin-portfolio (docs/projects/portfolio.md)

| 기능 | 학습 내용 |
|------|-----------|
| PDF 다운로드 | html2pdf.js, DOM 클론, 옵션 설정 |
| Vercel Analytics | @vercel/analytics 연동 |
| SEO 메타태그 | Open Graph, Twitter Card |
| 다국어 지원 | React Context, localStorage, 브라우저 언어 감지 |
| 스크롤 애니메이션 | Intersection Observer, 커스텀 훅 |
| 404 페이지 | React Router 와일드카드 라우트 |

## 다음 작업

- [ ] Vercel 배포 설정
- [ ] 추가 프로젝트 학습 기록 작성 (GAS 멀티플레이 게임 등)
- [ ] 검색 기능 테스트
- [ ] 파비콘/로고 추가

## 참고 링크

- VitePress 공식 문서: https://vitepress.dev
- 포트폴리오: https://shimwoojin-portfolio.vercel.app

---
**Last Updated**: 2026-01-18
