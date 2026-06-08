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
    <div className="relative mx-auto grid max-w-[900px] gap-4 text-[var(--text)] md:gap-5">
      <section className="saju-card px-4 py-5 md:px-7 md:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow animate-step-enter">Saju Dice</p>
            <h1 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--text)] md:text-[44px] [animation-delay:80ms] animate-step-enter">
              주사위 운보기
            </h1>
            <p className="mt-3 max-w-[620px] text-[15px] leading-[1.62] text-[var(--text-dim)] md:text-[16px] [animation-delay:140ms] animate-step-enter">
              생년월일 없이 숫자와 키워드만으로 오늘의 가벼운 흐름을 확인합니다.
            </p>
          </div>
          <a href="/saju" className="pill w-fit">
            다른 운세 보기
          </a>
        </div>
      </section>

      <section className="saju-card grid gap-4 px-5 py-5 md:px-7 md:py-6 animate-panel-reveal">
        <div className="grid gap-4 md:grid-cols-[minmax(260px,320px)_1fr] md:items-start">
          <div className="order-2 grid content-start gap-4 md:order-1">
            <div className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--text-dim)]">좋아하는 숫자</span>
                <input
                  value={favoriteNumbers}
                  onChange={(event) => setFavoriteNumbers(event.target.value)}
                  placeholder="7, 14, 22"
                  inputMode="numeric"
                  maxLength={32}
                  disabled={isRolling}
                  className="saju-input"
                />
                <span className="text-xs text-[var(--text-faint)]">앞에서부터 최대 3개만 반영됩니다.</span>
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--text-dim)]">키워드</span>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="연애, 집중, 이직"
                  maxLength={32}
                  disabled={isRolling}
                  className="saju-input"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--text-dim)]">주사위 수</span>
                <select
                  value={diceCount}
                  onChange={(event) => {
                    setDiceCount(Number(event.target.value));
                  }}
                  disabled={isRolling}
                  className="saju-input appearance-none"
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
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-xs leading-[1.65] text-[var(--text-dim)] animate-toast-slide">
                이 선택은 이미 굴렸어요. 숫자, 키워드, 주사위 수 중 하나를 바꿔주세요.
              </div>
            )}

            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-xs leading-[1.65] text-[var(--text-dim)]">
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

            <div className="grid grid-cols-3 gap-2 text-center text-xs text-[var(--text-dim)]">
              <MetricCard label="숫자" value={parsedNumbers.length ? parsedNumbers.join(', ') : '기본'} />
              <MetricCard label="키워드" value={keyword.trim() || '오늘의 감'} truncate />
              <MetricCard label="상태" value={statusLabel} />
            </div>
          </div>
        </div>
      </section>

      <section className="saju-card px-5 py-5 md:px-7 md:py-6">
        {fortune ? <FortuneResult result={fortune} /> : <EmptyResult />}
      </section>
    </div>
  );
}

function buildSelectionKey(favoriteNumbers: number[], keyword: string, diceCount: number) {
  return `${favoriteNumbers.join(',')}|${keyword}|${diceCount}`;
}

function MetricCard({ label, value, truncate = false }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2">
      <span className="block text-[11px] text-[var(--text-faint)]">{label}</span>
      <strong className={`mt-1 block text-sm text-[var(--text)] ${truncate ? 'truncate' : ''}`}>{value}</strong>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="grid gap-2 text-[var(--text-dim)]">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)]">결과 대기 중</h2>
      <p className="text-[14px] leading-[1.6]">주사위가 멈추면 합계와 윗면 조합에 맞춰 짧은 해석이 표시됩니다.</p>
    </div>
  );
}

function FortuneResult({ result }: { result: DiceFortuneResult }) {
  return (
    <div className="grid gap-5 md:grid-cols-[220px_1fr]">
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <span className="text-xs uppercase tracking-[0.08em] text-[var(--text-faint)]">Dice Result</span>
        <strong className="mt-2 block text-[46px] leading-none text-[var(--text)]">{result.total}</strong>
        <span className="mt-2 block text-sm text-[var(--text-dim)]">{result.diceValues.join(' + ')}</span>
        <div className="mt-4 h-2 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg)]">
          <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${result.luckyScore}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--text-faint)]">재미 점수 {result.luckyScore}/100</p>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text-dim)]">
            <span className="mr-1.5 h-2.5 w-2.5 self-center rounded-full" style={{ backgroundColor: result.element.color }} />
            {result.element.label} · {result.element.mood}
          </p>
          <h2 className="mt-3 text-[25px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--text)] md:text-[30px]">{result.title}</h2>
          <p className="mt-3 text-[15px] leading-[1.7] text-[var(--text-dim)]">{result.summary}</p>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {result.detailCards.map((card) => (
            <article key={card.title} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">{card.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-[var(--text-dim)]">{card.body}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {result.actionCards.map((action) => (
            <div key={action} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm font-medium leading-[1.55] text-[var(--text)]">
              {action}
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <p className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm leading-[1.6] text-[var(--text-dim)]">{result.caution}</p>
          <div className="flex flex-wrap gap-2">
            {result.luckyTokens.map((token) => (
              <span key={token} className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-dim)]">
                {token}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
