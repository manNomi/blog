import { analyzeLoveFortune, toKoreanElementName, type Element } from './saju-love-engine';
import type { ExamJobResult, ExamSubjectProfile, ExamYearGuide, LoveJobInput, LoveSajuSnapshot } from './love-job-types';

const STEM_LABELS: Record<string, string> = {
  JIA: '갑',
  YI: '을',
  BING: '병',
  DING: '정',
  WU: '무',
  JI: '기',
  GENG: '경',
  XIN: '신',
  REN: '임',
  GUI: '계',
};

const BRANCH_LABELS: Record<string, string> = {
  ZI: '자',
  CHOU: '축',
  YIN: '인',
  MAO: '묘',
  CHEN: '진',
  SI: '사',
  WU: '오',
  WEI: '미',
  SHEN: '신',
  YOU: '유',
  XU: '술',
  HAI: '해',
};

type SubjectRule = {
  category: string;
  primaryElement: Element;
  supportElement: Element;
  patterns: RegExp[];
  reason: string;
};

const SUBJECT_RULES: SubjectRule[] = [
  {
    category: '논리·계산 과목',
    primaryElement: 'metal',
    supportElement: 'earth',
    patterns: [/수학/, /통계/, /회계/, /경제/, /재무/, /확률/, /미적/, /기하/],
    reason: '문제를 잘게 자르고 규칙을 세우는 금 기운과, 풀이 절차를 버티는 토 기운이 함께 필요합니다.',
  },
  {
    category: '컴퓨터·정보 과목',
    primaryElement: 'water',
    supportElement: 'metal',
    patterns: [/컴퓨터/, /코딩/, /프로그래밍/, /정보/, /\bai\b/i, /인공지능/, /데이터/, /알고리즘/, /개발/],
    reason: '흐름을 읽고 연결하는 수 기운과, 구조를 정확히 세우는 금 기운이 같이 쓰입니다.',
  },
  {
    category: '언어·표현 과목',
    primaryElement: 'wood',
    supportElement: 'fire',
    patterns: [/국어/, /영어/, /언어/, /문학/, /독해/, /작문/, /논술/, /토익/, /토플/],
    reason: '문맥을 확장하는 목 기운과, 말의 온도와 표현력을 살리는 화 기운이 중요합니다.',
  },
  {
    category: '과학·탐구 과목',
    primaryElement: 'fire',
    supportElement: 'water',
    patterns: [/과학/, /물리/, /화학/, /생명/, /생물/, /지구/, /실험/],
    reason: '현상을 빠르게 포착하는 화 기운과, 원리를 차분히 따라가는 수 기운이 함께 필요합니다.',
  },
  {
    category: '사회·제도 과목',
    primaryElement: 'earth',
    supportElement: 'metal',
    patterns: [/사회/, /역사/, /지리/, /법/, /행정/, /정치/, /윤리/, /한국사/],
    reason: '큰 맥락을 붙잡는 토 기운과, 개념을 분류하는 금 기운이 점수를 만듭니다.',
  },
  {
    category: '예체능·감각 과목',
    primaryElement: 'fire',
    supportElement: 'wood',
    patterns: [/예체능/, /디자인/, /음악/, /미술/, /체육/, /실기/, /영상/],
    reason: '감각을 드러내는 화 기운과, 꾸준히 성장시키는 목 기운이 핵심입니다.',
  },
];

const FALLBACK_RULE: SubjectRule = {
  category: '구조화 학습 과목',
  primaryElement: 'earth',
  supportElement: 'metal',
  patterns: [],
  reason: '과목명이 넓게 들어와 큰 틀을 세우는 토 기운과, 기준을 나누는 금 기운을 우선 반영했습니다.',
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percent(value01: number) {
  return `${Math.round(clamp01(value01) * 100)}%`;
}

function normalizeSubject(value?: string) {
  return value?.normalize('NFKC').trim().replace(/\s+/g, ' ') ?? '';
}

function classifySubject(subject: string): SubjectRule {
  const normalized = normalizeSubject(subject);
  return SUBJECT_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized))) ?? FALLBACK_RULE;
}

function relationText(relation: { target: string; branch: string; relation: string }) {
  return `${relation.target} ${BRANCH_LABELS[relation.branch] ?? relation.branch}(${relation.relation})`;
}

