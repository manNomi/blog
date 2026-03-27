import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LoveJobInput, LoveJobPublic } from '../lib/saju/love-job-types';

const DEFAULT_INPUT: LoveJobInput = {
  name: '',
  email: '',
  gender: 'female',
  calendarType: 'solar',
  birthDate: '',
  birthTime: '',
  birthPlace: '대한민국'
};

type Step = 'landing' | 'input' | 'submitted';

type CreateResponse = {
  requestId: string;
  accessToken: string;
  request: LoveJobPublic;
};

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : '요청 처리 중 오류가 발생했어요.';
    throw new Error(message);
  }
  return payload as T;
}

function statusText(status: LoveJobPublic['status']) {
  switch (status) {
    case 'queued':
      return '대기 중';
    case 'processing':
      return '분석 중';
    case 'completed':
      return '완료';
    case 'failed':
      return '실패';
    default:
      return status;
  }
}

export default function SajuLovePage() {
  const [step, setStep] = useState<Step>('landing');
  const [form, setForm] = useState<LoveJobInput>(DEFAULT_INPUT);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const [requestId, setRequestId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [requestState, setRequestState] = useState<LoveJobPublic | null>(null);

  const updateField = <K extends keyof LoveJobInput>(key: K, value: LoveJobInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;
    if (!form.birthDate) {
      setError('생년월일을 입력해 주세요.');
      return;
    }
    if (!form.email) {
      setError('결과를 받을 이메일을 입력해 주세요.');
      return;
    }

    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const created = await parseJson<CreateResponse>(
        await fetch('/api/saju-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: form })
        })
      );

      setRequestId(created.requestId);
      setAccessToken(created.accessToken);
      setRequestState(created.request);
      setStep('submitted');
      setNotice('요청이 정상 등록되었습니다. 처리 후 이메일로 결과를 보내드립니다.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '요청 등록에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkStatus = async () => {
    if (isChecking) return;
    if (!requestId || !accessToken) {
      setError('요청 ID와 조회 키를 입력해 주세요.');
      return;
    }

    setError('');
    setNotice('');
    setIsChecking(true);

    try {
      const payload = await parseJson<{ request: LoveJobPublic }>(
        await fetch(`/api/saju-requests/${encodeURIComponent(requestId)}?token=${encodeURIComponent(accessToken)}`, {
          method: 'GET',
          cache: 'no-store'
        })
      );

      setRequestState(payload.request);

      if (payload.request.status === 'completed' && payload.request.email.sent) {
        setNotice('분석이 완료되었고 이메일 발송까지 끝났습니다. 메일함/스팸함을 확인해 주세요.');
      } else {
        setNotice(`현재 상태: ${statusText(payload.request.status)}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '상태 조회에 실패했어요.');
    } finally {
      setIsChecking(false);
    }
  };

  const triggerProcessor = async () => {
    if (isTriggering) return;

    setError('');
    setNotice('');
    setIsTriggering(true);

    try {
      const payload = await parseJson<{ processed: number }>(
        await fetch('/api/saju-requests/process', {
          method: 'POST'
        })
      );
      setNotice(`처리 트리거 완료: ${payload.processed}건 처리되었습니다.`);
      await checkStatus();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '처리 트리거 호출에 실패했어요.');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[linear-gradient(150deg,#ffffff_0%,#f8fbfc_100%)] p-5 shadow-[var(--shadow-sm)] md:p-7">
        <p className="mb-2 inline-flex rounded-full border border-[rgba(11,110,153,0.28)] bg-[#edf5f8] px-3 py-1 text-[0.72rem] font-semibold text-[var(--accent-primary)]">
          SAJU · EMAIL FLOW
        </p>
        <h1 className="text-[1.55rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[2rem]">사주 연애운 이메일 리포트</h1>
        <p className="mt-2 max-w-[700px] text-[0.92rem] leading-[1.65] text-[var(--text-secondary)]">
          결과를 즉시 노출하지 않고, 요청을 큐에 등록한 뒤 비동기 처리 후 이메일로 발송하는 구조입니다. 기존 saju 프로젝트의
          요청/처리/발송 플로우를 블로그 페이지로 통합했습니다.
        </p>
      </section>

      {step === 'landing' && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 text-center shadow-[var(--shadow-sm)]">
          <h2 className="text-[1.25rem] font-semibold text-[var(--text-primary)]">이메일로 결과 받기</h2>
          <p className="mt-2 text-[0.9rem] text-[var(--text-secondary)]">사주 정보를 입력하면 요청이 접수되고, 분석 완료 후 메일로 결과가 발송됩니다.</p>
          <button
            type="button"
            onClick={() => setStep('input')}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.84rem] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            요청 시작하기
          </button>
        </section>
      )}

      {step === 'input' && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
          <form className="space-y-4" onSubmit={submitRequest}>
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
                이메일
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
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.84rem] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {isSubmitting ? '등록 중...' : '요청 등록'}
              </button>
              <button
                type="button"
                onClick={() => setStep('landing')}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                뒤로가기
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'submitted' && (
        <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h2 className="text-[1.05rem] font-semibold text-[var(--text-primary)]">요청이 접수되었습니다</h2>
            <p className="mt-2 text-[0.88rem] text-[var(--text-secondary)]">처리가 완료되면 입력하신 이메일로 결과가 발송됩니다.</p>

            <div className="mt-3 space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <p className="text-[0.78rem] text-[var(--text-tertiary)]">요청 ID</p>
              <p className="break-all font-mono text-[0.82rem] text-[var(--text-primary)]">{requestId}</p>
              <p className="mt-2 text-[0.78rem] text-[var(--text-tertiary)]">조회 키 (token)</p>
              <p className="break-all font-mono text-[0.82rem] text-[var(--text-primary)]">{accessToken}</p>
            </div>
          </article>

          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h3 className="text-[0.95rem] font-semibold text-[var(--text-primary)]">상태 조회</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                placeholder="요청 ID"
                className="h-10 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.84rem]"
              />
              <input
                type="text"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder="조회 키(token)"
                className="h-10 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.84rem]"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={checkStatus}
                disabled={isChecking}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.82rem] font-semibold text-white disabled:opacity-60"
              >
                {isChecking ? '조회 중...' : '상태 확인'}
              </button>
              <button
                type="button"
                onClick={triggerProcessor}
                disabled={isTriggering}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] disabled:opacity-60"
              >
                {isTriggering ? '처리 요청 중...' : '처리 트리거'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setRequestState(null);
                  setNotice('');
                  setError('');
                }}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)]"
              >
                새 요청 만들기
              </button>
            </div>

            {requestState && (
              <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 text-[0.82rem] text-[var(--text-secondary)]">
                <p>
                  현재 상태: <strong className="text-[var(--text-primary)]">{statusText(requestState.status)}</strong>
                </p>
                <p className="mt-1">메일 발송: {requestState.email.sent ? '완료' : '대기/실패'}</p>
                {requestState.email.sentAt && (
                  <p className="mt-1">발송 시각: {new Date(requestState.email.sentAt).toLocaleString('ko-KR')}</p>
                )}
                {requestState.error && <p className="mt-1 text-[#ba3b2a]">오류: {requestState.error}</p>}
              </div>
            )}

            {notice && <p className="mt-3 text-[0.82rem] text-[var(--accent-primary)]">{notice}</p>}
            {error && <p className="mt-2 text-[0.82rem] text-[#ba3b2a]">{error}</p>}
          </article>
        </section>
      )}
    </div>
  );
}
