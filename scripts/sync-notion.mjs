import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 검증
if (!process.env.NOTION_TOKEN) {
  console.error('❌ 오류: NOTION_TOKEN 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Notion 클라이언트 초기화
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 커스텀 변환기 설정 - URL 멘션/북마크 블록 지원
n2m.setCustomTransformer('bookmark', async (block) => {
  const url = block.bookmark?.url || '';
  const caption = block.bookmark?.caption?.[0]?.plain_text || url;
  return `[${caption}](${url})`;
});

n2m.setCustomTransformer('link_preview', async (block) => {
  const url = block.link_preview?.url || '';
  return `[${url}](${url})`;
});

n2m.setCustomTransformer('embed', async (block) => {
  const url = block.embed?.url || '';
  const caption = block.embed?.caption?.[0]?.plain_text || url;
  return `[${caption}](${url})`;
});

// 설정
let DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!DATABASE_ID) {
  console.error('❌ 오류: NOTION_DATABASE_ID 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// DATABASE_ID가 URL 형식인 경우 UUID만 추출
// Notion URL 형식: https://www.notion.so/workspace/DATABASE_ID 또는 https://www.notion.so/DATABASE_ID
if (DATABASE_ID.includes('notion.so') || DATABASE_ID.includes('http')) {
  try {
    const url = new URL(DATABASE_ID);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // 마지막 부분이 database ID
    const lastPart = pathParts[pathParts.length - 1];
    
    // 하이픈 없는 32자리 UUID인 경우 하이픈 추가
    if (lastPart && lastPart.length === 32 && !lastPart.includes('-')) {
      DATABASE_ID = `${lastPart.slice(0, 8)}-${lastPart.slice(8, 12)}-${lastPart.slice(12, 16)}-${lastPart.slice(16, 20)}-${lastPart.slice(20, 32)}`;
    } else if (lastPart && lastPart.length === 36) {
      // 이미 하이픈이 있는 UUID 형식
      DATABASE_ID = lastPart;
    } else {
      DATABASE_ID = lastPart;
    }
  } catch (e) {
    // URL 파싱 실패 시 UUID 패턴으로 추출 시도
    const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = DATABASE_ID.match(uuidRegex);
    if (match) {
      DATABASE_ID = match[1];
    }
  }
}

const CONTENT_DIR = path.join(__dirname, '../src/content/blog');
const IMAGES_DIR = path.join(__dirname, '../public/images');

// 디렉토리 생성
if (!fs.existsSync(CONTENT_DIR)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// 이미지 다운로드 함수 (재시도 로직 포함)
async function downloadImage(url, filepath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        https.get(url, (response) => {
          // 리다이렉트 처리
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              downloadImage(redirectUrl, filepath, retries - 1).then(resolve).catch(reject);
              return;
            }
          }

          if (response.statusCode === 200) {
            const fileStream = fs.createWriteStream(filepath);
            response.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              resolve(filepath);
            });
            fileStream.on('error', reject);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }).on('error', reject);
      });
      return filepath; // 성공 시 반환
    } catch (error) {
      if (i === retries - 1) {
        throw error; // 마지막 재시도 실패 시 에러 던지기
      }
      // 재시도 전 대기 (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

// 파일명 안전하게 변환
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Notion 페이지 속성 추출
function getPageProperty(page, propertyName) {
  const property = page.properties[propertyName];
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return property.title[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text[0]?.plain_text || '';
    case 'date':
      return property.date?.start || null;
    case 'multi_select':
      // multi_select가 배열인지 확인하고 안전하게 처리
      if (Array.isArray(property.multi_select)) {
        return property.multi_select.map(item => item.name);
      }
      return [];
    case 'select':
      return property.select?.name || null;
    case 'checkbox':
      // checkbox는 boolean 값이므로 명시적으로 처리
      return property.checkbox === true;
    case 'files':
      return property.files[0]?.file?.url || property.files[0]?.external?.url || null;
    default:
      return null;
  }
}

// 메인 동기화 함수
async function syncNotion() {
  try {
    console.log('🚀 Notion 동기화 시작...\n');
    console.log(`📋 Database ID: ${DATABASE_ID.substring(0, 8)}...\n`);

    // 먼저 필터 없이 모든 항목 조회 (디버깅용)
    const allResponse = await notion.databases.query({
      database_id: DATABASE_ID,
    });
    
    console.log(`📊 전체 항목 수: ${allResponse.results.length}개\n`);
    
    // Status 속성 확인
    if (allResponse.results.length > 0) {
      const firstPage = allResponse.results[0];
      const statusProp = firstPage.properties.Status || firstPage.properties.status;
      if (statusProp) {
        console.log(`📋 Status 속성 타입: ${statusProp.type}`);
        if (statusProp.type === 'select' && statusProp.select) {
          console.log(`📋 현재 Status 값: "${statusProp.select.name}"`);
        }
        // 데이터베이스의 모든 Status 옵션 확인
        const dbInfo = await notion.databases.retrieve({ database_id: DATABASE_ID });
        const statusProperty = dbInfo.properties.Status || dbInfo.properties.status;
        if (statusProperty && statusProperty.type === 'select') {
          console.log(`📋 사용 가능한 Status 옵션: ${statusProperty.select.options.map(o => o.name).join(', ')}\n`);
        }
      }
    }

    // Notion 데이터베이스에서 페이지 가져오기
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Status',
        select: {
          equals: 'Published'
        }
      },
      sorts: [
        {
          property: 'Created',
          direction: 'descending'
        }
      ]
    });

    console.log(`📄 Published 상태 게시물: ${response.results.length}개\n`);

    for (const page of response.results) {
      const title = getPageProperty(page, 'Name') || getPageProperty(page, 'Title');
      const description = getPageProperty(page, 'Description');
      const pubDate = getPageProperty(page, 'Created') || new Date().toISOString();
      // Tags 속성 안전하게 처리
      let tags = getPageProperty(page, 'Tags');
      if (!Array.isArray(tags)) {
        tags = [];
      }
      const heroImageUrl = getPageProperty(page, 'Cover');
      // Pinned 속성 안전하게 처리 (checkbox 타입)
      const pinned = getPageProperty(page, 'Pinned') === true;

      console.log(`📝 처리 중: ${title}`);

      // Markdown 변환
      const mdblocks = await n2m.pageToMarkdown(page.id);
      let mdString = n2m.toMarkdownString(mdblocks);

      // 이미지 처리
      let heroImage = '';
      if (heroImageUrl) {
        try {
          const parsedUrl = new URL(heroImageUrl);
          // 파일 확장자 추출 (쿼리 파라미터 제거)
          let imageExt = path.extname(parsedUrl.pathname).split('?')[0];
          // 확장자가 없거나 너무 긴 경우 기본값 사용
          if (!imageExt || imageExt.length > 5) {
            imageExt = '.jpg';
          }
          const imageName = `${sanitizeFilename(title)}-hero${imageExt}`;
          const imagePath = path.join(IMAGES_DIR, imageName);

          await downloadImage(heroImageUrl, imagePath);
          heroImage = `/images/${imageName}`;
          console.log(`  ✓ 커버 이미지 다운로드: ${imageName}`);
        } catch (error) {
          console.log(`  ⚠ 커버 이미지 다운로드 실패: ${error.message}`);
        }
      }

      // 본문 내 이미지 URL 처리
      // Notion 이미지는 만료되는 signed URL이므로 로컬에 다운로드
      // 더 견고한 정규식: http/https 모두 지원, 괄호 안의 전체 URL 캡처
      const imageRegex = /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;
      let imageMatch;
      let imageIndex = 0;
      const replacements = [];

      // 먼저 모든 이미지를 찾아서 다운로드
      while ((imageMatch = imageRegex.exec(mdString.parent)) !== null) {
        const altText = imageMatch[1];
        const imageUrl = imageMatch[2];

        try {
          const parsedUrl = new URL(imageUrl);
          // 파일 확장자 추출 (쿼리 파라미터 제거)
          let imageExt = path.extname(parsedUrl.pathname).split('?')[0];
          // 확장자가 없거나 너무 긴 경우 기본값 사용
          if (!imageExt || imageExt.length > 5) {
            // Content-Type에서 추출 시도하거나 기본값 사용
            imageExt = '.jpg';
          }
          const imageName = `${sanitizeFilename(title)}-${imageIndex}${imageExt}`;
          const imagePath = path.join(IMAGES_DIR, imageName);

          await downloadImage(imageUrl, imagePath);
          replacements.push({
            original: `![${altText}](${imageUrl})`,
            replacement: `![${altText}](/images/${imageName})`
          });
          console.log(`  ✓ 본문 이미지 다운로드: ${imageName}`);
          imageIndex++;
        } catch (error) {
          console.log(`  ⚠ 본문 이미지 다운로드 실패 (${imageUrl}): ${error.message}`);
        }
      }

      // 모든 이미지 URL을 로컬 경로로 변경
      for (const { original, replacement } of replacements) {
        mdString.parent = mdString.parent.replace(original, replacement);
      }

      // HTML <img> 태그 처리 (Notion에서 복사-붙여넣기 등으로 생성된 경우)
      const htmlImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi;
      let htmlImageMatch;
      const htmlReplacements = [];

      while ((htmlImageMatch = htmlImageRegex.exec(mdString.parent)) !== null) {
        const imageUrl = htmlImageMatch[1];
        const altText = decodeURIComponent(htmlImageMatch[2] || '');

        try {
          const parsedUrl = new URL(imageUrl);
          let imageExt = path.extname(parsedUrl.pathname).split('?')[0];
          if (!imageExt || imageExt.length > 5) {
            imageExt = '.jpg';
          }
          const imageName = `${sanitizeFilename(title)}-${imageIndex}${imageExt}`;
          const imagePath = path.join(IMAGES_DIR, imageName);

          await downloadImage(imageUrl, imagePath);
          htmlReplacements.push({
            original: htmlImageMatch[0],
            replacement: `![${altText}](/images/${imageName})`
          });
          console.log(`  ✓ HTML 이미지 다운로드: ${imageName}`);
          imageIndex++;
        } catch (error) {
          console.log(`  ⚠ HTML 이미지 다운로드 실패 (${imageUrl}): ${error.message}`);
        }
      }

      // HTML 이미지를 마크다운으로 변환
      for (const { original, replacement } of htmlReplacements) {
        mdString.parent = mdString.parent.replace(original, replacement);
      }

      // Frontmatter 생성
      const frontmatter = [
        '---',
        `title: "${title.replace(/"/g, '\\"')}"`,
        description ? `description: "${description.replace(/"/g, '\\"')}"` : '',
        `pubDate: ${new Date(pubDate).toISOString()}`,
        heroImage ? `heroImage: "${heroImage}"` : '',
        tags.length > 0 ? `tags: [${tags.map(t => `"${t}"`).join(', ')}]` : '',
        pinned ? `pinned: true` : '',
        `notionId: "${page.id}"`,
        '---',
        ''
      ].filter(Boolean).join('\n');

      // 파일 저장
      const filename = `${sanitizeFilename(title)}.md`;
      const filepath = path.join(CONTENT_DIR, filename);

      fs.writeFileSync(filepath, frontmatter + mdString.parent);
      console.log(`  ✓ 저장 완료: ${filename}\n`);
    }

    console.log('✨ 동기화 완료!\n');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    
    // 더 자세한 에러 정보 출력
    if (error.code === 'invalid_request_url') {
      console.error('\n💡 해결 방법:');
      console.error('   - NOTION_DATABASE_ID가 올바른 UUID 형식인지 확인하세요.');
      console.error('   - URL 형식인 경우, 스크립트가 자동으로 UUID를 추출합니다.');
      console.error(`   - 현재 DATABASE_ID: ${DATABASE_ID}`);
    } else if (error.status === 401) {
      console.error('\n💡 해결 방법:');
      console.error('   - NOTION_TOKEN이 유효한지 확인하세요.');
      console.error('   - Notion Integration이 데이터베이스에 연결되어 있는지 확인하세요.');
    } else if (error.status === 404) {
      console.error('\n💡 해결 방법:');
      console.error('   - NOTION_DATABASE_ID가 올바른지 확인하세요.');
      console.error('   - 데이터베이스가 존재하는지 확인하세요.');
    }
    
    process.exit(1);
  }
}

syncNotion();
