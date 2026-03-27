import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LoveJobPublic } from '../lib/saju/love-job-types';

const requestFormSchema = z.object({
  name: z.string().trim().min(2, '이름은 두 자 이상 적어 주시옵소서.').max(30, '이름은 서른 자 안으로 적어 주시옵소서.'),
  email: z.string().trim().email('옳은 전자우편 꼴을 적어 주시옵소서.'),
  gender: z.enum(['female', 'male']),
  calendarType: z.enum(['solar', 'lunar']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '태어난 날을 적어 주시옵소서.'),
  birthTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '태어난 시각을 적어 주시옵소서.'),
  birthPlace: z.string().trim().min(2, '태어난 고장은 두 자 이상 적어 주시옵소서.').max(50, '태어난 고장은 쉰 자 안으로 적어 주시옵소서.')
});

const statusLookupSchema = z.object({
  requestId: z.string().trim().min(1, '청원 식별값을 적어 주시옵소서.'),
  accessToken: z.string().trim().min(1, '살핌 열쇠를 적어 주시옵소서.')
});

type RequestFormValues = z.infer<typeof requestFormSchema>;
type StatusLookupValues = z.infer<typeof statusLookupSchema>;

type Step = 'landing' | 'input' | 'submitted';

type CreateResponse = {
  requestId: string;
  accessToken: string;
  request: LoveJobPublic;
};

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : '청원 다스림 중 허물이 생겼사옵니다.';
    throw new Error(message);
  }
  return payload as T;
}

function statusText(status: LoveJobPublic['status']) {
  switch (status) {
    case 'queued':
      return '기다림';
    case 'processing':
      return '헤아리는 중';
    case 'completed':
      return '마침';
    case 'failed':
      return '그르침';
    default:
      return status;
  }
}

const stepLabels: Array<{ key: Step; label: string }> = [
  { key: 'landing', label: '알림' },
  { key: 'input', label: '반드시 적기' },
  { key: 'submitted', label: '접수 마침' }
];

