export type DiceElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export type DiceFortuneInput = {
  favoriteNumbers?: string | number[];
  keyword?: string;
  diceValues: number[];
};

export type DiceFortuneResult = {
  favoriteNumbers: number[];
  keyword: string;
  diceValues: number[];
  total: number;
  resultBucket: 'low' | 'middle' | 'high';
  element: {
    key: DiceElement;
    label: string;
    color: string;
    mood: string;
  };
  luckyScore: number;
  title: string;
  summary: string;
  actionCards: string[];
  caution: string;
  luckyTokens: string[];
};

const DEFAULT_KEYWORD = '오늘의 감';
const MAX_FAVORITE_NUMBERS = 3;

const elements: Array<DiceFortuneResult['element']> = [
  { key: 'wood', label: '목', color: '#3F8F63', mood: '새로 싹이 트는 흐름' },
  { key: 'fire', label: '화', color: '#D95D39', mood: '속도가 붙는 흐름' },
  { key: 'earth', label: '토', color: '#A57C45', mood: '중심을 잡는 흐름' },
  { key: 'metal', label: '금', color: '#6D7A86', mood: '기준이 선명해지는 흐름' },
  { key: 'water', label: '수', color: '#3D79B6', mood: '생각이 깊어지는 흐름' }
];

const titleByBucket: Record<DiceFortuneResult['resultBucket'], string[]> = {
  low: ['천천히 열리는 판', '작게 던져 크게 고르는 날', '가볍게 정리하면 풀리는 흐름'],
  middle: ['균형이 맞아 들어오는 판', '오늘의 감이 꽤 선명한 날', '흔들림 속에서 방향이 보이는 흐름'],
  high: ['한 번에 치고 나가는 판', '기세가 앞으로 몰리는 날', '숫자가 등을 밀어주는 흐름']
};

const summaryByElement: Record<DiceElement, string[]> = {
  wood: [
    '새로 시작한 일에 작은 물을 주기 좋습니다. 오늘은 크게 증명하기보다 싹을 살리는 쪽이 유리합니다.',
    '막힌 생각을 다른 각도에서 틔우기 좋습니다. 사람과 대화할수록 다음 수가 보입니다.'
  ],
  fire: [
    '반응이 빠른 날입니다. 마음이 움직인다면 짧게라도 표현하는 쪽이 흐름을 살립니다.',
    '집중력이 순간적으로 강해집니다. 단, 너무 빨리 결론내리지만 않으면 좋은 탄력이 납니다.'
  ],
  earth: [
    '흩어진 것을 모아 안정시키는 날입니다. 정리, 약속, 루틴처럼 기반을 잡는 일이 잘 맞습니다.',
    '결과보다 과정의 모양을 다듬기 좋습니다. 무리한 확장보다 지금 손에 있는 것을 단단히 잡으세요.'
  ],
  metal: [
    '기준을 세우면 선택이 쉬워집니다. 오늘은 애매한 호감보다 분명한 우선순위가 운을 부릅니다.',
    '불필요한 것을 덜어내기 좋습니다. 작게 잘라낸 결정 하나가 생각보다 큰 여유를 만듭니다.'
  ],
  water: [
    '조용히 관찰할수록 답이 보입니다. 오늘은 말보다 기록, 즉흥보다 여백이 운을 키웁니다.',
    '감정의 물살이 깊은 날입니다. 서두르지 않으면 오래 가는 힌트를 발견할 수 있습니다.'
  ]
};

const actionPool: Record<DiceElement, string[]> = {
  wood: ['새로 떠오른 아이디어를 하나만 적기', '먼저 가볍게 안부를 보내기', '미뤄둔 시작 버튼 누르기'],
  fire: ['10분 안에 끝낼 수 있는 일부터 처리하기', '마음에 든 표현을 바로 남기기', '몸을 움직여 기분 전환하기'],
  earth: ['책상이나 메모함 하나 정리하기', '오늘 꼭 지킬 작은 약속 정하기', '돈과 시간을 쓰기 전에 한 번 더 확인하기'],
  metal: ['하지 않을 일을 하나 정하기', '선택 기준을 세 문장으로 줄이기', '애매한 답변을 분명하게 고쳐 쓰기'],
  water: ['짧은 산책으로 생각 비우기', '감정이 올라오는 이유를 한 줄로 적기', '답장을 보내기 전 5분 쉬기']
};

