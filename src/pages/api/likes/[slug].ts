import type { APIRoute } from 'astro';

export const prerender = false;

// 간단한 인메모리 저장소 (실제로는 Redis나 DB 사용 권장)
const likeCounts = new Map<string, number>();
const userLikes = new Map<string, Set<string>>(); // slug -> Set of user IPs/IDs

export const GET: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const likes = likeCounts.get(slug) || 0;

  // 사용자가 이미 좋아요를 눌렀는지 확인 (IP 기반)
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  const hasLiked = userLikes.get(slug)?.has(clientIP) || false;

  return new Response(JSON.stringify({ likes, hasLiked }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

  // 사용자별 좋아요 저장소 초기화
  if (!userLikes.has(slug)) {
    userLikes.set(slug, new Set());
  }

  const slugLikes = userLikes.get(slug)!;
  const currentLikes = likeCounts.get(slug) || 0;

  // 이미 좋아요를 눌렀다면 취소, 아니면 추가
  let newLikes: number;
  let hasLiked: boolean;

  if (slugLikes.has(clientIP)) {
    // 좋아요 취소
    slugLikes.delete(clientIP);
    newLikes = Math.max(0, currentLikes - 1);
    hasLiked = false;
  } else {
    // 좋아요 추가
    slugLikes.add(clientIP);
    newLikes = currentLikes + 1;
    hasLiked = true;
  }

  likeCounts.set(slug, newLikes);

  return new Response(JSON.stringify({ likes: newLikes, hasLiked }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
