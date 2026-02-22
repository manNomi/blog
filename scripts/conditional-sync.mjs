import { execSync } from 'child_process';

// SKIP_SYNC 환경 변수가 있으면 건너뛰기
// GitHub Actions에서 동기화 후 커밋하므로, Vercel에서는 건너뛰기
if (process.env.SKIP_SYNC === 'true') {
  console.log('⏭️  Notion 동기화 건너뜀 (SKIP_SYNC=true)\n');
  process.exit(0);
}

// 환경 변수가 있을 때만 Notion 동기화 실행 (로컬 개발용)
if (process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID) {
  console.log('🔎 Notion 변경 여부 확인...\n');

  let checkExitCode = 0;

  try {
    execSync('npm run sync:check', { stdio: 'inherit' });
  } catch (error) {
    checkExitCode = typeof error.status === 'number' ? error.status : 1;

    // sync:check에서 1(변경 있음), 2(초기 매니페스트 없음)는 정상 분기
    if (checkExitCode !== 1 && checkExitCode !== 2) {
      throw error;
    }
  }

  if (checkExitCode === 0) {
    console.log('⏭️  변경 사항 없음 - Notion 동기화 생략\n');
    process.exit(0);
  }

  if (checkExitCode === 2) {
    console.log('🔄 초기 매니페스트 생성이 필요하여 Notion 동기화 실행...\n');
  } else {
    console.log('🔄 변경 사항이 감지되어 Notion 동기화 실행...\n');
  }

  execSync('npm run sync:notion', { stdio: 'inherit' });
} else {
  console.log('⏭️  Notion 동기화 건너뜀 (환경 변수 없음)\n');
}
