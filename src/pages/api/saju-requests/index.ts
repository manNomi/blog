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
      return '이름은 반드시 적어야 하옵니다.';
    case 'birth_date_required':
      return '태어난 날은 반드시 적어야 하옵니다.';
    case 'birth_time_required':
      return '태어난 시각은 반드시 적어야 하옵니다.';
    case 'birth_place_required':
      return '태어난 고장은 반드시 적어야 하옵니다.';
    case 'email_invalid':
      return '옳은 전자우편을 적어 주시옵소서.';
    case 'gender_invalid':
      return '남녀 값이 바르지 아니하옵니다.';
    case 'calendar_type_invalid':
      return '역법 값이 바르지 아니하옵니다.';
    case 'input_length_invalid':
      return '적은 값의 길이를 살펴 주시옵소서.';
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
    return json({ error: '청원이 몹시 많사오니, 잠시 뒤 다시 청해 주시옵소서.' }, 429);
  }

  try {
    const body = (await request.json()) as {
      input?: LoveJobInput;
      captchaToken?: string;
    };

    if (!body.input) {
      return json({ error: '적어 올릴 값이 필요하옵니다.' }, 400);
    }

    const captcha = await verifyTurnstileToken(body.captchaToken ?? null, ip);
    if (!captcha.success) {
      return json({ error: '사람 확인 표지 살핌에 그르쳤사옵니다.' }, 400);
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

    return json({ error: '청원을 세우는 동안 허물이 생겼사오니, 다시 청해 주시옵소서.' }, 500);
  }
};
