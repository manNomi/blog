export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const koreanCharsPerMinute = 500;

  // 한글 문자 수 계산
  const koreanChars = content.match(/[\u3131-\u314e|\u314f-\u3163|\uac00-\ud7a3]/g) || [];

  // 영어 단어 수 계산
  const englishWords = content.match(/[a-zA-Z]+/g) || [];

  const koreanTime = koreanChars.length / koreanCharsPerMinute;
  const englishTime = englishWords.length / wordsPerMinute;

  return Math.ceil(koreanTime + englishTime);
}
