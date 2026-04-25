import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LoveJobPublic, RelationshipStatus } from '../lib/saju/love-job-types';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const requestFormSchema = z
  .object({
    name: z.string().trim().min(2, '이름은 2자 이상 입력해 주세요.').max(30, '이름은 30자 이하로 입력해 주세요.'),
    email: z.string().trim().email('올바른 이메일 형식을 입력해 주세요.'),
    gender: z.enum(['female', 'male']),
    calendarType: z.enum(['solar', 'lunar']),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일을 입력해 주세요.'),
    birthTime: z.string(),
    birthTimeUnknown: z.boolean(),
    birthPlace: z.string().trim().min(2, '출생지는 2자 이상 입력해 주세요.').max(50, '출생지는 50자 이하로 입력해 주세요.'),
    relationshipStatus: z.enum(['none', 'interested', 'dating', 'unknown'], {
      required_error: '현재 관계 상태를 선택해 주세요.'
    })
  })
  .superRefine((data, ctx) => {
    if (!data.birthTimeUnknown && !TIME_REGEX.test(data.birthTime || '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthTime'],
        message: '출생 시간을 입력해 주세요.'
      });
    }
  });

type RequestFormValues = z.infer<typeof requestFormSchema>;

type Step = 'intro' | 'form' | 'result';
type RequestResult = 'idle' | 'success' | 'error';

type CreateResponse = {
  request: LoveJobPublic;
};

const REQUIRED_COUNT = 8;

const stepLabels: Array<{ key: Step; label: string; caption: string }> = [
  { key: 'landing', label: '01 안내', caption: '흐름 확인' },
  { key: 'input', label: '02 입력', caption: '정보 작성' },
  { key: 'submitted', label: '03 접수', caption: '이메일 발송 대기' }
];

const relationshipOptions: Array<{ value: RelationshipStatus; label: string; description: string }> = [
  { value: 'none', label: '없음', description: '특정 관계 없이 새 인연을 찾는 상태' },
  { value: 'interested', label: '관심 있는 사람이 있음', description: '호감 상대와 가능성을 탐색 중인 상태' },
  { value: 'dating', label: '연애 중', description: '현재 연애를 더 안정적으로 이어가고 싶은 상태' },
  { value: 'unknown', label: '잘 모르겠음', description: '관계 상태를 아직 정리하지 못한 상태' }
];

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : '요청 처리 중 문제가 발생했습니다.';
    throw new Error(message);
  }

  return payload as T;
}

function statusText(status: LoveJobPublic['status']) {
  switch (status) {
    case 'queued':
      return '요청이 접수되어 순서대로 분석을 기다리고 있습니다.';
    case 'processing':
      return '현재 분석을 진행하고 있습니다.';
    case 'completed':
      return '분석이 완료되어 이메일 발송이 진행되었습니다.';
    case 'failed':
      return '처리 중 문제가 발생했습니다. 잠시 뒤 다시 시도해 주세요.';
    default:
      return '요청 상태를 확인 중입니다.';
  }
}

