import test from 'node:test';
import assert from 'node:assert/strict';

import {
  markLoveResultWithLlmFallback,
  personalizeLoveResult,
} from '../src/lib/saju/server/love-llm-personalizer.ts';

function createBaselineResult() {
  return {
    loveScore: 78,
    marriageScore: 72,
    riskScore: 34,
    confidence: 0.82,
    dominantElement: '목',
    weakestElement: '수',
    topYears: [
      { year: 2027, loveChance: 0.71, breakupRisk: 0.28 },
      { year: 2028, loveChance: 0.69, breakupRisk: 0.31 },
    ],
    evidenceCodes: ['R_SP_BASE'],
    summary: '기본 요약',
    highlight: '기본 강점',
    caution: '기본 주의',
    timingHint: '기본 타이밍',
    detailedReport: '1) 전체 진단\n기본 진단',
    detailedSections: [
      { title: '1) 전체 진단', body: '기본 진단' },
      { title: '2) 현재 관계 상태 해석', body: '기본 해석' },
    ],
    yearlyGuidance: [
      { year: 2027, loveChance: 0.71, breakupRisk: 0.28, focus: '기본 포커스 2027' },
      { year: 2028, loveChance: 0.69, breakupRisk: 0.31, focus: '기본 포커스 2028' },
    ],
    modelVersion: 'saju-love-v2',
  };
}

test('personalizeLoveResult keeps numeric engine fields fixed and rewrites text fields', async () => {
  const baseline = createBaselineResult();
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'gpt-test-mini';
  let requestBody = null;

  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          summary: '연락 템포가 흔들리는 고민이 중심에 있으니, 지금은 상대의 반응을 단정하기보다 관계의 리듬을 다시 맞추는 쪽이 좋습니다. 사주 흐름상 감정의 속도 차이를 조율하는 태도가 안정감을 키웁니다.',
          highlight: '현재 흐름에서는 관계를 급하게 밀어붙이기보다 짧고 꾸준한 표현을 반복할 때 장점이 살아납니다. 연락 템포 고민도 작은 약속을 지키는 방식으로 풀어가면 오해가 줄어듭니다.',
          caution: '답장 속도만으로 마음을 판단하면 불안이 커질 수 있습니다. 사주 근거상 감정 기복이 올라오는 구간에서는 중요한 대화를 문자로 길게 이어가기보다 차분히 만날 시간을 정하는 편이 안전합니다.',
          timingHint: '가까운 시기에는 한 번에 결론을 내리기보다 연락 방식과 만남 빈도를 부드럽게 합의해보는 것이 좋습니다. 고민을 꺼낼 때는 원망보다 바라는 리듬을 말하는 쪽이 흐름을 안정시킵니다.',
          detailedSections: [
            {
              title: '1) 전체 진단',
              body: '배우자궁과 오행 균형을 함께 보면 관계가 끊어지는 흐름이라기보다 속도를 맞추는 과정에서 불안이 커지기 쉬운 모습입니다. 연락 템포가 고민이라면 상대의 한두 번 반응보다 반복되는 패턴을 보는 편이 정확합니다. 지금은 감정을 밀어붙이기보다 안정적인 기준을 세울 때 관계의 장점이 살아납니다. 먼저 본인이 원하는 연락 빈도와 만남 리듬을 짧게 정리해두고, 대화에서는 비난보다 요청의 형태로 꺼내보세요.',
            },
            {
              title: '2) 현재 관계 상태 해석',
              body: '현재 연애 중이라는 맥락에서는 새 인연보다 지금 관계의 신뢰를 어떻게 회복하고 유지할지가 핵심입니다. 사주 흐름은 감정 표현의 온도 차이가 생길 수 있음을 보여주지만, 그것이 곧 마음이 식었다는 뜻은 아닙니다. 연락이 뜸해진 이유를 바로 결론 내리기보다 서로 편한 소통 방식을 다시 맞추는 과정이 필요합니다. 이번 주 안에 가벼운 만남이나 통화 시간을 정하고, 그 자리에서 원하는 리듬을 차분히 말해보는 방식이 좋습니다.',
            },
          ],
          yearlyGuidance: [
            {
              year: 2027,
              focus: '2027년은 관계의 방향을 다시 맞추기 좋은 해입니다. 연락 템포 고민은 혼자 해석하기보다 약속 방식과 소통 빈도를 함께 정하는 쪽으로 풀어가세요.',
            },
            {
              year: 2028,
              focus: '2028년에는 감정 표현이 커질 수 있어 서운함을 오래 쌓아두지 않는 것이 중요합니다. 중요한 이야기는 문자보다 통화나 만남에서 짧고 분명하게 나누는 편이 좋습니다.',
            },
          ],
        }),
      }),
    };
  };

  try {
    const result = await personalizeLoveResult(
      {
        name: '홍길동',
        email: 'test@example.com',
        gender: 'male',
        calendarType: 'solar',
        birthDate: '1991-01-01',
        birthTime: '08:30',
        birthPlace: '부산',
        relationshipStatus: 'dating',
        concern: '연락 템포 고민',
      },
      baseline,
    );

    assert.equal(result.loveScore, baseline.loveScore);
    assert.equal(result.marriageScore, baseline.marriageScore);
    assert.equal(result.riskScore, baseline.riskScore);
    assert.deepEqual(result.topYears, baseline.topYears);
    assert.deepEqual(result.evidenceCodes, baseline.evidenceCodes);

    assert.match(result.summary, /연락 템포가 흔들리는 고민/);
    assert.match(result.highlight, /짧고 꾸준한 표현/);
    assert.match(result.caution, /답장 속도만으로 마음을 판단/);
    assert.match(result.timingHint, /연락 방식과 만남 빈도/);
    assert.match(result.detailedSections[0].body, /배우자궁과 오행 균형/);
    assert.match(result.yearlyGuidance[1].focus, /중요한 이야기는 문자보다 통화나 만남/);
    assert.match(result.modelVersion, /saju-love-v2\+llm:gpt-test-mini/);
    assert.match(JSON.stringify(requestBody), /연락 템포 고민/);
    assert.match(JSON.stringify(requestBody), /사주 근거 → 관계 해석 → 현실적인 행동 제안/);
  } finally {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPENAI_MODEL = originalModel;
  }
});

