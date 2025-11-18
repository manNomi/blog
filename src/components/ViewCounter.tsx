import { useState, useEffect } from 'react';

interface Props {
  slug: string;
}

export default function ViewCounter({ slug }: Props) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    const fetchViews = async () => {
      try {
        const response = await fetch(`/api/views/${slug}`);
        const data = await response.json();
        setViews(data.views);
      } catch (error) {
        console.error('Failed to fetch views:', error);
      }
    };

    fetchViews();
  }, [slug]);

  if (views === null) {
    return null;
  }

  return (
    <span className="view-counter">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>{views.toLocaleString()}</span>
    </span>
  );
}
