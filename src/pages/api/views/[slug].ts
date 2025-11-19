import type { APIRoute } from 'astro';
import { kv } from '@vercel/kv';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Vercel KV에서 조회수 가져오기 및 증가
    const viewKey = `views:${slug}`;
    const views = await kv.incr(viewKey);

    return new Response(JSON.stringify({ views }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Failed to update views:', error);

    // KV 오류시 기본값 반환 (로컬 개발 환경 대비)
    return new Response(JSON.stringify({ views: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
