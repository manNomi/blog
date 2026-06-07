import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ExamResultFormat, FortuneType, LoveJobPublic, RelationshipStatus } from '../lib/saju/love-job-types';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const requestFormSchema = z
  .object({
    fortuneType: z.enum(['love', 'exam']),
    name: z.string().trim().min(2, '이름은 2자 이상 입력해 주세요.').max(30, '이름은 30자 이하로 입력해 주세요.'),
    email: z.string().trim().email('올바른 이메일 형식을 입력해 주세요.'),
    gender: z.enum(['female', 'male']),
    calendarType: z.enum(['solar', 'lunar']),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일을 입력해 주세요.'),
    birthTime: z.string(),
    birthTimeUnknown: z.boolean(),
    birthPlace: z.string().trim().min(2, '출생지는 2자 이상 입력해 주세요.').max(50, '출생지는 50자 이하로 입력해 주세요.'),
    concern: z.string().trim().max(200, '고민은 200자 이하로 입력해 주세요.').optional(),
    examSubject: z.string().trim().max(80, '과목은 80자 이하로 입력해 주세요.').optional(),
    examResultFormat: z.enum(['grade', 'score']),
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

    if (data.fortuneType === 'exam' && !data.examSubject?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['examSubject'],
        message: '고민중인 과목을 입력해 주세요.'
      });
    }
  });

type RequestFormValues = z.infer<typeof requestFormSchema>;
type FlowStepKey = 'fortune' | 'profile' | 'context' | 'review';
type PagePhase = 'flow' | 'submitted';

type CreateResponse = {
  request: LoveJobPublic;
};

const REQUIRED_COUNT = 8;
const FLOW_STEPS: FlowStepKey[] = ['fortune', 'profile', 'context', 'review'];

const fortuneOptions: Array<{ value: FortuneType; label: string; description: string }> = [
  { value: 'love', label: '연애운', description: '관계 상태와 고민을 바탕으로 연애 리포트를 받아요.' },
  { value: 'exam', label: '시험운', description: '고민중인 과목과 오행 궁합을 재밌게 풀어봐요.' }
];

const relationshipOptions: Array<{ value: RelationshipStatus; label: string; description: string }> = [
  { value: 'none', label: '없음', description: '특정 관계 없이 새 인연을 찾는 상태' },
  { value: 'interested', label: '관심 있는 사람이 있음', description: '호감 상대와 가능성을 탐색 중인 상태' },
  { value: 'dating', label: '연애 중', description: '현재 연애를 더 안정적으로 이어가고 싶은 상태' },
  { value: 'unknown', label: '잘 모르겠음', description: '관계 상태를 아직 정리하지 못한 상태' }
];

const examResultFormatOptions: Array<{ value: ExamResultFormat; label: string; description: string }> = [
  { value: 'grade', label: '예상 학점', description: '대학생 과목처럼 A/B/C 학점 감각으로 받아요.' },
  { value: 'score', label: '예상 점수', description: '시험·자격증처럼 100점 기준 점수 감각으로 받아요.' }
];

const fieldStepMap: Record<keyof RequestFormValues, FlowStepKey> = {
  fortuneType: 'fortune',
  name: 'profile',
  email: 'profile',
  gender: 'profile',
  calendarType: 'profile',
  birthDate: 'profile',
  birthTime: 'profile',
  birthTimeUnknown: 'profile',
  birthPlace: 'review',
  concern: 'context',
  examSubject: 'context',
  examResultFormat: 'context',
  relationshipStatus: 'context'
};

const fieldOrder: Array<keyof RequestFormValues> = [
  'fortuneType',
  'name',
  'email',
  'birthDate',
  'birthTime',
  'gender',
  'calendarType',
  'relationshipStatus',
  'examSubject',
  'examResultFormat',
  'birthPlace',
  'concern'
];

function isFlowStepKey(value: string | null): value is FlowStepKey {
  return value === 'fortune' || value === 'profile' || value === 'context' || value === 'review';
}

