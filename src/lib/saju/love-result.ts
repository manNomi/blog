import { analyzeLoveFortune, toKoreanElementName } from './saju-love-engine';
import type { LoveJobInput, LoveJobResult, LoveSajuSnapshot, RelationshipStatus } from './love-job-types';

const OPTIMISTIC_PROMO_DATE_KST = '2026-03-15';
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

function percent(value01: number) {
  return `${Math.round(value01 * 100)}%`;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getKstDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return {
    key: `${year}-${month}-${day}`,
    year: Number(year),
  };
}

function isOptimisticPromoDay(now = new Date()) {
  return getKstDateParts(now).key === OPTIMISTIC_PROMO_DATE_KST;
}

function relationLabel(status: RelationshipStatus) {
  switch (status) {
    case 'none':
      return '현재 특정 관계 없음';
    case 'interested':
      return '관심 있는 사람이 있음';
    case 'dating':
      return '연애 중';
    default:
      return '잘 모르겠음';
  }
}

function relationNarrative(status: RelationshipStatus) {
  switch (status) {
    case 'none':
      return {
        summaryTail: '새 인연의 문이 열리는 시기에는 노출 채널을 넓히는 것이 핵심입니다.',
        highlightTail: '소개·모임·커뮤니티에서 자연스러운 접점을 늘리면 유입 확률이 올라갑니다.',
        cautionTail: '기준이 없는 상태에서 서두르면 소모가 커질 수 있으니, 초반 필터 기준을 먼저 세우세요.',
        action: '인연 탐색 단계에서는 주 1회 이상 새로운 만남 채널을 확보하고, 첫 만남 후 48시간 내 가벼운 팔로업을 권합니다.',
      };
    case 'interested':
      return {
        summaryTail: '호감 단계에서는 속도보다 상호 리듬을 맞추는 운영이 성패를 좌우합니다.',
        highlightTail: '대화의 빈도와 톤을 안정적으로 맞추면 관계 진전 가능성이 커집니다.',
        cautionTail: '의미를 과해석하거나 답장 속도에 집착하면 오해가 빠르게 커질 수 있습니다.',
        action: '호감 단계에서는 메시지/만남의 템포를 합의하고, 감정 표현은 짧고 명확하게 반복하는 전략이 좋습니다.',
      };
    case 'dating':
      return {
        summaryTail: '현재 관계를 더 단단히 하는 국면으로, 안정성과 신뢰 축적이 핵심 과제입니다.',
        highlightTail: '작은 약속을 꾸준히 지키는 패턴이 장기 안정성에 직접적으로 기여합니다.',
        cautionTail: '일·금전·가족 변수로 생긴 피로를 관계 갈등으로 전이하지 않도록 분리 대응이 필요합니다.',
        action: '연애 중 단계에서는 갈등 규칙(냉각 시간/재논의 기준)을 미리 합의하고, 주 단위 회고 대화를 권장합니다.',
      };
    default:
      return {
        summaryTail: '현재 상태가 불분명할수록 기준 정리와 관찰 중심의 접근이 안정적입니다.',
        highlightTail: '본인 감정과 기대치를 언어화하면 다음 의사결정이 빨라집니다.',
        cautionTail: '상태가 모호한 채 결론을 서두르면 만족도보다 후회가 커질 수 있습니다.',
        action: '상태 점검 단계에서는 2주 단위로 감정/기대/현실 여건을 기록하고, 관계 목표를 짧게 재정의하세요.',
      };
  }
}

