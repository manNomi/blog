import { execSync } from 'child_process';

// SKIP_SYNC 환경 변수가 있으면 건너뛰기 (중복 실행 방지)
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

