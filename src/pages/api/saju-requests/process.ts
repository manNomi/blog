import type { APIRoute } from 'astro';
import { processLoveJobsBatch } from '../../../lib/saju/server/love-job-service';
import { logEvent } from '../../../lib/saju/server/monitoring';

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST: APIRoute = async ({ request }) => {
  const expected = process.env.JOB_PROCESSOR_SECRET?.trim();
  const incoming = request.headers.get('x-job-processor-secret')?.trim();

  if (expected && incoming !== expected) {
    return json({ error: 'forbidden' }, 403);
  }

  try {
    const processed = await processLoveJobsBatch(20);

    logEvent('info', 'saju_request_batch_processed', {
      processed
    });

    return json({ processed });
  } catch (error) {
    logEvent('error', 'saju_request_batch_process_failed', {
      message: error instanceof Error ? error.message : 'unknown'
    });

    return json({ error: 'batch_process_failed' }, 500);
  }
};
