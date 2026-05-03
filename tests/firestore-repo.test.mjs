import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeFirestoreData } from '../src/lib/saju/server/firestore-repo.ts';

test('sanitizeFirestoreData removes undefined values before Firestore writes', () => {
  const sanitized = sanitizeFirestoreData({
    id: 'exam-job',
    input: {
      fortuneType: 'exam',
      examSubject: '컴퓨터',
      concern: undefined,
    },
    result: {
      fortuneType: 'exam',
      subjectAnswer: undefined,
      yearlyGuidance: [
        { year: 2026, focus: '기초 루틴', overloadRisk: undefined },
        undefined,
      ],
    },
    email: {
      to: 'tester@example.com',
      error: null,
    },
  });

  assert.deepEqual(sanitized, {
    id: 'exam-job',
    input: {
      fortuneType: 'exam',
      examSubject: '컴퓨터',
    },
    result: {
      fortuneType: 'exam',
      yearlyGuidance: [{ year: 2026, focus: '기초 루틴' }],
    },
    email: {
      to: 'tester@example.com',
      error: null,
    },
  });
});
