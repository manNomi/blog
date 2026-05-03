import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderAdminSummaryEmail,
  renderLoveResultEmail,
} from '../src/lib/saju/server/email-templates.ts';
import { buildExamResult } from '../src/lib/saju/exam-result.ts';

function sampleYearlyGuidance() {
  return [
    { year: 2026, loveChance: 0.52, breakupRisk: 0.34, focus: '2026 실행 포커스' },
    { year: 2027, loveChance: 0.57, breakupRisk: 0.32, focus: '2027 실행 포커스' },
    { year: 2028, loveChance: 0.49, breakupRisk: 0.3, focus: '2028 실행 포커스' },
    { year: 2029, loveChance: 0.61, breakupRisk: 0.37, focus: '2029 실행 포커스' },
    { year: 2030, loveChance: 0.9, breakupRisk: 0.3, focus: '2030 실행 포커스' },
    { year: 2031, loveChance: 0.75, breakupRisk: 0.3, focus: '2031 실행 포커스' },
    { year: 2032, loveChance: 0.58, breakupRisk: 0.39, focus: '2032 실행 포커스' },
    { year: 2033, loveChance: 0.63, breakupRisk: 0.35, focus: '2033 실행 포커스' },
    { year: 2034, loveChance: 0.54, breakupRisk: 0.31, focus: '2034 실행 포커스' },
    { year: 2035, loveChance: 0.56, breakupRisk: 0.3, focus: '2035 실행 포커스' },
  ];
}

function sampleResult() {
  return {
    loveScore: 84,
    marriageScore: 77,
    riskScore: 41,
    confidence: 0.88,
    dominantElement: '화',
    weakestElement: '수',
    topYears: [
      { year: 2027, loveChance: 0.72, breakupRisk: 0.3 },
      { year: 2028, loveChance: 0.68, breakupRisk: 0.33 },
    ],
    evidenceCodes: ['R_SP_HAP', 'R_HONGLUAN'],
    summary: '핵심 요약 문구입니다. 점수의 의미와 관계 흐름을 함께 설명합니다.',
    highlight: '좋은 흐름 문구',
    caution: '주의 포인트 문구',
    timingHint: '타이밍 힌트 문구',
    scoreRationales: {
      love: '연애 점수는 배우자궁 안정도와 배우자별 활성도를 함께 반영했습니다. 소개팅 고민에서는 첫 만남 이후의 후속 연락이 중요합니다. 만남의 양보다 리듬 설계가 점수의 장점을 살립니다.',
      marriage: '혼인 안정 점수는 장기 관계로 이어질 때 약속을 지키는 힘을 봅니다. 생활 리듬과 기대치를 구체적으로 맞출수록 안정감이 올라갑니다. 공식화 대화는 좋은 시기에 천천히 꺼내는 편이 좋습니다.',
      risk: '갈등 리스크는 감정 기복과 속도 차이에서 생기는 오해를 봅니다. 연락이 늦다는 이유만으로 마음을 단정하면 리스크가 커집니다. 대화 시간을 정하고 주제를 나누면 부담이 줄어듭니다.',
    },
    sajuSnapshot: {
      pillars: { year: '신미', month: '경자', day: '갑인', hour: '무진' },
      dayMaster: { stem: '갑', branch: '인', strength: 0.62 },
      elementProfile: { dominant: '화', weakest: '수', balanceScore: 0.74 },
      spousePalace: { branch: '인', stability: 0.76, conflictRisk: 0.29, relations: ['월지 자(합)'] },
      spouseStar: { presence: 0.7, balance: 0.66, conflictRisk: 0.32 },
      romanceStars: { peachInner: 1, peachOuter: 0, hongLuanCount: 1, hongYanCount: 0 },
      evidenceCodes: ['R_SP_HAP', 'R_HONGLUAN'],
      traces: ['dayMaster=0.62', 'spousePalace(stability=0.76, risk=0.29)'],
    },
    concernAnswer: {
      concern: '소개팅을 해도 잘 안 풀립니다.',
      answer: '소개팅이 잘 안 풀리는 문제는 매력이 없다는 뜻보다 첫 만남 이후 리듬을 이어가는 방식이 아직 정리되지 않았다는 쪽에 가깝습니다. 사주 흐름상 인연 유입 재료는 있으니, 만남 후 후속 연락과 다음 약속 제안 방식을 고정해보는 것이 좋습니다. 상대 반응을 기다리기만 하지 말고 편한 제안을 짧게 남기는 방식이 현실적입니다.',
      actionItems: [
        '첫 만남 후 24시간 안에 즐거웠던 지점 하나와 다음 제안 하나를 짧게 보내세요.',
        '소개팅 전에는 대화 주제 세 개와 피해야 할 질문 두 개를 미리 정리하세요.',
        '잘 안 맞는 만남은 실패로 세지 말고 기준을 좁히는 데이터로 기록하세요.',
      ],
    },
    detailedReport: '',
    detailedSections: [
      { title: '1) 전체 진단', body: '전체 진단 본문' },
      { title: '2) 현재 관계 상태 해석', body: '관계 상태 해석 본문' },
    ],
    yearlyGuidance: sampleYearlyGuidance(),
    modelVersion: 'saju-love-v2+llm:codex-local-codex',
    generationMeta: {
      provider: 'codex',
      model: 'local-codex',
      attempts: 1,
      generatedAt: 1777651200000,
    },
  };
}