function buildSajuSnapshot(analysis: ReturnType<typeof analyzeLoveFortune>): LoveSajuSnapshot {
  const diagnostics = analysis.diagnostics;

  return {
    pillars: diagnostics.pillars,
    dayMaster: {
      ...diagnostics.dayMaster,
      stem: STEM_LABELS[diagnostics.dayMaster.stem] ?? diagnostics.dayMaster.stem,
      branch: BRANCH_LABELS[diagnostics.dayMaster.branch] ?? diagnostics.dayMaster.branch,
    },
    elementProfile: {
      dominant: toKoreanElementName(analysis.elementProfile.dominant),
      weakest: toKoreanElementName(analysis.elementProfile.weakest),
      balanceScore: analysis.elementProfile.balanceScore,
    },
    spousePalace: {
      ...diagnostics.spousePalace,
      branch: BRANCH_LABELS[diagnostics.spousePalace.branch] ?? diagnostics.spousePalace.branch,
      relations: diagnostics.spousePalace.relations.map(relationText),
    },
    spouseStar: diagnostics.spouseStar,
    romanceStars: diagnostics.romanceStars,
    evidenceCodes: analysis.evidenceCodes,
    traces: analysis.traces,
  };
}

function buildSubjectProfile(subject: string, rule: SubjectRule): ExamSubjectProfile {
  return {
    subject,
    category: rule.category,
    primaryElement: rule.primaryElement,
    supportElement: rule.supportElement,
    primaryElementLabel: toKoreanElementName(rule.primaryElement),
    supportElementLabel: toKoreanElementName(rule.supportElement),
    fitReason: rule.reason,
  };
}

function buildYearFocus(row: ExamYearGuide, subject: string) {
  if (row.studyFlow >= 0.72 && row.overloadRisk < 0.55) {
    return `${row.year}년은 ${subject} 공부 흐름이 비교적 잘 붙는 구간입니다. 새 단원을 넓히기보다 기출과 오답을 촘촘히 연결하면 점수 회수가 빠릅니다. 다만 자신감이 올라온 날에도 풀이 근거를 쓰는 습관은 유지하세요.`;
  }

  if (row.overloadRisk >= 0.68) {
    return `${row.year}년은 ${subject}를 무리하게 몰아치면 쉽게 지치는 흐름입니다. 하루 공부량을 크게 늘리기보다 40분 단위 반복과 짧은 회고로 리듬을 쪼개세요. 어려운 파트는 못하는 과목이라는 딱지를 붙이지 말고, 풀이 순서를 다시 만드는 쪽이 유리합니다.`;
  }

  return `${row.year}년은 ${subject} 공부의 기초 체력을 다지는 구간입니다. 개념을 한 번 더 읽는 것보다 예제, 기출, 오답을 같은 규칙으로 묶어보세요. 작은 루틴을 꾸준히 지키면 과목 궁합의 약점도 충분히 보완됩니다.`;
}

function buildYearlyGuidance(
  analysis: ReturnType<typeof analyzeLoveFortune>,
  subject: string,
  fit01: number,
  effort01: number,
) {
  return [...analysis.timeline]
    .sort((a, b) => a.year - b.year)
    .map((row) => {
      const studyFlow = clamp01(row.loveChance * 0.42 + fit01 * 0.28 + analysis.elementProfile.balanceScore * 0.2 + (1 - row.breakupRisk) * 0.1);
      const overloadRisk = clamp01(row.breakupRisk * 0.48 + effort01 * 0.34 + (1 - analysis.elementProfile.balanceScore) * 0.18);
      const next = {
        year: row.year,
        studyFlow,
        overloadRisk,
        focus: '',
      };

      return {
        ...next,
        focus: buildYearFocus(next, subject),
      };
    });
}

