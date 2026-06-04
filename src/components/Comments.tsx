import { useEffect, useRef } from 'react';

const resolveGiscusTheme = () => (document.documentElement.classList.contains('dark') ? 'dark_dimmed' : 'light');

export default function Comments() {
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commentsRef.current) return;

    // 기존 스크립트가 있으면 제거
    const existingScript = commentsRef.current.querySelector('script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'manNomi/blog');
    // TODO: Giscus 설정 화면에서 생성한 실제 값으로 교체하세요.
    script.setAttribute('data-repo-id', 'YOUR_REPO_ID'); // Giscus 설정에서 확인 필요
    script.setAttribute('data-category', 'Comments');
    script.setAttribute('data-category-id', 'YOUR_CATEGORY_ID'); // Giscus 설정에서 확인 필요
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', resolveGiscusTheme());
    script.setAttribute('data-lang', 'ko');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    commentsRef.current.appendChild(script);

    const syncGiscusTheme = (event?: Event) => {
      const nextTheme =
        event instanceof CustomEvent && event.detail?.theme
          ? event.detail.theme
          : document.documentElement.classList.contains('dark')
            ? 'dark'
            : 'light';
      const iframe = commentsRef.current?.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
      iframe?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: nextTheme === 'dark' ? 'dark_dimmed' : 'light' } } },
        'https://giscus.app'
      );
    };

    window.addEventListener('themechange', syncGiscusTheme);

    return () => {
      window.removeEventListener('themechange', syncGiscusTheme);
    };
  }, []);

  return <div ref={commentsRef} className="comments" />;
}