test('markLoveResultWithLlmFallback appends fallback marker', () => {
  const baseline = createBaselineResult();
  const fallback = markLoveResultWithLlmFallback(baseline);

  assert.equal(fallback.modelVersion, 'saju-love-v2+llm:fallback');
  assert.equal(fallback.loveScore, baseline.loveScore);
});

test('personalizeLoveResult rejects sparse section bodies', async () => {
  const baseline = createBaselineResult();
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'gpt-test-mini';

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      output_text: JSON.stringify({
        summary: '사용자의 고민을 중심으로 관계 리듬을 다시 맞추는 것이 좋습니다. 불안을 바로 결론으로 만들기보다 대화의 기준을 세워보세요.',
        highlight: '관계의 장점은 꾸준한 표현과 약속 이행에서 살아납니다. 작은 소통 규칙을 만들면 흐름이 안정될 수 있습니다.',
        caution: '상대의 반응을 단정하면 오해가 커질 수 있습니다. 중요한 이야기는 차분한 자리에서 나누는 편이 좋습니다.',
        timingHint: '가까운 시기에는 결론보다 조율이 중요합니다. 연락과 만남의 리듬을 함께 정리하고, 감정이 올라온 날에는 바로 판단하지 않는 편이 좋습니다.',
        detailedSections: [
          { title: '1) 전체 진단', body: '너무 짧은 본문' },
          { title: '2) 현재 관계 상태 해석', body: '이 본문도 일부러 짧게 작성해 검증 로직이 빈약한 결과를 통과시키지 않는지 확인합니다.' },
        ],
        yearlyGuidance: [
          { year: 2027, focus: '2027년은 관계의 방향을 다시 맞추기 좋은 해입니다. 소통 빈도와 약속 방식을 함께 정리해보세요.' },
          { year: 2028, focus: '2028년은 감정 표현을 부드럽게 조율하는 것이 중요합니다. 중요한 이야기는 직접 나누는 편이 좋습니다.' },
        ],
      }),
    }),
  });

  try {
    await assert.rejects(
      () =>
        personalizeLoveResult(
          {
            name: '홍길동',
            email: 'test@example.com',
            gender: 'male',
            calendarType: 'solar',
            birthDate: '1991-01-01',
            birthTime: '08:30',
            birthPlace: '부산',
            relationshipStatus: 'dating',
            concern: '연락 템포 고민',
          },
          baseline,
        ),
      /openai_section_too_short/,
    );
  } finally {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPENAI_MODEL = originalModel;
  }
});
