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
    return json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429);
  }

  try {
    const body = (await request.json()) as {
      input?: LoveJobInput;
      captchaToken?: string;
    };

    if (!body.input) {
      return json({ error: '입력값이 필요해요.' }, 400);
    }

    const captcha = await verifyTurnstileToken(body.captchaToken ?? null, ip);
    if (!captcha.success) {
      return json({ error: '캡차 검증에 실패했어요.' }, 400);
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
    logEvent('error', 'saju_request_create_failed', {
      message: error instanceof Error ? error.message : 'unknown'
    });

    return json({ error: '요청 생성 중 오류가 발생했어요. 다시 시도해 주세요.' }, 500);
  }
};
