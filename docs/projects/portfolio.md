# shimwoojin-portfolio

React 학습 및 개인 포트폴리오 웹사이트 제작 프로젝트

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 기간 | 2026.01 |
| 배포 | [shimwoojin-portfolio.vercel.app](https://shimwoojin-portfolio.vercel.app) |
| GitHub | [shimwoojin/shimwoojin-portfolio](https://github.com/shimwoojin/shimwoojin-portfolio) |

### 기술 스택

- **프레임워크**: React 18.2.0
- **빌드 도구**: Vite 5.0.8
- **라우팅**: React Router DOM
- **배포**: Vercel (자동 배포)

---

## 주요 기능 구현

### 1. PDF 다운로드 기능

경력기술서 페이지를 PDF로 다운로드하는 기능 구현

#### 사용 라이브러리
```bash
npm install html2pdf.js
```

#### 핵심 코드
```jsx
import html2pdf from 'html2pdf.js'

const handleDownloadPdf = async () => {
  // 원본 DOM 변경 방지를 위해 클론 생성
  const element = contentRef.current.cloneNode(true)

  // PDF에서 제외할 요소 제거
  const nav = element.querySelector('.resume-nav')
  if (nav) nav.remove()

  const opt = {
    margin: [10, 10, 10, 10],
    filename: '심우진_경력기술서.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  await html2pdf().set(opt).from(element).save()
}
```

#### 배운 점
- `cloneNode(true)`로 DOM 복제하여 원본 보존
- PDF 생성 시 특정 요소 제외 가능
- html2canvas의 scale 옵션으로 해상도 조절

---

### 2. Vercel Analytics 연동

방문자 분석을 위한 Vercel Analytics 연동

#### 설치 및 적용
```bash
npm install @vercel/analytics
```

```jsx
// App.jsx
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <div className="App">
      <Routes>...</Routes>
      <Analytics />
    </div>
  )
}
```

#### 배운 점
- Vercel 프로젝트에서는 단 2줄로 Analytics 연동 가능
- 쿠키 없이 프라이버시 친화적인 분석 가능
- 무료 플랜에서도 기본 분석 제공

---

### 3. SEO 메타태그

검색 엔진 최적화 및 SNS 공유 미리보기를 위한 메타태그 추가

#### Open Graph 태그
```html
<!-- 기본 SEO -->
<title>심우진 | 게임 클라이언트 프로그래머 포트폴리오</title>
<meta name="description" content="Unreal Engine, Unity 기반 게임 클라이언트 프로그래머..." />

<!-- Open Graph (카카오톡, 페이스북, 링크드인) -->
<meta property="og:type" content="website" />
<meta property="og:title" content="심우진 | 게임 클라이언트 프로그래머" />
<meta property="og:description" content="Unreal Engine, Unity 기반 게임 개발자..." />
<meta property="og:image" content="https://shimwoojin-portfolio.vercel.app/picture_shimwoojin.jpg" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="심우진 | 게임 클라이언트 프로그래머" />
```

#### 배운 점
- Open Graph는 SNS 공유 시 미리보기 카드 생성
- `og:image`는 절대 URL 필요 (1200x630px 권장)
- Twitter Card는 별도 메타태그 필요

---

### 4. 다국어 지원 (i18n)

React Context를 활용한 한국어/영어 전환 기능

#### 프로젝트 구조
```
src/
├── context/
│   └── LanguageContext.jsx  # 언어 상태 관리
└── locales/
    ├── ko.js                # 한국어 번역
    └── en.js                # 영어 번역
```

#### LanguageContext 구현
```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import ko from '../locales/ko'
import en from '../locales/en'

const translations = { ko, en }
const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // 저장된 언어 또는 브라우저 언어 감지
    const saved = localStorage.getItem('language')
    if (saved) return saved
    const browserLang = navigator.language.slice(0, 2)
    return browserLang === 'ko' ? 'ko' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    document.documentElement.lang = language
  }, [language])

  const t = translations[language]
  const toggleLanguage = () => setLanguage(prev => prev === 'ko' ? 'en' : 'ko')

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
```

#### 컴포넌트에서 사용
```jsx
function About() {
  const { t } = useLanguage()

  return (
    <section>
      <h2>{t.about.title}</h2>
      <p>{t.about.intro}</p>
    </section>
  )
}
```

#### 배운 점
- Context API로 전역 상태 관리 가능
- `localStorage`로 사용자 설정 유지
- `navigator.language`로 브라우저 언어 감지
- 번역 파일 분리로 유지보수 용이

---

### 5. 스크롤 애니메이션 (Intersection Observer)

섹션이 뷰포트에 들어올 때 fade-in 애니메이션

#### 커스텀 훅 구현
```jsx
// hooks/useScrollFadeIn.js
import { useEffect, useRef, useState } from 'react'

export function useScrollFadeIn(options = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(element)  // 한 번만 트리거
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    observer.observe(element)
    return () => observer.unobserve(element)
  }, [])

  return { ref, isVisible }
}
```

#### CSS 애니메이션
```css
.fade-in-section {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.fade-in-section.visible {
  opacity: 1;
  transform: translateY(0);
}
```

#### 컴포넌트에서 사용
```jsx
function About() {
  const { ref, isVisible } = useScrollFadeIn()

  return (
    <section
      ref={ref}
      className={`about fade-in-section ${isVisible ? 'visible' : ''}`}
    >
      ...
    </section>
  )
}
```

#### 배운 점
- Intersection Observer는 스크롤 이벤트보다 성능 우수
- `threshold`: 요소가 얼마나 보여야 트리거할지 (0.1 = 10%)
- `rootMargin`: 뷰포트 마진 조절 (음수값으로 미리 트리거)
- `unobserve`로 한 번만 실행되게 최적화

---

### 6. 404 페이지

존재하지 않는 URL 접근 시 안내 페이지

#### React Router 설정
```jsx
// App.jsx
import NotFound from './pages/NotFound'

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/resume" element={<Resume />} />
  <Route path="*" element={<NotFound />} />  {/* 와일드카드 라우트 */}
</Routes>
```

#### 배운 점
- `path="*"`는 모든 매칭되지 않은 경로를 처리
- 404 페이지도 다국어 지원 가능

---

## 핵심 개념 정리

### React Context API
- 전역 상태 관리를 위한 React 내장 기능
- Redux 없이도 간단한 전역 상태 관리 가능
- `createContext`, `Provider`, `useContext` 패턴

### Intersection Observer API
- 요소의 가시성 변화를 비동기로 관찰
- 스크롤 이벤트 대비 성능 우수
- 무한 스크롤, 레이지 로딩, 애니메이션에 활용

### Custom Hook
- 재사용 가능한 로직 분리
- `use` 접두사로 명명
- 상태와 이펙트를 캡슐화

---

## 회고

### 잘한 점
- 기능 단위로 작은 커밋 유지
- 컴포넌트 분리로 재사용성 확보
- 커스텀 훅으로 로직 분리

### 개선할 점
- 번들 크기 최적화 (현재 1.8MB)
- 이미지 최적화 (WebP 변환 등)
- 테스트 코드 추가

### 다음에 적용할 것
- React.lazy()로 코드 스플리팅
- Error Boundary 추가
- Lighthouse 점수 개선