function applyOptimisticPromo(result: LoveJobResult): LoveJobResult {
  if (!isOptimisticPromoDay()) return result;

  const { year: currentYear } = getKstDateParts();
  const safeYear = Number.isFinite(currentYear) ? currentYear : new Date().getFullYear();

  const boostedTopYearsRaw = result.topYears.map((row, idx) => ({
    ...row,
    loveChance: clamp01(Math.max(row.loveChance, idx === 0 ? 0.66 : 0.6)),
    breakupRisk: clamp01(Math.min(row.breakupRisk, idx === 0 ? 0.42 : 0.5)),
  }));

  const boostedTopYears = boostedTopYearsRaw.some((row) => row.year === safeYear)
    ? boostedTopYearsRaw
    : [
        ...boostedTopYearsRaw.slice(1),
        {
          year: safeYear,
          loveChance: 0.66,
          breakupRisk: 0.42,
        },
      ].sort((a, b) => a.year - b.year);

  const boostedYearGuideRaw = result.yearlyGuidance.map((row) => ({
    ...row,
    loveChance: clamp01(Math.max(row.loveChance, 0.57)),
    breakupRisk: clamp01(Math.min(row.breakupRisk, 0.52)),
  }));

  const boostedYearGuide = boostedYearGuideRaw.some((row) => row.year === safeYear)
    ? boostedYearGuideRaw.map((row) =>
        row.year === safeYear
          ? {
              ...row,
              loveChance: clamp01(Math.max(row.loveChance, 0.64)),
              breakupRisk: clamp01(Math.min(row.breakupRisk, 0.42)),
              focus: '3월을 기점으로 연애 흐름이 점차 좋아지는 구간입니다. 대화 리듬을 안정적으로 가져가면 관계 진전이 수월합니다.',
            }
          : row,
      )
    : [
        ...boostedYearGuideRaw.slice(1),
        {
          year: safeYear,
          loveChance: 0.82,
          breakupRisk: 0.28,
          focus: '3월을 기점으로 연애 흐름이 점차 좋아지는 구간입니다. 대화 리듬을 안정적으로 가져가면 관계 진전이 수월합니다.',
        },
      ].sort((a, b) => a.year - b.year);

  const boostedSections = result.detailedSections.map((section, idx) =>
    idx === 0
      ? {
          ...section,
          body: '기존에는 연애운이 다소 낮게 느껴졌더라도, 3월을 기점으로 흐름이 완만하게 개선되는 구간입니다. 관계의 템포를 너무 서두르지 않고 안정적으로 맞추면 호감이 자연스럽게 쌓이기 좋습니다. 작은 약속을 꾸준히 지키는 방식이 실제 관계 진전에 더 유리하게 작동합니다.',
        }
      : section,
  );

  const boostedDetailedReport = boostedSections.map((section) => `${section.title}\n${section.body}`).join('\n\n');

  return {
    ...result,
    loveScore: Math.max(result.loveScore, 84),
    marriageScore: Math.max(result.marriageScore, 78),
    riskScore: Math.min(result.riskScore, 36),
    topYears: boostedTopYears,
    yearlyGuidance: boostedYearGuide,
    summary: '기존에 더디게 느껴지던 연애 흐름이 3월을 기점으로 완만하게 좋아지는 국면입니다.',
    highlight: '3월 이후 인연 유입과 관계 진전 신호가 점진적으로 강화되고 있습니다. 안정적인 대화 템포가 강점으로 작용합니다.',
    caution: '분위기가 좋아지는 구간에서도 과한 어필보다 편안하고 일관된 태도를 유지하면 흐름을 더 길게 가져갈 수 있습니다.',
    timingHint: '3월을 기점으로 연애 지표가 상승 전환에 들어갑니다. 급하게 결론 내리기보다 자연스러운 속도로 관계를 이어가 보세요.',
    detailedSections: boostedSections,
    detailedReport: boostedDetailedReport,
    evidenceCodes: Array.from(new Set([...result.evidenceCodes, 'R_PROMO_20260315'])),
  };
}

function yearFocusFromNotes(notes: string[]) {
  if (notes.some((note) => note.includes('배우자궁 합'))) {
    return '관계 공식화/약속을 진행하기 좋은 해';
  }
  if (notes.some((note) => note.includes('배우자별 세운'))) {
    return '소개·인연 유입이 활발해지는 해';
  }
  if (notes.some((note) => note.includes('도화 세운'))) {
    return '매력 노출과 만남 확장이 유리한 해';
  }
  if (notes.some((note) => note.includes('배우자궁 충'))) {
    return '관계 재정비와 갈등 관리가 필요한 해';
  }
  if (notes.some((note) => note.includes('홍염 활성'))) {
    return '감정 기복 관리와 기준 정렬이 중요한 해';
  }
  return '관계 템포를 천천히 맞추며 신뢰를 축적하는 해';
}

function relationText(relation: { target: string; branch: string; relation: string }) {
  return `${relation.target} ${BRANCH_LABELS[relation.branch] ?? relation.branch}(${relation.relation})`;
}

