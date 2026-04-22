import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const relationshipOptions = [
  { value: 'none', label: '없음' },
  { value: 'interested', label: '관심 있는 사람이 있음' },
  { value: 'dating', label: '연애 중' },
  { value: 'unknown', label: '잘 모르겠음' }
] as const;

const requestFormSchema = z
  .object({
    name: z.string().trim().min(2, '이름은 2자 이상 입력해 주세요.').max(30, '이름은 30자 이내로 입력해 주세요.'),
    email: z.string().trim().email('올바른 이메일 형식으로 입력해 주세요.'),
    gender: z.enum(['female', 'male']),
    calendarType: z.enum(['solar', 'lunar']),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '태어난 날짜를 입력해 주세요.'),
    birthTime: z.string(),
    birthTimeUnknown: z.boolean(),
    birthPlace: z.string().trim().min(2, '태어난 고장은 2자 이상 입력해 주세요.').max(50, '태어난 고장은 50자 이내로 입력해 주세요.'),
    relationshipStatus: z.enum(['none', 'interested', 'dating', 'unknown'])
  })
  .superRefine((values, ctx) => {
    if (values.birthTimeUnknown) {
      return;
    }

    const timeValue = values.birthTime?.trim() ?? '';
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthTime'],
        message: '태어난 시각을 입력하거나 시각 모름을 선택해 주세요.'
      });
    }
  });

type RequestFormValues = z.infer<typeof requestFormSchema>;

type Step = 'intro' | 'form' | 'result';
type RequestResult = 'idle' | 'success' | 'error';

type CreateResponse = {
  requestId: string;
  accessToken: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : '요청 처리 중 문제가 발생했습니다. 다시 시도해 주세요.';
    throw new Error(message);
  }

  return payload as T;
}

const stepLabels: Array<{ key: Step; label: string }> = [
  { key: 'intro', label: '1. 안내' },
  { key: 'form', label: '2. 정보 입력' },
  { key: 'result', label: '3. 접수 결과' }
];

