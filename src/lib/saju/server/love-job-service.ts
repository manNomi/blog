import { nanoid } from 'nanoid';
import { buildExamResult } from '../exam-result';
import { buildLoveResult } from '../love-result';
import { MAX_LLM_RETRIES, personalizeLoveResult } from './love-llm-personalizer';
import {
  RELATIONSHIP_STATUSES,
  type LoveJob,
  type LoveJobInput,
  type LoveJobPublic,
  type RelationshipStatus,
  type SajuJobResult
} from '../love-job-types';
import {
  claimQueuedLoveJob,
  createLoveJob,
  findProcessableLoveJobs,
  getLoveJobById,
  updateLoveJob,
} from './firestore-repo';
import { sendAdminJobSummaryEmail, sendLoveResultEmail } from './email';
import { hashToken, verifyToken } from './hash';
import { logEvent } from './monitoring';

function normalizeRelationshipStatus(value: unknown): RelationshipStatus {
  if (typeof value !== 'string') return 'unknown';
  return RELATIONSHIP_STATUSES.includes(value as RelationshipStatus) ? (value as RelationshipStatus) : 'unknown';
}

function normalizeInput(input: Partial<LoveJobInput> | LoveJobInput): LoveJobInput {
  const fortuneType = input.fortuneType === 'exam' ? 'exam' : 'love';
  const normalizedConcern = input.concern?.trim();
  const normalizedExamSubject = input.examSubject?.trim();

  return {
    fortuneType,
    name: input.name?.trim() ?? '',
    email: input.email?.trim().toLowerCase() ?? '',
    gender: input.gender === 'male' ? 'male' : 'female',
    calendarType: input.calendarType === 'lunar' ? 'lunar' : 'solar',
    birthDate: input.birthDate?.trim() ?? '',
    birthTime: input.birthTime?.trim() || '',
    birthPlace: input.birthPlace?.trim() ?? '',
    relationshipStatus: normalizeRelationshipStatus(input.relationshipStatus),
    concern: fortuneType === 'love' && normalizedConcern ? normalizedConcern : undefined,
    examSubject: fortuneType === 'exam' && normalizedExamSubject ? normalizedExamSubject : undefined,
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeNameForJobId(name: string) {
  const normalized = name
    .normalize('NFKC')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  return normalized || 'guest';
}

export function validateLoveInput(input: LoveJobInput) {
  if (!input.name) {
    throw new Error('name_required');
  }

  if (!input.birthDate) {
    throw new Error('birth_date_required');
  }

  if (!input.birthTime) {
    throw new Error('birth_time_required');
  }

  if (!input.birthPlace) {
    throw new Error('birth_place_required');
  }

  if (!isValidEmail(input.email)) {
    throw new Error('email_invalid');
  }

  if (input.gender !== 'female' && input.gender !== 'male') {
    throw new Error('gender_invalid');
  }

  if (input.calendarType !== 'solar' && input.calendarType !== 'lunar') {
    throw new Error('calendar_type_invalid');
  }

  if (input.fortuneType === 'love' && !RELATIONSHIP_STATUSES.includes(input.relationshipStatus)) {
    throw new Error('relationship_status_invalid');
  }

  if (input.fortuneType === 'exam' && !input.examSubject?.trim()) {
    throw new Error('exam_subject_required');
  }

  if (
    input.birthDate.length > 20 ||
    input.birthTime.length > 10 ||
    input.birthPlace.length > 120 ||
    input.email.length > 200 ||
    (input.concern?.length ?? 0) > 200 ||
    (input.examSubject?.length ?? 0) > 80
  ) {
    throw new Error('input_length_invalid');
  }
}

export function sanitizeLoveJob(job: LoveJob): LoveJobPublic {
  return {
    id: job.id,
    status: job.status,
    input: normalizeInput(job.input),
    result: job.result,
    error: job.error,
    email: job.email,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    processingStartedAt: job.processingStartedAt,
    processingCompletedAt: job.processingCompletedAt,
    retryCount: job.retryCount,
  };
}

export async function createLoveJobWithToken(payload: {
  input: LoveJobInput;
  ip: string;
  ua: string;
}) {
  const normalizedInput = normalizeInput(payload.input);
  validateLoveInput(normalizedInput);

  const namePart = normalizeNameForJobId(normalizedInput.name);
  const id = `${namePart}-${nanoid(12)}`;
  const accessToken = nanoid(32);
  const now = Date.now();

  const job: LoveJob = {
    id,
    status: 'queued',
    input: normalizedInput,
    result: null,
    error: null,
    email: {
      to: normalizedInput.email,
      provider: process.env.RESEND_API_KEY ? 'resend' : 'console',
      messageId: null,
      sent: false,
      sentAt: null,
      error: null,
    },
    accessTokenHash: hashToken(accessToken),
    createdAt: now,
    updatedAt: now,
    processingStartedAt: null,
    processingCompletedAt: null,
    retryCount: 0,
    requestMeta: {
      ip: payload.ip,
      ua: payload.ua,
    },
  };

  await createLoveJob(job);

  return {
    job: sanitizeLoveJob(job),
    accessToken,
  };
}

export async function getAuthorizedLoveJob(jobId: string, accessToken: string) {
  const job = await getLoveJobById(jobId);
  if (!job) return null;

  if (!verifyToken(accessToken, job.accessTokenHash)) {
    throw new Error('job_access_denied');
  }

  return job;
}

type ProcessSource = 'api' | 'worker';

export async function processLoveJob(jobId: string, source: ProcessSource = 'api') {
  const now = Date.now();
  const claimed = await claimQueuedLoveJob(jobId, now);

  if (!claimed) {
    const existing = await getLoveJobById(jobId);
    return existing ? sanitizeLoveJob(existing) : null;
  }

  const job = claimed;
  const normalizedInput = normalizeInput(job.input);

  if (job.email.sent) {
    await updateLoveJob(job.id, {
      status: 'completed',
      updatedAt: Date.now(),
      processingCompletedAt: Date.now(),
      error: null,
      result: job.result,
    });

    const refreshed = await getLoveJobById(job.id);
    return refreshed ? sanitizeLoveJob(refreshed) : null;
  }

  let result: SajuJobResult | null = null;
  let sentEmail: { provider: 'resend' | 'console'; messageId: string | null; sentAt: number } | null = null;
  let llmFailureMessage: string | null = null;
  let retryCount = job.retryCount ?? 0;

  try {
    if (normalizedInput.fortuneType === 'exam') {
      result = buildExamResult(normalizedInput);
    } else {
      const baselineResult = buildLoveResult(normalizedInput);
      try {
        result = await personalizeLoveResult(normalizedInput, baselineResult, {
          preferCodex: source === 'worker',
        });
      } catch (error) {
        llmFailureMessage = error instanceof Error ? error.message : 'llm_personalization_failed';
        retryCount += 1;

        if (retryCount < MAX_LLM_RETRIES) {
          await updateLoveJob(job.id, {
            status: 'queued',
            input: normalizedInput,
            result: null,
            error: llmFailureMessage,
            retryCount,
            updatedAt: Date.now(),
            processingStartedAt: null,
            processingCompletedAt: null,
            email: {
              ...job.email,
              sent: false,
              error: llmFailureMessage,
            },
          });

          logEvent('warn', 'saju_request_retry_queued', {
            requestId: job.id,
            retryCount,
            maxRetries: MAX_LLM_RETRIES,
            message: llmFailureMessage,
            source,
          });

          const refreshedQueued = await getLoveJobById(job.id);
          return refreshedQueued ? sanitizeLoveJob(refreshedQueued) : null;
        }

        await updateLoveJob(job.id, {
          status: 'failed',
          input: normalizedInput,
          result: null,
          error: llmFailureMessage,
          retryCount,
          updatedAt: Date.now(),
          processingCompletedAt: Date.now(),
          email: {
            ...job.email,
            sent: false,
            error: llmFailureMessage,
          },
        });

        logEvent('error', 'saju_request_generation_failed_no_user_email', {
          requestId: job.id,
          retryCount,
          maxRetries: MAX_LLM_RETRIES,
          message: llmFailureMessage,
          source,
        });

        try {
          await sendAdminJobSummaryEmail({
            requestId: job.id,
            requesterName: normalizedInput.name,
            requesterEmail: normalizedInput.email,
            status: 'failed',
            error: llmFailureMessage,
            source,
            result: null,
          });
        } catch (notifyError) {
          logEvent('warn', 'admin_summary_email_failed', {
            requestId: job.id,
            source,
            message: notifyError instanceof Error ? notifyError.message : 'unknown',
          });
        }

        const refreshedFailed = await getLoveJobById(job.id);
        return refreshedFailed ? sanitizeLoveJob(refreshedFailed) : null;
      }

      if (!result) {
        result = baselineResult;
      }
    }

    const emailResult = await sendLoveResultEmail({
      to: normalizedInput.email,
      name: normalizedInput.name,
      requestId: job.id,
      concern: normalizedInput.concern,
      result,
    });
    sentEmail = {
      provider: emailResult.provider,
      messageId: emailResult.messageId,
      sentAt: Date.now(),
    };

    await updateLoveJob(job.id, {
      status: 'completed',
      input: normalizedInput,
      result,
      retryCount,
      updatedAt: Date.now(),
      processingCompletedAt: Date.now(),
      error: null,
      email: {
        ...job.email,
        provider: sentEmail.provider,
        messageId: sentEmail.messageId,
        sent: true,
        sentAt: sentEmail.sentAt,
        error: null,
      },
    });

    try {
      await sendAdminJobSummaryEmail({
        requestId: job.id,
        requesterName: normalizedInput.name,
        requesterEmail: normalizedInput.email,
        status: 'completed',
        error: llmFailureMessage,
        source,
        result,
      });
    } catch (notifyError) {
      logEvent('warn', 'admin_summary_email_failed', {
        requestId: job.id,
        source,
        message: notifyError instanceof Error ? notifyError.message : 'unknown',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'analysis_or_email_failed';
    const nextRetryCount = sentEmail ? retryCount : retryCount + 1;
    const shouldRetry = !sentEmail && nextRetryCount < MAX_LLM_RETRIES;
    const nextStatus: LoveJob['status'] = sentEmail ? 'completed' : shouldRetry ? 'queued' : 'failed';

    await updateLoveJob(job.id, {
      status: nextStatus,
      input: normalizedInput,
      updatedAt: Date.now(),
      processingStartedAt: nextStatus === 'queued' ? null : job.processingStartedAt,
      processingCompletedAt: nextStatus === 'queued' ? null : Date.now(),
      error: sentEmail ? null : message,
      result,
      retryCount: nextRetryCount,
      email: {
        ...job.email,
        provider: sentEmail?.provider ?? job.email.provider,
        messageId: sentEmail?.messageId ?? job.email.messageId,
        sent: Boolean(sentEmail),
        sentAt: sentEmail?.sentAt ?? job.email.sentAt,
        error: sentEmail ? null : message,
      },
    });

    if (nextStatus === 'queued') {
      logEvent('warn', 'saju_request_retry_queued', {
        requestId: job.id,
        retryCount: nextRetryCount,
        maxRetries: MAX_LLM_RETRIES,
        message,
        source,
      });
    }

    if (nextStatus !== 'queued') {
      try {
        await sendAdminJobSummaryEmail({
          requestId: job.id,
          requesterName: normalizedInput.name,
          requesterEmail: normalizedInput.email,
          status: nextStatus,
          error: sentEmail ? null : message,
          source,
          result,
        });
      } catch (notifyError) {
        logEvent('warn', 'admin_summary_email_failed', {
          requestId: job.id,
          source,
          message: notifyError instanceof Error ? notifyError.message : 'unknown',
        });
      }
    }
  }

  const refreshed = await getLoveJobById(job.id);
  return refreshed ? sanitizeLoveJob(refreshed) : null;
}

export async function processLoveJobsBatch(limitCount = 10, source: ProcessSource = 'api') {
  const jobs = await findProcessableLoveJobs(limitCount);
  let processed = 0;

  for (const job of jobs) {
    const next = await processLoveJob(job.id, source);
    if (next?.status === 'completed' || next?.status === 'failed') {
      processed += 1;
    }
  }

  return processed;
}
