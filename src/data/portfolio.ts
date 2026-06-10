export type PortfolioMetric = {
  value: string;
  label: string;
  detail: string;
};

export type PortfolioLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type PortfolioResult = {
  label: string;
  before?: string;
  after: string;
  effect?: string;
};

export type PortfolioGalleryImage = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export type PortfolioLivePreview = {
  url: string;
  label: string;
  description: string;
};

export type PortfolioProject = {
  slug: string;
  title: string;
  eyebrow: string;
  period: string;
  quote: string;
  summary: string;
  role: string;
  team?: string;
  contribution?: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  gallery?: PortfolioGalleryImage[];
  visualMode?: 'phone';
  livePreview?: PortfolioLivePreview;
  accent: string;
  metrics: PortfolioMetric[];
  highlights: string[];
  contributions: string[];
  results: PortfolioResult[];
  techStack: string[];
  problem: string;
  approach: string[];
  links: PortfolioLink[];
};

export type ResumeImpactMetric = {
  value: string;
  label: string;
  detail: string;
  tone: string;
};

export type ResumeHighlight = {
  title: string;
  metric?: string;
  description: string;
  href?: string;
};

export type CompanyLogo = {
  src: string;
  alt: string;
  width: number;
  height: number;
  shape: 'mark' | 'wide';
};

export type ResumeExperience = {
  slug: string;
  company: string;
  logo?: CompanyLogo;
  team: string;
  role: string;
  period: string;
  description: string;
  highlights: ResumeHighlight[];
};

export type ResumeFeatureProject = {
  title: string;
  period: string;
  links: PortfolioLink[];
  summary: string;
  metrics: ResumeImpactMetric[];
  bullets: ResumeHighlight[];
};

export type ResumeOpenSourceGroup = {
  title: string;
  subtitle: string;
  period?: string;
  links?: PortfolioLink[];
  bullets: ResumeHighlight[];
};

export const portfolioProfile = {
  name: '한만욱',
  role: 'Frontend Developer',
  phone: '010-3421-2440',
  email: 'hanmw110@naver.com',
  github: 'https://github.com/manNomi',
  blog: '/',
  headline: '대규모 제품의 UX 결함과 성능 병목을 끝까지 추적하는 프론트엔드 개발자입니다.',
  intro:
    'MAU 800만 서비스의 Android 백버튼 UX, 초기 로딩, React Activity 크래시, 오버레이 아키텍처를 다뤘고, Babel AST 기반 i18n 자동화 라이브러리와 오픈소스 기여까지 이어가고 있습니다.',
  focus: ['Product Frontend', 'Performance', 'Architecture Debugging', 'DX Automation']
} as const;

export const portfolioMetrics: PortfolioMetric[] = [
  {
    value: 'MAU 800만',
    label: '당근마켓 부동산 홈',
    detail: '생활밀착형 부동산 거래 플랫폼의 핵심 UX와 성능 병목을 개선했습니다.'
  },
  {
    value: 'LCP 50%',
    label: '초기 로딩 개선',
    detail: '지도 모듈 lazy loading과 청크 최적화로 홈 초기 로딩 지연을 줄였습니다.'
  },
  {
    value: '13,000+',
    label: 'I18Nexus 다운로드',
    detail: '다국어 추출, 타입 생성, Google Sheets 협업 흐름을 자동화했습니다.'
  },
  {
    value: '91.2%',
    label: '솔리드 커넥션 LCP 단축',
    detail: '오픈소스 서비스에서 LCP 1.3초 단축과 이탈률 개선을 만들었습니다.'
  }
];

