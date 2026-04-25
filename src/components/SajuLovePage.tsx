import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LoveJobPublic } from '../lib/saju/love-job-types';
import './SajuLovePage.css';

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
  accessToken: z.string().trim().min(1, '접근 토큰을 입력해 주세요.')
});

type RequestFormValues = z.infer<typeof requestFormSchema>;
type StatusLookupValues = z.infer<typeof statusLookupSchema>;

type Step = 'landing' | 'input' | 'submitted';

type CreateResponse = {
  requestId: string;
  accessToken: string;
  request: LoveJobPublic;
};

const REQUIRED_COUNT = 7;

const stepLabels: Array<{ key: Step; label: string; caption: string }> = [
  { key: 'landing', label: '01 안내', caption: '흐름 확인' },
  { key: 'input', label: '02 입력', caption: '필수 정보 작성' },
  { key: 'submitted', label: '03 접수', caption: '이메일 발송 대기' }
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

function statusTone(status: LoveJobPublic['status']) {
  switch (status) {
    case 'completed':
      return 'is-success';
    case 'processing':
      return 'is-info';
    case 'queued':
      return 'is-wait';
    default:
      return 'is-danger';
  }
}

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
  const selectedGender = requestForm.watch('gender');
  const selectedCalendarType = requestForm.watch('calendarType');

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

  const completionPercent = Math.round((completionCount / REQUIRED_COUNT) * 100);

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
      setNotice('요청이 접수되었습니다. 분석이 완료되면 이메일로 결과를 보내드립니다.');

      statusForm.reset({
        requestId: created.requestId,
        accessToken: created.accessToken
      });
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '요청 접수 중 오류가 발생했습니다.');
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
        setNotice('분석과 이메일 발송이 완료되었습니다. 받은편지함/스팸함을 확인해 주세요.');
      } else {
        setNotice(`현재 상태: ${statusText(payload.request.status)}`);
      }
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '상태 조회 중 오류가 발생했습니다.');
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

      setNotice(`처리 워커를 실행했습니다. 처리된 요청: ${payload.processed}건`);
      await checkStatus();
    } catch (requestError) {
      setApiError(requestError instanceof Error ? requestError.message : '처리 요청 호출에 실패했습니다.');
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

  const copyField = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label}를 복사했습니다.`);
    } catch {
      setApiError('복사에 실패했습니다. 수동으로 복사해 주세요.');
    }
  };

  const currentStepIndex = stepLabels.findIndex((entry) => entry.key === step);

  return (
    <div className="saju-shell">
      <section className="saju-card saju-hero">
        <div className="saju-hero__glow" aria-hidden="true" />
        <p className="saju-hero__eyebrow">Saju Atelier</p>
        <h1 className="saju-hero__title">사주 연애운 리포트</h1>
        <p className="saju-hero__description">
          입력한 정보를 바탕으로 비동기 분석을 진행하고, 완료된 결과를 이메일로 전송합니다.
        </p>

        <div className="saju-stepper" role="list" aria-label="사주 요청 단계">
          {stepLabels.map((entry, index) => {
            const active = index <= currentStepIndex;
            return (
              <div key={entry.key} className={`saju-step ${active ? 'is-active' : ''}`} role="listitem">
                <strong>{entry.label}</strong>
                <span>{entry.caption}</span>
              </div>
            );
          })}
        </div>
      </section>

      {step === 'landing' && (
        <section className="saju-card saju-panel">
          <h2 className="saju-panel__title">요청 전에 확인해 주세요</h2>
          <p className="saju-panel__desc">필수 정보를 입력하면 접수 즉시 큐에 등록되고, 처리 완료 후 이메일로 발송됩니다.</p>

          <div className="saju-checklist">
            <article>
              <h3>필수 입력</h3>
              <p>이름, 이메일, 생년월일, 출생 시간/지역을 입력해 주세요.</p>
            </article>
            <article>
              <h3>처리 방식</h3>
              <p>요청은 비동기로 처리되며 순서에 따라 분석이 진행됩니다.</p>
            </article>
            <article>
              <h3>결과 수신</h3>
              <p>완료 시 등록한 이메일로 리포트를 전송합니다.</p>
            </article>
          </div>

          <button type="button" onClick={() => setStep('input')} className="saju-btn saju-btn--primary">
            입력 시작하기
          </button>
        </section>
      )}

      {step === 'input' && (
        <section className="saju-card saju-panel">
          <div className="saju-progress">
            <div className="saju-progress__meta">
              <span>입력 진행률</span>
              <strong>
                {completionCount}/{REQUIRED_COUNT} ({completionPercent}%)
              </strong>
            </div>
            <div className="saju-progress__bar">
              <span style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          <form className="saju-form" onSubmit={submitRequest}>
            <div className="saju-grid">
              <label className="saju-field">
                <span>이름 *</span>
                <input type="text" placeholder="홍길동" {...requestForm.register('name')} className="saju-input" />
                {requestForm.formState.errors.name && <em>{requestForm.formState.errors.name.message}</em>}
              </label>

              <label className="saju-field">
                <span>이메일 *</span>
                <input type="email" placeholder="name@example.com" {...requestForm.register('email')} className="saju-input" />
                {requestForm.formState.errors.email && <em>{requestForm.formState.errors.email.message}</em>}
              </label>

              <label className="saju-field">
                <span>생년월일 *</span>
                <input type="date" {...requestForm.register('birthDate')} className="saju-input" />
                {requestForm.formState.errors.birthDate && <em>{requestForm.formState.errors.birthDate.message}</em>}
              </label>

              <label className="saju-field">
                <span>출생 시간 *</span>
                <input type="time" {...requestForm.register('birthTime')} className="saju-input" />
                {requestForm.formState.errors.birthTime && <em>{requestForm.formState.errors.birthTime.message}</em>}
              </label>
            </div>

            <div className="saju-segment-row">
              <div className="saju-field">
                <span>성별 *</span>
                <div className="saju-segment" role="group" aria-label="성별 선택">
                  <button
                    type="button"
                    className={`saju-segment__button ${selectedGender === 'female' ? 'is-active' : ''}`}
                    onClick={() => requestForm.setValue('gender', 'female', { shouldValidate: true, shouldDirty: true })}
                  >
                    여성
                  </button>
                  <button
                    type="button"
                    className={`saju-segment__button ${selectedGender === 'male' ? 'is-active' : ''}`}
                    onClick={() => requestForm.setValue('gender', 'male', { shouldValidate: true, shouldDirty: true })}
                  >
                    남성
                  </button>
                </div>
              </div>

              <div className="saju-field">
                <span>역법 *</span>
                <div className="saju-segment" role="group" aria-label="역법 선택">
                  <button
                    type="button"
                    className={`saju-segment__button ${selectedCalendarType === 'solar' ? 'is-active' : ''}`}
                    onClick={() => requestForm.setValue('calendarType', 'solar', { shouldValidate: true, shouldDirty: true })}
                  >
                    양력
                  </button>
                  <button
                    type="button"
                    className={`saju-segment__button ${selectedCalendarType === 'lunar' ? 'is-active' : ''}`}
                    onClick={() => requestForm.setValue('calendarType', 'lunar', { shouldValidate: true, shouldDirty: true })}
                  >
                    음력
                  </button>
                </div>
              </div>
            </div>

            <label className="saju-field">
              <span>출생 지역 *</span>
              <input type="text" placeholder="서울특별시" {...requestForm.register('birthPlace')} className="saju-input" />
              {requestForm.formState.errors.birthPlace && <em>{requestForm.formState.errors.birthPlace.message}</em>}
            </label>

            <div className="saju-actions">
              <button type="submit" disabled={requestForm.formState.isSubmitting} className="saju-btn saju-btn--primary">
                {requestForm.formState.isSubmitting ? '접수 중...' : '요청 접수하기'}
              </button>
              <button type="button" onClick={() => setStep('landing')} className="saju-btn saju-btn--ghost">
                이전 단계
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'submitted' && (
        <section className="saju-panel-grid">
          <article className={`saju-card saju-panel saju-status ${requestState ? statusTone(requestState.status) : ''}`}>
            <h2 className="saju-panel__title">접수 상태</h2>
            <p className="saju-panel__desc">요청 식별값과 접근 토큰으로 현재 처리 상태를 조회할 수 있습니다.</p>

            <dl className="saju-credentials">
              <div>
                <dt>요청 ID</dt>
                <dd>
                  <code>{statusForm.watch('requestId') || '-'}</code>
                  <button type="button" onClick={() => copyField(statusForm.watch('requestId') || '', '요청 ID')}>
                    복사
                  </button>
                </dd>
              </div>
              <div>
                <dt>접근 토큰</dt>
                <dd>
                  <code>{statusForm.watch('accessToken') || '-'}</code>
                  <button type="button" onClick={() => copyField(statusForm.watch('accessToken') || '', '접근 토큰')}>
                    복사
                  </button>
                </dd>
              </div>
            </dl>

            {requestState && (
              <p className="saju-status__current">
                현재 상태: <strong>{statusText(requestState.status)}</strong>
              </p>
            )}
          </article>

          <form className="saju-card saju-panel" onSubmit={checkStatus}>
            <h3 className="saju-panel__title">상태 조회 / 처리 실행</h3>

            <div className="saju-grid">
              <label className="saju-field">
                <span>요청 ID</span>
                <input type="text" {...statusForm.register('requestId')} className="saju-input" />
                {statusForm.formState.errors.requestId && <em>{statusForm.formState.errors.requestId.message}</em>}
              </label>

              <label className="saju-field">
                <span>접근 토큰</span>
                <input type="text" {...statusForm.register('accessToken')} className="saju-input" />
                {statusForm.formState.errors.accessToken && <em>{statusForm.formState.errors.accessToken.message}</em>}
              </label>
            </div>

            <div className="saju-actions">
              <button type="submit" disabled={isChecking} className="saju-btn saju-btn--primary">
                {isChecking ? '조회 중...' : '상태 조회'}
              </button>
              <button type="button" onClick={triggerProcessor} disabled={isTriggering} className="saju-btn saju-btn--ghost">
                {isTriggering ? '처리 요청 중...' : '처리 트리거'}
              </button>
              <button type="button" onClick={resetForNewRequest} className="saju-btn saju-btn--ghost">
                새 요청 작성
              </button>
            </div>
          </form>
        </section>
      )}

      {notice && <div className="saju-toast is-notice">{notice}</div>}
      {apiError && <div className="saju-toast is-error">{apiError}</div>}

      <section className="saju-footnote">
        상태값: queued / processing / completed / failed
        <br />
        개인정보 안내: 민감 정보는 최소 수집하며, 처리 완료 후 보관 정책에 따라 관리합니다.
      </section>
    </div>
  );
}
