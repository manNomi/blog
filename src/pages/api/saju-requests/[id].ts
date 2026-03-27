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
    return json({ error: '요청 ID가 필요해요.' }, 400);
  }

  if (!token) {
    return json({ error: '조회 키(token)가 필요해요.' }, 400);
  }

  try {
    const job = await getAuthorizedLoveJob(id, token);
    if (!job) {
      return json({ error: '요청 정보를 찾지 못했어요.' }, 404);
    }

    return json({ request: sanitizeLoveJob(job) });
  } catch (error) {
    if (error instanceof Error && error.message === 'job_access_denied') {
      return json({ error: '조회 권한이 없어요. 요청 ID/조회 키를 확인해 주세요.' }, 403);
    }

    logEvent('error', 'saju_request_get_failed', {
      requestId: id,
      message: error instanceof Error ? error.message : 'unknown'
    });

    return json({ error: '결과 조회 중 오류가 발생했어요.' }, 500);
  }
};
