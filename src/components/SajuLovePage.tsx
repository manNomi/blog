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

type FlowStep = 'intro' | 'identity' | 'birth' | 'review' | 'submitted';

type CreateResponse = {
  requestId: string;
  accessToken: string;
  request: LoveJobPublic;
};

const formKeys: Array<keyof RequestFormValues> = [
  'name',
  'email',
  'gender',
  'calendarType',
  'birthDate',
  'birthTime',
  'birthPlace'
];

const flowStepLabels: Array<{ key: Exclude<FlowStep, 'intro' | 'submitted'>; label: string }> = [
  { key: 'identity', label: '기본 정보' },
  { key: 'birth', label: '태어난 때' },
  { key: 'review', label: '확인 및 제출' }
];

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

function calendarLabel(type: RequestFormValues['calendarType']) {
  return type === 'solar' ? '양력' : '음력';
}

function genderLabel(gender: RequestFormValues['gender']) {
  return gender === 'female' ? '여인' : '사내';
}

export default function SajuLovePage() {
  const [step, setStep] = useState<FlowStep>('intro');
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

  const watched = requestForm.watch();

  const completionCount = useMemo(() => {
    return formKeys.filter((key) => {
      const value = watched[key];
      return typeof value === 'string' && value.trim().length > 0;
    }).length;
  }, [watched]);

  const completionPercent = Math.round((completionCount / formKeys.length) * 100);

  const activeStepIndex = useMemo(() => {
    if (step === 'intro') return -1;
    if (step === 'submitted') return flowStepLabels.length;
    return flowStepLabels.findIndex((entry) => entry.key === step);
  }, [step]);

  const moveToBirth = async () => {
    const valid = await requestForm.trigger(['name', 'email', 'gender']);
    if (!valid) return;
    setStep('birth');
  };

  const moveToReview = async () => {
    const valid = await requestForm.trigger(['calendarType', 'birthDate', 'birthTime', 'birthPlace']);
    if (!valid) return;
    setStep('review');
  };

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

  const resetFlow = () => {
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
    setStep('identity');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Saju Atelier</p>
        <h1 className="mt-3 text-[2.1rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-strong)] md:text-[2.9rem]">사주 풀이 요청</h1>
        <p className="mt-2 text-[0.95rem] leading-[1.6] text-[var(--text-muted)]">입력 흐름을 단계별로 나누어 빠짐없이 작성할 수 있게 바꾸었사옵니다. 결과는 비동기 처리 후 전자우편 (이메일)로 전해집니다.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {flowStepLabels.map((entry, index) => {
            const active = index <= activeStepIndex;
            return (
              <span
                key={entry.key}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'border-[#111] bg-[#111] text-white'
                    : 'border-[var(--line-default)] bg-[var(--bg-soft)] text-[var(--text-muted)]'
                }`}
              >
                {index + 1}. {entry.label}
              </span>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>입력 완성도</span>
            <strong className="text-[var(--text-strong)]">{completionCount}/{formKeys.length} · {completionPercent}%</strong>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--bg-soft)]">
            <div className="h-full rounded-full bg-[#111] transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
      </section>

      {step === 'intro' && (
        <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-soft)] md:p-7">
          <h2 className="text-[1.18rem] font-semibold text-[var(--text-strong)] md:text-[1.35rem]">새 입력 흐름 안내</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[0.92rem] leading-[1.55] text-[var(--text-muted)]">
            <li>기본 정보 입력</li>
            <li>태어난 시점/장소 입력</li>
            <li>최종 확인 후 요청 접수</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep('identity')}
              className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white"
            >
              입력 시작
            </button>
          </div>
        </section>
      )}

      {(step === 'identity' || step === 'birth' || step === 'review') && (
        <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)] md:p-7">
          <form className="space-y-4" onSubmit={submitRequest}>
            {step === 'identity' && (
              <>
                <h2 className="text-[1.08rem] font-semibold text-[var(--text-strong)] md:text-[1.2rem]">1단계 · 기본 정보</h2>
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
                </div>

                <label className="block text-sm text-[var(--text-muted)]">
                  남녀 *
                  <select
                    {...requestForm.register('gender')}
                    className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                  >
                    <option value="female">여인</option>
                    <option value="male">사내</option>
                  </select>
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={moveToBirth}
                    className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white"
                  >
                    다음 단계
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('intro')}
                    className="inline-flex h-11 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-soft)] px-5 text-sm text-[var(--text-body)]"
                  >
                    안내로 돌아가기
                  </button>
                </div>
              </>
            )}

            {step === 'birth' && (
              <>
                <h2 className="text-[1.08rem] font-semibold text-[var(--text-strong)] md:text-[1.2rem]">2단계 · 태어난 때</h2>
                <div className="grid gap-4 md:grid-cols-2">
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
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={moveToReview}
                    className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white"
                  >
                    확인 단계로 이동
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('identity')}
                    className="inline-flex h-11 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-soft)] px-5 text-sm text-[var(--text-body)]"
                  >
                    이전 단계
                  </button>
                </div>
              </>
            )}

            {step === 'review' && (
              <>
                <h2 className="text-[1.08rem] font-semibold text-[var(--text-strong)] md:text-[1.2rem]">3단계 · 최종 확인</h2>
                <div className="grid gap-3 rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-soft)] p-4 text-sm md:grid-cols-2">
                  <p><span className="text-[var(--text-muted)]">성명:</span> <strong>{watched.name || '-'}</strong></p>
                  <p><span className="text-[var(--text-muted)]">전자우편:</span> <strong>{watched.email || '-'}</strong></p>
                  <p><span className="text-[var(--text-muted)]">남녀:</span> <strong>{genderLabel(watched.gender)}</strong></p>
                  <p><span className="text-[var(--text-muted)]">역법:</span> <strong>{calendarLabel(watched.calendarType)}</strong></p>
                  <p><span className="text-[var(--text-muted)]">태어난 날:</span> <strong>{watched.birthDate || '-'}</strong></p>
                  <p><span className="text-[var(--text-muted)]">태어난 시각:</span> <strong>{watched.birthTime || '-'}</strong></p>
                  <p className="md:col-span-2"><span className="text-[var(--text-muted)]">태어난 고장:</span> <strong>{watched.birthPlace || '-'}</strong></p>
                </div>

                <p className="text-xs leading-5 text-[var(--text-muted)]">제출 후에는 요청 식별값과 접근 열쇠가 발급되며, 처리 결과는 등록한 전자우편 (이메일)로 보내집니다.</p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={requestForm.formState.isSubmitting}
                    className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {requestForm.formState.isSubmitting ? '접수 중…' : '요청 접수'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('birth')}
                    className="inline-flex h-11 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-soft)] px-5 text-sm text-[var(--text-body)]"
                  >
                    수정하기
                  </button>
                </div>
              </>
            )}
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
                onClick={resetFlow}
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
