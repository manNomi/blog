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

  global.fetch = async () =>
    ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          summary: '개인화 요약',
          highlight: '개인화 강점',
          caution: '개인화 주의',
          timingHint: '개인화 타이밍',
          detailedSections: [
            { title: '1) 전체 진단', body: '개인화 진단' },
            { title: '2) 현재 관계 상태 해석', body: '개인화 해석' },
          ],
          yearlyGuidance: [
            { year: 2027, focus: '개인화 포커스 2027' },
            { year: 2028, focus: '개인화 포커스 2028' },
          ],
        }),
      }),
    });

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

    assert.equal(result.summary, '개인화 요약');
    assert.equal(result.highlight, '개인화 강점');
    assert.equal(result.caution, '개인화 주의');
    assert.equal(result.timingHint, '개인화 타이밍');
    assert.equal(result.detailedSections[0].body, '개인화 진단');
    assert.equal(result.yearlyGuidance[1].focus, '개인화 포커스 2028');
    assert.match(result.modelVersion, /saju-love-v2\+llm:gpt-test-mini/);
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