export const resumeImpactMetrics: ResumeImpactMetric[] = [
  {
    value: '15%p',
    label: 'Android 이탈 문제 개선',
    detail: 'iOS 대비 높던 페이지 이탈 문제를 LIFO/Priority 백버튼 레이어로 개선',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  {
    value: '50%',
    label: '부동산 홈 LCP 개선',
    detail: '지도 모듈 lazy loading과 청크 최적화로 초기 로딩 병목 완화',
    tone: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  {
    value: '13,000+',
    label: 'I18Nexus 다운로드',
    detail: '다국어 자동화 라이브러리 누적 다운로드',
    tone: 'bg-violet-50 text-violet-800 border-violet-200'
  },
  {
    value: '0건',
    label: '번역 키 휴먼 에러',
    detail: '타입 지원으로 번역 키 누락과 오타를 빌드 단계에서 감지',
    tone: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  {
    value: '80%',
    label: '다국어 작업 시간 감축',
    detail: 'Babel AST 기반 래핑/추출 자동화로 반복 작업 제거',
    tone: 'bg-cyan-50 text-cyan-800 border-cyan-200'
  },
  {
    value: '71.6%',
    label: 'cold build 평균 단축',
    detail: 'Vinext 전환 가능성 검토 중 동일 환경 5회 측정 기준',
    tone: 'bg-rose-50 text-rose-800 border-rose-200'
  }
];

export const resumeExperiences: ResumeExperience[] = [
  {
    slug: 'daangn-real-estate',
    company: '당근마켓 부동산팀',
    logo: {
      src: '/images/companies/daangn-logo.png',
      alt: '당근 로고',
      width: 48,
      height: 77,
      shape: 'mark'
    },
    team: '신뢰도 높은 생활밀착형 정보를 제공하는 부동산 거래 플랫폼',
    role: 'Frontend Developer Intern',
    period: '2025.12 - 2026.03',
    description:
      'Android WebView 백버튼, Relay 기반 React Activity 크래시, 오버레이 스택, 홈 피드 메모리처럼 사용자 이탈로 이어지는 결함을 재현 가능한 구조 문제로 좁혀 제품 레이어에서 해결했습니다.',
    highlights: [
      {
        title: 'Android 백버튼 UX 결함 개선',
        metric: '이탈 문제 15%p 개선',
        description:
          'BottomSheet, Dialog, 페이지 이동이 섞인 Android WebView에서 백버튼이 화면을 닫지 않고 앱 이탈로 이어지는 문제를 LIFO/Priority 레이어로 정리했습니다.',
        href: '/blog/android-백버튼-시스템-설계'
      },
      {
        title: '부동산 홈 초기 로딩 최적화',
        metric: 'LCP 50% 개선',
        description:
          '사용자 문의로 드러난 부동산 홈 초기 로딩 병목을 지도 모듈 lazy loading과 chunk 분리로 줄였습니다.'
      },
      {
        title: 'React Activity 프로덕션 크래시 해결',
        metric: 'GC 메커니즘 분석',
        description:
          '지도 토글 성능 개선을 위해 도입한 React Activity가 Relay GC와 충돌하며 만든 프로덕션 크래시를 생명주기/retain 경계에서 추적했습니다.',
        href: '/blog/relay-react-activity-gc-크래시'
      },
      {
        title: '화면 전환/레이어 아키텍처 재설계',
        description:
          'overlay-kit 사용 과정에서 드러난 전역 오버레이 간섭을 Activity별 컨텍스트와 레이어 우선순위 문제로 재정의했습니다.',
        href: '/blog/overlay-kit-의-의도인가-버그인가'
      },
      {
        title: '긴 스크롤 메모리 부족 대응',
        metric: '중복 로그 없이 기능성 개선',
        description:
          '긴 스크롤에서 이미지, 로깅, 렌더 트리가 함께 누적되는 문제를 가상화 리스트와 1회 로깅 보장 구조로 끊었습니다.',
        href: '/blog/부동산-홈-피드-메모리-분석'
      },
      {
        title: 'AI 인스펙터 개발',
        description:
          '비개발자가 자연어로 UI와 플로우 변경을 요청하면 화면 맥락을 수집해 빠른 수정 루프로 이어지는 인스펙터를 구현했습니다.'
      },
      {
        title: '디자인 시스템 스와이프백 성능 개선',
        description:
          '사내 디자인 시스템에서 발생한 스와이프백 버벅임을 줄이기 위한 성능 개선에 기여했습니다.'
      }
    ]
  },
  {
    slug: 'upsite',
    company: '주식회사 업사이트',
    logo: {
      src: '/images/companies/upsite-logo.png',
      alt: '업사이트 로고',
      width: 127,
      height: 42,
      shape: 'wide'
    },
    team: 'AI와 데이터 디지털화를 통해 3D 건설 현장 데이터를 시각화하는 대시보드 웹 솔루션',
    role: 'Frontend Developer Intern',
    period: '2025.09 - 2025.12',
    description:
      '건설 현장 대시보드에서 다국어 추출 자동화, React Compiler 도입 오류, 대용량 PDF 변환, 오프라인 캐싱, 번역 QA를 제품 운영 비용을 줄이는 DX/UX 문제로 묶어 해결했습니다.',
    highlights: [
      {
        title: 'Babel AST 기반 i18n 추출 라이브러리 개발',
        metric: '작업 시간 80% 감축',
        description:
          '하드코딩 문자열 탐색, t() 래핑, key 추출, 타입 생성을 Babel AST 기반 CLI로 자동화했습니다.',
        href: '/blog/딸깍이면-내-프로젝트도-해외-진출'
      },
      {
        title: 'React Compiler Hook 인식 오류 분석',
        description:
          'Compiler lint suppression과 Hook 인식 경계가 만든 침묵 실패를 추적해 메모이제이션 누락이 숨어버리는 문제를 복구했습니다.',
        href: '/blog/리액트-컴파일러의-이슈를-수정하며'
      },
      {
        title: '대용량 건설 데이터 PDF 변환',
        description:
          '대용량 표, 이미지, 지도형 데이터를 화면 구조 손상 없이 PDF로 내려받을 수 있도록 변환 경계를 설계했습니다.',
        href: '/blog/복잡한-ui-데이터를-안전하게-pdf로-변환하는-방법'
      },
      {
        title: '불안정한 네트워크를 위한 오프라인 캐싱',
        description:
          '현장 네트워크 단절을 전제로 읽기 데이터와 사용자 작업 흐름이 유지되도록 오프라인 캐시 전략을 구성했습니다.',
        href: '/blog/공사-현장에서-오프라인-기능이-필요하지-않을까요'
      },
      {
        title: 'Google Sheets 기반 번역 QA',
        description:
          '번역 담당자가 실제 페이지 맥락에서 문구를 확인하고 Google Sheets로 바로 수정하는 QA 루프를 만들었습니다.',
        href: '/blog/i18n-부채-청산기'
      }
    ]
  }
];

export const resumeFeatureProject: ResumeFeatureProject = {
  title: 'I18Nexus',
  period: '2025.09 ~',
  links: [
    { label: '소개 글', href: '/blog/딸깍이면-내-프로젝트도-해외-진출' },
    { label: 'i18n 부채 청산기', href: '/blog/i18n-부채-청산기' },
    { label: 'Rust 이식 기록', href: '/blog/react-생태계-도구를-rust로-옮기며-배운-것들' }
  ],
  summary:
    '13,000+ 다운로드를 기록한 다국어 작업 자동화 라이브러리입니다. Babel AST 기반 코드 분석으로 번역 키 추출, t 메서드 래핑, 타입 생성을 자동화해 번역 누락을 줄입니다.',
  metrics: [
    {
      value: '13,000+',
      label: 'downloads',
      detail: '라이브러리와 CLI 생태계 누적 다운로드',
      tone: 'bg-zinc-950 text-white border-zinc-950'
    },
    {
      value: '70%',
      label: '협업 시간 단축',
      detail: 'Google Sheets 연동으로 개발자와 번역가 협업 흐름 개선',
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    {
      value: '0건',
      label: '번역 키 휴먼 에러',
      detail: '타입 지원으로 빌드 단계에서 누락과 오타 감지',
      tone: 'bg-blue-50 text-blue-800 border-blue-200'
    }
  ],
  bullets: [
    {
      title: 'AST 기반 코드 변환',
      description: 'useTranslation의 t 메서드 래핑, 번역 키 추출, 타입 생성을 자동화했습니다.'
    },
    {
      title: '반복 작업 자동화',
      description: '하드코딩 문자열 탐색, 래핑, 병합 작업을 줄여 다국어 적용 비용을 낮췄습니다.'
    },
    {
      title: '협업 워크플로우 개선',
      description: 'Google Sheets 연동으로 번역가와 개발자가 같은 데이터를 기준으로 작업할 수 있게 했습니다.'
    }
  ]
};

export const resumeOpenSourceGroups: ResumeOpenSourceGroup[] = [
  {
    title: 'DefinitelyTyped [relay-runtime]',
    subtitle: 'Relay Activity Crash 해결 과정에서 누락된 타입 정의 기여',
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/DefinitelyTyped/DefinitelyTyped', external: true },
      { label: 'PR #74280', href: 'https://github.com/DefinitelyTyped/DefinitelyTyped/pull/74280', external: true }
    ],
    bullets: [
      {
        title: 'Relay Activity 호환 타입 보강',
        metric: 'DefinitelyTyped #74280',
        description: 'relay-runtime v20.1.1에서 필요한 RelayFeatureFlags 타입 누락을 보강했습니다.',
        href: 'https://github.com/DefinitelyTyped/DefinitelyTyped/pull/74280'
      }
    ]
  },
  {
    title: 'vinext [Cloudflare]',
    subtitle: 'App Router와 static export, cache 회귀를 다룬 런타임/라우터 기여',
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/cloudflare/vinext', external: true },
      { label: 'PR #1192', href: 'https://github.com/cloudflare/vinext/pull/1192', external: true },
      { label: 'PR #1588', href: 'https://github.com/cloudflare/vinext/pull/1588', external: true },
      { label: 'PR #1590', href: 'https://github.com/cloudflare/vinext/pull/1590', external: true },
      { label: 'PR #1626', href: 'https://github.com/cloudflare/vinext/pull/1626', external: true }
    ],
    bullets: [
      {
        title: 'bfcacheId undefined 런타임 크래시 수정',
        metric: 'vinext #1192',
        description: 'Next.js 최신 useRouter().bfcacheId API에 맞춰 App Router shim과 관련 타입을 보강했습니다.',
        href: 'https://github.com/cloudflare/vinext/pull/1192'
      },
      {
        title: 'useRouter().bfcacheId 동작 구현',
        metric: 'vinext #1588',
        description: 'history state 기반 bfcache identity map으로 Next.js와 유사한 navigation identity semantics를 구현했습니다.',
        href: 'https://github.com/cloudflare/vinext/pull/1588'
      },
      {
        title: 'metadata asset 누락 수정',
        metric: 'vinext #1590',
        description: 'App Router static export에서 file-based metadata asset이 누락되는 문제를 Next.js 호환 경로로 보정했습니다.',
        href: 'https://github.com/cloudflare/vinext/pull/1590'
      },
      {
        title: 'query string cache 회귀 E2E 추가',
        metric: 'vinext #1626',
        description: 'router.replace 후 이전 query string이 복원되는 회귀를 막기 위한 App Router E2E fixture를 추가했습니다.',
        href: 'https://github.com/cloudflare/vinext/pull/1626'
      }
    ]
  }
];

export const resumeEducation = {
  school: '인하대학교',
  major: '컴퓨터공학과 학사',
  period: '2021.03 ~',
  detail: '7 / 8'
} as const;

export const resumeActivities = [
  '객체지향 프로그래밍 수업 학부생 조교 2025.03',
  'INCOM 해커톤 1등(대상) 2024.11',
  '인하대 활동우수상 2021.06',
  '인하대 전공멘토단 및 홍보대사 2021.03'
] as const;

export const resumeSkillGroups = [
  {
    title: 'Core',
    items: ['React', 'TypeScript', 'JavaScript', 'Next.js']
  },
  {
    title: 'Strength',
    items: ['Performance', 'WebView', 'React Activity', 'Relay', 'AST Tooling', 'i18n Automation']
  },
  {
    title: 'Product',
    items: ['DX Automation', 'Offline Cache', 'PDF Rendering', 'Design System', 'Open Source']
  }
] as const;

export const portfolioStrengths = [
  {
    title: '실시간 UI를 먼저 움직이게 만들기',
    detail: '낙관적 업데이트, 소켓 이벤트, 클라이언트 캐시를 조합해 사용자가 기다리는 시간을 줄입니다.'
  },
  {
    title: '브라우저 한계를 제품 구조로 풀기',
    detail: 'WebGL 컨텍스트, 지도 과금, 렌더링 실패처럼 단순 스타일 수정으로 해결되지 않는 문제를 구조로 다룹니다.'
  },
  {
    title: 'MVP를 배포 가능한 상태까지 밀기',
    detail: '프론트엔드 구현을 넘어 EC2, GitHub Actions, HTTPS, 광고 UI 충돌까지 서비스 완성 조건을 챙깁니다.'
  },
  {
    title: '갈등을 동작하는 시제품으로 정리하기',
    detail: '요구가 충돌할 때 각자의 우려를 듣고 48시간 안에 확인 가능한 대안을 만들어 의사결정을 돕습니다.'
  }
] as const;

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: 'i18nexus',
    title: 'I18Nexus',
    eyebrow: 'i18n Automation Toolkit',
    period: '2025.09 ~',
    quote: 'i18n의 병목은 t() 호출이 아니라, 번역 키와 코드와 협업 문서가 서로 어긋나는 순간에 생겼습니다.',
    summary:
      '하드코딩 문자열, JSON 리소스, 번역 시트, 타입 정의가 따로 움직이던 i18n 작업을 AST 기반 CLI와 type-safe runtime으로 묶은 자동화 툴킷입니다. 13,000+ 다운로드와 Google Sheets 동기화로 실제 사용성을 검증했습니다.',
    role: '라이브러리 설계, AST 변환, CLI/DX 자동화',
    team: '개인 오픈소스',
    contribution: '기획·구현 100%',
    image: '/images/projects/i18nexus-logo.png',
    imageAlt: 'I18Nexus 로고 이미지',
    imageWidth: 1254,
    imageHeight: 1254,
    livePreview: {
      url: 'https://i18nexus.pro/',
      label: 'i18nexus.pro',
      description: '런타임과 도구 생태계를 설명하는 실제 제품 사이트를 모바일 베젤 안에서 확인할 수 있습니다.'
    },
    accent: '#71717a',
    metrics: [
      { value: '13,000+', label: '누적 다운로드', detail: '런타임과 CLI 도구 생태계 다운로드' },
      { value: '80%', label: '작업 시간 감축', detail: '수동 래핑, 추출, 동기화 반복 작업 자동화' },
      { value: '0건', label: '번역 키 휴먼 에러', detail: 'generated type으로 누락과 오타를 빌드 단계에서 감지' }
    ],
    highlights: [
      'Babel AST로 JSX 텍스트와 문자열 리터럴을 찾아 t() 호출, key, JSON resource를 자동 생성',
      'runtime과 tools가 같은 namespace/type 계약을 보게 만들어 코드와 번역 리소스 drift를 차단',
      'Google Sheets upload/download로 개발자와 번역 담당자의 작업 기준을 하나로 통합',
      'i18next의 대체 런타임이 아니라 React i18n 운영 workflow를 자동화하는 toolkit으로 포지셔닝'
    ],
    contributions: [
      'wrapper, extractor, upload, download 명령을 분리해 추출부터 협업 시트 반영까지 CLI로 연결했습니다.',
      'translationImportSource를 설정화해 react-i18next, next-i18next, react-intl 위에서도 도입할 수 있게 했습니다.',
      'generated type을 기준으로 누락 key와 오타를 빌드 단계에서 끊도록 runtime/tools 계약을 맞췄습니다.',
      'TypeScript/Babel 구현을 Rust로 옮겨보며 대규모 코드베이스에서 병목이 되는 파싱 비용을 검토했습니다.'
    ],
    results: [
      { label: '누적 다운로드', after: '13,000+', effect: '외부 사용 검증' },
      { label: '반복 작업 시간', before: '수동 래핑/추출', after: '자동 변환', effect: '80% 감축' },
      { label: '번역 키 검증', before: '런타임 확인', after: '타입 검증', effect: '휴먼 에러 감소' },
      { label: '협업 방식', before: '개발자 중심 JSON 수정', after: 'Google Sheets 동기화', effect: '비개발자 협업 가능' },
      { label: 'SSR 대응', before: 'client hook 중심', after: 'server helper 제공', effect: 'Next.js App Router 대응' }
    ],
    techStack: ['TypeScript', 'Babel AST', 'CLI', 'Google Sheets API', 'React', 'Next.js', 'SSR', 'i18n', 'Rust'],
    problem:
      'i18n 부채는 t() 호출 누락보다 key naming, namespace, JSON resource, 번역 시트, 타입 정의가 서로 다른 시점에 깨지는 운영 문제였습니다.',
    approach: [
      'AST 분석으로 JSX 텍스트를 찾아 t() 래핑, key 생성, JSON 병합, 타입 생성을 한 번에 처리했습니다.',
      'Google Sheets를 번역 협업의 source of truth로 두고 upload/download 명령을 만들었습니다.',
      'runtime core와 tools가 같은 namespace/key 계약을 공유하게 해 코드와 리소스 불일치를 줄였습니다.',
      'i18next보다 빠른 런타임이 아니라 React 앱의 번역 운영 비용을 줄이는 toolkit으로 메시지를 좁혔습니다.'
    ],
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/i18n-global/i18n-mono', external: true },
      { label: 'npm i18nexus', href: 'https://www.npmjs.com/package/i18nexus', external: true },
      { label: 'npm tools', href: 'https://www.npmjs.com/package/i18nexus-tools', external: true },
      { label: '소개 글', href: '/blog/딸깍이면-내-프로젝트도-해외-진출' },
      { label: 'i18n 부채 청산기', href: '/blog/i18n-부채-청산기' },
      { label: 'Rust 이식 기록', href: '/blog/react-생태계-도구를-rust로-옮기며-배운-것들' },
      { label: 'i18next와의 포지셔닝', href: '/blog/i18nexus는-i18next보다-빠른가-질문을-조금-바꿔야-한다' }
    ]
  },
  {
    slug: 'solid-connection',
    title: '솔리드 커넥션',
    eyebrow: 'Product Performance & DX',
    period: '2025.06 ~',
    quote: '성능 개선은 초를 줄이는 일이 아니라, 사용자가 가치에 도달하는 경로를 짧게 만드는 일이었습니다.',
    summary:
      '교환학생 플랫폼에서 홈 성능, 커뮤니티 퍼널, 대학 catalog 배포 경계, React 19/Next 16 업그레이드, 운영 자동화를 제품 지표와 배포 책임 기준으로 정리했습니다. LCP 91.2% 개선, 이탈률 21% → 16%, SSG 대상 188개 → 35개 분리를 만들었습니다.',
    role: '프론트엔드 성능 개선, 운영 자동화, 배포 경계 설계',
    team: '오픈소스/사이드 프로젝트',
    contribution: '성능·DX 개선 주도',
    image: '/images/projects/solid-connection-cover.jpg',
    imageAlt: '솔리드 커넥션 교환학생 커뮤니티 오픈그래프 이미지',
    imageWidth: 1600,
    imageHeight: 900,
    livePreview: {
      url: 'https://www.solid-connection.com/',
      label: 'solid-connection.com',
      description: '교환학생 정보 탐색과 커뮤니티 진입 흐름을 실제 서비스 화면으로 확인할 수 있습니다.'
    },
    accent: '#52525b',
    metrics: [
      { value: '91.2%', label: '홈 LCP 개선', detail: '9.961s → 0.874s로 핵심 렌더링 지표 개선' },
      { value: '21% → 16%', label: '이탈률 개선', detail: '홈 유입 이후 이탈을 성능과 흐름 관점에서 개선' },
      { value: '188 → 35', label: 'SSG 대상 분리', detail: '대학 catalog를 멀티존으로 분리해 main web 배포 부담 축소' },
      { value: '7.5s', label: 'Turbopack compile', detail: 'React 19, Next 16 업그레이드 후 production build 경로 안정화' }
    ],
    highlights: [
      'LCP 후보와 이미지 우선순위를 재선정해 홈 초기 렌더링을 9.961s → 0.874s로 단축',
      '로그인 장벽 때문에 가치 도달 전 이탈하던 커뮤니티 퍼널을 GA 기반으로 재설계',
      '대학 catalog SSG를 main web에서 분리해 배포 blast radius와 Vercel 대기 시간을 축소',
      '자연어 요청 → 큐 저장 → 로컬 워커 → PR/프리뷰 링크 전송까지 운영 인스펙터로 연결'
    ],
    contributions: [
      'Performance 패널과 GA를 같이 보며 LCP, 이탈률, 커뮤니티 도달률을 하나의 퍼널 문제로 재정의했습니다.',
      '이미지와 비핵심 섹션의 로딩 우선순위를 낮춰 사용자가 먼저 보는 화면의 체감 속도를 올렸습니다.',
      '대학 정보 SSG를 별도 zone으로 분리해 SEO 요구는 유지하고 main web 배포 책임은 줄였습니다.',
      'React 19/Next 16 업그레이드와 Turbopack 전환을 PR 단위로 나눠 회귀 원인을 좁혔습니다.',
      'Bruno Docs codegen과 운영 인스펙터로 API 연동, QA, PR 생성 반복을 자동화했습니다.'
    ],
    results: [
      { label: '홈 LCP', before: '9.961s', after: '0.874s', effect: '91.2% 개선' },
      { label: '홈 이탈률', before: '21%', after: '16%', effect: '5%p 개선' },
      { label: '정적 생성 대상', before: '188개', after: '35개', effect: 'main web 배포 부담 축소' },
      { label: 'SSG 생성 시간', before: '5.6s', after: '1.626s', effect: '약 71% 단축' },
      { label: 'Next compile', before: 'webpack build', after: 'Turbopack 7.5s', effect: 'Next 16 기본 빌더 전환 준비' }
    ],
    techStack: ['Next.js', 'React 19', 'Turbopack', 'Turborepo', 'Vercel', 'Google Analytics', 'Bruno', 'AI Inspector', 'Firestore'],
    problem:
      '트래픽은 있었지만 홈 LCP와 로그인 중심 커뮤니티 진입 때문에 사용자가 가치에 도달하기 전 이탈했습니다. 대학 catalog SSG는 main web 배포와 묶여 작은 수정도 전체 배포 비용으로 번졌습니다.',
    approach: [
      'GA와 Performance 패널로 LCP, 이탈률, 커뮤니티 도달률을 먼저 수치화했습니다.',
      'LCP 후보 이미지와 비핵심 섹션 로딩을 분리하고, 커뮤니티는 로그인보다 가치 노출이 먼저 오도록 바꿨습니다.',
      '대학 catalog를 별도 Next.js zone으로 빼 SEO 요구와 main web 배포 책임을 분리했습니다.',
      'React 19/Next 16 호환 작업과 Turbopack 전환을 나눠 리뷰 범위와 회귀 지점을 줄였습니다.',
      'Bruno codegen과 큐 기반 운영 인스펙터로 반복 운영 작업과 품질 확인 루프를 자동화했습니다.'
    ],
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/solid-connection/solid-connect-web', external: true },
      { label: '성능 개선 기록', href: '/blog/페이지-속도가-이탈률-감소와-연관이-있을까' },
      { label: '커뮤니티 퍼널 분석', href: '/blog/유령-커뮤니티에-활기를-불어넣는법' },
      { label: '멀티존 전환 기록', href: '/blog/빌드-속도-개선을-위한-마이크로-프론트엔드' },
      { label: 'React 19 전환기', href: '/blog/솔커-react-19-next-16-업그레이드와-turbopack-전환기' },
      { label: 'Bruno codegen', href: '/blog/bruno-api용-codegen-을-만들자' },
      { label: '운영 인스펙터', href: '/blog/qa를-필요한-사람이-하게-하자' }
    ]
  },
  {
    slug: 'football-square',
    title: 'FootBallSquare',
    eyebrow: 'Realtime Matching Platform',
    period: '2025.02 ~',
    quote: '게임처럼 즉시 반응하는 웹, 그것이 목표였습니다.',
    summary:
      'EA FC ProClub 유저의 팀 매칭, 대회, 채팅을 한 흐름에 묶은 실시간 플랫폼입니다. 비순차 raw match 데이터를 브래킷으로 재구성하고 낙관적 UI를 직접 구현해 매치 생성 체감 반응을 0ms로 만들었습니다.',
    role: '실시간 데이터 및 대시보드 성능 최적화 담당',
    team: 'FE 2명, BE 2명',
    contribution: '기여도 85%',
    image: '/images/projects/football-square-cover.jpg',
    imageAlt: 'FootBallSquare 축구 커뮤니티 배너 이미지',
    imageWidth: 1600,
    imageHeight: 900,
    accent: '#16a34a',
    metrics: [
      { value: '0ms', label: '매치 생성 체감 반응', detail: 'Optimistic UI로 즉시 화면 반영' },
      { value: '1회', label: '매치 API 호출', detail: '2~3회 호출 흐름을 하나로 통합' },
      { value: '5ms 이하', label: '클라이언트 연산', detail: '비순차 매치 데이터를 브래킷으로 변환' }
    ],
    highlights: [
      '매칭, 대회, 팀 관리, 채팅을 하나의 대시보드 경험으로 연결',
      '비순차 raw match 데이터를 라운드/팀 기준 브래킷으로 즉시 재구성',
      'React Query 없이 백업/커밋/롤백을 포함한 optimistic cache 흐름 구현',
      'Socket.io 팀 채팅을 floating entry로 분리해 경기 흐름을 방해하지 않게 설계'
    ],
    contributions: [
      '매치 생성, 삭제, 스코어 수정의 실패 케이스까지 고려해 백업/커밋/롤백 흐름을 설계했습니다.',
      '팀장, 팀원, 대회 참가자 역할에 따라 대시보드 뷰와 액션 노출을 분리했습니다.',
      '브래킷 가공을 클라이언트로 옮겨 서버 응답 대기 없이 토너먼트 상태를 먼저 갱신했습니다.'
    ],
    results: [
      { label: '매치 생성 반응시간', before: '평균 800ms', after: '0ms', effect: '즉시 반응 경험' },
      { label: '데이터 가공 위치', before: '서버 중심', after: '클라이언트 처리', effect: '연산 5ms 이하' },
      { label: 'API 호출 수', before: '2~3회 / 매치', after: '1회', effect: '요청 흐름 단순화' },
      { label: '토너먼트 구조', before: '수동 입력', after: '자동 생성 및 진출 처리', effect: '운영 부담 감소' }
    ],
    techStack: ['React', 'Tailwind CSS', 'Axios', 'Zustand', 'Socket.io'],
    problem:
      '게임 유저 대상 서비스에서 매치 생성이 서버 응답을 기다리면 제품의 즉시성이 무너집니다. 특히 토너먼트 진출 처리는 raw match 순서가 일정하지 않아 화면 갱신이 쉽게 어긋났습니다.',
    approach: [
      '서버 응답 전 임시 매치를 삽입하고 실패 시 이전 상태로 되돌리는 optimistic flow를 만들었습니다.',
      'Raw match 데이터를 라운드와 참가팀 기준으로 재구성해 브래킷을 서버 가공 없이 갱신했습니다.',
      '팀 모집, 일정 공지, 전적 기록을 사용자 역할별 화면으로 나누어 액션 혼선을 줄였습니다.',
      '채팅은 floating entry로 분리하고 socket event가 대시보드 상태를 흔들지 않도록 경계를 나눴습니다.'
    ],
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/footballSquare/frontend', external: true },
      { label: 'Optimistic UI 구현 글', href: '/blog/피파-프로클럽-대시보드-raw-데이터-처리와-optimistic-ui' }
    ]
  },
  {
    slug: 'incheon-bus',
    title: '인천 버스 도착 예측 서비스',
    eyebrow: 'Hackathon MVP',
    period: '2025.04',
    quote: '정확한 예측보다 먼저, 4주 안에 납득 가능한 제품을 만드는 것이 문제였습니다.',
    summary:
      '인천 버스의 실시간 위치, 정류장 채팅, 도착 예측을 2주 안에 검증 가능한 MVP로 만든 해커톤 프로젝트입니다. AI 예측 리스크는 확장 여지로 남기고, 노드 좌표와 구간 평균 속도로 ±10초 수준의 예측 경험을 먼저 완성했습니다.',
    role: '프론트엔드 구현, 실시간 UI, 배포 파이프라인 구축',
    team: 'FE/UI·UX 1명, BE 1명',
    contribution: '인컴해커톤 Linced 3.0 사업단장상 대상',
    image: '/images/projects/buslive-move.gif',
    imageAlt: 'BusLive 실시간 버스 이동 화면',
    imageWidth: 666,
    imageHeight: 1194,
    gallery: [
      {
        src: '/images/projects/buslive-login.png',
        alt: 'BusLive 로그인 화면',
        caption: 'Login Page',
        width: 668,
        height: 1194
      },
      {
        src: '/images/projects/buslive-move.gif',
        alt: 'BusLive 메인 지도 이동 화면',
        caption: 'Main Page',
        width: 666,
        height: 1194
      },
      {
        src: '/images/projects/buslive-chat-list.png',
        alt: 'BusLive 채팅 목록 화면',
        caption: 'Chat List',
        width: 668,
        height: 1194
      },
      {
        src: '/images/projects/buslive-chat-page.png',
        alt: 'BusLive 정류장 채팅 화면',
        caption: 'Chat Page',
        width: 668,
        height: 1194
      },
      {
        src: '/images/projects/buslive-move-small.gif',
        alt: 'BusLive 버스 이동 상세 화면',
        caption: 'Move Feature',
        width: 666,
        height: 1194
      }
    ],
    visualMode: 'phone',
    accent: '#2563eb',
    metrics: [
      { value: '±10초', label: '도착 예측 정확도', detail: '사용자가 체감할 수 있는 수준으로 예측 결과 제공' },
      { value: '2주', label: 'MVP 완성', detail: '4주 계획을 2주 만에 앞당겨 완성' },
      { value: '1위', label: '해커톤 수상', detail: '12팀 중 대상 수상' }
    ],
    highlights: [
      '정류장별 WebSocket 채팅과 지도 기반 실시간 위치 시각화 구현',
      '노드 좌표와 구간 평균 속도로 인천 지역 초정밀 위치 추적 공백 보완',
      'Bus/Chat entity와 Map/Chat page를 나눈 FSD 구조로 MVP 변경 비용 축소',
      'AWS EC2, GitHub Actions, Let’s Encrypt로 HTTPS 배포 자동화',
      '광고 영역과 채팅 패널이 겹치는 문제를 레이어 위계와 진입 흐름으로 해결'
    ],
    contributions: [
      'AI 예측 요구와 4주 일정 사이의 충돌을 듣고, 확장 가능한 규칙 기반 MVP로 범위를 재정의했습니다.',
      '48시간 안에 프로토타입을 만들어 기능 방향을 회의가 아니라 실제 화면으로 결정하게 했습니다.',
      '지도, 실시간 채팅, 배포, HTTPS, 광고 UI 충돌까지 데모가 아닌 서비스 조건으로 챙겼습니다.'
    ],
    results: [
      { label: '도착 예측 정확도', after: '±10초 수준', effect: '사용자 기대치 충족' },
      { label: 'MVP 개발 기간', before: '4주 계획', after: '2주 완성', effect: '조기 검증 가능' },
      { label: '해커톤 결과', before: '12팀 경쟁', after: '대상 수상', effect: '제품 방향성 검증' },
      { label: '배포 자동화', before: '수동 배포', after: 'GitHub Actions + HTTPS', effect: '배포 민첩성 확보' }
    ],
    techStack: [
      'React',
      'Recoil',
      'Styled-components',
      'WebSocket',
      'Node.js',
      'Express',
      'Naver Maps API',
      'AWS EC2',
      'GitHub Actions',
      'Let’s Encrypt',
      'FSD'
    ],
    problem:
      '팀은 AI 예측을 핵심 차별점으로 원했지만 4주 안에 안정적으로 검증하기에는 리스크가 컸습니다. 반대로 지도, 채팅, 도착 정보는 사용자가 바로 판단할 수 있는 MVP의 핵심이었습니다.',
    approach: [
      '팀장과 개발진을 따로 만나 리스크와 목표를 분리하고, 대상 수상이라는 공통 목표를 먼저 맞췄습니다.',
      'AI 예측은 추후 고도화 지점으로 남기고, MVP에서는 정류장별 위치/도착 정보의 신뢰도를 우선했습니다.',
      '인천에서 초정밀 위치 추적이 비어 있는 문제를 노드 좌표와 구간 평균 속도 계산으로 보완했습니다.',
      '광고, 채팅, 지도처럼 겹치기 쉬운 UI는 레이어와 진입 흐름을 분리해 실제 서비스 화면으로 정리했습니다.'
    ],
    links: [{ label: 'GitHub 저장소', href: 'https://github.com/manNomi/BusLiveWeb', external: true }]
  },
  {
    slug: 'dmap-map-grid',
    title: 'DMAP 지도 썸네일 최적화',
    eyebrow: 'Rendering Performance',
    period: '2024.10 ~ 2025.02',
    quote: '구글 지도 18개를 동시에 띄우면 어떤 일이 벌어질까?',
    summary:
      '이동 경로를 지도 위에 남기고 SNS 피드로 공유하는 DMAP에서 프로필 3×3 지도 그리드를 최적화했습니다. 18개 동적 Google Map이 만들던 WebGL 크래시와 월 $70 과금을 정적 썸네일 + 전역 동적 지도 1개 구조로 해결했습니다.',
    role: '프로필 기능 전담, 렌더링 최적화 및 지도 구조 개선 주도',
    team: 'FE 2명, BE 2명',
    contribution: '기여도 90%',
    image: '/images/projects/dmap-readme-tracking.png',
    imageAlt: 'DMAP README 경로 트래킹 화면',
    imageWidth: 411,
    imageHeight: 740,
    gallery: [
      {
        src: '/images/projects/dmap-readme-home.png',
        alt: 'DMAP README 홈 화면',
        caption: '홈 화면',
        width: 413,
        height: 734
      },
      {
        src: '/images/projects/dmap-readme-tracking.png',
        alt: 'DMAP README 경로 트래킹 화면',
        caption: '경로 트래킹',
        width: 411,
        height: 740
      }
    ],
    visualMode: 'phone',
    accent: '#ea580c',
    metrics: [
      { value: '0건', label: '렌더링 실패', detail: '벡터 지도 크래시를 정적 지도 전략으로 해결' },
      { value: '$0', label: '월 API 비용', detail: '무료 한도 안에서 유지되도록 호출 구조 개선' },
      { value: '18개', label: '지도 썸네일', detail: '정적 썸네일과 전역 동적 지도 1개를 조합' }
    ],
    highlights: [
      'WebGL 벡터 지도 16개 초과 시 컨텍스트 한계로 깨지는 현상 재현',
      '실시간 경로 트래킹, 경로 그리기, SNS 피드 흐름을 지도 렌더링 구조와 연결',
      '6가지 실패 이후 정적 지도 + 전역 단일 동적 지도 하이브리드 전략 설계',
      'React Portal 상세 전환과 Google API 비용 알림 체계까지 운영 관점으로 정리'
    ],
    contributions: [
      '벡터 지도 16개 초과 시 발생하는 WebGL 컨텍스트 크래시를 재현하고 병목을 지도 인스턴스 수로 좁혔습니다.',
      '목록의 18개 지도는 정적 썸네일로, 상세 확인은 동적 지도 1개로 분리해 안정성과 UX를 함께 확보했습니다.',
      '과금 발생 뒤 Google API 사용량을 분석하고 무료 한도 안에 머물도록 모니터링/알림을 설정했습니다.',
      '무한 스크롤, API 호출, 코드 컨벤션 충돌을 팀 속도 관점에서 정리하며 구현 방향을 합의했습니다.'
    ],
    results: [
      { label: '지도 타입', before: '벡터 WebGL 지도', after: '정적 + 전역 동적 1개', effect: '메모리 사용량 감소' },
      { label: '렌더링 성능', before: '크래시 발생', after: '렌더링 실패 0건', effect: '안정성 확보' },
      { label: 'API 비용', before: '월 $70 과금', after: '$0', effect: '비용 100% 감소' },
      { label: '로딩 속도', before: '18개 동적 지도', after: '이미지 + 지도 1개', effect: '사용자 경험 개선' }
    ],
    techStack: ['React', 'JavaScript', 'Google Maps API', 'Static Maps API', 'React Portal'],
    problem:
      '프로필에서 3×3 썸네일을 여러 묶음으로 보여주면 한 화면에 최대 18개의 Google Maps 인스턴스가 필요했습니다. 벡터 지도는 WebGL 컨텍스트를 사용해 브라우저 한계에 닿으면 지도 일부가 사라졌습니다.',
    approach: [
      'WebGL 해제, key 리렌더링, 스켈레톤, 캡처, 인스턴스 재사용 등 6가지 방식을 실험해 실패 원인을 좁혔습니다.',
      '목록은 정적 지도 이미지로, 상세 확인은 전역 동적 지도 1개로 처리하는 하이브리드 구조를 선택했습니다.',
      'Google Maps 과금 구조와 호출량을 확인하고 알림을 설정해 기술 해결이 운영 비용 절감으로 이어지게 했습니다.',
      '코드 컨벤션, API 호출, 무한 스크롤 구현 차이를 조율하며 팀 전체 속도를 해치지 않는 방향으로 합의했습니다.'
    ],
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/Stageus/DMap-homepage/tree/master', external: true },
      { label: 'WebGL/비용 해결 과정', href: '/blog/구글지도-api-비용-120만원-청산' },
      { label: '팀 협업 회고', href: '/blog/코드의-옳고-그름보다-중요한-것-팀의-속도를-높이는-팔로워십' }
    ]
  }
];

export const featuredPostSlugs = [
  'android-백버튼-시스템-설계',
  'relay-react-activity-gc-크래시',
  '페이지-속도가-이탈률-감소와-연관이-있을까',
  '딸깍이면-내-프로젝트도-해외-진출',
  '공사-현장에서-오프라인-기능이-필요하지-않을까요',
  'bruno-api용-codegen-을-만들자'
] as const;
