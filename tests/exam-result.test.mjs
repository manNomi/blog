import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExamResult } from '../src/lib/saju/exam-result.ts';

function baseInput(overrides = {}) {
  return {
    fortuneType: 'exam',
    name: '테스터',
    email: 'tester@example.com',
    gender: 'female',
    calendarType: 'solar',
    birthDate: '1993-07-12',
    birthTime: '08:30',
    birthPlace: '서울특별시',
    relationshipStatus: 'unknown',
    examSubject: '컴퓨터',
    ...overrides,
  };
}

function combinedResultText(result) {
  return [
    result.summary,
    result.highlight,
    result.caution,
    result.timingHint,
    result.detailedReport,
    result.expectedOutcome?.label,
    result.expectedOutcome?.value,
    result.expectedOutcome?.description,
    result.scoreRationales?.exam,
    result.scoreRationales?.subjectFit,
    result.scoreRationales?.effort,
    result.subjectAnswer?.answer,
    ...(result.subjectAnswer?.actionItems ?? []),
    ...(result.yearlyGuidance ?? []).map((row) => row.focus),
  ].filter(Boolean).join('\n');
}

test('buildExamResult classifies 컴퓨터 as water and metal subject', () => {
  const result = buildExamResult(baseInput());

  assert.equal(result.fortuneType, 'exam');
  assert.equal(result.subjectProfile.subject, '컴퓨터');
  assert.equal(result.subjectProfile.primaryElement, 'water');
  assert.equal(result.subjectProfile.supportElement, 'metal');
  assert.equal(result.subjectProfile.primaryElementLabel, '수');
  assert.equal(result.subjectProfile.supportElementLabel, '금');
  assert.equal(result.examResultFormat, 'score');
  assert.equal(result.expectedOutcome.label, '예상 점수');
  assert.match(result.expectedOutcome.value, /\d+점대/);
  assert.deepEqual(result.yearlyGuidance, []);
  assert.deepEqual(result.topYears, []);
});

test('buildExamResult can return expected grade when requested', () => {
  const result = buildExamResult(baseInput({ examResultFormat: 'grade' }));

  assert.equal(result.examResultFormat, 'grade');
  assert.equal(result.expectedOutcome.label, '예상 학점');
  assert.match(result.expectedOutcome.value, /[ABCDF][+0]?|F 위험권/);
  assert.match(combinedResultText(result), /예상 학점/);
});

test('buildExamResult does not reuse love-only yearly or relationship signals', () => {
  const result = buildExamResult(baseInput({ examSubject: '컴퓨터' }));
  const text = combinedResultText(result);

  assert.doesNotMatch(text, /연도별 학습|학습 흐름 타임라인|배우자궁|배우자별|도화|홍란|홍염|연애|이별/);
  assert.deepEqual(result.yearlyGuidance, []);
  assert.deepEqual(result.topYears, []);
  assert.ok(result.evidenceCodes.every((code) => !code.startsWith('R_')));
});

test('buildExamResult strengthens effort coaching when weak element overlaps subject element', () => {
  let weakOverlapResult = null;

  for (const year of Array.from({ length: 30 }, (_, index) => 1980 + index)) {
    for (const month of ['01', '03', '05', '07', '09', '11']) {
      for (const day of ['04', '12', '20', '28']) {
        const result = buildExamResult(baseInput({ birthDate: `${year}-${month}-${day}` }));
        if (['수', '금'].includes(result.weakestElement)) {
          weakOverlapResult = result;
          break;
        }
      }
      if (weakOverlapResult) break;
    }
    if (weakOverlapResult) break;
  }

  assert.ok(weakOverlapResult, 'expected a deterministic sample whose weakest element overlaps 컴퓨터 subject elements');
  assert.ok(weakOverlapResult.effortScore >= 55);
  assert.match(weakOverlapResult.summary, new RegExp(`오행상 ${weakOverlapResult.weakestElement} 기운을 보완`));
  assert.match(weakOverlapResult.caution, /보완|반복 규칙|풀이 순서/);
});

test('buildExamResult avoids deterministic failure wording', () => {
  const result = buildExamResult(baseInput({ examSubject: '컴퓨터' }));
  const text = combinedResultText(result);

  assert.doesNotMatch(text, /절대 못함|불합격 확정|무조건 떨어|합격 확정|절대 안 됨/);
});
