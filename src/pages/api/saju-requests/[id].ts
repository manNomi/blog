import type { APIRoute } from 'astro';
import { getAuthorizedLoveJob, sanitizeLoveJob } from '../../../lib/saju/server/love-job-service';
import { logEvent } from '../../../lib/saju/server/monitoring';

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const GET: APIRoute = async ({ request, params }) => {
  const id = params.id?.trim();
  const token = new URL(request.url).searchParams.get('token')?.trim() ?? '';

  if (!id) {
    return json({ error: '청원 식별값이 필요하옵니다.' }, 400);
  }

  if (!token) {
    return json({ error: '살핌 열쇠가 필요하옵니다.' }, 400);
  }

  try {
    const job = await getAuthorizedLoveJob(id, token);
    if (!job) {
      return json({ error: '청원 내력을 찾지 못하였사옵니다.' }, 404);
    }

    return json({ request: sanitizeLoveJob(job) });
  } catch (error) {
    if (error instanceof Error && error.message === 'job_access_denied') {
      return json({ error: '살필 권한이 없사오니, 청원 식별값과 살핌 열쇠를 다시 살펴 주시옵소서.' }, 403);
    }

    logEvent('error', 'saju_request_get_failed', {
      requestId: id,
      message: error instanceof Error ? error.message : 'unknown'
    });

    return json({ error: '결과를 살피는 동안 허물이 생겼사옵니다.' }, 500);
  }
};
