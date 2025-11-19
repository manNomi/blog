import { useState, useEffect } from 'react';

interface Props {
  slug: string;
}

export default function LikeButton({ slug }: Props) {
  const [likes, setLikes] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const response = await fetch(`/api/likes/${slug}`);
        const data = await response.json();
        setLikes(data.likes);
        setHasLiked(data.hasLiked);
      } catch (error) {
        console.error('Failed to fetch likes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikes();
  }, [slug]);

  const handleLike = async () => {
    if (isAnimating) return;

    setIsAnimating(true);

    try {
      const response = await fetch(`/api/likes/${slug}`, {
        method: 'POST',
      });
      const data = await response.json();
      setLikes(data.likes);
      setHasLiked(data.hasLiked);

      // 애니메이션 종료 후 상태 리셋
      setTimeout(() => setIsAnimating(false), 600);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setIsAnimating(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <button
      className={`like-button ${hasLiked ? 'liked' : ''} ${isAnimating ? 'animating' : ''}`}
      onClick={handleLike}
      aria-label={hasLiked ? '좋아요 취소' : '좋아요'}
      disabled={isAnimating}
    >
      <svg
        className="like-icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={hasLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="like-count">{likes}</span>
    </button>
  );
}