test('renderLoveResultEmail includes evidence-rich modern report blocks', async () => {
  const rendered = await renderLoveResultEmail({
    requestId: 'job-123',
    name: '테스터',
    concern: '소개팅을 해도 잘 안 풀립니다.',
    result: sampleResult(),
  });

  assert.match(rendered.html, /<details/i);
  assert.match(rendered.html, /<summary/i);
  assert.match(rendered.html, /핵심 요약/);
  assert.match(rendered.html, /왜 이 점수인가/);
  assert.match(rendered.html, /만세력 근거 요약/);
  assert.match(rendered.html, /고민에 대한 직접 답변/);
  assert.match(rendered.html, /2026~2035 연애운 타임라인/);
  assert.match(rendered.html, /최고 기회/);
  assert.match(rendered.html, /width:90%/);
  assert.match(rendered.html, /리스크 30%/);

  const yearPositions = Array.from({ length: 10 }, (_, index) => {
    const year = 2026 + index;
    return rendered.text.indexOf(`${year} 실행 포커스`);
  });
  assert.ok(yearPositions.every((position) => position >= 0));
  assert.deepEqual([...yearPositions].sort((a, b) => a - b), yearPositions);

  assert.match(rendered.text, /소개팅이 잘 안 풀리는 문제/);
  assert.match(rendered.text, /사주팔자/);
  assert.match(rendered.text, /첫 만남 후 24시간 안에/);
  assert.match(rendered.text, /2028 실행 포커스/);
  assert.match(rendered.text, /2035 실행 포커스/);
  assert.match(rendered.text, /도화·홍란·홍염 신호/);
  assert.doesNotMatch(rendered.text, /청하신 연애운 풀이 글월/);
  assert.doesNotMatch(rendered.text, /모델 버전|local-codex|Codex|confidence|presence|traces|evidenceCodes|loveChance|breakupRisk/);
  assert.doesNotMatch(rendered.text, /\b(?:0|1)\.\d+\b/);
  assert.doesNotMatch(rendered.html, /\u0000/);
  assert.doesNotMatch(rendered.text, /\u0000/);
});

test('renderAdminSummaryEmail contains request summary data', async () => {
  const rendered = await renderAdminSummaryEmail({
    requestId: 'job-999',
    requesterName: '관리자테스트',
    requesterEmail: 'admin-test@example.com',
    status: 'completed',
    error: null,
    source: 'worker',
    result: sampleResult(),
  });

  assert.match(rendered.html, /job-999/);
  assert.match(rendered.html, /관리자테스트/);
  assert.match(rendered.text, /처리 경로:\s*worker/);
});

test('renderAdminSummaryEmail can describe failed generation without user result', async () => {
  const rendered = await renderAdminSummaryEmail({
    requestId: 'job-failed',
    requesterName: '실패테스트',
    requesterEmail: 'fail@example.com',
    status: 'failed',
    error: 'report_generation_failed',
    source: 'worker',
    result: null,
  });

  assert.match(rendered.text, /사주 처리 실패/);
  assert.match(rendered.text, /report_generation_failed/);
  assert.match(rendered.text, /점수:\s*점수 없음/);
});

test('renderLoveResultEmail renders exam report blocks without internal keys', async () => {
  const result = buildExamResult({
    fortuneType: 'exam',
    name: '시험러',
    email: 'exam@example.com',
    gender: 'female',
    calendarType: 'solar',
    birthDate: '1993-07-12',
    birthTime: '08:30',
    birthPlace: '서울특별시',
    relationshipStatus: 'unknown',
    examSubject: '컴퓨터',
    examResultFormat: 'grade',
  });
  const rendered = await renderLoveResultEmail({
    requestId: 'exam-123',
    name: '시험러',
    result,
  });

  assert.match(rendered.text, /사주 시험운 리포트/);
  assert.match(rendered.text, /컴퓨터/);
  assert.match(rendered.text, /예상 학점/);
  assert.match(rendered.text, /[ABCDF][+0]?|F 위험권/);
  assert.match(rendered.text, /과목 궁합/);
  assert.match(rendered.text, /노력 보정/);
  assert.match(rendered.text, /과목 맞춤 해석/);
  assert.match(rendered.text, /공부 전략/);
  assert.match(rendered.text, /짧은 루틴/);
  assert.match(rendered.text, /해석 리포트/);
  assert.match(rendered.text, /근거/);
  assert.match(rendered.text, /현실적 의미/);
  assert.match(rendered.text, /실행 조언/);
  assert.match(rendered.text, /시험 준비 타임라인/);
  assert.match(rendered.text, /지금부터 할 일/);
  assert.match(rendered.text, /시험 1주 전/);
  assert.match(rendered.text, /시험 전날/);
  assert.match(rendered.text, /시험 당일/);
  assert.match(rendered.text, /바로 해볼 행동/);
  assert.doesNotMatch(rendered.text, /연도별 학습|학습 흐름 타임라인|confidence|traces|elementProfile|studyFlow|overloadRisk|generationMeta/);
  assert.doesNotMatch(rendered.text, /절대 못함|불합격 확정|무조건 떨어/);
});

test('renderLoveResultEmail falls back to legacy exam detailedSections', async () => {
  const result = buildExamResult({
    fortuneType: 'exam',
    name: '레거시시험러',
    email: 'legacy-exam@example.com',
    gender: 'female',
    calendarType: 'solar',
    birthDate: '1993-07-12',
    birthTime: '08:30',
    birthPlace: '서울특별시',
    relationshipStatus: 'unknown',
    examSubject: '컴퓨터',
  });
  delete result.interpretationSections;
  delete result.preparationTimeline;

  const rendered = await renderLoveResultEmail({
    requestId: 'exam-legacy-123',
    name: '레거시시험러',
    result,
  });

  assert.match(rendered.text, /공부 전략/);
  assert.match(rendered.text, /결론:/);
  assert.doesNotMatch(rendered.text, /시험 준비 타임라인/);
  assert.doesNotMatch(rendered.text, /confidence|traces|elementProfile|generationMeta/);
});
