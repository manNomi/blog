import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ExamResultFormat, FortuneType, LoveJobPublic, RelationshipStatus } from '../lib/saju/love-job-types';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const requestFormSchema = z
  .object({
    fortuneType: z.enum(['love', 'exam']).optional(),
    name: z.string().trim().min(2, '이름은 2자 이상 입력해 주세요.').max(30, '이름은 30자 이하로 입력해 주세요.'),
    email: z.string().trim().email('올바른 이메일 형식을 입력해 주세요.'),
    gender: z.enum(['female', 'male']),
    calendarType: z.enum(['solar', 'lunar']),
    birthDate: z.string().refine((value) => isValidBirthDate(value), 'YYYY-MM-DD 형식으로 생년월일을 입력해 주세요.'),
    birthTime: z.string(),
    birthTimeUnknown: z.boolean(),
    birthPlace: z.string().trim().min(2, '출생지는 2자 이상 입력해 주세요.').max(50, '출생지는 50자 이하로 입력해 주세요.'),
    concern: z.string().trim().max(200, '고민은 200자 이하로 입력해 주세요.').optional(),
    examSubject: z.string().trim().max(80, '과목은 80자 이하로 입력해 주세요.').optional(),
    examResultFormat: z.enum(['grade', 'score']),
    relationshipStatus: z.enum(['none', 'interested', 'dating', 'unknown']).optional()
  })
  .superRefine((data, ctx) => {
    if (!data.fortuneType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fortuneType'],
        message: '보고 싶은 운세를 선택해 주세요.'
      });
    }

    if (!data.birthTimeUnknown && !TIME_REGEX.test(data.birthTime || '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthTime'],
        message: '출생 시간을 입력해 주세요.'
      });
    }

    if (data.fortuneType === 'love' && !data.relationshipStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['relationshipStatus'],
        message: '현재 관계 상태를 선택해 주세요.'
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
type Step = 'fortune' | 'input' | 'submitted';
type FlowTarget = 'name' | 'birthDate' | 'birthTime' | 'details' | 'delivery' | 'review';
type AdvanceableFlowTarget = Exclude<FlowTarget, 'review'>;

type CreateResponse = {
  request: LoveJobPublic;
};

const REQUIRED_COUNT = 5;
const flowOrder: FlowTarget[] = ['name', 'birthDate', 'birthTime', 'details', 'delivery', 'review'];

const fortuneOptions: Array<{ value: FortuneType; label: string; description: string }> = [
  { value: 'exam', label: '시험운', description: '과목과 결과 기준에 맞춘 시험 흐름을 받아요.' },
  { value: 'love', label: '연애운', description: '관계 상태와 고민을 바탕으로 연애 리포트를 받아요.' }
];

const relationshipOptions: Array<{ value: RelationshipStatus; label: string; description: string }> = [
  { value: 'none', label: '새 인연', description: '특정 관계 없이 새 만남을 보고 싶어요.' },
  { value: 'interested', label: '관심 상대', description: '호감 상대와의 가능성이 궁금해요.' },
  { value: 'dating', label: '연애 중', description: '현재 관계를 안정적으로 보고 싶어요.' },
  { value: 'unknown', label: '정리 중', description: '아직 상태를 명확히 말하기 어려워요.' }
];

const concernQuickOptions = ['새 인연이 궁금해요', '호감 상대와 잘될까요?', '현재 관계를 이어가도 될까요?', '재회나 정리가 고민이에요'];

const examResultFormatOptions: Array<{ value: ExamResultFormat; label: string; description: string }> = [
  { value: 'grade', label: '예상 학점', description: 'A/B/C 학점 감각으로 받아요.' },
  { value: 'score', label: '예상 점수', description: '100점 기준 점수 감각으로 받아요.' }
];

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : '요청 처리 중 문제가 발생했습니다.';
    throw new Error(message);
  }

  return payload as T;
}

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function isValidBirthDate(value: string) {
  if (!BIRTH_DATE_REGEX.test(value)) return false;

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);

  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <em className="text-xs not-italic text-red-600 animate-toast-slide dark:text-red-300">{message}</em>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="saju-summary-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function FlowCard({
  title,
  description,
  complete,
  active,
  children,
  setNode
}: {
  title: string;
  description: string;
  complete: boolean;
  active: boolean;
  children: ReactNode;
  setNode?: (node: HTMLElement | null) => void;
}) {
  return (
    <section ref={setNode} className={`saju-card scroll-mt-[96px] px-5 py-5 animate-panel-reveal md:px-7 md:py-6 ${active ? 'saju-card--active' : ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[1.25rem] font-semibold leading-[1.3] tracking-[-0.025em] text-[var(--text)]">{title}</h2>
          <p className="mt-1 text-sm leading-[1.6] text-[var(--text-dim)]">{description}</p>
        </div>
        <span className={`saju-status ${complete ? 'saju-status--done' : ''}`}>{complete ? '완료' : active ? '입력 중' : '대기'}</span>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function FlowNextButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  if (disabled) return null;

  return (
    <div className="flex justify-end pt-2 animate-step-enter">
      <button type="button" onClick={onClick} className="btn-pill-dark h-10 w-full transition-transform duration-200 hover:-translate-y-0.5 sm:w-fit">
        다음
      </button>
    </div>
  );
}

export default function SajuLovePage() {
  const [step, setStep] = useState<Step>('fortune');
  const [visibleFlowTarget, setVisibleFlowTarget] = useState<FlowTarget>('name');
  const [requestState, setRequestState] = useState<LoveJobPublic | null>(null);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const flowRefs = useRef<Record<FlowTarget, HTMLElement | null>>({
    name: null,
    birthDate: null,
    birthTime: null,
    details: null,
    delivery: null,
    review: null
  });
  const previousFlowTarget = useRef<FlowTarget | null>(null);

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    mode: 'onChange',
    defaultValues: {
      fortuneType: undefined,
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
      relationshipStatus: undefined
    }
  });

  const watched = requestForm.watch();
  const selectedFortuneType = requestForm.watch('fortuneType');
  const selectedGender = requestForm.watch('gender');
  const selectedCalendarType = requestForm.watch('calendarType');
  const selectedRelationship = requestForm.watch('relationshipStatus');
  const selectedExamResultFormat = requestForm.watch('examResultFormat');
  const birthTimeUnknown = requestForm.watch('birthTimeUnknown');
  const isSubmitting = requestForm.formState.isSubmitting;
  const concernLength = watched.concern?.length ?? 0;
  const examSubjectLength = watched.examSubject?.length ?? 0;

  const fortuneLabel = selectedFortuneType === 'exam' ? '시험운' : selectedFortuneType === 'love' ? '연애운' : '미선택';
  const relationshipLabel = relationshipOptions.find((option) => option.value === selectedRelationship)?.label ?? '미선택';
  const examResultFormatLabel = examResultFormatOptions.find((option) => option.value === selectedExamResultFormat)?.label ?? '예상 학점';

  const nameLength = watched.name?.trim().length ?? 0;
  const birthPlaceLength = watched.birthPlace?.trim().length ?? 0;
  const hasName = nameLength >= 2 && nameLength <= 30 && (selectedGender === 'female' || selectedGender === 'male') && (selectedCalendarType === 'solar' || selectedCalendarType === 'lunar');
  const hasBirthDate = isValidBirthDate(watched.birthDate || '');
  const hasBirthTime = Boolean(watched.birthTimeUnknown) || TIME_REGEX.test(watched.birthTime || '');
  const hasBasicInfo = hasName && hasBirthDate && hasBirthTime;
  const hasDetails =
    selectedFortuneType === 'exam'
      ? Boolean(watched.examSubject?.trim()) && (watched.examSubject?.trim().length ?? 0) <= 80 && (selectedExamResultFormat === 'grade' || selectedExamResultFormat === 'score')
      : selectedFortuneType === 'love'
        ? Boolean(selectedRelationship)
        : false;
  const hasDelivery = EMAIL_REGEX.test(watched.email?.trim() || '') && birthPlaceLength >= 2 && birthPlaceLength <= 50;

  const completedCount = [hasName, hasBirthDate, hasBirthTime, hasDetails, hasDelivery].filter(Boolean).length;
  const completionPercent = Math.round((completedCount / REQUIRED_COUNT) * 100);

  const firstIncompleteFlowTarget: FlowTarget = !hasName ? 'name' : !hasBirthDate ? 'birthDate' : !hasBirthTime ? 'birthTime' : !hasDetails ? 'details' : !hasDelivery ? 'delivery' : 'review';
  const visibleFlowIndex = flowOrder.indexOf(visibleFlowTarget);
  const firstIncompleteFlowIndex = flowOrder.indexOf(firstIncompleteFlowTarget);
  const renderedFlowTarget = firstIncompleteFlowIndex < visibleFlowIndex ? firstIncompleteFlowTarget : visibleFlowTarget;
  const renderedFlowIndex = flowOrder.indexOf(renderedFlowTarget);
  const activeFlowTarget = firstIncompleteFlowIndex <= renderedFlowIndex ? firstIncompleteFlowTarget : renderedFlowTarget;
  const currentTargetComplete: Record<FlowTarget, boolean> = {
    name: hasName,
    birthDate: hasBirthDate,
    birthTime: hasBirthTime,
    details: hasDetails,
    delivery: hasDelivery,
    review: completionPercent === 100
  };
  const isFlowVisible = (target: FlowTarget) => flowOrder.indexOf(target) <= renderedFlowIndex;
  const shouldShowNext = (target: AdvanceableFlowTarget) => step === 'input' && renderedFlowTarget === target && currentTargetComplete[target] && !isSubmitting;
  const birthDateField = requestForm.register('birthDate');

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
    if (step !== 'input') return;
    if (firstIncompleteFlowIndex < visibleFlowIndex) {
      setVisibleFlowTarget(firstIncompleteFlowTarget);
    }
  }, [firstIncompleteFlowIndex, firstIncompleteFlowTarget, step, visibleFlowIndex]);

  useEffect(() => {
    if (step !== 'input') return;
    if (previousFlowTarget.current === visibleFlowTarget) return;

    previousFlowTarget.current = visibleFlowTarget;
    window.setTimeout(() => {
      const node = flowRefs.current[visibleFlowTarget];
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusTarget = node?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), button:not([disabled])');
      focusTarget?.focus({ preventScroll: true });
    }, 120);
  }, [step, visibleFlowTarget]);

  const advanceFlow = async (target: AdvanceableFlowTarget) => {
    if (isSubmitting) return;

    const fieldsByTarget: Record<AdvanceableFlowTarget, Array<keyof RequestFormValues>> = {
      name: ['name', 'gender', 'calendarType'],
      birthDate: ['birthDate'],
      birthTime: ['birthTime', 'birthTimeUnknown'],
      details: selectedFortuneType === 'exam' ? ['examSubject', 'examResultFormat'] : ['relationshipStatus', 'concern'],
      delivery: ['email', 'birthPlace']
    };
    const isValid = await requestForm.trigger(fieldsByTarget[target]);
    if (!isValid || !currentTargetComplete[target]) return;

    const nextTarget = flowOrder[flowOrder.indexOf(target) + 1] ?? target;
    previousFlowTarget.current = null;
    setVisibleFlowTarget(nextTarget);
  };

  const handleBirthDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthDateInput(event.currentTarget.value);
    event.currentTarget.value = formatted;
    void birthDateField.onChange(event);
  };

  const handleFortuneChange = (fortuneType: FortuneType) => {
    if (isSubmitting) return;

    requestForm.setValue('fortuneType', fortuneType, { shouldValidate: true, shouldDirty: true });

    if (fortuneType === 'exam') {
      requestForm.setValue('concern', '', { shouldValidate: true, shouldDirty: true });
      requestForm.setValue('relationshipStatus', undefined, { shouldValidate: true, shouldDirty: true });
      requestForm.setValue('examResultFormat', requestForm.getValues('examResultFormat') ?? 'grade', { shouldValidate: true, shouldDirty: true });
      requestForm.clearErrors(['concern', 'relationshipStatus']);
    } else {
      requestForm.setValue('examSubject', '', { shouldValidate: true, shouldDirty: true });
      requestForm.setValue('examResultFormat', 'grade', { shouldValidate: true, shouldDirty: true });
      requestForm.clearErrors(['examSubject']);
    }

    previousFlowTarget.current = null;
    setVisibleFlowTarget('name');
    setStep('input');
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  };

  const submitRequest = requestForm.handleSubmit(async (values) => {
    if (!values.fortuneType) return;

    setApiError('');
    setNotice('');

    try {
      const fortuneType = values.fortuneType;
      const created = await parseJson<CreateResponse>(
        await fetch('/api/saju-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: {
              fortuneType,
              name: values.name,
              email: values.email,
              gender: values.gender,
              calendarType: values.calendarType,
              birthDate: values.birthDate,
              birthTime: values.birthTimeUnknown ? '00:00' : values.birthTime,
              birthPlace: values.birthPlace,
              relationshipStatus: fortuneType === 'love' ? values.relationshipStatus : 'unknown',
              concern: fortuneType === 'love' && values.concern?.trim() ? values.concern.trim() : undefined,
              examSubject: fortuneType === 'exam' && values.examSubject?.trim() ? values.examSubject.trim() : undefined,
              examResultFormat: fortuneType === 'exam' ? values.examResultFormat : undefined
            }
          })
        })
      );

      setRequestState(created.request);
      setStep('submitted');
      setNotice(
        fortuneType === 'exam'
          ? '요청이 접수되었습니다. 분석이 완료되면 입력하신 이메일로 시험운 리포트를 보내드립니다.'
          : '요청이 접수되었습니다. 분석이 완료되면 입력하신 이메일로 결과를 보내드립니다.'
      );
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '요청 접수 중 오류가 발생했습니다.');
    }
  });

  const resetForNewRequest = () => {
    requestForm.reset({
      fortuneType: undefined,
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
      relationshipStatus: undefined
    });
    previousFlowTarget.current = null;
    setVisibleFlowTarget('name');
    setRequestState(null);
    setNotice('');
    setApiError('');
    setStep('fortune');
  };

  return (
    <div className="relative mx-auto grid max-w-[900px] gap-4 text-[var(--text)] md:gap-5">
      <section className="saju-card px-4 py-5 md:px-7 md:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow animate-step-enter">Saju Atelier</p>
            <h1 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--text)] md:text-[44px] [animation-delay:80ms] animate-step-enter">
              사주 운세 요청
            </h1>
            <p className="mt-3 max-w-[620px] text-[15px] leading-[1.62] text-[var(--text-dim)] md:text-[16px] [animation-delay:140ms] animate-step-enter">
              한 번에 하나씩 입력하면 결과를 이메일로 받아볼 수 있습니다.
            </p>
          </div>
          {step === 'input' && (
            <button
              type="button"
              className="pill w-fit"
              disabled={isSubmitting}
              onClick={() => {
                previousFlowTarget.current = null;
                setVisibleFlowTarget('name');
                setStep('fortune');
              }}
            >
              {fortuneLabel} 변경
            </button>
          )}
        </div>

        {step === 'input' && (
          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between gap-3 text-[13px] text-[var(--text-dim)]">
              <span>입력 진행률</span>
              <strong className="text-[var(--text)]">{completionPercent}%</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
              <span className="block h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        )}
      </section>

      {step === 'fortune' && (
        <section className="saju-card grid gap-4 px-4 py-5 md:px-7 md:py-6 animate-panel-reveal">
          <div>
            <p className="eyebrow mb-2">Choose one</p>
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-[var(--text)]">보고 싶은 운세를 선택해 주세요</h2>
            <p className="mt-1 text-sm leading-[1.6] text-[var(--text-dim)]">선택하면 다음 입력 화면으로 이동합니다.</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2" role="group" aria-label="운세 종류 선택">
            {fortuneOptions.map((option) => {
              const active = selectedFortuneType === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  disabled={isSubmitting}
                  aria-pressed={active}
                  data-active={active ? 'true' : undefined}
                  onClick={() => handleFortuneChange(option.value)}
                  className="saju-choice min-h-[112px] p-4 text-left"
                >
                  <strong className="block text-base">{option.label}</strong>
                  <span className="mt-2 block text-sm leading-[1.55]">{option.description}</span>
                </button>
              );
            })}
          </div>
          <FieldError message={requestForm.formState.errors.fortuneType?.message} />
        </section>
      )}

      {step === 'input' && (
        <form className="grid gap-4" onSubmit={submitRequest}>
          <FlowCard
            title="기본 정보를 입력해 주세요"
            description="입력한 값이 확인되면 다음 항목으로 이어집니다."
            complete={hasBasicInfo}
            active={activeFlowTarget === 'name' || activeFlowTarget === 'birthDate' || activeFlowTarget === 'birthTime'}
          >
            <div ref={(node) => { flowRefs.current.name = node; }} className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--text-dim)]">이름 *</span>
                <input
                  type="text"
                  placeholder="홍길동"
                  disabled={isSubmitting}
                  {...requestForm.register('name')}
                  className="saju-input"
                />
                <FieldError message={requestForm.formState.errors.name?.message} />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-dim)]">성별 *</span>
                  <div className="saju-segment" role="group" aria-label="성별 선택">
                    {(['female', 'male'] as const).map((gender) => {
                      const active = selectedGender === gender;
                      return (
                        <button
                          type="button"
                          key={gender}
                          disabled={isSubmitting}
                          aria-pressed={active}
                          data-active={active ? 'true' : undefined}
                          className="saju-segment__button"
                          onClick={() => requestForm.setValue('gender', gender, { shouldValidate: true, shouldDirty: true })}
                        >
                          {gender === 'female' ? '여성' : '남성'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-dim)]">역법 *</span>
                  <div className="saju-segment" role="group" aria-label="역법 선택">
                    {(['solar', 'lunar'] as const).map((calendarType) => {
                      const active = selectedCalendarType === calendarType;
                      return (
                        <button
                          type="button"
                          key={calendarType}
                          disabled={isSubmitting}
                          aria-pressed={active}
                          data-active={active ? 'true' : undefined}
                          className="saju-segment__button"
                          onClick={() => requestForm.setValue('calendarType', calendarType, { shouldValidate: true, shouldDirty: true })}
                        >
                          {calendarType === 'solar' ? '양력' : '음력'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <FlowNextButton disabled={!shouldShowNext('name')} onClick={() => void advanceFlow('name')} />
            </div>

            {isFlowVisible('birthDate') && (
              <label ref={(node) => { flowRefs.current.birthDate = node; }} className="grid gap-1.5 animate-step-enter">
                <span className="text-sm font-medium text-[var(--text-dim)]">생년월일 *</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="YYYY-MM-DD"
                  disabled={isSubmitting}
                  {...birthDateField}
                  onChange={handleBirthDateChange}
                  className="saju-input"
                />
                <FieldError message={requestForm.formState.errors.birthDate?.message} />
                <FlowNextButton disabled={!shouldShowNext('birthDate')} onClick={() => void advanceFlow('birthDate')} />
              </label>
            )}

            {isFlowVisible('birthTime') && (
              <div ref={(node) => { flowRefs.current.birthTime = node; }} className="grid gap-2 animate-step-enter">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-dim)]">출생시간 *</span>
                  <input
                    type="time"
                    disabled={isSubmitting || birthTimeUnknown}
                    {...requestForm.register('birthTime')}
                    onInput={(event) => requestForm.setValue('birthTime', event.currentTarget.value, { shouldValidate: true, shouldDirty: true })}
                    className="saju-input disabled:opacity-60"
                  />
                  <FieldError message={requestForm.formState.errors.birthTime?.message} />
                </label>
                <label className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-dim)]">
                  <input
                    type="checkbox"
                    disabled={isSubmitting}
                    {...requestForm.register('birthTimeUnknown')}
                    className="h-4 w-4 rounded border-[var(--border)] text-zinc-900 focus:ring-zinc-900/20 disabled:cursor-not-allowed"
                    onChange={(event) => {
                      const checked = event.target.checked;
                      requestForm.setValue('birthTimeUnknown', checked, { shouldDirty: true, shouldValidate: true });
                      requestForm.setValue('birthTime', checked ? '00:00' : '', { shouldValidate: true, shouldDirty: true });
                    }}
                  />
                  출생시간을 모릅니다
                </label>
                <FlowNextButton disabled={!shouldShowNext('birthTime')} onClick={() => void advanceFlow('birthTime')} />
              </div>
            )}
          </FlowCard>

          {isFlowVisible('details') && hasBasicInfo && (
            <FlowCard
              title={selectedFortuneType === 'exam' ? '시험 정보를 입력해 주세요' : '관계 상태를 선택해 주세요'}
              description={selectedFortuneType === 'exam' ? '과목과 결과 기준을 고르면 시험운 리포트가 맞춰집니다.' : '현재 상태를 고르고, 필요하면 고민을 짧게 남겨주세요.'}
              complete={hasDetails}
              active={activeFlowTarget === 'details'}
              setNode={(node) => {
                flowRefs.current.details = node;
              }}
            >
              {selectedFortuneType === 'exam' ? (
                <>
                  <label className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-dim)]">고민중인 과목 *</span>
                      <span className="text-xs text-[var(--text-faint)]">{examSubjectLength}/80</span>
                    </div>
                    <input
                      type="text"
                      maxLength={80}
                      disabled={isSubmitting}
                      placeholder="예: 컴퓨터, 수학, 영어, 한국사"
                      {...requestForm.register('examSubject')}
                      className="saju-input"
                    />
                    <FieldError message={requestForm.formState.errors.examSubject?.message} />
                  </label>

                  <div className="saju-segment md:grid-cols-2" role="group" aria-label="시험운 결과 기준 선택">
                    {examResultFormatOptions.map((option) => {
                      const active = selectedExamResultFormat === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          disabled={isSubmitting}
                          aria-pressed={active}
                          data-active={active ? 'true' : undefined}
                          onClick={() => requestForm.setValue('examResultFormat', option.value, { shouldValidate: true, shouldDirty: true })}
                          className="saju-segment__button min-h-[70px] text-left"
                        >
                          <strong className="block text-sm">{option.label}</strong>
                          <span className="mt-1 block text-xs leading-[1.5] opacity-75">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  <FlowNextButton disabled={!shouldShowNext('details')} onClick={() => void advanceFlow('details')} />
                </>
              ) : (
                <>
                  <div className="grid gap-2 md:grid-cols-2">
                    {relationshipOptions.map((option) => {
                      const active = selectedRelationship === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          disabled={isSubmitting}
                          aria-pressed={active}
                          data-active={active ? 'true' : undefined}
                          onClick={() => requestForm.setValue('relationshipStatus', option.value, { shouldValidate: true, shouldDirty: true })}
                          className="saju-choice p-3 text-left"
                        >
                          <strong className="block text-sm">{option.label}</strong>
                          <span className="mt-1 block text-xs leading-[1.5]">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={requestForm.formState.errors.relationshipStatus?.message} />

                  <label className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--text-dim)]">연애 고민 (선택)</span>
                      <span className="text-xs text-[var(--text-faint)]">{concernLength}/200</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {concernQuickOptions.map((option) => (
                        <button type="button" key={option} disabled={isSubmitting} onClick={() => requestForm.setValue('concern', option, { shouldValidate: true, shouldDirty: true })} className="pill">
                          {option}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      maxLength={200}
                      disabled={isSubmitting}
                      placeholder="요즘 가장 고민되는 연애 이슈"
                      {...requestForm.register('concern')}
                      className="saju-input min-h-[104px] resize-y py-2.5 leading-[1.55]"
                    />
                    <FieldError message={requestForm.formState.errors.concern?.message} />
                  </label>
                  <FlowNextButton disabled={!shouldShowNext('details')} onClick={() => void advanceFlow('details')} />
                </>
              )}
            </FlowCard>
          )}

          {isFlowVisible('delivery') && hasDetails && (
            <FlowCard
              title="받을 곳을 입력해 주세요"
              description="분석 결과를 보낼 이메일과 출생지를 확인합니다."
              complete={hasDelivery}
              active={activeFlowTarget === 'delivery'}
              setNode={(node) => {
                flowRefs.current.delivery = node;
              }}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-dim)]">이메일 *</span>
                  <input type="email" placeholder="name@example.com" disabled={isSubmitting} {...requestForm.register('email')} className="saju-input" />
                  <FieldError message={requestForm.formState.errors.email?.message} />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-dim)]">출생지 *</span>
                  <input type="text" placeholder="서울특별시" disabled={isSubmitting} {...requestForm.register('birthPlace')} className="saju-input" />
                  <FieldError message={requestForm.formState.errors.birthPlace?.message} />
                </label>
              </div>
              <FlowNextButton disabled={!shouldShowNext('delivery')} onClick={() => void advanceFlow('delivery')} />
            </FlowCard>
          )}

          {isFlowVisible('review') && hasDelivery && (
            <FlowCard
              title="입력 내용을 확인해 주세요"
              description="제출 후 분석이 시작되며 완료된 결과는 이메일로 발송됩니다."
              complete={completionPercent === 100}
              active
              setNode={(node) => {
                flowRefs.current.review = node;
              }}
            >
              <dl className="grid gap-2 md:grid-cols-2">
                <SummaryRow label="운세" value={fortuneLabel} />
                <SummaryRow label="이름" value={`${watched.name || '-'} · ${selectedGender === 'female' ? '여성' : '남성'} · ${selectedCalendarType === 'solar' ? '양력' : '음력'}`} />
                <SummaryRow label="생년월일" value={watched.birthDate || '-'} />
                <SummaryRow label="출생시간" value={birthTimeUnknown ? '모름' : watched.birthTime || '-'} />
                <SummaryRow label="출생지" value={watched.birthPlace || '-'} />
                <SummaryRow label="이메일" value={watched.email || '-'} />
                {selectedFortuneType === 'exam' ? (
                  <>
                    <SummaryRow label="과목" value={watched.examSubject || '-'} />
                    <SummaryRow label="결과 기준" value={examResultFormatLabel} />
                  </>
                ) : (
                  <>
                    <SummaryRow label="관계 상태" value={relationshipLabel} />
                    <SummaryRow label="연애 고민" value={watched.concern?.trim() || '입력 안 함'} />
                  </>
                )}
              </dl>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                <button type="submit" disabled={isSubmitting} className="btn-pill-dark h-11 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? '접수 중...' : '요청 접수하기'}
                </button>
                <a href="/saju-dice" aria-disabled={isSubmitting} className={`btn-pill-soft h-11 transition-transform duration-200 hover:-translate-y-0.5 ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}>
                  개인정보 없이 보기
                </a>
              </div>

              <p className="text-xs leading-[1.6] text-[var(--text-faint)] md:text-[13px]">
                요청 접수 전{' '}
                <a href="/privacy" className="font-medium text-[var(--text-dim)] underline underline-offset-2 transition hover:text-[var(--text)]">
                  개인정보 처리방침
                </a>
                을 확인해 주세요.
              </p>
            </FlowCard>
          )}
        </form>
      )}

      {step === 'submitted' && (
        <section className="saju-card grid gap-4 px-4 py-5 md:px-7 md:py-6 animate-result-pop">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--text)] md:text-[30px]">접수가 완료되었습니다</h2>
          <p className="text-[15px] leading-[1.6] text-[var(--text-dim)]">
            분석 완료 시 이메일로 {requestState?.input.fortuneType === 'exam' ? '시험운 리포트' : '결과'}를 보내드립니다. 스팸함도 함께 확인해 주세요.
          </p>

          {requestState && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm leading-[1.6] text-[var(--text)]">
              <p className="font-medium">현재 상태</p>
              <p className="mt-1 text-[var(--text-dim)]">{statusText(requestState.status)}</p>
            </div>
          )}

          <div className="pt-1">
            <button type="button" onClick={resetForNewRequest} className="btn-pill-dark transition-transform duration-200 hover:-translate-y-0.5">
              새 요청 작성
            </button>
          </div>
        </section>
      )}

      <div className="pointer-events-none fixed right-4 top-24 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
        {notice && (
          <div className="pointer-events-auto rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] shadow-soft animate-toast-slide" role="status" aria-live="polite">
            {notice}
          </div>
        )}
        {apiError && (
          <div className="pointer-events-auto rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-soft animate-toast-slide dark:border-red-300/40 dark:bg-red-950/30 dark:text-red-200" role="alert">
            {apiError}
          </div>
        )}
      </div>
    </div>
  );
}
