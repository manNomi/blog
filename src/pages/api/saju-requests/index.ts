import type { APIRoute } from 'astro';
import type { LoveJobInput } from '../../../lib/saju/love-job-types';
import { consumeRateLimit } from '../../../lib/saju/server/rate-limit';
import { verifyTurnstileToken } from '../../../lib/saju/server/turnstile';
import { createLoveJobWithToken } from '../../../lib/saju/server/love-job-service';
import { getFirestoreBackendMode } from '../../../lib/saju/server/firestore-repo';
import { logEvent } from '../../../lib/saju/server/monitoring';

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function mapCreateErrorToMessage(code: string) {
  switch (code) {
    case 'name_required':
      return '이름을 입력해 주세요.';
    case 'birth_date_required':
      return '태어난 날짜를 입력해 주세요.';
    case 'birth_time_required':
      return '태어난 시각을 입력해 주세요.';
    case 'birth_place_required':
      return '태어난 고장을 입력해 주세요.';
    case 'email_invalid':
      return '올바른 이메일을 입력해 주세요.';
    case 'gender_invalid':
      return '성별 값이 올바르지 않습니다.';
    case 'calendar_type_invalid':
      return '역법 값이 바르지 아니하옵니다.';
    case 'relationship_status_invalid':
      return '연애 상태 값을 다시 골라 주시옵소서.';
    case 'input_length_invalid':
      return '입력 길이를 다시 확인해 주세요.';
    default:
      return null;
  }
}

function getIp(request: Request, clientAddress?: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || clientAddress || '0.0.0.0';
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getIp(request, clientAddress);
  const ua = request.headers.get('user-agent') ?? 'unknown';
  const rate = consumeRateLimit(`saju:create:${ip}`, 10, 60_000);

  if (!rate.allowed) {
    return json({ error: '요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.' }, 429);
  }

  try {
    const body = (await request.json()) as {
      input?: LoveJobInput;
      captchaToken?: string;
    };

    if (!body.input) {
      return json({ error: '입력 정보가 필요합니다.' }, 400);
    }

    const captcha = await verifyTurnstileToken(body.captchaToken ?? null, ip);
    if (!captcha.success) {
      return json({ error: '보안 확인에 실패했습니다. 다시 시도해 주세요.' }, 400);
    }

    const created = await createLoveJobWithToken({
      input: body.input,
      ip,
      ua
    });

    logEvent('info', 'saju_request_created', {
      requestId: created.job.id,
      backendMode: getFirestoreBackendMode(),
      captchaSkipped: captcha.skipped
    });

    return json({
      requestId: created.job.id,
      accessToken: created.accessToken,
      request: created.job
    });
  } catch (error) {
    if (error instanceof Error) {
      const mapped = mapCreateErrorToMessage(error.message);
      if (mapped) {
        return json({ error: mapped }, 400);
      }
    }

    logEvent('error', 'saju_request_create_failed', {
      message: error instanceof Error ? error.message : 'unknown'
    });

    return json({ error: '요청을 처리하는 중 문제가 발생했습니다. 다시 시도해 주세요.' }, 500);
  }
};
