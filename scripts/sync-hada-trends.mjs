#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FEED_URL = 'https://news.hada.io/rss/news';
const OUTPUT_PATH = path.join(ROOT_DIR, 'src/data/trends/hada-today.json');
const SCHEMA_PATH = path.join(ROOT_DIR, 'scripts/schemas/dev-trend-analysis.schema.json');
const DEFAULT_LIMIT = 30;
const DEFAULT_TIMEOUT_SEC = 240;

function parseArgs(argv) {
  const options = {
    outPath: OUTPUT_PATH,
    limit: DEFAULT_LIMIT,
    analysis: 'auto',
    timeoutSec: DEFAULT_TIMEOUT_SEC,
    model: process.env.CODEX_MODEL?.trim() || '',
    dryRun: false
  };

  for (const raw of argv) {
    if (raw.startsWith('--out=')) {
      options.outPath = path.resolve(ROOT_DIR, raw.split('=')[1] || OUTPUT_PATH);
    } else if (raw.startsWith('--limit=')) {
      const value = Number(raw.split('=')[1]);
      if (Number.isFinite(value) && value >= 5) options.limit = Math.floor(value);
    } else if (raw.startsWith('--analysis=')) {
      const value = (raw.split('=')[1] || '').trim();
      if (value === 'auto' || value === 'codex' || value === 'heuristic') {
        options.analysis = value;
      }
    } else if (raw.startsWith('--timeout=')) {
      const value = Number(raw.split('=')[1]);
      if (Number.isFinite(value) && value >= 30) options.timeoutSec = Math.floor(value);
    } else if (raw.startsWith('--model=')) {
      options.model = (raw.split('=')[1] || '').trim();
    } else if (raw === '--no-ai') {
      options.analysis = 'heuristic';
    } else if (raw === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

async function fetchFeedXml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'nomi-blog-trend-bot/1.0 (+https://news.hada.io/rss/news)'
      }
    });

    if (!response.ok) {
      throw new Error(`feed_fetch_failed:${response.status}`);
    }

    return await response.text();
  } catch (fetchError) {
    const curlResult = await new Promise((resolve) => {
      const child = spawn('curl', ['-sSL', '--fail', url], {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk ?? '');
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk ?? '');
      });

      child.on('close', (code) => {
        resolve({
          code: code ?? 1,
          stdout,
          stderr: stderr.trim()
        });
      });

      child.on('error', (error) => {
        resolve({
          code: 1,
          stdout: '',
          stderr: String(error?.message || error)
        });
      });
    });

    if (curlResult.code !== 0 || !curlResult.stdout.trim()) {
      throw new Error(`feed_fetch_failed:${String(fetchError?.message || fetchError)} / ${curlResult.stderr || 'curl_failed'}`);
    }

    return curlResult.stdout;
  }
}

function decodeXmlEntities(value) {
  const entities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' '
  };

  return String(value || '').replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, token) => {
    if (token in entities) {
      return entities[token];
    }

    if (token.startsWith('#x') || token.startsWith('#X')) {
      const parsed = Number.parseInt(token.slice(2), 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : full;
    }

    if (token.startsWith('#')) {
      const parsed = Number.parseInt(token.slice(1), 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : full;
    }

    return full;
  });
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value) {
  return normalizeWhitespace(
    decodeXmlEntities(String(value || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' '))
  );
}

