import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderAdminSummaryEmail,
  renderLoveResultEmail,
} from '../src/lib/saju/server/email-templates.ts';

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
    summary: '핵심 요약 문구',
    highlight: '좋은 흐름 문구',
    caution: '주의 포인트 문구',
    timingHint: '타이밍 힌트 문구',
    detailedReport: '',
    detailedSections: [
      { title: '1) 전체 진단', body: '전체 진단 본문' },
      { title: '2) 현재 관계 상태 해석', body: '관계 상태 해석 본문' },
    ],
    yearlyGuidance: [
      { year: 2027, loveChance: 0.72, breakupRisk: 0.3, focus: '2027 실행 포커스' },
      { year: 2028, loveChance: 0.68, breakupRisk: 0.33, focus: '2028 실행 포커스' },
    ],
    modelVersion: 'saju-love-v2+llm:gpt-5.5',
  };
}

test('renderLoveResultEmail includes progressive details/summary blocks', async () => {
  const rendered = await renderLoveResultEmail({
    requestId: 'job-123',
    name: '테스터',
    concern: '연락이 뜸해져서 관계가 식은 건 아닌지 걱정돼요.',
    result: sampleResult(),
  });

  assert.match(rendered.html, /<details/i);
  assert.match(rendered.html, /<summary/i);
  assert.match(rendered.html, /핵심 요약/);
  assert.match(rendered.html, /고민 중심 해석/);
  assert.match(rendered.html, /년도별 연애운 차트/);
  assert.match(rendered.html, /연도별 실행 포인트/);
  assert.match(rendered.html, /width:72%/);
  assert.match(rendered.html, /리스크 30%/);

  assert.match(rendered.text, /핵심 요약 문구/);
  assert.match(rendered.text, /연락이 뜸해져서 관계가 식은 건 아닌지 걱정돼요/);
  assert.match(rendered.text, /2027 실행 포커스/);
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
