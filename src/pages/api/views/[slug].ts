import type { APIRoute } from 'astro';

export const prerender = false;

// 간단한 인메모리 저장소 (실제로는 Redis나 DB 사용 권장)
const viewCounts = new Map<string, number>();

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 조회수 증가
  const currentViews = viewCounts.get(slug) || 0;
  const newViews = currentViews + 1;
  viewCounts.set(slug, newViews);

  return new Response(JSON.stringify({ views: newViews }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