function unwrapCdata(value) {
  return String(value || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function extractTag(xml, tagName) {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const matched = xml.match(pattern);
  return matched?.[1] || '';
}

function extractLink(xml) {
  const linkTags = [...xml.matchAll(/<link\b[^>]*>/gi)].map((entry) => entry[0]);

  for (const tag of linkTags) {
    const rel = (tag.match(/\brel=['"]([^'"]+)['"]/i)?.[1] || '').toLowerCase();
    const href = tag.match(/\bhref=['"]([^'"]+)['"]/i)?.[1] || '';
    if (!href) continue;
    if (rel === 'alternate') return href;
  }

  for (const tag of linkTags) {
    const href = tag.match(/\bhref=['"]([^'"]+)['"]/i)?.[1] || '';
    if (href) return href;
  }

  return '';
}

function truncate(value, maxLength) {
  const text = normalizeWhitespace(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function parseAtomEntries(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];

  return entries
    .map((entry) => {
      const titleRaw = unwrapCdata(extractTag(entry, 'title'));
      const contentRaw = unwrapCdata(extractTag(entry, 'content'));
      const authorBlock = extractTag(entry, 'author');

      const title = normalizeWhitespace(stripHtml(titleRaw));
      const summary = truncate(stripHtml(contentRaw), 220);
      const link = extractLink(entry);
      const author = normalizeWhitespace(stripHtml(extractTag(authorBlock, 'name')));
      const publishedAt = normalizeWhitespace(extractTag(entry, 'published') || extractTag(entry, 'updated'));

      return {
        title,
        url: link,
        summary,
        author: author || null,
        publishedAt: publishedAt || null
      };
    })
    .filter((item) => item.title && item.url);
}

const CATEGORY_RULES = [
  {
    name: '인공지능·에이전트',
    patterns: [/ai/i, /llm/i, /agent/i, /gpt/i, /claude/i, /gemini/i, /인공지능/, /에이전트/, /모델/, /프롬프트/]
  },
  {
    name: '클라우드·인프라',
    patterns: [/aws/i, /gcp/i, /azure/i, /kubernetes/i, /docker/i, /linux/i, /infra/i, /cloud/i, /서버/, /클라우드/]
  },
  {
    name: '보안·안전',
    patterns: [/security/i, /vulnerability/i, /zero-day/i, /cve/i, /취약점/, /보안/, /공격/, /해킹/]
  },
  {
    name: '프론트엔드·웹',
    patterns: [/react/i, /next\.?js/i, /javascript/i, /typescript/i, /web/i, /css/i, /frontend/i, /프론트/, /웹뷰/]
  },
  {
    name: '개발 도구·생산성',
    patterns: [/ide/i, /editor/i, /tool/i, /cli/i, /workflow/i, /devops/i, /자동화/, /생산성/, /도구/]
  }
];

function heuristicAnalysis(items) {
  const buckets = new Map();

  for (const item of items) {
    const text = `${item.title} ${item.summary || ''}`;
    const matched = CATEGORY_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map((rule) => rule.name);
    const labels = matched.length > 0 ? matched : ['개발 일반'];

    for (const label of labels) {
      const current = buckets.get(label) || { count: 0, examples: [] };
      current.count += 1;
      if (current.examples.length < 3) {
        current.examples.push(item.title);
      }
      buckets.set(label, current);
    }
  }

  const ordered = [...buckets.entries()].sort((a, b) => b[1].count - a[1].count);
  const top = ordered.slice(0, 4);

  const trends = top.map(([name, info]) => ({
    name,
    count: info.count,
    why: `${name} 관련 글이 ${info.count}건으로 오늘 피드에서 반복적으로 보입니다.`,
    examples: info.examples
  }));

  const trendNames = trends.map((trend) => trend.name).join(', ');
  const watchPoints = items.slice(0, 3).map((item) => `${item.title}`);
  const signals = [
    items[0] ? `가장 최근 올라온 글: ${items[0].title}` : '가장 최근 글을 확인할 수 없습니다.',
    trendNames ? `상위 갈래: ${trendNames}` : '상위 갈래를 추릴 수 없습니다.',
    `총 ${items.length}건을 묶어 오늘의 흐름을 만들었습니다.`
  ];

  return {
    headline: '오늘의 개발 판세',
    summary: trendNames
      ? `오늘 수집한 ${items.length}건을 묶어보니 ${trendNames} 갈래가 두드러집니다.`
      : `오늘 수집한 ${items.length}건을 바탕으로 갈래를 정리했습니다.`,
    trends: trends.length > 0
      ? trends
      : [
          {
            name: '개발 일반',
            count: items.length,
            why: '갈래를 강하게 묶기 어려운 날이라 전체 흐름으로 정리했습니다.',
            examples: items.slice(0, 3).map((item) => item.title)
          }
        ],
    watchPoints: watchPoints.length > 0 ? watchPoints : ['추가 수집 데이터가 필요합니다.'],
    signals
  };
}

function parseJsonOutput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('codex_output_empty');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first < 0 || last < 0 || last <= first) {
      throw new Error('codex_output_not_json');
    }
    return JSON.parse(trimmed.slice(first, last + 1));
  }
}

