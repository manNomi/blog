import { useEffect, useRef } from 'react';

export default function Comments() {
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commentsRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'manNomi/blog');
    script.setAttribute('data-repo-id', 'R_kgDONYour_Repo_ID'); // TODO: https://giscus.app에서 설정 후 업데이트
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDONYour_Category_ID'); // TODO: https://giscus.app에서 설정 후 업데이트
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'ko');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    commentsRef.current.appendChild(script);
  }, []);

  return <div ref={commentsRef} className="comments" />;
}
