import type { APIRoute } from 'astro';
import { kv } from '@vercel/kv';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const likeKey = `likes:${slug}`;
    const userKey = `likes:${slug}:users`;
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

    // 좋아요 수 가져오기
    const likes = (await kv.get<number>(likeKey)) || 0;

    // 사용자가 이미 좋아요를 눌렀는지 확인
    const hasLiked = (await kv.sismember(userKey, clientIP)) === 1;

    return new Response(JSON.stringify({ likes, hasLiked }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Failed to fetch likes:', error);

    // KV 오류시 기본값 반환
    return new Response(JSON.stringify({ likes: 0, hasLiked: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const likeKey = `likes:${slug}`;
    const userKey = `likes:${slug}:users`;
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

    // 사용자가 이미 좋아요를 눌렀는지 확인
    const hasLiked = (await kv.sismember(userKey, clientIP)) === 1;

    let newLikes: number;
    let newHasLiked: boolean;

    if (hasLiked) {
      // 좋아요 취소
      await kv.srem(userKey, clientIP);
      newLikes = await kv.decr(likeKey);
      newLikes = Math.max(0, newLikes); // 음수 방지
      if (newLikes === 0) {
        await kv.del(likeKey);
      }
      newHasLiked = false;
    } else {
      // 좋아요 추가
      await kv.sadd(userKey, clientIP);
      newLikes = await kv.incr(likeKey);
      newHasLiked = true;
    }

    return new Response(JSON.stringify({ likes: newLikes, hasLiked: newHasLiked }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Failed to toggle like:', error);

    return new Response(JSON.stringify({ error: 'Failed to toggle like' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