export default function SajuLovePage() {
  const [step, setStep] = useState<Step>('intro');
  const [requestResult, setRequestResult] = useState<RequestResult>('idle');
  const [resultTitle, setResultTitle] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      gender: 'female',
      calendarType: 'solar',
      birthDate: '',
      birthTime: '',
      birthTimeUnknown: false,
      birthPlace: '',
      relationshipStatus: 'unknown'
    }
  });

  const watched = requestForm.watch();
  const canUseUnknownTime = watched.birthTimeUnknown;

  const completionCount = useMemo(() => {
    const checks = [
      watched.name.trim().length > 0,
      watched.email.trim().length > 0,
      watched.birthDate.trim().length > 0,
      watched.birthPlace.trim().length > 0,
      watched.gender.trim().length > 0,
      watched.calendarType.trim().length > 0,
      watched.relationshipStatus.trim().length > 0,
      watched.birthTimeUnknown || watched.birthTime.trim().length > 0
    ];

    return checks.filter(Boolean).length;
  }, [
    watched.name,
    watched.email,
    watched.birthDate,
    watched.birthPlace,
    watched.gender,
    watched.calendarType,
    watched.relationshipStatus,
    watched.birthTime,
    watched.birthTimeUnknown
  ]);

  const submitRequest = requestForm.handleSubmit(async (values) => {
    setRequestResult('idle');
    setResultTitle('');
    setResultMessage('');

    const payload = {
      input: {
        name: values.name,
        email: values.email,
        gender: values.gender,
        calendarType: values.calendarType,
        birthDate: values.birthDate,
        birthTime: values.birthTimeUnknown ? '00:00' : values.birthTime,
        birthPlace: values.birthPlace,
        relationshipStatus: values.relationshipStatus
      }
    };

    try {
      await parseJson<CreateResponse>(
        await fetch('/api/saju-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      );

      setRequestResult('success');
      setResultTitle('요청이 접수되었습니다');
      setResultMessage('분석이 완료되면 입력하신 이메일로 결과를 보내드립니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.');
      setStep('result');
    } catch (requestError) {
      setRequestResult('error');
      setResultTitle('요청 접수에 실패했습니다');
      setResultMessage(requestError instanceof Error ? requestError.message : '잠시 후 다시 시도해 주세요.');
      setStep('result');
    }
  });

  const resetForNewRequest = () => {
    requestForm.reset({
      name: '',
      email: '',
      gender: 'female',
      calendarType: 'solar',
      birthDate: '',
      birthTime: '',
      birthTimeUnknown: false,
      birthPlace: '',
      relationshipStatus: 'unknown'
    });
    setRequestResult('idle');
    setResultTitle('');
    setResultMessage('');
    setStep('form');
  };

  const currentStepIndex = stepLabels.findIndex((entry) => entry.key === step);

  return (
    <div className="space-y-5">
      <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Saju Atelier</p>
        <h1 className="mt-3 text-[2rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-strong)] md:text-[2.8rem]">사주 풀이 신청</h1>
        <p className="mt-2 text-[0.96rem] leading-[1.6] text-[var(--text-muted)]">
          필요한 정보를 입력해 주시면 비동기로 분석한 뒤 결과를 이메일로 보내드립니다.
        </p>

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

      {step === 'intro' && (
        <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-[1.18rem] font-semibold text-[var(--text-strong)] md:text-[1.3rem]">신청 전에 확인해 주세요</h2>
          <ul className="mt-3 grid gap-2 text-[0.94rem] text-[var(--text-muted)]">
            <li>이름, 이메일, 출생 정보, 현재 관계 상태를 입력하면 신청할 수 있습니다.</li>
            <li>분석은 비동기로 진행되며 완료 시 이메일로 결과를 받아보게 됩니다.</li>
            <li>태어난 시각을 모르면 “시각 모름”을 선택해도 신청 가능합니다.</li>
          </ul>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white"
          >
            정보 입력 시작
          </button>
        </section>
      )}

      {step === 'form' && (
        <section className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)] md:p-7">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            입력 진행률: <strong className="text-[var(--text-strong)]">{completionCount}/8</strong>
          </p>

          {requestForm.formState.submitCount > 0 && !requestForm.formState.isValid && (
            <div className="mb-4 rounded-[10px] border border-[#e3b9b3] bg-[#f9eceb] px-4 py-3 text-sm text-[#8a2f23]">
              필수 항목을 모두 정확하게 입력해 주세요.
            </div>
          )}

          <form className="space-y-4" onSubmit={submitRequest}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[var(--text-muted)]">
                이름 *
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
                이메일 *
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
                태어난 날짜 *
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
                  disabled={canUseUnknownTime}
                  {...requestForm.register('birthTime')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-55"
                />
                {requestForm.formState.errors.birthTime && (
                  <span className="mt-1 block text-xs text-[#b34131]">{requestForm.formState.errors.birthTime.message}</span>
                )}
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <input id="birth-time-unknown" type="checkbox" {...requestForm.register('birthTimeUnknown')} className="h-4 w-4" />
                  <label htmlFor="birth-time-unknown">태어난 시각을 잘 모르겠어요</label>
                </div>
              </label>

              <label className="text-sm text-[var(--text-muted)]">
                성별 *
                <select
                  {...requestForm.register('gender')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                >
                  <option value="female">여성</option>
                  <option value="male">남성</option>
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

              <label className="text-sm text-[var(--text-muted)] md:col-span-2">
                현재 관계 상태 *
                <select
                  {...requestForm.register('relationshipStatus')}
                  className="mt-1.5 h-11 w-full rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-3 text-sm text-[var(--text-strong)]"
                >
                  {relationshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
                disabled={!requestForm.formState.isValid || requestForm.formState.isSubmitting}
                className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white disabled:opacity-60"
              >
                {requestForm.formState.isSubmitting ? '접수 중…' : '사주 풀이 신청하기'}
              </button>
              <button
                type="button"
                onClick={() => setStep('intro')}
                className="inline-flex h-11 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-soft)] px-5 text-sm text-[var(--text-body)]"
              >
                안내 다시 보기
              </button>
            </div>
          </form>

          <section className="mt-5 rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-soft)] px-4 py-3 text-xs leading-[1.55] text-[var(--text-muted)]">
            개인정보 안내: 서비스 제공에 필요한 최소 정보만 수집합니다.
            <br />
            처리 안내: 분석은 비동기 처리되며 결과는 이메일로 전달됩니다.
          </section>
        </section>
      )}

      {step === 'result' && (
        <section
          className={`rounded-[12px] border p-6 shadow-[var(--shadow-soft)] ${
            requestResult === 'success'
              ? 'border-[#bfd4bf] bg-[#edf7ed] text-[#245524]'
              : 'border-[#e3b9b3] bg-[#f9eceb] text-[#8a2f23]'
          }`}
        >
          <h2 className="text-[1.2rem] font-semibold">{resultTitle || '요청 상태를 확인해 주세요'}</h2>
          <p className="mt-2 text-sm leading-[1.6]">{resultMessage || '요청 상태를 다시 확인해 주세요.'}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetForNewRequest}
              className="inline-flex h-10 items-center rounded-full bg-[#111] px-4 text-sm font-medium text-white"
            >
              새 요청 작성
            </button>
            <button
              type="button"
              onClick={() => setStep('intro')}
              className="inline-flex h-10 items-center rounded-full border border-current px-4 text-sm"
            >
              처음 안내 보기
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
