import { execSync } from 'child_process';

// SKIP_SYNC 환경 변수가 있으면 건너뛰기
// GitHub Actions에서 동기화 후 커밋하므로, Vercel에서는 건너뛰기
if (process.env.SKIP_SYNC === 'true') {
  console.log('⏭️  Notion 동기화 건너뜀 (SKIP_SYNC=true)\n');
  process.exit(0);
}

// 환경 변수가 있을 때만 Notion 동기화 실행 (로컬 개발용)
if (process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID) {
  console.log('🔎 Notion 변경 여부 확인 후 edit 체크된 페이지만 동기화합니다...\n');
  execSync('npm run sync:notion:edited', { stdio: 'inherit' });
} else {
  console.log('⏭️  Notion 동기화 건너뜀 (환경 변수 없음)\n');
}
