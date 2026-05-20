import { useEffect, useMemo, useRef, useState } from 'react';
import SajuDiceStage from './SajuDiceStage';
import { buildDiceFortune, normalizeDiceKeyword, parseFavoriteNumbers, type DiceFortuneResult } from '../lib/saju/dice-fortune';

const diceCountOptions = [2, 3, 4, 5, 6];

export default function SajuDicePage() {
  const [favoriteNumbers, setFavoriteNumbers] = useState('7, 14, 22');
  const [keyword, setKeyword] = useState('오늘의 운');
  const [diceCount, setDiceCount] = useState(3);
  const [rollSignal, setRollSignal] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [fortune, setFortune] = useState<DiceFortuneResult | null>(null);
  const [rolledSelectionKeys, setRolledSelectionKeys] = useState<Set<string>>(() => new Set());
  const activeRollRef = useRef<{ favoriteNumbers: string; key: string; keyword: string } | null>(null);

  const parsedNumbers = useMemo(() => parseFavoriteNumbers(favoriteNumbers), [favoriteNumbers]);
  const normalizedKeyword = useMemo(() => normalizeDiceKeyword(keyword), [keyword]);
  const selectionKey = useMemo(() => buildSelectionKey(parsedNumbers, normalizedKeyword, diceCount), [diceCount, normalizedKeyword, parsedNumbers]);
  const previousSelectionKeyRef = useRef(selectionKey);
  const isSelectionRolled = rolledSelectionKeys.has(selectionKey);
  const statusLabel = isRolling ? '회전 중' : fortune ? '완료' : isSelectionRolled ? '잠김' : '대기';

  useEffect(() => {
    if (previousSelectionKeyRef.current === selectionKey) return;

    previousSelectionKeyRef.current = selectionKey;
    activeRollRef.current = null;
    setFortune(null);
    setIsRolling(false);
  }, [selectionKey]);

  const rollDice = () => {
    if (isRolling || isSelectionRolled) return;

    activeRollRef.current = {
      favoriteNumbers,
      key: selectionKey,
      keyword
    };
    setRollSignal((signal) => signal + 1);
  };

  return (
    <div className="mx-auto grid max-w-[1120px] gap-4 text-zinc-800 md:gap-5">
      <section className="grid gap-4 rounded-md border border-line bg-surface px-4 py-5 shadow-soft md:px-6 md:py-6">
        <div>
          <p className="kicker">Saju Dice</p>
          <h1 className="mt-2 text-[31px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-900 md:text-[44px]">주사위 사주</h1>
          <p className="mt-3 max-w-[720px] text-[15px] leading-[1.6] text-zinc-600">
            생년월일 없이 숫자와 키워드만으로 오늘의 장난스러운 흐름을 뽑아봅니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="order-2 grid content-start gap-4 md:order-1">

          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">좋아하는 숫자</span>
              <input
                value={favoriteNumbers}
                onChange={(event) => setFavoriteNumbers(event.target.value)}
                placeholder="7, 14, 22"
                inputMode="numeric"
                maxLength={32}
                disabled={isRolling}
                className="h-11 rounded-md border border-line bg-white px-3 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
              />
              <span className="text-xs text-zinc-500">앞에서부터 최대 3개만 반영됩니다.</span>
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">키워드</span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="연애, 집중, 이직"
                maxLength={32}
                disabled={isRolling}
                className="h-11 rounded-md border border-line bg-white px-3 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">주사위 수</span>
              <select
                value={diceCount}
                onChange={(event) => {
                  setDiceCount(Number(event.target.value));
                }}
                disabled={isRolling}
                className="h-11 rounded-md border border-line bg-white px-3 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
              >
                {diceCountOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}개
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={rollDice}
            disabled={isRolling || isSelectionRolled}
            className="btn-pill-dark h-12 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRolling ? '굴리는 중...' : isSelectionRolled ? '이미 굴린 선택' : '주사위 굴리기'}
          </button>

          {isSelectionRolled && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-[1.65] text-amber-900">
              이 선택은 이미 굴렸어요. 숫자, 키워드, 주사위 수 중 하나를 바꿔주세요.
            </div>
          )}

          <div className="rounded-md border border-line bg-soft px-3 py-3 text-xs leading-[1.65] text-zinc-600">
            개인정보를 넣지 않는 오락용 결과입니다. 이름, 생년월일, 이메일, 출생지 같은 정보는 입력하지 않아도 됩니다.
          </div>
        </div>

          <div className="order-1 grid gap-3 md:order-2">
          <SajuDiceStage
            diceCount={diceCount}
            rollSignal={rollSignal}
            onRollStart={() => {
              setIsRolling(true);
            }}
            onRollResult={(diceValues) => {
              const activeRoll = activeRollRef.current ?? {
                favoriteNumbers,
                key: selectionKey,
                keyword
              };

              setFortune(
                buildDiceFortune({
                  favoriteNumbers: activeRoll.favoriteNumbers,
                  keyword: activeRoll.keyword,
                  diceValues
                })
              );
              setRolledSelectionKeys((currentKeys) => {
                const nextKeys = new Set(currentKeys);
                nextKeys.add(activeRoll.key);
                return nextKeys;
              });
              setIsRolling(false);
            }}
          />

          <div className="grid grid-cols-3 gap-2 text-center text-xs text-zinc-600">
            <div className="rounded-md border border-line bg-soft px-2 py-2">
              <span className="block text-[11px] text-zinc-500">숫자</span>
              <strong className="mt-1 block text-sm text-zinc-900">{parsedNumbers.length ? parsedNumbers.join(', ') : '기본'}</strong>
            </div>
            <div className="rounded-md border border-line bg-soft px-2 py-2">
              <span className="block text-[11px] text-zinc-500">키워드</span>
              <strong className="mt-1 block truncate text-sm text-zinc-900">{keyword.trim() || '오늘의 감'}</strong>
            </div>
            <div className="rounded-md border border-line bg-soft px-2 py-2">
              <span className="block text-[11px] text-zinc-500">상태</span>
              <strong className="mt-1 block text-sm text-zinc-900">{statusLabel}</strong>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="rounded-md border border-line bg-surface px-4 py-5 shadow-soft md:px-6 md:py-6">
        {fortune ? <FortuneResult result={fortune} /> : <EmptyResult />}
      </section>
    </div>
  );
}