function stepUrl(step: FlowStepKey) {
  const url = new URL(window.location.href);
  if (step === 'fortune') {
    url.searchParams.delete('step');
  } else {
    url.searchParams.set('step', step);
  }
  return url;
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

function statusTone(status: LoveJobPublic['status']) {
  switch (status) {
    case 'completed':
      return 'border-emerald-300 bg-emerald-50 text-emerald-900';
    case 'processing':
      return 'border-sky-300 bg-sky-50 text-sky-900';
    case 'queued':
      return 'border-amber-300 bg-amber-50 text-amber-900';
    default:
      return 'border-red-300 bg-red-50 text-red-800';
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : '요청 처리 중 문제가 발생했습니다.';
    throw new Error(message);
  }

  return payload as T;
}

function stepMeta(step: FlowStepKey, fortuneType: FortuneType) {
  switch (step) {
    case 'fortune':
      return {
        label: '운세 선택',
        caption: '한 가지 선택',
        title: '먼저 보고 싶은 운세를 골라주세요.',
        description: '연애와 시험 중 지금 필요한 흐름을 선택하면 다음 질문이 그에 맞게 정리됩니다.'
      };
    case 'profile':
      return {
        label: '기본 정보',
        caption: '이메일·생년월일',
        title: '결과를 받을 기본 정보를 알려주세요.',
        description: '이메일 발송과 사주 계산에 필요한 최소 정보만 차례대로 입력합니다.'
      };
    case 'context':
      return {
        label: fortuneType === 'exam' ? '시험 상황' : '관계 상황',
        caption: fortuneType === 'exam' ? '과목·기준' : '상태·고민',
        title: fortuneType === 'exam' ? '어떤 시험운이 궁금한가요?' : '지금 관계 흐름을 알려주세요.',
        description:
          fortuneType === 'exam'
            ? '고민중인 과목과 결과 기준을 넣으면 리포트가 더 구체적으로 정리됩니다.'
            : '관계 상태를 고르면 연애 리포트의 톤과 조언이 더 자연스럽게 맞춰집니다.'
      };
    case 'review':
      return {
        label: '확인',
        caption: '접수 전 점검',
        title: '마지막으로 한 번만 확인해 주세요.',
        description: '입력한 내용이 맞으면 요청을 접수하고, 완료된 결과를 이메일로 보내드립니다.'
      };
    default:
      return {
        label: '',
        caption: '',
        title: '',
        description: ''
      };
  }
}

function getStepFields(step: FlowStepKey, fortuneType: FortuneType): Array<keyof RequestFormValues> {
  switch (step) {
    case 'fortune':
      return ['fortuneType'];
    case 'profile':
      return ['name', 'email', 'birthDate', 'birthTime', 'birthTimeUnknown', 'gender', 'calendarType'];
    case 'context':
      return fortuneType === 'exam' ? ['examSubject', 'examResultFormat'] : ['relationshipStatus', 'concern'];
    case 'review':
      return ['birthPlace'];
    default:
      return [];
  }
}

function fortuneLabel(value: FortuneType) {
  return value === 'exam' ? '시험운' : '연애운';
}

function genderLabel(value: RequestFormValues['gender']) {
  return value === 'male' ? '남성' : '여성';
}

function calendarLabel(value: RequestFormValues['calendarType']) {
  return value === 'lunar' ? '음력' : '양력';
}

function relationshipLabel(value: RelationshipStatus) {
  return relationshipOptions.find((option) => option.value === value)?.label ?? '잘 모르겠음';
}

function examFormatLabel(value: ExamResultFormat) {
  return examResultFormatOptions.find((option) => option.value === value)?.label ?? '예상 학점';
}

export default function SajuLovePage() {
  const [phase, setPhase] = useState<PagePhase>('flow');
  const [activeStep, setActiveStep] = useState<FlowStepKey>('fortune');
  const [requestState, setRequestState] = useState<LoveJobPublic | null>(null);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    mode: 'onChange',
    defaultValues: {
      fortuneType: 'love',
      name: '',
      email: '',
      gender: 'female',
      calendarType: 'solar',
      birthDate: '',
      birthTime: '',
      birthTimeUnknown: false,
      birthPlace: '',
      concern: '',
      examSubject: '',
      examResultFormat: 'grade',
      relationshipStatus: 'unknown'
    }
  });

  const watched = requestForm.watch();
  const selectedFortuneType = requestForm.watch('fortuneType');
  const selectedGender = requestForm.watch('gender');
  const selectedCalendarType = requestForm.watch('calendarType');
  const selectedRelationship = requestForm.watch('relationshipStatus');
  const selectedExamResultFormat = requestForm.watch('examResultFormat');
  const birthTimeUnknown = requestForm.watch('birthTimeUnknown');
  const concernLength = watched.concern?.length ?? 0;
  const examSubjectLength = watched.examSubject?.length ?? 0;
  const activeStepIndex = FLOW_STEPS.indexOf(activeStep);
  const activeMeta = stepMeta(activeStep, selectedFortuneType);
  const flowPercent = Math.round(((activeStepIndex + 1) / FLOW_STEPS.length) * 100);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice('');
    }, 3600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    const syncStepFromUrl = () => {
      const url = new URL(window.location.href);
      const nextStep = url.searchParams.get('step');
      setPhase('flow');
      setActiveStep(isFlowStepKey(nextStep) ? nextStep : 'fortune');
    };

    syncStepFromUrl();
    window.addEventListener('popstate', syncStepFromUrl);

    return () => {
      window.removeEventListener('popstate', syncStepFromUrl);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'flow') return undefined;
    const timer = window.setTimeout(() => {
      stepHeadingRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeStep, phase]);

  const completionCount = useMemo(() => {
    const checks = [
      watched.name?.trim().length > 0,
      watched.email?.trim().length > 0,
      watched.birthDate?.trim().length > 0,
      watched.birthPlace?.trim().length > 0,
      watched.gender === 'female' || watched.gender === 'male',
      watched.calendarType === 'solar' || watched.calendarType === 'lunar',
      watched.fortuneType === 'exam' ? Boolean(watched.examSubject?.trim()) : Boolean(watched.relationshipStatus),
      watched.birthTimeUnknown || TIME_REGEX.test(watched.birthTime || '')
    ];

    return checks.filter(Boolean).length;
  }, [
    watched.name,
    watched.email,
    watched.birthDate,
    watched.birthPlace,
    watched.examSubject,
    watched.fortuneType,
    watched.gender,
    watched.calendarType,
    watched.relationshipStatus,
    watched.birthTime,
    watched.birthTimeUnknown
  ]);

  const completionPercent = Math.round((completionCount / REQUIRED_COUNT) * 100);

  const moveToStep = (nextStep: FlowStepKey, mode: 'push' | 'replace' = 'push') => {
    setPhase('flow');
    setActiveStep(nextStep);

    if (typeof window === 'undefined') return;

    const nextUrl = stepUrl(nextStep);
    if (mode === 'replace') {
      window.history.replaceState({ sajuStep: nextStep }, '', nextUrl);
      return;
    }

    window.history.pushState({ sajuStep: nextStep }, '', nextUrl);
  };

  const handleFortuneSelect = (nextFortuneType: FortuneType) => {
    setApiError('');
    const previousFortuneType = requestForm.getValues('fortuneType');
    requestForm.setValue('fortuneType', nextFortuneType, { shouldValidate: true, shouldDirty: true });

    if (nextFortuneType === 'exam') {
      requestForm.setValue('concern', '', { shouldValidate: true, shouldDirty: true });
      requestForm.setValue('relationshipStatus', 'unknown', { shouldValidate: true, shouldDirty: true });
      requestForm.setValue('examResultFormat', requestForm.getValues('examResultFormat') ?? 'grade', { shouldValidate: true, shouldDirty: true });
    } else {
      requestForm.setValue('examSubject', '', { shouldValidate: true, shouldDirty: true });
      requestForm.setValue('examResultFormat', 'grade', { shouldValidate: true, shouldDirty: true });
    }

    if (previousFortuneType !== nextFortuneType && activeStep !== 'fortune') {
      moveToStep('fortune');
    }
  };

  const handleNext = async () => {
    setApiError('');
    const fields = getStepFields(activeStep, selectedFortuneType);
    const isStepValid = await requestForm.trigger(fields, { shouldFocus: true });

    if (!isStepValid) {
      setNotice('필수 항목을 확인해 주세요.');
      return;
    }

    const nextStep = FLOW_STEPS[Math.min(activeStepIndex + 1, FLOW_STEPS.length - 1)];
    moveToStep(nextStep);
  };

  const handlePrevious = () => {
    setApiError('');
    const previousStep = FLOW_STEPS[Math.max(activeStepIndex - 1, 0)];
    moveToStep(previousStep);
  };

  const moveToFirstErrorStep = (errors: Partial<Record<keyof RequestFormValues, unknown>>) => {
    const firstErrorField = fieldOrder.find((field) => Boolean(errors[field]));
    if (!firstErrorField) return;
    moveToStep(fieldStepMap[firstErrorField]);
    setNotice('입력값을 다시 확인해 주세요.');
  };

  const submitRequest = requestForm.handleSubmit(
    async (values) => {
      setApiError('');
      setNotice('');

      try {
        const created = await parseJson<CreateResponse>(
          await fetch('/api/saju-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: {
                fortuneType: values.fortuneType,
                name: values.name,
                email: values.email,
                gender: values.gender,
                calendarType: values.calendarType,
                birthDate: values.birthDate,
                birthTime: values.birthTimeUnknown ? '00:00' : values.birthTime,
                birthPlace: values.birthPlace,
                relationshipStatus: values.fortuneType === 'love' ? values.relationshipStatus : 'unknown',
                concern: values.fortuneType === 'love' && values.concern?.trim() ? values.concern.trim() : undefined,
                examSubject: values.fortuneType === 'exam' && values.examSubject?.trim() ? values.examSubject.trim() : undefined,
                examResultFormat: values.fortuneType === 'exam' ? values.examResultFormat : undefined
              }
            })
          })
        );

        setRequestState(created.request);
        setPhase('submitted');
        setNotice(
          values.fortuneType === 'exam'
            ? '요청이 접수되었습니다. 분석이 완료되면 입력하신 이메일로 시험운 리포트를 보내드립니다.'
            : '요청이 접수되었습니다. 분석이 완료되면 입력하신 이메일로 결과를 보내드립니다.'
        );

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('step');
          window.history.replaceState({ sajuStep: 'submitted' }, '', url);
        }
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : '요청 접수 중 오류가 발생했습니다.';
        setApiError(message);

        if (/email|이메일/i.test(message)) {
          requestForm.setError('email', { type: 'server', message });
          moveToStep('profile');
        } else {
          moveToStep('review', 'replace');
        }
      }
    },
    (errors) => moveToFirstErrorStep(errors)
  );

  const resetForNewRequest = () => {
    requestForm.reset({
      fortuneType: 'love',
      name: '',
      email: '',
      gender: 'female',
      calendarType: 'solar',
      birthDate: '',
      birthTime: '',
      birthTimeUnknown: false,
      birthPlace: '',
      concern: '',
      examSubject: '',
      examResultFormat: 'grade',
      relationshipStatus: 'unknown'
    });
    setRequestState(null);
    setNotice('');
    setApiError('');
    moveToStep('fortune', 'replace');
  };

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (activeStep !== 'review') {
      event.preventDefault();
      void handleNext();
      return;
    }

    void submitRequest(event);
  };

  const summaryItems = [
    { label: '운세', value: fortuneLabel(selectedFortuneType) },
    { label: '이름', value: watched.name || '미입력' },
    { label: '이메일', value: watched.email || '미입력' },
    { label: '생년월일', value: watched.birthDate || '미입력' },
    { label: '출생 시간', value: birthTimeUnknown ? '모름 (00:00 기준)' : watched.birthTime || '미입력' },
    { label: '성별·역법', value: `${genderLabel(selectedGender)} · ${calendarLabel(selectedCalendarType)}` },
    {
      label: selectedFortuneType === 'exam' ? '시험 정보' : '관계 상태',
      value: selectedFortuneType === 'exam' ? `${watched.examSubject || '미입력'} · ${examFormatLabel(selectedExamResultFormat)}` : relationshipLabel(selectedRelationship)
    }
  ];

  return (
    <div className="relative mx-auto grid max-w-[1080px] gap-4 text-zinc-800 md:gap-5">
      <section className="page-card relative overflow-hidden px-4 py-5 md:px-7 md:py-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-zinc-900/5 blur-2xl dark:bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute right-5 top-5 h-2.5 w-2.5 animate-float-dot rounded-full bg-zinc-300" aria-hidden="true" />
        <div className="pointer-events-none absolute right-10 top-9 h-1.5 w-1.5 animate-soft-pulse rounded-full bg-zinc-400" aria-hidden="true" />

        <p className="kicker animate-step-enter">Saju Atelier</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-900 md:text-[52px] [animation-delay:80ms] animate-step-enter">
          사주 운세 요청
        </h1>
        <p className="mt-3 max-w-[780px] text-[15px] leading-[1.58] text-zinc-600 md:text-[17px] [animation-delay:140ms] animate-step-enter">
          사주로 연애와 시험운을 볼 수 있어요. 간단한 입력 후 전자우편(이메일)로 보내드립니다.
        </p>

        <div className="mt-5 grid gap-2.5 md:grid-cols-4" aria-label="사주 요청 단계">
          {FLOW_STEPS.map((stepKey, index) => {
            const meta = stepMeta(stepKey, selectedFortuneType);
            const active = phase === 'submitted' || index <= activeStepIndex;
            const current = phase === 'flow' && stepKey === activeStep;
            return (
              <button
                key={stepKey}
                type="button"
                aria-current={current ? 'step' : undefined}
                onClick={() => {
                  if (phase !== 'flow' || requestForm.formState.isSubmitting) return;
                  if (index <= activeStepIndex) moveToStep(stepKey);
                }}
                disabled={phase === 'submitted' || requestForm.formState.isSubmitting || (phase === 'flow' && index > activeStepIndex)}
                className={`rounded-md border px-3 py-2 text-left transition-all duration-300 animate-step-enter disabled:cursor-not-allowed disabled:opacity-60 ${
                  current
                    ? 'scale-[1.01] border-zinc-900 bg-zinc-900 text-white dark:border-[#D8DADE] dark:bg-[#D8DADE] dark:text-[#18191C]'
                    : active
                      ? 'border-zinc-400 bg-elevated text-zinc-900'
                      : 'border-line bg-soft text-zinc-600'
                }`}
                style={{ animationDelay: `${180 + index * 80}ms` }}
              >
                <strong className="block text-sm">
                  {String(index + 1).padStart(2, '0')} {meta.label}
                </strong>
                <span className={`text-xs ${current ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-500'}`}>{meta.caption}</span>
              </button>
            );
          })}
        </div>

        {phase === 'flow' && (
          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between text-[13px] text-zinc-600">
              <span>현재 단계</span>
              <strong className="text-zinc-900">
                {activeStepIndex + 1}/{FLOW_STEPS.length} · 입력 {completionCount}/{REQUIRED_COUNT}
              </strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <span className="block h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-[#D8DADE]" style={{ width: `${Math.max(flowPercent, completionPercent)}%` }} />
            </div>
          </div>
        )}
      </section>

      {phase === 'flow' && (
        <section className="page-card grid gap-5 px-4 py-5 md:px-7 md:py-6 animate-panel-reveal">
          <div className="grid gap-1.5">
            <p className="kicker">Step {activeStepIndex + 1}</p>
            <h2 ref={stepHeadingRef} tabIndex={-1} className="text-[25px] font-semibold tracking-[-0.02em] text-zinc-900 outline-none md:text-[32px]">
              {activeMeta.title}
            </h2>
            <p className="max-w-[760px] text-[14px] leading-[1.62] text-zinc-600 md:text-[15px]">{activeMeta.description}</p>
          </div>

          <form className="grid gap-5" onSubmit={onFormSubmit}>
            {activeStep === 'fortune' && (
              <div className="grid gap-4 animate-step-enter">
                <div className="grid gap-2 rounded-md border border-line bg-soft p-1 md:grid-cols-2" role="group" aria-label="운세 종류 선택">
                  {fortuneOptions.map((option) => {
                    const active = selectedFortuneType === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => handleFortuneSelect(option.value)}
                        className={`rounded-md px-4 py-4 text-left transition-all duration-300 ${
                          active ? 'scale-[1.01] bg-zinc-900 text-white dark:bg-[#D8DADE] dark:text-[#18191C]' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        <strong className="block text-[17px]">{option.label}</strong>
                        <span className={`mt-1 block text-[13px] leading-[1.55] ${active ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-500'}`}>{option.description}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-2.5 md:grid-cols-3">
                  <article className="rounded-md border border-line bg-elevated p-3.5">
                    <h3 className="text-sm font-semibold text-zinc-900">필수 입력만</h3>
                    <p className="mt-1 text-[13px] leading-[1.55] text-zinc-600">이름, 이메일, 생년월일/시각, 출생지와 운세별 추가 정보만 입력해요.</p>
                  </article>
                  <article className="rounded-md border border-line bg-elevated p-3.5">
                    <h3 className="text-sm font-semibold text-zinc-900">비동기 처리</h3>
                    <p className="mt-1 text-[13px] leading-[1.55] text-zinc-600">요청은 순차 큐로 처리되고 완료 후 이메일로 발송됩니다.</p>
                  </article>
                  <article className="rounded-md border border-line bg-elevated p-3.5">
                    <h3 className="text-sm font-semibold text-zinc-900">가벼운 보기</h3>
                    <p className="mt-1 text-[13px] leading-[1.55] text-zinc-600">개인정보 없이 즐기는 주사위 사주도 함께 준비되어 있어요.</p>
                  </article>
                </div>
              </div>
            )}

            {activeStep === 'profile' && (
              <div className="grid gap-4 animate-step-enter">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700">이름 *</span>
                    <input
                      type="text"
                      placeholder="홍길동"
                      {...requestForm.register('name')}
                      className="h-12 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                    />
                    {requestForm.formState.errors.name && <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.name.message}</em>}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700">이메일 *</span>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      {...requestForm.register('email')}
                      className="h-12 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                    />
                    {requestForm.formState.errors.email && <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.email.message}</em>}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700">생년월일 *</span>
                    <input
                      type="date"
                      {...requestForm.register('birthDate')}
                      className="h-12 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                    />
                    {requestForm.formState.errors.birthDate && <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.birthDate.message}</em>}
                  </label>

                  <div className="grid gap-1.5">
                    <label htmlFor="birth-time" className="text-sm font-medium text-zinc-700">
                      출생 시간 *
                    </label>
                    <input
                      id="birth-time"
                      type="time"
                      disabled={birthTimeUnknown}
                      {...requestForm.register('birthTime')}
                      className="h-12 rounded-md border border-line bg-white px-3 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                    />
                    <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        {...requestForm.register('birthTimeUnknown')}
                        className="h-4 w-4 rounded border-line text-zinc-900 focus:ring-zinc-900/20"
                        onChange={(event) => {
                          const checked = event.target.checked;
                          requestForm.setValue('birthTimeUnknown', checked, { shouldValidate: true, shouldDirty: true });
                          requestForm.setValue('birthTime', checked ? '00:00' : '', { shouldValidate: true, shouldDirty: true });
                        }}
                      />
                      태어난 시각을 모릅니다 (00:00 기준)
                    </label>
                    {requestForm.formState.errors.birthTime && <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.birthTime.message}</em>}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700">성별 *</span>
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-soft p-1" role="group" aria-label="성별 선택">
                      <button
                        type="button"
                        className={`h-11 rounded-md text-sm font-medium transition ${selectedGender === 'female' ? 'bg-zinc-900 text-white dark:bg-[#D8DADE] dark:text-[#18191C]' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
                        onClick={() => requestForm.setValue('gender', 'female', { shouldValidate: true, shouldDirty: true })}
                      >
                        여성
                      </button>
                      <button
                        type="button"
                        className={`h-11 rounded-md text-sm font-medium transition ${selectedGender === 'male' ? 'bg-zinc-900 text-white dark:bg-[#D8DADE] dark:text-[#18191C]' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
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
                        className={`h-11 rounded-md text-sm font-medium transition ${selectedCalendarType === 'solar' ? 'bg-zinc-900 text-white dark:bg-[#D8DADE] dark:text-[#18191C]' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
                        onClick={() => requestForm.setValue('calendarType', 'solar', { shouldValidate: true, shouldDirty: true })}
                      >
                        양력
                      </button>
                      <button
                        type="button"
                        className={`h-11 rounded-md text-sm font-medium transition ${selectedCalendarType === 'lunar' ? 'bg-zinc-900 text-white dark:bg-[#D8DADE] dark:text-[#18191C]' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'}`}
                        onClick={() => requestForm.setValue('calendarType', 'lunar', { shouldValidate: true, shouldDirty: true })}
                      >
                        음력
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'context' && selectedFortuneType === 'love' && (
              <div className="grid gap-4 animate-step-enter">
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
                          className={`rounded-md border p-3 text-left transition-all duration-300 ${
                            active
                              ? 'scale-[1.01] border-zinc-900 bg-zinc-900 text-white dark:border-[#D8DADE] dark:bg-[#D8DADE] dark:text-[#18191C]'
                              : 'border-line bg-soft text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          <strong className="block text-sm">{option.label}</strong>
                          <span className={`mt-1 block text-xs leading-[1.5] ${active ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-500'}`}>{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  {requestForm.formState.errors.relationshipStatus && (
                    <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.relationshipStatus.message}</em>
                  )}
                </div>

                <label className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">요즘 가장 고민되는 연애 이슈 (선택)</span>
                    <span className="text-xs text-zinc-500">{concernLength}/200</span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={200}
                    placeholder="요즘 가장 고민되는 연애 이슈"
                    {...requestForm.register('concern')}
                    className="min-h-[116px] resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm leading-[1.55] outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                  />
                  {requestForm.formState.errors.concern && <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.concern.message}</em>}
                </label>
              </div>
            )}

            {activeStep === 'context' && selectedFortuneType === 'exam' && (
              <div className="grid gap-4 animate-step-enter">
                <label className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">고민중인 과목 *</span>
                    <span className="text-xs text-zinc-500">{examSubjectLength}/80</span>
                  </div>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="예: 컴퓨터, 수학, 영어, 한국사"
                    {...requestForm.register('examSubject')}
                    className="h-12 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                  />
                  <span className="text-xs leading-[1.55] text-zinc-500">오행상 과목 궁합과 보완 루틴을 재밌게 풀어드립니다.</span>
                  {requestForm.formState.errors.examSubject && <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.examSubject.message}</em>}
                </label>

                <div className="grid gap-1.5">
                  <span className="text-sm font-medium text-zinc-700">결과를 어떤 기준으로 받을까요? *</span>
                  <div className="grid gap-2 rounded-md border border-line bg-soft p-1 md:grid-cols-2" role="group" aria-label="시험운 결과 기준 선택">
                    {examResultFormatOptions.map((option) => {
                      const active = selectedExamResultFormat === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => requestForm.setValue('examResultFormat', option.value, { shouldValidate: true, shouldDirty: true })}
                          className={`rounded-md px-3 py-2.5 text-left transition-all duration-300 ${
                            active ? 'scale-[1.01] bg-zinc-900 text-white dark:bg-[#D8DADE] dark:text-[#18191C]' : 'bg-transparent text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          <strong className="block text-sm">{option.label}</strong>
                          <span className={`mt-1 block text-xs leading-[1.5] ${active ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-500'}`}>{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'review' && (
              <div className="grid gap-4 animate-step-enter">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-zinc-700">출생 지역 *</span>
                  <input
                    type="text"
                    placeholder="서울특별시"
                    {...requestForm.register('birthPlace')}
                    className="h-12 rounded-md border border-line bg-white px-3 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                  />
                  {requestForm.formState.errors.birthPlace && <em className="text-xs not-italic text-red-600 animate-toast-slide">{requestForm.formState.errors.birthPlace.message}</em>}
                </label>

                <div className="grid gap-2 rounded-md border border-line bg-soft p-3 md:grid-cols-2">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="rounded-md border border-line bg-elevated px-3 py-2.5">
                      <span className="block text-xs text-zinc-500">{item.label}</span>
                      <strong className="mt-0.5 block break-words text-sm text-zinc-900">{item.value}</strong>
                    </div>
                  ))}
                </div>

                <section className="rounded-md border border-line bg-elevated px-4 py-3 text-xs leading-[1.65] text-zinc-600 md:text-[13px]">
                  수집 항목: 이름, 이메일, 생년월일/시각, 출생지,
                  {selectedFortuneType === 'exam' ? ' 고민중인 과목과 결과 기준' : ' 관계 상태(고민 내용은 선택)'}만 수집합니다.
                  <br />
                  처리 목적: 사주 {selectedFortuneType === 'exam' ? '시험운' : '연애운'} 분석 및 결과 이메일 발송 목적으로만 이용합니다.
                  <br />
                  보관 정책: 처리 완료 건 90일, 처리 실패 건 30일 보관 후 파기(현재 운영정책 기준)합니다.
                </section>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={activeStepIndex === 0 || requestForm.formState.isSubmitting}
                  className="btn-pill-soft transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                {activeStep === 'fortune' && (
                  <a href="/saju-dice" className="btn-pill-soft transition-transform duration-200 hover:-translate-y-0.5">
                    개인정보 없이 주사위로 보기
                  </a>
                )}
              </div>

              {activeStep === 'review' ? (
                <button
                  type="submit"
                  disabled={requestForm.formState.isSubmitting}
                  className="btn-pill-dark transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestForm.formState.isSubmitting ? '접수 중...' : '이대로 접수하기'}
                </button>
              ) : (
                <button type="button" onClick={() => void handleNext()} className="btn-pill-dark transition-transform duration-200 hover:-translate-y-0.5">
                  다음
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {phase === 'submitted' && (
        <section className="page-card grid gap-4 px-4 py-5 md:px-7 md:py-6 animate-result-pop">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-zinc-900 md:text-[30px]">접수가 완료되었습니다</h2>
          <p className="text-[15px] leading-[1.6] text-zinc-600">
            분석 완료 시 전자우편(이메일)로 {requestState?.input.fortuneType === 'exam' ? '시험운 리포트' : '결과'}를 보내드립니다. 스팸함도 함께 확인해 주세요.
          </p>

          {requestState && (
            <div className={`rounded-md border p-4 text-sm leading-[1.6] ${statusTone(requestState.status)}`}>
              <p className="font-medium">현재 상태</p>
              <p className="mt-1">{statusText(requestState.status)}</p>
            </div>
          )}

          <div className="pt-1">
            <button type="button" onClick={resetForNewRequest} className="btn-pill-dark transition-transform duration-200 hover:-translate-y-0.5">
              새 요청 작성
            </button>
          </div>
        </section>
      )}

      <section className="rounded-md border border-line bg-soft px-4 py-3 text-xs leading-[1.65] text-zinc-600 md:text-[13px]">
        요청 상태는 시스템 처리 순서에 따라 queued → processing → completed 또는 failed로 진행됩니다.
      </section>

      <div className="pointer-events-none fixed right-4 top-24 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
        {notice && (
          <div className="pointer-events-auto rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lift animate-toast-slide" role="status" aria-live="polite">
            {notice}
          </div>
        )}
        {apiError && (
          <div className="pointer-events-auto rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lift animate-toast-slide" role="alert">
            {apiError}
          </div>
        )}
      </div>
    </div>
  );
}
