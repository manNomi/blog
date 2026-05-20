import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiceFortune, normalizeDiceKeyword, parseFavoriteNumbers } from '../src/lib/saju/dice-fortune.ts';

test('parseFavoriteNumbers keeps up to three numeric values', () => {
  assert.deepEqual(parseFavoriteNumbers('7, 14, 22, 99, text'), [7, 14, 22]);
});

test('normalizeDiceKeyword falls back when keyword is empty', () => {
  assert.equal(normalizeDiceKeyword('   '), '오늘의 감');
});

test('buildDiceFortune includes three detail cards and action cards', () => {
  const result = buildDiceFortune({
    favoriteNumbers: '7, 14, 22',
    keyword: '집중',
    diceValues: [2, 4, 6]
  });

  assert.deepEqual(
    result.detailCards.map((card) => card.title),
    ['숫자 흐름', '키워드 해석', '오늘의 사용법']
  );
  assert.equal(result.detailCards.length, 3);
  assert.equal(result.actionCards.length, 3);
  assert.ok(result.detailCards.every((card) => card.body.length > 20));
});

test('buildDiceFortune uses default keyword in detail cards', () => {
  const result = buildDiceFortune({
    favoriteNumbers: '',
    keyword: '   ',
    diceValues: [1, 2, 3]
  });

  assert.equal(result.keyword, '오늘의 감');
  assert.match(result.detailCards[1].body, /오늘의 감/);
});

test('buildDiceFortune is deterministic for the same numbers keyword and dice values', () => {
  const input = {
    favoriteNumbers: '3, 8, 21',
    keyword: '집중',
    diceValues: [2, 4, 6]
  };

  assert.deepEqual(buildDiceFortune(input), buildDiceFortune(input));
});

test('buildDiceFortune reflects dice total changes in result bucket', () => {
  const low = buildDiceFortune({
    favoriteNumbers: '5',
    keyword: '연애',
    diceValues: [1, 1, 1]
  });
  const high = buildDiceFortune({
    favoriteNumbers: '5',
    keyword: '연애',
    diceValues: [6, 6, 6]
  });

  assert.equal(low.resultBucket, 'low');
  assert.equal(high.resultBucket, 'high');
});
