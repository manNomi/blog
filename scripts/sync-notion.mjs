import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Notion 클라이언트 초기화
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 설정
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const CONTENT_DIR = path.join(__dirname, '../src/content/blog');
const IMAGES_DIR = path.join(__dirname, '../public/images');

// 디렉토리 생성
if (!fs.existsSync(CONTENT_DIR)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// 이미지 다운로드 함수
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(filepath);
        });
      } else {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
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
      return property.multi_select.map(item => item.name);
    case 'select':
      return property.select?.name || null;
    case 'checkbox':
      return property.checkbox || false;
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

    console.log(`📄 ${response.results.length}개의 게시물을 찾았습니다.\n`);

    for (const page of response.results) {
      const title = getPageProperty(page, 'Name') || getPageProperty(page, 'Title');
      const description = getPageProperty(page, 'Description');
      const pubDate = getPageProperty(page, 'Created') || new Date().toISOString();
      const tags = getPageProperty(page, 'Tags') || [];
      const heroImageUrl = getPageProperty(page, 'Cover');
      const pinned = getPageProperty(page, 'Pinned') || false;

      console.log(`📝 처리 중: ${title}`);

      // Markdown 변환
      const mdblocks = await n2m.pageToMarkdown(page.id);
      let mdString = n2m.toMarkdownString(mdblocks);

      // 이미지 처리
      let heroImage = '';
      if (heroImageUrl) {
        const imageExt = path.extname(new URL(heroImageUrl).pathname) || '.jpg';
        const imageName = `${sanitizeFilename(title)}-hero${imageExt}`;
        const imagePath = path.join(IMAGES_DIR, imageName);

        try {
          await downloadImage(heroImageUrl, imagePath);
          heroImage = `/images/${imageName}`;
          console.log(`  ✓ 커버 이미지 다운로드: ${imageName}`);
        } catch (error) {
          console.log(`  ⚠ 이미지 다운로드 실패: ${error.message}`);
        }
      }

      // 본문 내 이미지 URL 처리
      // Notion 이미지는 만료되지 않는 URL로 유지되거나, 다운로드하여 로컬에 저장
      const imageRegex = /!\[.*?\]\((https:\/\/.*?)\)/g;
      let imageMatch;
      let imageIndex = 0;

      while ((imageMatch = imageRegex.exec(mdString.parent)) !== null) {
        const imageUrl = imageMatch[1];
        const imageExt = path.extname(new URL(imageUrl).pathname) || '.jpg';
        const imageName = `${sanitizeFilename(title)}-${imageIndex}${imageExt}`;
        const imagePath = path.join(IMAGES_DIR, imageName);

        try {
          await downloadImage(imageUrl, imagePath);
          mdString.parent = mdString.parent.replace(imageUrl, `/images/${imageName}`);
          console.log(`  ✓ 본문 이미지 다운로드: ${imageName}`);
          imageIndex++;
        } catch (error) {
          console.log(`  ⚠ 본문 이미지 다운로드 실패: ${error.message}`);
        }
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
    process.exit(1);
  }
}

syncNotion();
