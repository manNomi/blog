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
  accent: string;
  metrics: PortfolioMetric[];
  highlights: string[];
  contributions: string[];
  results: PortfolioResult[];
  techStack: string[];
  problem: string;
  approach: string[];
  takeaway: string;
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

export type ResumeExperience = {
  company: string;
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
    company: '당근마켓 부동산팀',
    team: '신뢰도 높은 생활밀착형 정보를 제공하는 부동산 거래 플랫폼',
    role: 'Frontend Developer Intern',
    period: '2025.12 - 2026.03',
    description:
      'Android 웹뷰, 지도 기반 홈 피드, React Activity, 오버레이 레이어, 긴 스크롤 메모리 문제처럼 실제 사용자 흐름에서 터지는 결함을 추적하고 제품 구조로 해결했습니다.',
    highlights: [
      {
        title: 'Android 백버튼 UX 결함 개선',
        metric: '이탈 문제 15%p 개선',
        description:
          '중첩형 UI가 백버튼으로 닫히지 않고 페이지 종료로 이어지는 결함을 발견하고, LIFO/Priority 기반 백버튼 관리 레이어를 설계했습니다.',
        href: '/blog/android-백버튼-시스템-설계'
      },
      {
        title: '부동산 홈 초기 로딩 최적화',
        metric: 'LCP 50% 개선',
        description:
          'MAU 800만 부동산 홈 초기 로딩 지연 문의를 계기로 지도 모듈 lazy loading과 청크 최적화를 적용했습니다.'
      },
      {
        title: 'React Activity 프로덕션 크래시 해결',
        metric: 'GC 메커니즘 분석',
        description:
          '홈 피드 지도 토글 성능 개선을 위해 React Activity를 도입한 뒤 발생한 크래시를 컴포넌트 생명주기와 Relay GC 관점에서 분석했습니다.',
        href: '/blog/relay-react-activity-gc-크래시'
      },
      {
        title: '화면 전환/레이어 아키텍처 재설계',
        description:
          '통일화되지 않은 오버레이 상태로 인한 충돌과 간섭을 줄이기 위해 Activity별 독립 오버레이 컨텍스트와 레이어 구조를 정리했습니다.',
        href: '/blog/overlay-kit-의-의도인가-버그인가'
      },
      {
        title: '긴 스크롤 메모리 부족 대응',
        metric: '중복 로그 없이 기능성 개선',
        description:
          '프로덕션 긴 스크롤 구간의 메모리 부족과 렌더링 지연에 대응하기 위해 가상화 리스트와 1회 로깅 보장 구조를 도입했습니다.',
        href: '/blog/부동산-홈-피드-메모리-분석'
      },
      {
        title: 'AI 인스펙터 개발',
        description:
          '비개발자가 자연어로 UI와 플로우를 수정할 수 있도록 빠른 개발을 돕는 AI 인스펙터 기능을 구현했습니다.'
      },
      {
        title: '디자인 시스템 스와이프백 성능 개선',
        description:
          '사내 디자인 시스템에서 발생한 스와이프백 버벅임을 줄이기 위한 성능 개선에 기여했습니다.'
      }
    ]
  },
  {
    company: '주식회사 업사이트',
    team: 'AI와 데이터 디지털화를 통해 3D 건설 현장 데이터를 시각화하는 대시보드 웹 솔루션',
    role: 'Frontend Developer Intern',
    period: '2025.09 - 2025.12',
    description:
      '건설 현장 데이터 대시보드에서 다국어 자동화, React Compiler, PDF 변환, 오프라인 캐싱, Google Sheets 기반 번역 QA까지 제품 운영에 필요한 DX와 UX를 함께 개선했습니다.',
    highlights: [
      {
        title: 'Babel AST 기반 i18n 추출 라이브러리 개발',
        metric: '작업 시간 80% 감축',
        description:
          '수동 래핑과 번역 키 추출 과정을 자동화하기 위해 I18Nexus를 개발하고 다국어 적용 비용을 줄였습니다.',
        href: '/blog/딸깍이면-내-프로젝트도-해외-진출'
      },
      {
        title: 'React Compiler Hook 인식 오류 분석',
        description:
          'React Compiler 도입 후 발생한 Hook 인식 오류를 분석하고 메모이제이션 누락 문제를 해결했습니다.',
        href: '/blog/react-compiler-도입'
      },
      {
        title: '대용량 건설 데이터 PDF 변환',
        description:
          '복잡한 UI 데이터를 구조 손상 없이 즉시 PDF로 변환하는 기능을 구현했습니다.',
        href: '/blog/복잡한-ui-데이터를-안전하게-pdf로-변환하는-방법'
      },
      {
        title: '불안정한 네트워크를 위한 오프라인 캐싱',
        description:
          '현장 작업자가 네트워크가 불안정한 환경에서도 서비스를 사용할 수 있도록 오프라인 캐싱 기능을 구현했습니다.',
        href: '/blog/웹뷰에도-오프라인-기능이-필요하지-않을까요'
      },
      {
        title: 'Google Sheets 기반 번역 QA',
        description:
          '비개발자가 실제 페이지에서 다국어 번역을 즉시 수정할 수 있도록 Google Sheets 연동 흐름을 구현했습니다.',
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
    title: '솔리드 커넥션',
    subtitle: '총 사용자 4,000+, MAU 400+의 교환학생 멘토링 및 정보 공유 플랫폼',
    period: '2025.06 ~',
    links: [
      { label: '성능 개선 기록', href: '/blog/페이지-속도가-이탈률-감소와-연관이-있을까' },
      { label: '커뮤니티 퍼널 분석', href: '/blog/유령-커뮤니티에-활기를-불어넣는법' },
      { label: 'Bruno codegen', href: '/blog/bruno-api용-codegen-을-만들자' },
      { label: '운영 인스펙터', href: '/blog/qa를-필요한-사람이-하게-하자' }
    ],
    bullets: [
      {
        title: '홈페이지 LCP 91.2% 단축',
        metric: '이탈률 21% → 16%',
        description: '서버 요청을 67% 줄이고 LCP를 1.3초 단축했습니다.',
        href: '/blog/페이지-속도가-이탈률-감소와-연관이-있을까'
      },
      {
        title: '낮은 페이지 도달률 문제 해결',
        metric: '커뮤니티 도달률 4.3%',
        description: '커뮤니티 접속 시도 대비 낮은 도달률을 퍼널 분석으로 추적했습니다.',
        href: '/blog/유령-커뮤니티에-활기를-불어넣는법'
      },
      {
        title: 'Bruno 기반 AI CLI와 API codegen',
        description: 'API 명세 연동 반복 작업을 줄이기 위해 Bruno Docs 기반 codegen 흐름을 개발했습니다.',
        href: '/blog/bruno-api용-codegen-을-만들자'
      },
      {
        title: '큐 기반 운영 인스펙터',
        description: '추가 운영비 없이 자연어 요청만으로 코드 변경, PR 생성, 프리뷰 확인까지 자동화했습니다.',
        href: '/blog/qa를-필요한-사람이-하게-하자'
      },
      {
        title: 'Turborepo 공통 컴포넌트 구조',
        description: '어드민과 웹 서비스 사이 중복 UI를 줄이고 관리 효율을 높였습니다.'
      },
      {
        title: 'Vinext 전환 가능성 검토',
        metric: 'cold build 71.6% 단축',
        description: '동일 환경 cold build 5회 측정 기준 평균 빌드 시간을 크게 낮췄습니다.'
      }
    ]
  },
  {
    title: 'DefinitelyTyped [relay-runtime]',
    subtitle: 'Relay Activity Crash 해결 과정에서 누락된 타입 정의 기여',
    bullets: [
      {
        title: 'Relay Activity 호환 타입 보강',
        description: 'Relay Activity Crash 해결 과정에서 호환 설정 적용에 필요한 누락 타입을 보강했습니다.',
        href: '/blog/relay-react-activity-gc-크래시'
      }
    ]
  },
  {
    title: 'vinext [Cloudflare]',
    subtitle: 'App Router와 static export, cache 회귀를 다룬 런타임/라우터 기여',
    bullets: [
      { title: 'bfcacheId undefined 런타임 크래시 수정', description: 'Cloudflare 환경에서 발생한 런타임 크래시를 수정했습니다.' },
      { title: 'useRouter().bfcacheId 동작 구현', description: '라우터 API에서 bfcacheId를 사용할 수 있도록 동작을 구현했습니다.' },
      { title: 'metadata asset 누락 수정', description: 'App Router static export에서 metadata asset이 누락되는 문제를 수정했습니다.' },
      { title: 'query string cache 회귀 E2E 추가', description: 'router.replace 후 이전 query string이 복원되는 회귀를 방지하는 테스트를 추가했습니다.' }
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
    slug: 'football-square',
    title: 'FootBallSquare',
    eyebrow: 'Realtime Matching Platform',
    period: '2025.02 ~',
    quote: '게임처럼 즉시 반응하는 웹, 그것이 목표였습니다.',
    summary:
      'EA FC ProClub 유저를 위한 팀 매칭, 토너먼트, 채팅 통합 플랫폼입니다. 매치 생성부터 토너먼트 자동 생성까지 클라이언트 연산과 낙관적 UI로 빠르게 반응하도록 설계했습니다.',
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
      '비순차 매치 데이터를 기반으로 토너먼트 브래킷을 실시간 시각화',
      'React Query 없이 커스텀 낙관적 업데이트와 캐싱 흐름 구현',
      'Socket.io 기반 팀 채팅 시스템과 floating 버튼 진입 구조 설계'
    ],
    contributions: [
      '매치 생성, 삭제, 스코어 수정처럼 복잡한 CRUD 동작에서 백업/커밋/롤백 흐름을 직접 설계했습니다.',
      '팀, 마이페이지, 대회 등 사용자 역할에 따라 필요한 뷰만 보이도록 조건부 렌더링 구조를 정리했습니다.',
      '서버 중심 데이터 가공을 클라이언트 처리로 옮겨 화면 전환과 토너먼트 갱신을 빠르게 만들었습니다.'
    ],
    results: [
      { label: '매치 생성 반응시간', before: '평균 800ms', after: '0ms', effect: '즉시 반응 경험' },
      { label: '데이터 가공 위치', before: '서버 중심', after: '클라이언트 처리', effect: '연산 5ms 이하' },
      { label: 'API 호출 수', before: '2~3회 / 매치', after: '1회', effect: '요청 흐름 단순화' },
      { label: '토너먼트 구조', before: '수동 입력', after: '자동 생성 및 진출 처리', effect: '운영 부담 감소' }
    ],
    techStack: ['React', 'Tailwind CSS', 'Axios', 'Zustand', 'Socket.io'],
    problem:
      '게임 유저를 위한 플랫폼이 서버 응답을 기다리며 늦게 반응하면 제품의 핵심 경험이 무너집니다. 특히 매치 생성과 토너먼트 진출 처리는 데이터 순서가 일정하지 않아 화면 갱신이 자주 어긋날 수 있었습니다.',
    approach: [
      '서버 응답 전 임시 매치 데이터를 먼저 삽입하고 실패 시 이전 상태로 되돌리는 낙관적 업데이트 흐름을 만들었습니다.',
      'Raw match 데이터를 라운드와 참가팀 기준으로 재구성해 브래킷 UI가 서버 가공 없이도 갱신되도록 했습니다.',
      '채팅은 전역 floating 버튼으로 접근성을 높이고, 소켓 이벤트가 화면 상태를 과도하게 흔들지 않도록 상태 경계를 나눴습니다.'
    ],
    takeaway:
      'React Query를 쓰지 않는 선택은 단순한 배제가 아니라 서버 상태 라이브러리가 해결하는 캐싱, 롤백, 동기화 비용을 직접 체감한 딥다이브였습니다.',
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
      '인천 지역 버스 사용자를 위한 초정밀 도착 예측 및 실시간 위치 시각화 서비스입니다. WebSocket 채팅, Naver Maps 기반 위치 표시, EC2 배포와 HTTPS 자동화까지 MVP 완성 조건을 직접 다뤘습니다.',
    role: '프론트엔드 구현, 실시간 UI, 배포 파이프라인 구축',
    contribution: '인컴해커톤 Linced 3.0 사업단장상 대상',
    image: '/images/projects/incheon-bus-cover.jpg',
    imageAlt: '인천 버스 도착 예측 서비스 지도 화면',
    imageWidth: 1600,
    imageHeight: 900,
    accent: '#2563eb',
    metrics: [
      { value: '±10초', label: '도착 예측 정확도', detail: '사용자가 체감할 수 있는 수준으로 예측 결과 제공' },
      { value: '2주', label: 'MVP 완성', detail: '4주 계획을 2주 만에 앞당겨 완성' },
      { value: '1위', label: '해커톤 수상', detail: '12팀 중 대상 수상' }
    ],
    highlights: [
      '정류장별 WebSocket 채팅과 실시간 위치 시각화 구현',
      'AWS EC2 웹서버 셋업, GitHub Actions, Let’s Encrypt HTTPS 자동화',
      'Google 애드센스 영역과 채팅 UI가 겹치는 문제를 레이아웃 위계 조정으로 해결'
    ],
    contributions: [
      '팀장이 원하는 AI 예측과 개발 일정 사이의 충돌을 듣고, 추후 고도화 가능한 MVP 대안을 제안했습니다.',
      '48시간 안에 프로토타입을 구현해 기능 방향을 말이 아니라 화면으로 검증했습니다.',
      '프론트엔드 UI, 실시간 채팅, 지도, 배포, 보안 설정까지 실제 서비스 운영에 필요한 주변 조건을 함께 챙겼습니다.'
    ],
    results: [
      { label: '도착 예측 정확도', after: '±10초 수준', effect: '사용자 기대치 충족' },
      { label: 'MVP 개발 기간', before: '4주 계획', after: '2주 완성', effect: '조기 검증 가능' },
      { label: '해커톤 결과', before: '12팀 경쟁', after: '대상 수상', effect: '제품 방향성 검증' },
      { label: '배포 자동화', before: '수동 배포', after: 'GitHub Actions + HTTPS', effect: '배포 민첩성 확보' }
    ],
    techStack: ['React', 'Recoil', 'Styled-components', 'WebSocket', 'Naver Maps API', 'AWS EC2', 'GitHub Actions', 'Let’s Encrypt'],
    problem:
      '팀은 AI 예측을 핵심으로 가져가고 싶었지만, 4주 안에 안정적으로 구현하기에는 리스크가 컸습니다. 동시에 실제 사용자가 볼 수 있는 지도, 채팅, 도착 정보는 빠르게 완성되어야 했습니다.',
    approach: [
      '팀장과 개발진을 따로 만나 우려와 목표를 분리해 들은 뒤, 모두가 원하는 대상 수상이라는 공통 목표를 먼저 맞췄습니다.',
      'AI 예측은 나중에 확장 가능한 구조로 남기고, MVP에서는 정류장별 도착 예측과 위치 시각화의 신뢰도를 우선했습니다.',
      '광고, 채팅, 지도처럼 서로 충돌하기 쉬운 UI 요소는 계층과 영역을 명확히 나눠 실제 서비스 화면으로 정리했습니다.'
    ],
    takeaway:
      '좋은 MVP는 기능을 덜 만드는 일이 아니라, 지금 검증해야 하는 핵심만 남기고 팀이 같은 방향으로 움직이게 만드는 일이라는 점을 배웠습니다.',
    links: [{ label: 'GitHub 저장소', href: 'https://github.com/manNomi/BusLiveWeb', external: true }]
  },
  {
    slug: 'dmap-map-grid',
    title: 'DMAP 지도 썸네일 최적화',
    eyebrow: 'Rendering Performance',
    period: '2024.10 ~ 2025.02',
    quote: '구글 지도 18개를 동시에 띄우면 어떤 일이 벌어질까?',
    summary:
      'DMAP 프로필 페이지의 3×3 지도 썸네일 그리드를 구현하며 WebGL 크래시, Google Maps API 과금, 렌더링 성능 저하를 해결한 프로젝트입니다.',
    role: '프로필 기능 전담, 렌더링 최적화 및 지도 구조 개선 주도',
    team: 'FE 2명, BE 2명',
    contribution: '기여도 90%',
    image: '/images/projects/dmap-cover.jpg',
    imageAlt: 'DMAP 경로 드로잉과 지도 트래킹 화면',
    imageWidth: 1600,
    imageHeight: 900,
    accent: '#ea580c',
    metrics: [
      { value: '0건', label: '렌더링 실패', detail: '벡터 지도 크래시를 정적 지도 전략으로 해결' },
      { value: '$0', label: '월 API 비용', detail: '무료 한도 안에서 유지되도록 호출 구조 개선' },
      { value: '18개', label: '지도 썸네일', detail: '정적 썸네일과 전역 동적 지도 1개를 조합' }
    ],
    highlights: [
      'WebGL 기반 벡터 지도의 컨텍스트 한계와 크래시 원인 분석',
      '6가지 실패 방식 이후 정적 지도 + 전역 단일 동적 지도 하이브리드 전략 설계',
      'React Portal 기반 상세 지도 전환과 Google API 비용 알림 체계 구축'
    ],
    contributions: [
      '벡터 지도 16개 초과 시 발생하는 WebGL 컨텍스트 크래시를 재현하고 병목을 분석했습니다.',
      '지도 18개 썸네일은 정적 이미지로, 상세 뷰는 동적 지도 1개로 분리해 안정성과 UX를 동시에 확보했습니다.',
      '과금 폭탄 이후 Google API 사용량을 분석하고 모니터링 및 알림 설정까지 정리했습니다.'
    ],
    results: [
      { label: '지도 타입', before: '벡터 WebGL 지도', after: '정적 + 전역 동적 1개', effect: '메모리 사용량 감소' },
      { label: '렌더링 성능', before: '크래시 발생', after: '렌더링 실패 0건', effect: '안정성 확보' },
      { label: 'API 비용', before: '월 $70 과금', after: '$0', effect: '비용 100% 감소' },
      { label: '로딩 속도', before: '18개 동적 지도', after: '이미지 + 지도 1개', effect: '사용자 경험 개선' }
    ],
    techStack: ['React', 'JavaScript', 'Google Maps API', 'Static Maps API', 'React Portal'],
    problem:
      '프로필 페이지에서 지도 썸네일을 많이 보여주려면 한 화면에 최대 18개의 Google Maps 인스턴스가 필요했습니다. 벡터 지도는 WebGL 컨텍스트를 사용했고, 브라우저 한계에 닿으면 지도 일부가 사라졌습니다.',
    approach: [
      'WebGL 컨텍스트 해제, key 기반 리렌더링, 스켈레톤, 캡처, 인스턴스 재사용 등 6가지 방식을 실험하며 실패 원인을 좁혔습니다.',
      '최종적으로 목록에서는 정적 지도 이미지를 사용하고, 상세 확인이 필요한 순간에만 전역 동적 지도 1개를 재사용했습니다.',
      'Google Maps 과금 구조를 확인하고 알림을 설정해 기술 해결이 운영 비용 절감으로 이어지도록 마무리했습니다.'
    ],
    takeaway:
      '렌더링 최적화는 빠르게 만드는 것만이 아니라 브라우저 자원, 외부 API 비용, 사용자 흐름을 함께 설계하는 일이라는 점을 배웠습니다.',
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/Stageus/DMap-homepage/tree/master', external: true },
      { label: 'WebGL 문제 해결 과정', href: '/blog/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기' }
    ]
  },
  {
    slug: 'solid-connection',
    title: '솔리드 커넥션',
    eyebrow: 'Product Performance & DX',
    period: '2025.06 ~',
    quote: '성능 개선은 초를 줄이는 일이 아니라, 사용자가 가치에 도달하는 경로를 짧게 만드는 일이었습니다.',
    summary:
      '교환학생 멘토링 및 정보 공유 플랫폼에서 홈 성능, 커뮤니티 퍼널, 대학 정보 배포 경계, API codegen, 운영 인스펙터를 개선한 프로젝트입니다. 블로그 기록을 바탕으로 LCP 91.2% 개선, 이탈률 21% → 16%, SSG 대상 188개 → 35개 분리 같은 변화를 정리했습니다.',
    role: '프론트엔드 성능 개선, 운영 자동화, 배포 경계 설계',
    team: '오픈소스/사이드 프로젝트',
    contribution: '성능·DX 개선 주도',
    image: '/images/projects/solid-connection-cover.jpg',
    imageAlt: '솔리드 커넥션 교환학생 커뮤니티 오픈그래프 이미지',
    imageWidth: 1600,
    imageHeight: 900,
    accent: '#52525b',
    metrics: [
      { value: '91.2%', label: '홈 LCP 개선', detail: '9.961s → 0.874s로 핵심 렌더링 지표 개선' },
      { value: '21% → 16%', label: '이탈률 개선', detail: '홈 유입 이후 이탈을 성능과 흐름 관점에서 개선' },
      { value: '188 → 35', label: 'SSG 대상 분리', detail: '대학 catalog를 멀티존으로 분리해 main web 배포 부담 축소' }
    ],
    highlights: [
      'LCP 후보를 다시 선정하고 이미지·섹션 로딩 전략을 조정해 홈 초기 렌더링 개선',
      '로그인 장벽 때문에 가치에 도달하지 못하던 커뮤니티 퍼널을 GA 기반으로 재설계',
      '대학 catalog SSG를 main web에서 분리해 배포 blast radius와 Vercel 대기 시간을 축소'
    ],
    contributions: [
      'Performance 패널과 GA 지표를 함께 보고 홈 이탈률, LCP, 커뮤니티 도달률을 제품 문제로 재정의했습니다.',
      '비핵심 섹션과 이미지 로딩 우선순위를 조정해 초기 화면의 체감 속도를 끌어올렸습니다.',
      '대학 정보 SSG를 별도 zone으로 분리해 SEO 요구는 유지하면서 main web 배포 책임을 줄였습니다.',
      'Bruno Docs 기반 API codegen과 큐 기반 운영 인스펙터로 반복 운영 작업을 예측 가능한 자동화 흐름으로 바꿨습니다.'
    ],
    results: [
      { label: '홈 LCP', before: '9.961s', after: '0.874s', effect: '91.2% 개선' },
      { label: '홈 이탈률', before: '21%', after: '16%', effect: '5%p 개선' },
      { label: '정적 생성 대상', before: '188개', after: '35개', effect: 'main web 배포 부담 축소' },
      { label: 'SSG 생성 시간', before: '5.6s', after: '1.626s', effect: '약 71% 단축' }
    ],
    techStack: ['Next.js', 'React', 'Turborepo', 'Vercel', 'Google Analytics', 'Bruno', 'AI Inspector'],
    problem:
      '트래픽은 있었지만 홈 성능과 커뮤니티 진입 장벽 때문에 사용자가 핵심 가치에 도달하기 전 이탈했습니다. 동시에 대학 catalog SSG가 main web 배포에 묶여 작은 수정도 전체 배포 비용을 유발했습니다.',
    approach: [
      'GA와 Performance 패널로 홈 이탈률, LCP, 커뮤니티 도달률을 먼저 수치화했습니다.',
      'LCP 후보 이미지와 비핵심 섹션 로딩 방식을 분리하고, 커뮤니티는 로그인보다 가치 노출을 먼저 하도록 흐름을 재검토했습니다.',
      '대학 catalog를 별도 Next.js zone으로 분리해 SEO 요구와 main web 배포 책임을 분리했습니다.',
      'Bruno 기반 codegen과 큐 기반 운영 인스펙터로 반복 운영 작업을 줄이고 품질 확인 루프를 자동화했습니다.'
    ],
    takeaway:
      '성능 최적화는 빠르게 만드는 일만이 아니라, 어떤 제품 영역이 어떤 배포와 운영 책임을 가져야 하는지 분리하는 설계 문제였습니다.',
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/solid-connection/solid-connect-web', external: true },
      { label: '성능 개선 기록', href: '/blog/페이지-속도가-이탈률-감소와-연관이-있을까' },
      { label: '커뮤니티 퍼널 분석', href: '/blog/유령-커뮤니티에-활기를-불어넣는법' },
      { label: '멀티존 전환 기록', href: '/blog/빌드-속도-개선을-위한-마이크로-프론트엔드' },
      { label: 'Bruno codegen', href: '/blog/bruno-api용-codegen-을-만들자' },
      { label: '운영 인스펙터', href: '/blog/qa를-필요한-사람이-하게-하자' }
    ]
  },
  {
    slug: 'i18nexus',
    title: 'I18Nexus',
    eyebrow: 'i18n Automation Toolkit',
    period: '2025.09 ~',
    quote: 'i18n의 병목은 t() 호출이 아니라, 번역 키와 코드와 협업 문서가 서로 어긋나는 순간에 생겼습니다.',
    summary:
      'React 코드베이스의 다국어 작업을 자동화하는 런타임/도구 생태계입니다. AST 기반 문자열 탐색, t() 래핑, key 추출, 타입 생성, Google Sheets 동기화로 i18n 반복 작업과 휴먼 에러를 줄였습니다.',
    role: '라이브러리 설계, AST 변환, CLI/DX 자동화',
    team: '개인 오픈소스',
    contribution: '기획·구현 100%',
    image: '/images/projects/i18nexus-cover.jpg',
    imageAlt: 'I18Nexus 다국어 자동화 툴킷 아이콘 이미지',
    imageWidth: 1600,
    imageHeight: 900,
    accent: '#71717a',
    metrics: [
      { value: '13,000+', label: '누적 다운로드', detail: '런타임과 CLI 도구 생태계 다운로드' },
      { value: '80%', label: '작업 시간 감축', detail: '수동 래핑, 추출, 동기화 반복 작업 자동화' },
      { value: '0건', label: '번역 키 휴먼 에러', detail: 'generated type으로 누락과 오타를 빌드 단계에서 감지' }
    ],
    highlights: [
      'Babel AST로 JSX 텍스트와 문자열 리터럴을 찾아 t() 호출과 JSON resource 자동 생성',
      'Google Sheets CLI로 기획자, 번역가, 개발자가 같은 번역 데이터를 기준으로 작업하도록 연결',
      'i18next 대체제가 아니라 React 앱 번역 workflow에 강하게 결합된 toolkit으로 포지셔닝'
    ],
    contributions: [
      'i18n-wrapper, i18n-extractor, i18n-upload, i18n-download 등 CLI 명령을 설계했습니다.',
      'translationImportSource를 설정으로 분리해 react-i18next, next-i18next, react-intl 등 기존 런타임과도 함께 쓸 수 있게 했습니다.',
      'runtime core와 tools가 같은 namespace/key 계약을 보도록 설계해 코드와 리소스의 불일치를 줄였습니다.',
      'TypeScript/Babel 기반 구현을 정리하고 Rust 포팅을 실험하며 대규모 코드베이스 적용 가능성을 검토했습니다.'
    ],
    results: [
      { label: '누적 다운로드', after: '13,000+', effect: '외부 사용 검증' },
      { label: '반복 작업 시간', before: '수동 래핑/추출', after: '자동 변환', effect: '80% 감축' },
      { label: '번역 키 검증', before: '런타임 확인', after: '타입 검증', effect: '휴먼 에러 감소' },
      { label: '협업 방식', before: '개발자 중심 JSON 수정', after: 'Google Sheets 동기화', effect: '비개발자 협업 가능' }
    ],
    techStack: ['TypeScript', 'Babel AST', 'CLI', 'Google Sheets API', 'React', 'i18n', 'Rust'],
    problem:
      '다국어 적용은 문자열을 t()로 감싸는 문제가 아니라, key naming, namespace, JSON resource, 번역 시트, 타입 안정성이 동시에 어긋나는 운영 문제였습니다.',
    approach: [
      'JSX 텍스트와 문자열 리터럴을 AST로 분석해 자동 래핑과 추출을 수행하는 CLI를 만들었습니다.',
      'Google Sheets를 번역 데이터의 협업 지점으로 두고 upload/download 흐름을 자동화했습니다.',
      'runtime core와 tools가 같은 namespace/key 계약을 보도록 설계해 코드와 리소스의 불일치를 줄였습니다.',
      'i18next보다 기능이 많은 런타임이 아니라 React 앱 번역 workflow에 강하게 결합된 toolkit으로 포지셔닝했습니다.'
    ],
    takeaway:
      'DX 자동화의 핵심은 코드를 많이 생성하는 것이 아니라, 사람이 실수하기 쉬운 경계를 타입과 도구가 같은 계약으로 보게 만드는 일이었습니다.',
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/i18n-global/i18n-mono', external: true },
      { label: '소개 글', href: '/blog/딸깍이면-내-프로젝트도-해외-진출' },
      { label: 'i18n 부채 청산기', href: '/blog/i18n-부채-청산기' },
      { label: 'Rust 이식 기록', href: '/blog/react-생태계-도구를-rust로-옮기며-배운-것들' },
      { label: 'i18next와의 포지셔닝', href: '/blog/i18nexus는-i18next보다-빠른가-질문을-조금-바꿔야-한다' }
    ]
  }
];

export const featuredPostSlugs = [
  'android-백버튼-시스템-설계',
  'relay-react-activity-gc-크래시',
  '페이지-속도가-이탈률-감소와-연관이-있을까',
  '딸깍이면-내-프로젝트도-해외-진출',
  '웹뷰에도-오프라인-기능이-필요하지-않을까요',
  'bruno-api용-codegen-을-만들자'
] as const;
