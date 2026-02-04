import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Claude Learning Docs',
  description: 'Claude Code와 함께한 프로젝트 학습 기록',
  lang: 'ko-KR',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '홈', link: '/' },
      { text: '프로젝트', link: '/projects/' },
      { text: '대화 기록', link: '/conversations/' }
    ],

    sidebar: {
      '/projects/': [
        {
          text: '프로젝트 학습 기록',
          items: [
            { text: '개요', link: '/projects/' },
            { text: 'Portfolio (React)', link: '/projects/portfolio' },
            { text: 'WjWorld (Unreal)', link: '/projects/wjworld' }
          ]
        }
      ],
      '/conversations/': [
        {
          text: '대화 기록',
          items: [
            { text: '개요', link: '/conversations/' },
            { text: '전체 대화', link: '/conversations/all' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/shimwoojin' }
    ],

    footer: {
      message: 'Claude Code와 함께한 학습 기록',
      copyright: '© 2026 Shim Woojin'
    },

    search: {
      provider: 'local'
    },

    outline: {
      label: '목차',
      level: [2, 3]
    },

    docFooter: {
      prev: '이전',
      next: '다음'
    }
  }
})
