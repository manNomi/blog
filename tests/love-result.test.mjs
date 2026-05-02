import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('buildLoveResult returns the full 2026-2035 yearly guidance timeline', () => {
  const script = `
    import { buildLoveResult } from './src/lib/saju/love-result.ts';
    const result = buildLoveResult({
      name: '테스터',
      email: 'test@example.com',
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1991-01-01',
      birthTime: '08:30',
      birthPlace: '경기도 수원시',
      relationshipStatus: 'unknown',
      concern: '소개팅이 잘 안 풀립니다.',
    });
    process.stdout.write(JSON.stringify({
      years: result.yearlyGuidance.map((row) => row.year),
      yearlyCount: result.yearlyGuidance.length,
      topYearCount: result.topYears.length,
    }));
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr);

  const result = JSON.parse(child.stdout);
  assert.deepEqual(
    result.years,
    [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035],
  );
  assert.equal(result.yearlyCount, 10);
  assert.equal(result.topYearCount, 3);
});
