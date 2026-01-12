/**
 * 마크다운 콘텐츠에서 첫 번째 이미지를 추출합니다
 * ![alt](url) 형식과 <img> 태그를 모두 지원합니다
 */
export function extractFirstImage(markdown: string): string | null {
  // 방법 1: 마크다운 이미지 문법
  const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
  const match = markdown.match(markdownImageRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  // 방법 2: HTML img 태그 (대체)
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["']/;
  const htmlMatch = markdown.match(htmlImageRegex);

  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1].trim();
  }

  return null;
}