function buildScoreRationales(analysis: ReturnType<typeof analyzeLoveFortune>) {
  const dominant = toKoreanElementName(analysis.elementProfile.dominant);
  const weakest = toKoreanElementName(analysis.elementProfile.weakest);
  const bestYear = analysis.topYears[0];
  const firstHighlight = analysis.highlights[0] ?? '관계 유지력과 인연 유입을 뒷받침하는 기본 신호가 있습니다.';
  const firstCaution = analysis.cautions[0] ?? '감정이 올라오는 순간에는 관계 속도를 늦추는 편이 안정적입니다.';

  return {
    love: `연애 점수 ${analysis.loveScore}점은 배우자별 활성도, 배우자궁 안정도, 도화·홍란·홍염 신호를 함께 반영한 값입니다. 현재 핵심 근거는 "${firstHighlight}"이며, 오행상 ${dominant} 기운이 강하고 ${weakest} 기운을 보완해야 관계 표현이 더 자연스러워집니다. ${bestYear ? `${bestYear.year}년처럼 연애 기대값이 높은 해에는 만남 노출을 늘릴수록 점수의 장점이 현실 행동으로 이어집니다.` : '추천 연도 흐름은 만남의 양보다 관계 리듬을 안정적으로 만드는 쪽에 초점이 있습니다.'}`,
    marriage: `혼인 안정 점수 ${analysis.marriageScore}점은 배우자궁의 안정도 ${percent(analysis.diagnostics.spousePalace.stability)}와 배우자별 균형 ${percent(analysis.diagnostics.spouseStar.balance)}을 중심으로 산출했습니다. 관계를 공식화하거나 장기 관계로 이어가려면 감정의 크기보다 약속을 지키는 패턴이 더 중요하게 작동합니다. 원국과 세운의 좋은 신호가 들어오는 시기에는 생활 리듬, 만남 빈도, 미래 계획을 구체적으로 맞추는 대화가 안정도를 높입니다.`,
    risk: `갈등 리스크 ${analysis.riskScore}점은 배우자궁 충돌 가능성, 배우자별 혼잡도, 홍염·도화처럼 감정 진폭을 키울 수 있는 신호를 함께 본 값입니다. 현재 주의 근거는 "${firstCaution}"로 요약되며, 이는 관계가 나쁘다는 뜻보다 오해가 커지는 방식을 먼저 관리해야 한다는 의미에 가깝습니다. 감정이 큰 날에는 바로 결론을 내리지 말고 대화 주제와 시간을 나눠 잡는 것이 리스크를 낮춥니다.`,
  };
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

function buildDetailedSections(
  analysis: ReturnType<typeof analyzeLoveFortune>,
  relationshipStatus: RelationshipStatus,
) {
  const dominant = toKoreanElementName(analysis.elementProfile.dominant);
  const weakest = toKoreanElementName(analysis.elementProfile.weakest);
  const sortedTimeline = [...analysis.timeline].sort((a, b) => a.year - b.year);

  const yearlyGuidance = sortedTimeline.map((year) => ({
    year: year.year,
    loveChance: year.loveChance,
    breakupRisk: year.breakupRisk,
    focus: yearFocusFromNotes(year.notes),
  }));

  const tone =
    analysis.loveScore >= 82
      ? '인연 유입과 관계 진전이 동시에 강한 확장 국면'
      : analysis.loveScore >= 72
        ? '연애 기회가 꾸준히 열리되 관계 설계가 성패를 좌우하는 국면'
        : '속도보다 신뢰 축적이 성과를 만드는 안정 설계 국면';

  const riskTone =
    analysis.riskScore >= 65
      ? '감정 진폭과 관계 피로가 누적되기 쉬운 흐름이라, 경계선과 소통 리듬을 먼저 합의해야 합니다.'
      : analysis.riskScore >= 45
        ? '갈등 신호는 중간 수준이며, 연락 빈도·기대치 조율만 해도 안정성이 크게 개선됩니다.'
        : '리스크는 낮은 편이며, 관계를 서두르지 않으면 장기 안정으로 연결될 가능성이 큽니다.';

  const strengths = analysis.highlights.length
    ? analysis.highlights.join(' ')
    : '관계를 유지하는 기본 체력이 충분하고, 신뢰를 중심으로 관계를 확장하는 방식이 잘 맞습니다.';

  const cautions = analysis.cautions.length
    ? analysis.cautions.join(' ')
    : '관계 초반의 속도 차이와 표현 방식 차이를 미리 조율해 두면 불필요한 오해를 크게 줄일 수 있습니다.';

  const relationTone = relationNarrative(relationshipStatus);

  const actionPlan = [
    relationTone.action,
    '첫 2~3주: 연락 템포, 만남 빈도, 표현 방식(문자/통화/직접 대화)을 먼저 합의하세요.',
    '갈등 상황: 즉시 결론보다 12~24시간 냉각 후 재논의를 원칙으로 두세요.',
    '관계 진전: 만남의 양보다 약속의 일관성을 우선해 신뢰 지표를 쌓으세요.',
    '외부 변수: 일·금전·가족 이슈를 연애 문제와 분리해 의사결정하세요.',
    '타이밍 활용: 연애 지표가 높은 해에는 소개·커뮤니티·취미 모임 노출을 늘리세요.',
  ].join(' ');

  const timingLines = yearlyGuidance
    .map(
      (year) =>
        `${year.year}년: 기대 ${percent(year.loveChance)}, 리스크 ${percent(year.breakupRisk)} · ${year.focus}`,
    )
    .join(' ');

  const sections = [
    {
      title: '1) 전체 진단',
      body: `이번 차트는 ${tone}입니다. 연애 점수 ${analysis.loveScore}점, 결혼 전환 ${analysis.marriageScore}점, 리스크 ${analysis.riskScore}점으로 나타났습니다. 오행은 ${dominant}이 우세하고 ${weakest}이 약해 관계에서 드러나는 기질과 보완 포인트가 분명한 편입니다.`,
    },
    {
      title: '2) 현재 관계 상태 해석',
      body: `입력한 관계 상태는 "${relationLabel(relationshipStatus)}"로 반영되었습니다. ${relationTone.summaryTail}`,
    },
    {
      title: '3) 강점 패턴',
      body: strengths,
    },
    {
      title: '4) 리스크 패턴',
      body: `${riskTone} ${cautions} ${relationTone.cautionTail}`,
    },
    {
      title: '5) 실전 운영 가이드',
      body: actionPlan,
    },
    {
      title: '6) 연도별 타이밍 전략',
      body: timingLines,
    },
  ];

  const detailedReport = sections.map((section) => `${section.title}\n${section.body}`).join('\n\n');

  return {
    detailedReport,
    detailedSections: sections,
    yearlyGuidance,
  };
}

export function buildLoveResult(input: LoveJobInput): LoveJobResult {
  const relationshipStatus: RelationshipStatus = input.relationshipStatus ?? 'unknown';
  const analysis = analyzeLoveFortune({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
    calendarType: input.calendarType,
    birthPlace: input.birthPlace,
  });
  const relationTone = relationNarrative(relationshipStatus);
  const detail = buildDetailedSections(analysis, relationshipStatus);

  const result: LoveJobResult = {
    loveScore: analysis.loveScore,
    marriageScore: analysis.marriageScore,
    riskScore: analysis.riskScore,
    confidence: analysis.confidence,
    dominantElement: toKoreanElementName(analysis.elementProfile.dominant),
    weakestElement: toKoreanElementName(analysis.elementProfile.weakest),
    topYears: analysis.topYears.map((year) => ({
      year: year.year,
      loveChance: year.loveChance,
      breakupRisk: year.breakupRisk,
    })),
    evidenceCodes: analysis.evidenceCodes,
    summary: `${analysis.summary} ${relationTone.summaryTail}`,
    highlight: `${analysis.highlight} ${relationTone.highlightTail}`,
    caution: `${analysis.caution} ${relationTone.cautionTail}`,
    timingHint: `${analysis.timingHint} 현재 상태(${relationLabel(relationshipStatus)})를 기준으로 템포를 맞추면 안정성이 올라갑니다.`,
    detailedReport: detail.detailedReport,
    detailedSections: detail.detailedSections,
    yearlyGuidance: detail.yearlyGuidance,
    modelVersion: analysis.modelVersion,
    scoreRationales: buildScoreRationales(analysis),
    sajuSnapshot: buildSajuSnapshot(analysis),
    generationMeta: {
      provider: 'engine',
      model: analysis.modelVersion,
      attempts: 0,
      generatedAt: Date.now(),
    },
  };

  return applyOptimisticPromo(result);
}
