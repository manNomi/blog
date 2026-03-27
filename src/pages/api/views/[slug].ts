import type { APIRoute } from 'astro';
import { kv } from '@vercel/kv';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: '글월 고리값이 필요하옵니다.' }), {
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
    console.error('조회수 고침 중 허물:', error);
    // 에러 발생 시에도 기본값 반환
    return new Response(JSON.stringify({ views: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