function buildSelectionKey(favoriteNumbers: number[], keyword: string, diceCount: number) {
  return `${favoriteNumbers.join(',')}|${keyword}|${diceCount}`;
}

function EmptyResult() {
  return (
    <div className="grid gap-2 text-zinc-600">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-900">결과 대기 중</h2>
      <p className="text-[14px] leading-[1.6]">주사위가 멈추면 합계와 윗면 조합에 맞춰 짧은 해석이 표시됩니다.</p>
    </div>
  );
}

function FortuneResult({ result }: { result: DiceFortuneResult }) {
  return (
    <div className="grid gap-5 md:grid-cols-[240px_1fr]">
      <div className="rounded-md border border-line bg-soft p-4">
        <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Dice Result</span>
        <strong className="mt-2 block text-[46px] leading-none text-zinc-900">{result.total}</strong>
        <span className="mt-2 block text-sm text-zinc-600">{result.diceValues.join(' + ')}</span>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
          <span className="block h-full rounded-full bg-zinc-900" style={{ width: `${result.luckyScore}%` }} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">재미 점수 {result.luckyScore}/100</p>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-zinc-700">
            <span className="mr-1.5 h-2.5 w-2.5 self-center rounded-full" style={{ backgroundColor: result.element.color }} />
            {result.element.label} · {result.element.mood}
          </p>
          <h2 className="mt-3 text-[25px] font-semibold leading-[1.2] tracking-[-0.02em] text-zinc-900 md:text-[30px]">{result.title}</h2>
          <p className="mt-3 text-[15px] leading-[1.7] text-zinc-600">{result.summary}</p>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {result.detailCards.map((card) => (
            <article key={card.title} className="rounded-md border border-line bg-white px-3 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">{card.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-zinc-600">{card.body}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {result.actionCards.map((action) => (
            <div key={action} className="rounded-md border border-line bg-soft px-3 py-3 text-sm font-medium leading-[1.55] text-zinc-800">
              {action}
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-[1.6] text-amber-900">{result.caution}</p>
          <div className="flex flex-wrap gap-2">
            {result.luckyTokens.map((token) => (
              <span key={token} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-zinc-700">
                {token}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