const cautionByBucket: Record<DiceFortuneResult['resultBucket'], string[]> = {
  low: ['작게 나온 숫자는 멈춤이 아니라 예열에 가깝습니다. 오늘은 판을 키우기보다 발판을 고르세요.'],
  middle: ['균형이 좋은 만큼 우유부단해지기 쉽습니다. 한 가지 기준을 정하면 흐름이 더 선명해집니다.'],
  high: ['기세가 좋은 날일수록 말과 약속이 커질 수 있습니다. 속도는 살리되 확인은 한 번 더 하세요.']
};

export function parseFavoriteNumbers(value: string | number[] = '') {
  const rawNumbers = Array.isArray(value) ? value : value.match(/-?\d+/g) ?? [];

  return rawNumbers
    .map((entry) => Number(entry))
    .filter(Number.isFinite)
    .map((entry) => Math.abs(Math.trunc(entry)))
    .slice(0, MAX_FAVORITE_NUMBERS);
}

export function normalizeDiceKeyword(keyword = '') {
  const normalized = keyword.trim().replace(/\s+/g, ' ').slice(0, 32);
  return normalized || DEFAULT_KEYWORD;
}

export function normalizeDiceValues(values: number[]) {
  const diceValues = values
    .map((value) => Math.trunc(value))
    .filter((value) => value >= 1 && value <= 6);

  return diceValues.length > 0 ? diceValues : [1, 1, 1];
}

export function buildDiceFortune(input: DiceFortuneInput): DiceFortuneResult {
  const favoriteNumbers = parseFavoriteNumbers(input.favoriteNumbers);
  const keyword = normalizeDiceKeyword(input.keyword);
  const diceValues = normalizeDiceValues(input.diceValues);
  const total = diceValues.reduce((sum, value) => sum + value, 0);
  const favoriteSum = favoriteNumbers.reduce((sum, value) => sum + value, 0);
  const seed = hashText(`${favoriteNumbers.join(',')}|${keyword}|${diceValues.join(',')}`);
  const resultBucket = getResultBucket(total, diceValues.length);
  const element = elements[(seed + total + favoriteSum) % elements.length];
  const titleOptions = titleByBucket[resultBucket];
  const summaryOptions = summaryByElement[element.key];
  const actionOptions = actionPool[element.key];
  const luckyScore = clamp(42 + total * 3 + (favoriteSum % 13) + (seed % 17) - diceValues.length, 1, 99);

  return {
    favoriteNumbers,
    keyword,
    diceValues,
    total,
    resultBucket,
    element,
    luckyScore,
    title: titleOptions[seed % titleOptions.length],
    summary: summaryOptions[(seed + total) % summaryOptions.length],
    actionCards: pickRotating(actionOptions, seed, 2),
    caution: cautionByBucket[resultBucket][0],
    luckyTokens: buildLuckyTokens({ favoriteNumbers, keyword, diceValues, seed })
  };
}

function getResultBucket(total: number, diceCount: number): DiceFortuneResult['resultBucket'] {
  const min = diceCount;
  const max = diceCount * 6;
  const ratio = (total - min) / Math.max(1, max - min);

  if (ratio < 0.34) return 'low';
  if (ratio < 0.67) return 'middle';
  return 'high';
}

function pickRotating(values: string[], seed: number, count: number) {
  return Array.from({ length: count }, (_, index) => values[(seed + index) % values.length]);
}

function buildLuckyTokens({
  favoriteNumbers,
  keyword,
  diceValues,
  seed
}: {
  favoriteNumbers: number[];
  keyword: string;
  diceValues: number[];
  seed: number;
}) {
  const numberToken = favoriteNumbers.length > 0 ? favoriteNumbers[seed % favoriteNumbers.length] : diceValues[seed % diceValues.length];
  const keywordToken = keyword.split(' ')[0] || DEFAULT_KEYWORD;
  const diceToken = diceValues[(seed + numberToken) % diceValues.length];

  return [`숫자 ${numberToken}`, keywordToken, `${diceToken}칸 전진`];
}

function hashText(text: string) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
