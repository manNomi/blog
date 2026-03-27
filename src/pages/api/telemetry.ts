import type { APIRoute } from 'astro';
import { logEvent } from '../../lib/saju/server/monitoring';

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as {
      event?: string;
      jobId?: string;
      detail?: Record<string, unknown>;
    };

    if (!body.event) {
      return json({ ok: false }, 400);
    }

    logEvent('info', `client_${body.event}`, {
      jobId: body.jobId,
      detail: body.detail,
      ua: request.headers.get('user-agent') ?? 'unknown'
    });

    return json({ ok: true });
  } catch {
    return json({ ok: false }, 400);
  }
};