export function buildExamResult(input: LoveJobInput): ExamJobResult {
  const subject = normalizeSubject(input.examSubject) || '시험 과목';
  const rule = classifySubject(subject);
  const analysis = analyzeLoveFortune({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
    calendarType: input.calendarType,
    birthPlace: input.birthPlace,
  });

  const counts = analysis.elementProfile.counts;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  const primaryShare = counts[rule.primaryElement] / total;
  const supportShare = counts[rule.supportElement] / total;
  const weakestHitsPrimary = analysis.elementProfile.weakest === rule.primaryElement;
  const weakestHitsSupport = analysis.elementProfile.weakest === rule.supportElement;
  const dominantBonus = analysis.elementProfile.dominant === rule.primaryElement ? 0.08 : analysis.elementProfile.dominant === rule.supportElement ? 0.04 : 0;
  const weakPenalty = weakestHitsPrimary ? 0.18 : weakestHitsSupport ? 0.1 : 0;
  const fit01 = clamp01(0.22 + primaryShare * 1.35 + supportShare * 0.75 + analysis.elementProfile.balanceScore * 0.2 + dominantBonus - weakPenalty);
  const effort01 = clamp01(
    0.28 +
      (weakestHitsPrimary ? 0.34 : weakestHitsSupport ? 0.22 : 0.1) +
      (1 - analysis.elementProfile.balanceScore) * 0.24 +
      (analysis.dayMasterStrength < 0.42 ? 0.12 : 0) +
      (primaryShare < 0.15 ? 0.1 : 0),
  );
  const examScore = clampScore(40 + fit01 * 42 + (1 - effort01) * 10 + analysis.elementProfile.balanceScore * 8);
  const subjectFitScore = clampScore(35 + fit01 * 60);
  const effortScore = clampScore(35 + effort01 * 60);
  const dominant = toKoreanElementName(analysis.elementProfile.dominant);
  const weakest = toKoreanElementName(analysis.elementProfile.weakest);
  const subjectProfile = buildSubjectProfile(subject, rule);
  const yearlyGuidance = buildYearlyGuidance(analysis, subject, fit01, effort01);
  const topYears = [...yearlyGuidance]
    .sort((a, b) => b.studyFlow - b.overloadRisk * 0.35 - (a.studyFlow - a.overloadRisk * 0.35))
    .slice(0, 3)
    .map((row) => ({ year: row.year, studyFlow: row.studyFlow, overloadRisk: row.overloadRisk }))
    .sort((a, b) => a.year - b.year);
  const bestYear = topYears[0]?.year ?? yearlyGuidance[0]?.year ?? new Date().getFullYear();
  const weakSubjectMessage = weakestHitsPrimary || weakestHitsSupport
    ? `${subject}가 안 맞는다는 결론은 아닙니다. 오행상 ${weakest} 기운을 보완해야 하는 과목이라, 재능보다 루틴 설계가 점수를 더 크게 흔듭니다.`
    : `${subject}는 타고난 흐름과 완전히 따로 노는 과목은 아닙니다. 다만 감으로 밀기보다 규칙을 반복해서 몸에 붙이는 쪽이 더 빠릅니다.`;

  const detailedSections = [
    {
      title: '1) 전체 시험운',
      body: `이번 시험운은 ${examScore}점 흐름입니다. 강한 오행은 ${dominant}, 보완할 오행은 ${weakest}로 잡히며, ${subject}는 ${subjectProfile.primaryElementLabel} 기운을 중심으로 보는 과목입니다. 점수는 운이 대신 공부해준다는 뜻이 아니라, 어떤 방식으로 공부할 때 덜 새는지를 보여주는 지도에 가깝습니다. ${weakSubjectMessage}`,
    },
    {
      title: '2) 과목 궁합',
      body: `${subject}는 ${subjectProfile.category}으로 분류했습니다. ${subjectProfile.fitReason} 현재 과목 궁합 점수는 ${subjectFitScore}점이라, 기본 흐름은 ${subjectFitScore >= 75 ? '꽤 잘 붙는 편' : subjectFitScore >= 58 ? '중간 이상' : '처음엔 삐걱일 수 있는 편'}입니다. 궁합이 낮게 나와도 포기 신호가 아니라 공부 방식을 바꾸라는 알림에 가깝습니다.`,
    },
    {
      title: '3) 오행상 보완 포인트',
      body: `노력 보정 점수는 ${effortScore}점입니다. 이 점수가 높을수록 벼락치기보다 매일 같은 시간에 같은 규칙으로 반복하는 편이 좋습니다. 특히 ${subjectProfile.primaryElementLabel} 기운이 필요한 파트는 개념을 오래 읽는 방식보다 문제를 풀고 틀린 이유를 분류하는 방식이 잘 맞습니다. 오늘의 목표는 완벽 이해가 아니라 같은 실수를 줄이는 쪽으로 잡으세요.`,
    },
    {
      title: '4) 공부 전략',
      body: `추천 루틴은 20분 개념 확인, 40분 문제 풀이, 10분 오답 이름 붙이기입니다. 오답에는 "개념 누락", "계산/문법 실수", "조건 오독", "시간 부족"처럼 원인을 붙이세요. ${subject}가 재미없게 느껴지는 날에는 공부량을 늘리기보다 시작 마찰을 줄이는 편이 낫습니다. 작은 단위로 자주 이기는 구조가 시험운을 현실 점수로 바꿉니다.`,
    },
    {
      title: '5) 실전 멘탈',
      body: `시험장에서는 안 맞는 과목이라는 생각이 올라와도 그 문장을 그대로 믿지 않는 것이 중요합니다. 사주 해석은 방향을 알려주는 장난기 있는 코칭이지, 합격과 불합격을 확정하는 판정표가 아닙니다. 긴장되는 문제를 만나면 바로 넘기고, 풀 수 있는 문제로 손을 데운 뒤 돌아오세요. 흐름을 되찾는 순서가 점수 방어의 핵심입니다.`,
    },
    {
      title: '6) 연도별 학습 흐름',
      body: yearlyGuidance.map((row) => `${row.year}년: 학습 흐름 ${percent(row.studyFlow)}, 과부하 ${percent(row.overloadRisk)} · ${row.focus}`).join(' '),
    },
  ];
  const detailedReport = detailedSections.map((section) => `${section.title}\n${section.body}`).join('\n\n');

  return {
    fortuneType: 'exam',
    examScore,
    subjectFitScore,
    effortScore,
    confidence: analysis.confidence,
    dominantElement: dominant,
    weakestElement: weakest,
    subjectProfile,
    topYears,
    evidenceCodes: Array.from(new Set([...analysis.evidenceCodes, `E_SUBJECT_${rule.primaryElement.toUpperCase()}`, `E_SUPPORT_${rule.supportElement.toUpperCase()}`])),
    summary: `${subject} 시험운은 ${examScore}점입니다. ${weakSubjectMessage} 지금은 재능 판정보다 공부 구조를 다시 짜는 쪽이 훨씬 쓸모 있습니다. ${subjectProfile.primaryElementLabel} 기운을 쓰는 과목답게, 한 번에 몰아치기보다 풀이 규칙과 오답 분류를 반복할수록 점수가 붙습니다.`,
    highlight: `${subject}에서 살릴 장점은 ${dominant} 기운의 속도를 공부 루틴으로 바꾸는 데 있습니다. 잘 맞는 파트는 빠르게 밀고, 안 맞는 파트는 오답 원인을 이름 붙이며 공략하면 흐름이 살아납니다. ${bestYear}년은 학습 흐름을 확장하기 좋은 후보 구간입니다.`,
    caution: `${subject}가 안 맞는다는 말은 재미있는 경고일 뿐 결론이 아닙니다. 오행상 ${weakest} 기운을 보완해야 하므로, 컨디션이 흔들릴 때는 공부량보다 반복 규칙이 먼저입니다. 특히 어려운 단원은 감으로 버티지 말고 풀이 순서를 종이에 고정하세요.`,
    timingHint: `${bestYear}년 전후로 ${subject} 학습 흐름을 끌어올리기 좋습니다. 새 교재를 계속 늘리기보다 같은 문제 묶음을 반복해 정확도를 올리세요. 흐름이 약한 해에는 시험 범위를 더 작게 쪼개고, 과부하가 오기 전에 쉬는 날을 먼저 배치하는 편이 안전합니다.`,
    detailedReport,
    detailedSections,
    yearlyGuidance,
    modelVersion: `exam-engine-v1+${analysis.modelVersion}`,
    scoreRationales: {
      exam: `시험 점수는 과목 궁합, 오행 균형, 일간 강약, 연도 흐름을 함께 본 값입니다. ${subject}는 ${subjectProfile.primaryElementLabel}과 ${subjectProfile.supportElementLabel} 기운을 함께 쓰는 과목이라, 해당 기운의 분포가 공부 체감 난이도에 영향을 줍니다. 이 점수는 합격을 보장하는 숫자가 아니라 어떤 루틴으로 점수를 회수할지 알려주는 기준입니다.`,
      subjectFit: `과목 궁합은 ${subjectProfile.fitReason} 현재 ${subject}와의 궁합은 ${subjectFitScore}점으로 계산되었습니다. 궁합이 낮은 부분은 재능 부족이 아니라 공부 방식을 더 잘게 쪼개야 하는 지점입니다.`,
      effort: `노력 보정은 ${effortScore}점입니다. 이 값이 높을수록 벼락치기보다 반복 루틴, 오답 분류, 시간 제한 훈련이 중요합니다. ${subject}가 버겁게 느껴지는 날에는 공부 시간을 늘리기보다 시작 단위를 작게 만드는 편이 효과적입니다.`,
    },
    sajuSnapshot: buildSajuSnapshot(analysis),
    subjectAnswer: {
      subject,
      answer: `${subject}는 오행상 ${subjectProfile.primaryElementLabel} 기운을 중심으로 보는 과목입니다. ${weakSubjectMessage} 그래서 지금 필요한 건 "나는 이 과목이랑 안 맞아"라는 결론이 아니라, 어떤 단원에서 어떤 실수가 반복되는지 잡아내는 루틴입니다.`,
      actionItems: [
        `${subject} 오답을 원인별로 4칸(개념, 조건, 계산/표현, 시간)으로 나누어 기록하세요.`,
        '매일 같은 시간에 40분짜리 문제 풀이 블록 하나를 고정하세요.',
        '틀린 문제는 바로 해설을 베끼지 말고, 먼저 내가 놓친 조건을 한 문장으로 적으세요.',
        '일주일에 한 번은 새 문제보다 지난 오답 10개를 다시 풀어 정확도를 확인하세요.',
      ],
    },
    generationMeta: {
      provider: 'engine',
      model: `exam-engine-v1+${analysis.modelVersion}`,
      attempts: 0,
      generatedAt: Date.now(),
    },
  };
}
