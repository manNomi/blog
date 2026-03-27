import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LoveJobPublic } from '../lib/saju/love-job-types';

const requestFormSchema = z.object({
  name: z.string().trim().min(2, '이름은 2자 이상 입력해 주세요.').max(30, '이름은 30자 이하로 입력해 주세요.'),
  email: z.string().trim().email('올바른 이메일 형식을 입력해 주세요.'),
  gender: z.enum(['female', 'male']),
  calendarType: z.enum(['solar', 'lunar']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일을 입력해 주세요.'),
  birthTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '출생 시간을 입력해 주세요.'),
  birthPlace: z.string().trim().min(2, '출생지는 2자 이상 입력해 주세요.').max(50, '출생지는 50자 이하로 입력해 주세요.')
});

const statusLookupSchema = z.object({
  requestId: z.string().trim().min(1, '요청 ID를 입력해 주세요.'),
  accessToken: z.string().trim().min(1, '조회 키(token)를 입력해 주세요.')
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

const stepLabels: Array<{ key: Step; label: string }> = [
  { key: 'landing', label: '안내' },
  { key: 'input', label: '필수 입력' },
  { key: 'submitted', label: '접수 완료' }
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
      setNotice('요청이 접수되었습니다. 분석이 완료되면 이메일로 결과를 보내드릴게요.');

      statusForm.reset({
        requestId: created.requestId,
        accessToken: created.accessToken
      });
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '요청 등록에 실패했어요.');
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
        setNotice('분석 완료 + 이메일 발송까지 끝났습니다. 메일함과 스팸함을 확인해 주세요.');
      } else {
        setNotice(`현재 상태: ${statusText(payload.request.status)}`);
      }
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '상태 조회에 실패했어요.');
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

      setNotice(`처리 트리거 완료: ${payload.processed}건 처리되었습니다.`);
      await checkStatus();
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '처리 트리거 호출에 실패했어요.');
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
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[linear-gradient(150deg,#ffffff_0%,#f8fbfc_100%)] p-5 shadow-[var(--shadow-sm)] md:p-7">
        <div className="mb-3 flex flex-wrap gap-2">
          {stepLabels.map((entry, index) => {
            const active = index <= currentStepIndex;
            return (
              <span
                key={entry.key}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.72rem] font-semibold transition-all duration-200 ${
                  active
                    ? 'border-[rgba(11,110,153,0.35)] bg-[#edf5f8] text-[var(--accent-primary)]'
                    : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-tertiary)]'
                }`}
              >
                {active && <span className="saju-status-dot" />}
                {entry.label}
              </span>
            );
          })}
        </div>

        <h1 className="text-[1.55rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[2rem]">사주 연애운 이메일 리포트</h1>
        <p className="mt-2 max-w-[700px] text-[0.92rem] leading-[1.65] text-[var(--text-secondary)]">
          결과를 즉시 노출하지 않고 요청을 큐에 등록한 뒤 비동기 처리합니다. 처리가 끝나면 이메일로 결과를 발송합니다.
        </p>
      </section>

      {step === 'landing' && (
        <section className="saju-hover-card rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 text-center shadow-[var(--shadow-sm)]">
          <h2 className="text-[1.25rem] font-semibold text-[var(--text-primary)]">필수 정보 입력 후 메일 수령</h2>
          <p className="mt-2 text-[0.9rem] text-[var(--text-secondary)]">이름, 이메일, 생년월일, 출생시간, 출생지를 포함해 필수값을 모두 입력해야 요청이 등록됩니다.</p>
          <button
            type="button"
            onClick={() => setStep('input')}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-[0.84rem] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--accent-hover)]"
          >
            요청 시작하기
          </button>
        </section>
      )}

      {step === 'input' && (
        <section className="saju-hover-card rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-[0.8rem] text-[var(--text-secondary)]">
            필수 항목 진행률: <strong className="text-[var(--text-primary)]">{completionCount}/7</strong>
          </div>

          <form className="space-y-4" onSubmit={submitRequest}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                이름 *
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
                이메일 *
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...requestForm.register('email')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                />
                {requestForm.formState.errors.email && (
                  <span className="mt-1 block text-[0.76rem] text-[#ba3b2a]">{requestForm.formState.errors.email.message}</span>
                )}
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                생년월일 *
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
                출생 시간 *
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
                성별 *
                <select
                  {...requestForm.register('gender')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="female">여성</option>
                  <option value="male">남성</option>
                </select>
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)]">
                달력 *
                <select
                  {...requestForm.register('calendarType')}
                  className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-[0.9rem] text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </label>

              <label className="text-[0.82rem] text-[var(--text-secondary)] md:col-span-2">
                출생지 *
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
                {requestForm.formState.isSubmitting ? '등록 중...' : '요청 등록'}
              </button>
              <button
                type="button"
                onClick={() => setStep('landing')}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                뒤로가기
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'submitted' && (
        <section className="saju-hover-card space-y-4 rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] md:p-7">
          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h2 className="text-[1.05rem] font-semibold text-[var(--text-primary)]">요청이 접수되었습니다</h2>
            <p className="mt-2 text-[0.88rem] text-[var(--text-secondary)]">비동기 분석 완료 후 이메일로 결과를 발송합니다.</p>

            <div className="mt-3 space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <p className="text-[0.78rem] text-[var(--text-tertiary)]">요청 ID</p>
              <p className="break-all font-mono text-[0.82rem] text-[var(--text-primary)]">{statusForm.watch('requestId')}</p>
              <p className="mt-2 text-[0.78rem] text-[var(--text-tertiary)]">조회 키 (token)</p>
              <p className="break-all font-mono text-[0.82rem] text-[var(--text-primary)]">{statusForm.watch('accessToken')}</p>
            </div>
          </article>

          <article className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h3 className="text-[0.95rem] font-semibold text-[var(--text-primary)]">상태 조회</h3>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={checkStatus}>
              <div>
                <input
                  type="text"
                  placeholder="요청 ID"
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
                  placeholder="조회 키(token)"
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
                {isChecking ? '조회 중...' : '상태 확인'}
              </button>
              <button
                type="button"
                onClick={triggerProcessor}
                disabled={isTriggering}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTriggering && <span className="saju-status-dot" />}
                {isTriggering ? '처리 요청 중...' : '처리 트리거'}
              </button>
              <button
                type="button"
                onClick={resetForNewRequest}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 text-[0.82rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
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

            {notice && <p className="mt-3 rounded-[var(--radius-sm)] bg-[#edf5f8] px-3 py-2 text-[0.82rem] text-[var(--accent-primary)]">{notice}</p>}
            {apiError && <p className="mt-2 rounded-[var(--radius-sm)] bg-[#fff2ef] px-3 py-2 text-[0.82rem] text-[#ba3b2a]">{apiError}</p>}
          </article>
        </section>
      )}
    </div>
  );
}
