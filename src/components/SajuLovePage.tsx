import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { buildLoveResult } from '../lib/saju/love-result';
import type { LoveJobInput, LoveJobResult } from '../lib/saju/love-types';

const DEFAULT_INPUT: LoveJobInput = {
  name: '',
  email: '',
  gender: 'female',
  calendarType: 'solar',
  birthDate: '',
  birthTime: '',
  birthPlace: '대한민국'
};

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function SajuLovePage() {
  const [form, setForm] = useState<LoveJobInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<LoveJobResult | null>(null);
  const [error, setError] = useState('');

  const quickSummary = useMemo(() => {
    if (!result) return [];
    return [
      { label: '연애운', value: `${result.loveScore}점` },
      { label: '결혼 전환', value: `${result.marriageScore}점` },
      { label: '리스크', value: `${result.riskScore}점` }
    ];
  }, [result]);

  const updateField = <K extends keyof LoveJobInput>(key: K, value: LoveJobInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.birthDate) {
      setError('생년월일을 입력해 주세요.');
      return;
    }

    setError('');
    setResult(buildLoveResult(form));
  };

  const handleReset = () => {
    setForm(DEFAULT_INPUT);
    setResult(null);
    setError('');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[linear-gradient(150deg,#ffffff_0%,#f8fbfc_100%)] p-5 shadow-[var(--shadow-sm)] md:p-7">
        <p className="mb-2 inline-flex rounded-full border border-[rgba(11,110,153,0.28)] bg-[#edf5f8] px-3 py-1 text-[0.72rem] font-semibold text-[var(--accent-primary)]">
          SAJU · LOVE REPORT
        </p>
        <h1 className="text-[1.55rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[2rem]">사주 연애운 리포트</h1>
        <p className="mt-2 max-w-[680px] text-[0.92rem] leading-[1.65] text-[var(--text-secondary)]">
          기존 사주 앱의 핵심 분석 엔진을 블로그 디자인에 맞춰 통합했습니다. 입력 즉시 연애운, 결혼 전환 지표,
          연도별 흐름을 한 화면에서 확인할 수 있습니다.
        </p>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-[0.82rem] text-[var(--text-secondary)]">
              이름 (선택)
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="홍길동"
                className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)]"
              />
            </label>

            <label className="text-[0.82rem] text-[var(--text-secondary)]">
              이메일 (선택)
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)]"
              />
            </label>

            <label className="text-[0.82rem] text-[var(--text-secondary)]">
              생년월일
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) => updateField('birthDate', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)]"
              />
            </label>

            <label className="text-[0.82rem] text-[var(--text-secondary)]">
              출생 시간 (선택)
              <input
                type="time"
                value={form.birthTime}
                onChange={(event) => updateField('birthTime', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)]"
              />
            </label>

            <label className="text-[0.82rem] text-[var(--text-secondary)]">
              성별
              <select
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value as LoveJobInput['gender'])}
                className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)]"
              >
                <option value="female">여성</option>
                <option value="male">남성</option>
              </select>
            </label>

            <label className="text-[0.82rem] text-[var(--text-secondary)]">
              달력
              <select
                value={form.calendarType}
                onChange={(event) => updateField('calendarType', event.target.value as LoveJobInput['calendarType'])}
                className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)]"
              >
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>

            <label className="text-[0.82rem] text-[var(--text-secondary)] md:col-span-2">
              출생지 (선택)
              <input
                type="text"
                value={form.birthPlace}
                onChange={(event) => updateField('birthPlace', event.target.value)}
                placeholder="서울"
                className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)]"
              />
            </label>
          </div>

          {error && <p className="text-[0.84rem] text-[#ba3b2a]">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.84rem] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              결과 보기
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              초기화
            </button>
          </div>
        </form>
      </section>

      {result && (
        <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
          <div className="grid gap-3 md:grid-cols-3">
            {quickSummary.map((item) => (
              <article key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
                <p className="text-[0.72rem] text-[var(--text-tertiary)]">{item.label}</p>
                <p className="mt-1 text-[1.2rem] font-semibold text-[var(--text-primary)]">{item.value}</p>
              </article>
            ))}
          </div>

          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h2 className="text-[0.95rem] font-semibold text-[var(--text-primary)]">핵심 요약</h2>
            <p className="mt-2 text-[0.9rem] leading-[1.65] text-[var(--text-secondary)]">{result.summary}</p>
            <p className="mt-2 text-[0.86rem] leading-[1.6] text-[var(--text-secondary)]">좋은 흐름: {result.highlight}</p>
            <p className="mt-1 text-[0.86rem] leading-[1.6] text-[var(--text-secondary)]">주의 포인트: {result.caution}</p>
            <p className="mt-1 text-[0.86rem] leading-[1.6] text-[var(--text-secondary)]">타이밍 힌트: {result.timingHint}</p>
          </article>

          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h2 className="text-[0.95rem] font-semibold text-[var(--text-primary)]">연도별 가이드</h2>
            <ul className="mt-3 space-y-2">
              {result.yearlyGuidance.slice(0, 5).map((year) => (
                <li key={year.year} className="rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
                  <p className="text-[0.85rem] font-semibold text-[var(--text-primary)]">{year.year}년</p>
                  <p className="mt-1 text-[0.8rem] text-[var(--text-secondary)]">
                    기대 {toPercent(year.loveChance)} · 리스크 {toPercent(year.breakupRisk)}
                  </p>
                  <p className="mt-1 text-[0.8rem] leading-[1.55] text-[var(--text-secondary)]">{year.focus}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h2 className="text-[0.95rem] font-semibold text-[var(--text-primary)]">상세 리포트</h2>
            <div className="mt-3 space-y-3">
              {result.detailedSections.map((section) => (
                <section key={section.title} className="rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
                  <h3 className="text-[0.84rem] font-semibold text-[var(--text-primary)]">{section.title}</h3>
                  <p className="mt-1.5 whitespace-pre-line text-[0.82rem] leading-[1.65] text-[var(--text-secondary)]">{section.body}</p>
                </section>
              ))}
            </div>
            <p className="mt-3 text-right text-[0.72rem] text-[var(--text-tertiary)]">model: {result.modelVersion}</p>
          </article>
        </section>
      )}
    </div>
  );
}