function assertTrendShape(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('trend_result_not_object');
  }

  if (typeof result.headline !== 'string' || !result.headline.trim()) {
    throw new Error('trend_missing_headline');
  }
  if (typeof result.summary !== 'string' || !result.summary.trim()) {
    throw new Error('trend_missing_summary');
  }
  if (!Array.isArray(result.trends) || result.trends.length === 0) {
    throw new Error('trend_missing_trends');
  }
  if (!Array.isArray(result.watchPoints) || result.watchPoints.length === 0) {
    throw new Error('trend_missing_watchPoints');
  }
  if (!Array.isArray(result.signals) || result.signals.length === 0) {
    throw new Error('trend_missing_signals');
  }
}

function buildCodexPrompt(items) {
  const compactItems = items.slice(0, 15).map((item, index) => ({
    no: index + 1,
    title: item.title,
    summary: item.summary,
    url: item.url,
    publishedAt: item.publishedAt
  }));

  return [
    '당신은 기술 뉴스 데스크 편집자입니다.',
    '아래 뉴스 목록만 근거로 "오늘의 개발 트렌드"를 분석해서 JSON만 출력하세요.',
    '과장하거나 없는 사실을 만들지 마세요.',
    'trends[].count는 반드시 실제 항목 개수에 맞게 추정하지 말고 목록 기준으로 계산하세요.',
    'examples는 입력 목록의 제목 원문을 그대로 사용하세요.',
    '',
    '입력 목록(JSON):',
    JSON.stringify(compactItems, null, 2)
  ].join('\n');
}

async function runCodexAnalysis(items, options) {
  const outPath = path.join(os.tmpdir(), `hada-trend-${Date.now()}.json`);
  const prompt = buildCodexPrompt(items);
  const args = [
    'exec',
    '--cd',
    ROOT_DIR,
    '--skip-git-repo-check',
    '--sandbox',
    'read-only',
    '--output-schema',
    SCHEMA_PATH,
    '--output-last-message',
    outPath
  ];

  if (options.model) {
    args.push('--model', options.model);
  }

  args.push(prompt);

  const execResult = await new Promise((resolve) => {
    const child = spawn('codex', args, {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    let timeoutHit = false;
    let settled = false;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      timeoutHit = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 3000).unref();
    }, options.timeoutSec * 1000);

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk ?? '');
    });

    child.stdout.on('data', () => {});

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code: code ?? 1,
        stderr: stderr.trim(),
        timeoutHit,
        durationMs: Date.now() - startedAt
      });
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code: 1,
        stderr: String(error?.message || error),
        timeoutHit,
        durationMs: Date.now() - startedAt
      });
    });
  });

  if (execResult.timeoutHit) {
    throw new Error(`codex_exec_timeout:${options.timeoutSec}s`);
  }
  if (execResult.code !== 0) {
    throw new Error(`codex_exec_failed:${execResult.stderr || 'unknown'}`);
  }

  try {
    const raw = await readFile(outPath, 'utf8');
    const parsed = parseJsonOutput(raw);
    assertTrendShape(parsed);
    return parsed;
  } finally {
    await rm(outPath, { force: true }).catch(() => {});
  }
}

function formatKst(isoDate) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(isoDate);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log(`📰 news.hada.io 피드 수집 시작 (limit=${options.limit}, analysis=${options.analysis})`);
  const xml = await fetchFeedXml(FEED_URL);
  const entries = parseAtomEntries(xml).slice(0, options.limit);

  if (entries.length === 0) {
    throw new Error('feed_entries_empty');
  }

  let analysisMode = 'heuristic';
  let analysis = heuristicAnalysis(entries);

  if (options.analysis !== 'heuristic') {
    try {
      console.log('🤖 Codex 분석 시도 중...');
      analysis = await runCodexAnalysis(entries, options);
      analysisMode = 'codex';
      console.log('✅ Codex 분석 완료');
    } catch (error) {
      if (options.analysis === 'codex') {
        throw error;
      }
      console.warn(`⚠ Codex 분석 실패, 규칙 기반 분석으로 폴백합니다. (${String(error?.message || error)})`);
    }
  }

  const now = new Date();
  const payload = {
    source: {
      name: 'GeekNews',
      siteUrl: 'https://news.hada.io',
      feedUrl: FEED_URL
    },
    generatedAt: now.toISOString(),
    generatedAtKst: formatKst(now),
    analysisMode,
    itemCount: entries.length,
    analysis,
    items: entries
  };

  if (options.dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`✨ 완료: ${options.outPath}`);
}

main().catch((error) => {
  console.error(`❌ 실패: ${String(error?.message || error)}`);
  process.exitCode = 1;
});