export default function SajuLovePage() {
  const [step, setStep] = useState<Step>('landing');
  const [requestState, setRequestState] = useState<LoveJobPublic | null>(null);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');

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
  const selectedGender = requestForm.watch('gender');
  const selectedCalendarType = requestForm.watch('calendarType');
  const selectedRelationship = requestForm.watch('relationshipStatus');
  const birthTimeUnknown = requestForm.watch('birthTimeUnknown');

  const completionCount = useMemo(() => {
    const checks = [
      watched.name?.trim().length > 0,
      watched.email?.trim().length > 0,
      watched.birthDate?.trim().length > 0,
      watched.birthPlace?.trim().length > 0,
      watched.gender === 'female' || watched.gender === 'male',
      watched.calendarType === 'solar' || watched.calendarType === 'lunar',
      watched.relationshipStatus ? true : false,
      watched.birthTimeUnknown || TIME_REGEX.test(watched.birthTime || '')
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

  const completionPercent = Math.round((completionCount / REQUIRED_COUNT) * 100);
  const currentStepIndex = stepLabels.findIndex((entry) => entry.key === step);

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

      const created = await parseJson<CreateResponse>(
        await fetch('/api/saju-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      );

      setRequestState(created.request);
      setStep('submitted');
      setNotice('요청이 접수되었습니다. 분석이 완료되면 입력한 이메일로 결과를 보내드립니다.');
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '요청 접수 중 오류가 발생했습니다.');
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

  return (
    <div className="mx-auto grid max-w-[1080px] gap-4 text-zinc-800 md:gap-5">
      <section className="page-card relative overflow-hidden px-4 py-5 animate-fade-up md:px-7 md:py-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-zinc-900/5 blur-2xl" aria-hidden="true" />
        <p className="kicker">Saju Atelier</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-900 md:text-[52px]">사주 연애운 요청</h1>
        <p className="mt-3 max-w-[780px] text-[15px] leading-[1.58] text-zinc-600 md:text-[17px]">
          3단계 입력 흐름으로 정보를 정리하고, 완료된 리포트를 이메일로 받아보세요.
        </p>

        <div className="mt-4 grid gap-2.5 md:mt-5 md:grid-cols-3" role="list" aria-label="사주 요청 단계">
          {stepLabels.map((entry, index) => {
            const active = index <= currentStepIndex;
            return (
              <div
                key={entry.key}
                role="listitem"
                className={`rounded-md border px-3 py-2 transition ${
                  active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-line bg-soft text-zinc-600'
                }`}
              >
                <strong className="block text-sm">{entry.label}</strong>
                <span className={`text-xs ${active ? 'text-zinc-200' : 'text-zinc-500'}`}>{entry.caption}</span>
              </div>
            );
          })}
        </div>
      </section>

      {step === 'landing' && (
        <section className="page-card grid gap-4 px-4 py-5 animate-fade-up md:px-7 md:py-6">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-zinc-900 md:text-[28px]">요청 전에 확인해 주세요</h2>
          <p className="text-[15px] leading-[1.6] text-zinc-600">필수 정보 입력 후 접수되며, 분석 완료 시 이메일로 결과가 발송됩니다.</p>

          <div className="grid gap-2.5 md:grid-cols-3">
            <article className="rounded-md border border-line bg-soft p-3.5">
              <h3 className="text-sm font-semibold text-zinc-900">필수 입력</h3>
              <p className="mt-1 text-[13px] leading-[1.55] text-zinc-600">이름, 이메일, 생년월일/시각, 출생지, 관계 상태를 입력해 주세요.</p>
            </article>
            <article className="rounded-md border border-line bg-soft p-3.5">
              <h3 className="text-sm font-semibold text-zinc-900">비동기 처리</h3>
              <p className="mt-1 text-[13px] leading-[1.55] text-zinc-600">요청은 순차 큐로 처리되며 완료 후 이메일로 발송됩니다.</p>
            </article>
            <article className="rounded-md border border-line bg-soft p-3.5">
              <h3 className="text-sm font-semibold text-zinc-900">개인정보 유의</h3>
              <p className="mt-1 text-[13px] leading-[1.55] text-zinc-600">분석 목적 최소 정보만 수집하며, 정책에 따라 안전하게 처리합니다.</p>
            </article>
          </div>

          <div>
            <button type="button" onClick={() => setStep('input')} className="btn-pill-dark">
              입력 시작하기
            </button>
          </div>
        </section>
      )}

      {step === 'input' && (
        <section className="page-card grid gap-5 px-4 py-5 animate-fade-up md:px-7 md:py-6">
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-[13px] text-zinc-600">
              <span>입력 진행률</span>
              <strong className="text-zinc-900">
                {completionCount}/{REQUIRED_COUNT} ({completionPercent}%)
              </strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <span className="block h-full rounded-full bg-zinc-900 transition-all duration-300" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          <form className="grid gap-4" onSubmit={submitRequest}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">이름 *</span>
                <input type="text" placeholder="홍길동" {...requestForm.register('name')} className="h-11 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10" />
                {requestForm.formState.errors.name && <em className="text-xs not-italic text-red-600">{requestForm.formState.errors.name.message}</em>}
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">이메일 *</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...requestForm.register('email')}
                  className="h-11 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                />
                {requestForm.formState.errors.email && <em className="text-xs not-italic text-red-600">{requestForm.formState.errors.email.message}</em>}
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">생년월일 *</span>
                <input type="date" {...requestForm.register('birthDate')} className="h-11 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10" />
                {requestForm.formState.errors.birthDate && <em className="text-xs not-italic text-red-600">{requestForm.formState.errors.birthDate.message}</em>}
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">출생 시간 *</span>
                <input
                  type="time"
                  disabled={birthTimeUnknown}
                  {...requestForm.register('birthTime')}
                  className="h-11 rounded-md border border-line bg-white px-3 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                />
                <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    {...requestForm.register('birthTimeUnknown')}
                    className="h-4 w-4 rounded border-line text-zinc-900 focus:ring-zinc-900/20"
                    onChange={(event) => {
                      const checked = event.target.checked;
                      requestForm.setValue('birthTimeUnknown', checked, { shouldDirty: true });
                      if (checked) {
                        requestForm.setValue('birthTime', '00:00', { shouldValidate: true, shouldDirty: true });
                      } else {
                        requestForm.setValue('birthTime', '', { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                  />
                  태어난 시각을 모릅니다 (00:00 기준)
                </label>
                {requestForm.formState.errors.birthTime && <em className="text-xs not-italic text-red-600">{requestForm.formState.errors.birthTime.message}</em>}
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">성별 *</span>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-soft p-1" role="group" aria-label="성별 선택">
                  <button
                    type="button"
                    className={`h-10 rounded-md text-sm font-medium transition ${selectedGender === 'female' ? 'bg-zinc-900 text-white' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
                    onClick={() => requestForm.setValue('gender', 'female', { shouldValidate: true, shouldDirty: true })}
                  >
                    여성
                  </button>
                  <button
                    type="button"
                    className={`h-10 rounded-md text-sm font-medium transition ${selectedGender === 'male' ? 'bg-zinc-900 text-white' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
                    onClick={() => requestForm.setValue('gender', 'male', { shouldValidate: true, shouldDirty: true })}
                  >
                    남성
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">역법 *</span>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-soft p-1" role="group" aria-label="역법 선택">
                  <button
                    type="button"
                    className={`h-10 rounded-md text-sm font-medium transition ${selectedCalendarType === 'solar' ? 'bg-zinc-900 text-white' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
                    onClick={() => requestForm.setValue('calendarType', 'solar', { shouldValidate: true, shouldDirty: true })}
                  >
                    양력
                  </button>
                  <button
                    type="button"
                    className={`h-10 rounded-md text-sm font-medium transition ${selectedCalendarType === 'lunar' ? 'bg-zinc-900 text-white' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
                    onClick={() => requestForm.setValue('calendarType', 'lunar', { shouldValidate: true, shouldDirty: true })}
                  >
                    음력
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">관계 상태 *</span>
              <div className="grid gap-2 md:grid-cols-2">
                {relationshipOptions.map((option) => {
                  const active = selectedRelationship === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => requestForm.setValue('relationshipStatus', option.value, { shouldValidate: true, shouldDirty: true })}
                      className={`rounded-md border p-3 text-left transition ${
                        active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-line bg-soft text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      <strong className="block text-sm">{option.label}</strong>
                      <span className={`mt-1 block text-xs leading-[1.5] ${active ? 'text-zinc-200' : 'text-zinc-500'}`}>{option.description}</span>
                    </button>
                  );
                })}
              </div>
              {requestForm.formState.errors.relationshipStatus && (
                <em className="text-xs not-italic text-red-600">{requestForm.formState.errors.relationshipStatus.message}</em>
              )}
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">출생 지역 *</span>
              <input
                type="text"
                placeholder="서울특별시"
                {...requestForm.register('birthPlace')}
                className="h-11 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
              />
              {requestForm.formState.errors.birthPlace && <em className="text-xs not-italic text-red-600">{requestForm.formState.errors.birthPlace.message}</em>}
            </label>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
              <button type="submit" disabled={requestForm.formState.isSubmitting} className="btn-pill-dark disabled:cursor-not-allowed disabled:opacity-60">
                {requestForm.formState.isSubmitting ? '접수 중...' : '요청 접수하기'}
              </button>
              <button type="button" onClick={() => setStep('landing')} className="btn-pill-soft">
                이전 단계
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

      {step === 'submitted' && (
        <section className="page-card grid gap-4 px-4 py-5 animate-fade-up md:px-7 md:py-6">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-zinc-900 md:text-[30px]">접수가 완료되었습니다</h2>
          <p className="text-[15px] leading-[1.6] text-zinc-600">분석 완료 시 전자우편(이메일)로 결과를 보내드립니다. 스팸함도 함께 확인해 주세요.</p>

          {requestState && (
            <div className="rounded-md border border-line bg-soft p-4 text-sm leading-[1.6] text-zinc-700">
              <p className="font-medium text-zinc-900">현재 상태</p>
              <p className="mt-1">{statusText(requestState.status)}</p>
            </div>
          )}

          <div className="pt-1">
            <button type="button" onClick={resetForNewRequest} className="btn-pill-dark">
              새 요청 작성
            </button>
          </div>
        </section>
      )}

      {notice && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-fade-up">{notice}</div>}
      {apiError && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-up">{apiError}</div>}

      <section className="rounded-md border border-line bg-soft px-4 py-3 text-xs leading-[1.65] text-zinc-600 md:text-[13px]">
        개인정보 안내: 민감 정보는 최소 수집하며, 처리 완료 후 보관 정책에 따라 관리합니다.
        <br />
        요청 상태는 시스템 처리 순서에 따라 queued → processing → completed 또는 failed로 진행됩니다.
      </section>
    </div>
  );
}
