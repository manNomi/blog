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
    // Vercel KV에서 조회수 가져오기
    const key = `views:${slug}`;
    const currentViews = (await kv.get<number>(key)) || 0;
    
    // 조회수 증가
    const newViews = currentViews + 1;
    await kv.set(key, newViews);

    return new Response(JSON.stringify({ views: newViews }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error updating view count:', error);
    // 에러 발생 시에도 기본값 반환
    return new Response(JSON.stringify({ views: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
