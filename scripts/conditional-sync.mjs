import { execSync } from 'child_process';

// Vercel 환경에서는 항상 실행 (환경 변수 체크만)
// GitHub Actions에서는 SKIP_SYNC로 제어
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (isVercel) {
  // Vercel 환경: 환경 변수가 있으면 실행
  if (process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID) {
    console.log('🔄 Notion 동기화 실행 (Vercel)...\n');
    execSync('npm run sync:notion', { stdio: 'inherit' });
  } else {
    console.log('⏭️  Notion 동기화 건너뜀 (환경 변수 없음)\n');
  }
} else {
  // GitHub Actions 등 다른 환경: SKIP_SYNC 체크
  if (process.env.SKIP_SYNC === 'true') {
    console.log('⏭️  Notion 동기화 건너뜀 (SKIP_SYNC=true)\n');
    process.exit(0);
  }
  
  // 환경 변수가 있을 때만 Notion 동기화 실행
  if (process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID) {
    console.log('🔄 Notion 동기화 실행...\n');
    execSync('npm run sync:notion', { stdio: 'inherit' });
  } else {
    console.log('⏭️  Notion 동기화 건너뜀 (환경 변수 없음)\n');
  }
}

