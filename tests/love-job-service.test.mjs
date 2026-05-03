import test from 'node:test';
import assert from 'node:assert/strict';

import { validateLoveInput } from '../src/lib/saju/server/love-job-service.ts';
import { mapCreateErrorToMessage } from '../src/pages/api/saju-requests/index.ts';

function legacyLoveInput(overrides = {}) {
  return {
    name: '테스터',
    email: 'tester@example.com',
    gender: 'female',
    calendarType: 'solar',
    birthDate: '1993-07-12',
    birthTime: '08:30',
    birthPlace: '서울특별시',
    relationshipStatus: 'unknown',
    ...overrides,
  };
}

test('validateLoveInput keeps legacy love requests without fortuneType working', () => {
  assert.doesNotThrow(() => validateLoveInput(legacyLoveInput()));
});

test('validateLoveInput requires examSubject for exam requests', () => {
  assert.throws(
    () => validateLoveInput(legacyLoveInput({ fortuneType: 'exam', examSubject: '' })),
    /exam_subject_required/,
  );
});

test('mapCreateErrorToMessage returns the exam subject 400 copy', () => {
  assert.equal(mapCreateErrorToMessage('exam_subject_required'), '고민중인 과목을 입력해 주세요.');
});