export default function SajuLovePage() {
  const [step, setStep] = useState<Step>('landing');
  const [requestState, setRequestState] = useState<LoveJobPublic | null>(null);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      gender: 'female',
      calendarType: 'solar',
      birthDate: '',
      birthTime: '',
      birthPlace: ''
    }
  });

  const statusForm = useForm<StatusLookupValues>({
    resolver: zodResolver(statusLookupSchema),
    mode: 'onSubmit',
    defaultValues: {
      requestId: '',
      accessToken: ''
    }
  });

  const watchedRequestForm = requestForm.watch();
  const completionCount = useMemo(() => {
    const entries = [
      watchedRequestForm.name,
      watchedRequestForm.email,
      watchedRequestForm.birthDate,
      watchedRequestForm.birthTime,
      watchedRequestForm.birthPlace,
      watchedRequestForm.gender,
      watchedRequestForm.calendarType
    ];

    return entries.filter((value) => typeof value === 'string' && value.trim().length > 0).length;
  }, [
    watchedRequestForm.name,
    watchedRequestForm.email,
    watchedRequestForm.birthDate,
    watchedRequestForm.birthTime,
    watchedRequestForm.birthPlace,
    watchedRequestForm.gender,
    watchedRequestForm.calendarType
  ]);

  const submitRequest = requestForm.handleSubmit(async (values) => {
    setApiError('');
    setNotice('');

    try {
      const created = await parseJson<CreateResponse>(
        await fetch('/api/saju-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: values })
        })
      );

      setRequestState(created.request);
      setStep('submitted');
      setNotice('청원이 접수되었사옵니다. 헤아림이 마치면 전자우편으로 풀이를 올려 드리겠사옵니다.');

      statusForm.reset({
        requestId: created.requestId,
        accessToken: created.accessToken
      });
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '청원 올리기에 그르쳤사옵니다.');
    }
  });

  const checkStatus = statusForm.handleSubmit(async (values) => {
    setApiError('');
    setNotice('');
    setIsChecking(true);

    try {
      const payload = await parseJson<{ request: LoveJobPublic }>(
        await fetch(`/api/saju-requests/${encodeURIComponent(values.requestId)}?token=${encodeURIComponent(values.accessToken)}`, {
          method: 'GET',
          cache: 'no-store'
        })
      );

      setRequestState(payload.request);

      if (payload.request.status === 'completed' && payload.request.email.sent) {
        setNotice('헤아림과 전자우편 보냄이 모두 마쳤사옵니다. 편지함과 잡편함을 살펴 주시옵소서.');
      } else {
        setNotice(`이제 형편: ${statusText(payload.request.status)}`);
      }
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '형편 살피기에 그르쳤사옵니다.');
    } finally {
      setIsChecking(false);
    }
  });

  const triggerProcessor = async () => {
    const valid = await statusForm.trigger();
    if (!valid) return;

    setApiError('');
    setNotice('');
    setIsTriggering(true);

    try {
      const payload = await parseJson<{ processed: number }>(
        await fetch('/api/saju-requests/process', {
          method: 'POST'
        })
      );

      setNotice(`다스림 깨우기 마침: ${payload.processed}건을 다스렸사옵니다.`);
      await checkStatus();
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '다스림 깨우기 부름에 그르쳤사옵니다.');
    } finally {
      setIsTriggering(false);
    }
  };

  const resetForNewRequest = () => {
    requestForm.reset({
      name: '',
      email: '',
      gender: 'female',
      calendarType: 'solar',
      birthDate: '',
      birthTime: '',
      birthPlace: ''
    });
    setRequestState(null);
    setNotice('');
    setApiError('');
    setStep('input');
  };

  const currentStepIndex = stepLabels.findIndex((entry) => entry.key === step);

  return (
    <div className="space-y-5 saju-stage">
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[linear-gradient(150deg,#d1cdc3_0%,#c8c4ba_100%)] p-5 shadow-[var(--shadow-sm)] md:p-7">
        <div className="mb-3 flex flex-wrap gap-2">
          {stepLabels.map((entry, index) => {
            const active = index <= currentStepIndex;
            return (
              <span
                key={entry.key}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.72rem] font-semibold transition-all duration-200 ${
                  active
                    ? 'border-[rgba(190,111,52,0.38)] bg-[rgba(231,161,106,0.2)] text-[#7b3f19]'
                    : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-tertiary)]'
                }`}
              >
                {active && <span className="saju-status-dot" />}
                {entry.label}
              </span>
            );
          })}
        </div>

        <h1 className="text-[1.55rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[2rem]">사주 연정 전자우편 풀이</h1>
        <p className="mt-2 max-w-[700px] text-[0.92rem] leading-[1.65] text-[var(--text-secondary)]">
          결과를 곧바로 드러내지 아니하고 청원을 줄에 올린 뒤 비동기로 다스리옵니다. 마치면 전자우편으로 풀이를 보내옵니다.
        </p>
      </section>

      {step === 'landing' && (
        <section className="saju-hover-card rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 text-center shadow-[var(--shadow-sm)]">
          <h2 className="text-[1.25rem] font-semibold text-[var(--text-primary)]">긴요한 정보를 적은 뒤 편지를 받으소서</h2>
          <p className="mt-2 text-[0.9rem] text-[var(--text-secondary)]">이름, 전자우편, 태어난 날과 시각, 태어난 고장을 빠짐없이 적어야 청원이 올라가옵니다.</p>
          <button
            type="button"
            onClick={() => setStep('input')}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.84rem] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--accent-hover)]"
          >
            청원 올리기
          </button>
        </section>
      )}

      {step === 'input' && (
        <section className="saju-hover-card rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-[0.8rem] text-[var(--text-secondary)]">
            긴요한 항목 채움새: <strong className="text-[var(--text-primary)]">{completionCount}/7</strong>
          </div>

          <form className="space-y-4" onSubmit={submitRequest}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                성명 *
                <input
                  type="text"
                  placeholder="홍길동"
                  {...requestForm.register('name')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {requestForm.formState.errors.name && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{requestForm.formState.errors.name.message}</span>
                )}
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                전자우편 *
                <input
                  type="email"
                  placeholder="이름@본보기.한국"
                  {...requestForm.register('email')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {requestForm.formState.errors.email && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{requestForm.formState.errors.email.message}</span>
                )}
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                태어난 날 *
                <input
                  type="date"
                  {...requestForm.register('birthDate')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {requestForm.formState.errors.birthDate && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{requestForm.formState.errors.birthDate.message}</span>
                )}
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                태어난 시각 *
                <input
                  type="time"
                  {...requestForm.register('birthTime')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {requestForm.formState.errors.birthTime && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{requestForm.formState.errors.birthTime.message}</span>
                )}
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                남녀 *
                <select
                  {...requestForm.register('gender')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="female">여인</option>
                  <option value="male">사내</option>
                </select>
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                역법 *
                <select
                  {...requestForm.register('calendarType')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="solar">해력</option>
                  <option value="lunar">태음력</option>
                </select>
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)] md:col-span-2">
                태어난 고장 *
                <input
                  type="text"
                  placeholder="서울"
                  {...requestForm.register('birthPlace')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {requestForm.formState.errors.birthPlace && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{requestForm.formState.errors.birthPlace.message}</span>
                )}
              </label>
            </div>

            {apiError && <p className="rounded-[var(--radius-sm)] bg-[#fff2ef] px-3 py-2 text-[0.82rem] text-[#ba3b2a]">{apiError}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={requestForm.formState.isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.84rem] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requestForm.formState.isSubmitting ? '올리는 중...' : '청원 올리기'}
              </button>
              <button
                type="button"
                onClick={() => setStep('landing')}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                뒤로 물림
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'submitted' && (
        <section className="saju-hover-card space-y-4 rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h2 className="text-[1.05rem] font-semibold text-[var(--text-primary)]">청원이 접수되었사옵니다</h2>
            <p className="mt-2 text-[0.88rem] text-[var(--text-secondary)]">비동기 헤아림이 마치면 전자우편으로 풀이를 보내옵니다.</p>

            <div className="mt-3 space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <p className="text-[0.78rem] text-[var(--text-tertiary)]">청원 식별값</p>
              <p className="break-all font-mono text-[0.82rem] text-[var(--text-primary)]">{statusForm.watch('requestId')}</p>
              <p className="mt-2 text-[0.78rem] text-[var(--text-tertiary)]">살핌 열쇠</p>
              <p className="break-all font-mono text-[0.82rem] text-[var(--text-primary)]">{statusForm.watch('accessToken')}</p>
            </div>
          </article>

          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h3 className="text-[0.95rem] font-semibold text-[var(--text-primary)]">형편 살피기</h3>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={checkStatus}>
              <div>
                <input
                  type="text"
                  placeholder="청원 식별값"
                  {...statusForm.register('requestId')}
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.84rem] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {statusForm.formState.errors.requestId && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{statusForm.formState.errors.requestId.message}</span>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="살핌 열쇠"
                  {...statusForm.register('accessToken')}
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.84rem] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {statusForm.formState.errors.accessToken && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{statusForm.formState.errors.accessToken.message}</span>
                )}
              </div>

              <button type="submit" className="hidden" aria-hidden="true" />
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={checkStatus}
                disabled={isChecking}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.82rem] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChecking && <span className="saju-status-dot" />}
                {isChecking ? '살피는 중...' : '형편 살피기'}
              </button>
              <button
                type="button"
                onClick={triggerProcessor}
                disabled={isTriggering}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTriggering && <span className="saju-status-dot" />}
                {isTriggering ? '다스림 청하는 중...' : '다스림 깨우기'}
              </button>
              <button
                type="button"
                onClick={resetForNewRequest}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                새 청원 올리기
              </button>
            </div>

            {requestState && (
              <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 text-[0.82rem] text-[var(--text-secondary)]">
                <p>
                  이제 형편: <strong className="text-[var(--text-primary)]">{statusText(requestState.status)}</strong>
                </p>
                <p className="mt-1">편지 보냄: {requestState.email.sent ? '마침' : '기다림/그르침'}</p>
                {requestState.email.sentAt && (
                  <p className="mt-1">보낸 시각: {new Date(requestState.email.sentAt).toLocaleString('ko-KR')}</p>
                )}
                {requestState.error && <p className="mt-1 text-[#ba3b2a]">허물: {requestState.error}</p>}
              </div>
            )}

            {notice && <p className="mt-3 rounded-[var(--radius-sm)] bg-[#edf5f8] px-3 py-2 text-[0.82rem] text-[var(--accent-primary)]">{notice}</p>}
            {apiError && <p className="mt-2 rounded-[var(--radius-sm)] bg-[#fff2ef] px-3 py-2 text-[0.82rem] text-[#ba3b2a]">{apiError}</p>}
          </article>
        </section>
      )}
    </div>
  );
}
