import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LoveJobPublic } from '../lib/saju/love-job-types';

const requestFormSchema = z.object({
  name: z.string().trim().min(2, '이름은 두 자 이상 적어 주시옵소서.').max(30, '이름은 서른 자 안으로 적어 주시옵소서.'),
  email: z.string().trim().email('옳은 전자우편 (이메일) 꼴을 적어 주시옵소서.'),
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
  { key: 'input', label: '필수 입력' },
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
      setNotice('청원이 접수되었사옵니다. 헤아림이 마치면 전자우편 (이메일)으로 풀이를 올려 드리겠사옵니다.');

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
        setNotice('헤아림과 전자우편 (이메일) 보냄이 모두 마쳤사옵니다. 편지함과 잡편함을 살펴 주시옵소서.');
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
    <div className="space-y-5">
      <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Saju Atelier</p>
        <h1 className="mt-3 text-[2.1rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-strong)] md:text-[2.9rem]">사주 풀이 요청</h1>
        <p className="mt-2 text-[0.95rem] leading-[1.6] text-[var(--text-muted)]">입력 후 비동기 처리되며 결과는 이메일로 전달됩니다.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {stepLabels.map((entry, index) => {
            const active = index <= currentStepIndex;
            return (
              <span
                key={entry.key}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'border-[#111] bg-[#111] text-white'
                    : 'border-[var(--line-default)] bg-[var(--bg-soft)] text-[var(--text-muted)]'
                }`}
              >
                {entry.label}
              </span>
            );
          })}
        </div>
      </section>

      {step === 'landing' && (
        <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-[1.15rem] font-semibold text-[var(--text-strong)] md:text-[1.3rem]">필수 입력을 먼저 채워 주세요</h2>
          <p className="mt-2 text-[0.9rem] text-[var(--text-muted)]">이름, 전자우편 (이메일), 태어난 날과 시각, 태어난 고장을 반드시 입력해야 요청이 접수됩니다.</p>
          <button
            type="button"
            onClick={() => setStep('input')}
            className="mt-4 inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white"
          >
            요청 접수
          </button>
        </section>
      )}

      {step === 'input' && (
        <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)] md:p-7">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            입력 진행률: <strong className="text-[var(--text-strong)]">{completionCount}/7</strong>
          </p>

          <form className="space-y-4" onSubmit={submitRequest}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[var(--text-muted)]">
                성명 *
                <input
                  type="text"
                  placeholder="홍길동"
                  {...requestForm.register('name')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                />
                {requestForm.formState.errors.name && (
                  <span className="mt-1 block text-xs text-[#b34131]">{requestForm.formState.errors.name.message}</span>
                )}
              </label>

              <label className="text-sm text-[var(--text-muted)]">
                전자우편 (이메일) *
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...requestForm.register('email')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                />
                {requestForm.formState.errors.email && (
                  <span className="mt-1 block text-xs text-[#b34131]">{requestForm.formState.errors.email.message}</span>
                )}
              </label>

              <label className="text-sm text-[var(--text-muted)]">
                태어난 날 *
                <input
                  type="date"
                  {...requestForm.register('birthDate')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                />
                {requestForm.formState.errors.birthDate && (
                  <span className="mt-1 block text-xs text-[#b34131]">{requestForm.formState.errors.birthDate.message}</span>
                )}
              </label>

              <label className="text-sm text-[var(--text-muted)]">
                태어난 시각 *
                <input
                  type="time"
                  {...requestForm.register('birthTime')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                />
                {requestForm.formState.errors.birthTime && (
                  <span className="mt-1 block text-xs text-[#b34131]">{requestForm.formState.errors.birthTime.message}</span>
                )}
              </label>

              <label className="text-sm text-[var(--text-muted)]">
                남녀 *
                <select
                  {...requestForm.register('gender')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                >
                  <option value="female">여인</option>
                  <option value="male">사내</option>
                </select>
              </label>

              <label className="text-sm text-[var(--text-muted)]">
                역법 *
                <select
                  {...requestForm.register('calendarType')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </label>
            </div>

            <label className="block text-sm text-[var(--text-muted)]">
              태어난 고장 *
              <input
                type="text"
                placeholder="서울특별시"
                {...requestForm.register('birthPlace')}
                className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
              />
              {requestForm.formState.errors.birthPlace && (
                <span className="mt-1 block text-xs text-[#b34131]">{requestForm.formState.errors.birthPlace.message}</span>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={requestForm.formState.isSubmitting}
                className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white disabled:opacity-60"
              >
                {requestForm.formState.isSubmitting ? '접수 중…' : '요청 접수'}
              </button>
              <button
                type="button"
                onClick={() => setStep('landing')}
                className="inline-flex h-11 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-soft)] px-5 text-sm text-[var(--text-body)]"
              >
                뒤로
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'submitted' && (
        <section className="space-y-4">
          <div className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)] md:p-6">
            <h2 className="text-[1.1rem] font-semibold text-[var(--text-strong)]">접수 정보</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">요청 식별값</dt>
                <dd className="mt-1 break-all rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 py-2 font-mono text-xs text-[var(--text-strong)]">
                  {statusForm.watch('requestId') || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">접근 열쇠</dt>
                <dd className="mt-1 break-all rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 py-2 font-mono text-xs text-[var(--text-strong)]">
                  {statusForm.watch('accessToken') || '-'}
                </dd>
              </div>
            </dl>
          </div>

          <form className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)] md:p-6" onSubmit={checkStatus}>
            <h3 className="text-[1.02rem] font-semibold text-[var(--text-strong)]">처리 상태 조회</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-[var(--text-muted)]">
                요청 식별값
                <input
                  type="text"
                  {...statusForm.register('requestId')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                />
                {statusForm.formState.errors.requestId && (
                  <span className="mt-1 block text-xs text-[#b34131]">{statusForm.formState.errors.requestId.message}</span>
                )}
              </label>

              <label className="text-sm text-[var(--text-muted)]">
                접근 열쇠
                <input
                  type="text"
                  {...statusForm.register('accessToken')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                />
                {statusForm.formState.errors.accessToken && (
                  <span className="mt-1 block text-xs text-[#b34131]">{statusForm.formState.errors.accessToken.message}</span>
                )}
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isChecking}
                className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isChecking ? '조회 중…' : '상태 조회'}
              </button>
              <button
                type="button"
                onClick={triggerProcessor}
                disabled={isTriggering}
                className="inline-flex h-11 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-soft)] px-5 text-sm text-[var(--text-body)] disabled:opacity-60"
              >
                {isTriggering ? '처리 요청 중…' : '처리 트리거'}
              </button>
              <button
                type="button"
                onClick={resetForNewRequest}
                className="inline-flex h-11 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-soft)] px-5 text-sm text-[var(--text-body)]"
              >
                새 요청 작성
              </button>
            </div>

            {requestState && (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                현재 상태: <strong className="text-[var(--text-strong)]">{statusText(requestState.status)}</strong>
              </p>
            )}
          </form>
        </section>
      )}

      {notice && (
        <div className="rounded-[12px] border border-[#bfd4bf] bg-[#edf7ed] px-4 py-3 text-sm text-[#245524]">
          {notice}
        </div>
      )}

      {apiError && (
        <div className="rounded-[12px] border border-[#e3b9b3] bg-[#f9eceb] px-4 py-3 text-sm text-[#8a2f23]">
          {apiError}
        </div>
      )}

      <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-4 py-3 text-xs text-[var(--text-muted)]">
        상태: queued · processing · completed · failed
        <br />
        개인정보 유의사항: 민감정보 최소 수집, 처리 완료 후 보관 정책 적용
      </section>
    </div>
  );
}
