import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { LoveConcernAnswer, LoveJobInput, LoveJobResult, LoveScoreRationales } from '../love-job-types';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_TIMEOUT_MS = 20_000;
const DEFAULT_CODEX_TIMEOUT_MS = 180_000;
const GENERATED_TEXT_SCHEMA_PATH = path.join(process.cwd(), 'schemas/love-report-generated-text.schema.json');
const MIN_MAIN_TEXT_LENGTH = 120;
const MIN_SCORE_RATIONALE_LENGTH = 120;
const MIN_SECTION_BODY_LENGTH = 240;
const MIN_YEAR_FOCUS_LENGTH = 90;
const FORBIDDEN_TONE_PATTERNS = [
  /글월/,
  /사옵니다/,
  /도착했사옵니다/,
  /무조건\s*(헤어|만나|결혼|성공|실패)/,
  /반드시\s*(헤어|만나|결혼|성공|실패)/,
  /파국/,
  /재앙/,
  /망합니다/,
  /좋은 흐름입니다[.。]?$/,
  /안정적으로 흐릅니다[.。]?$/,
];
const FORBIDDEN_INTERNAL_PATTERNS = [
  /\b(?:0|1)\.\d+\b/,
  /\bconfidence\b/i,
  /\bpresence\b/i,
  /\bbalance\b/i,
  /\bstability\b/i,
  /\bconflictRisk\b/i,
  /\btraces\b/i,
  /\bevidenceCodes\b/i,
  /\bspouseRelations\b/i,
  /\bloveChance\b/i,
  /\bbreakupRisk\b/i,
  /\bdayMaster\b/i,
  /\belementBalance\b/i,
  /\bspousePalace\b/i,
  /\bspouseStar\b/i,
];

export const MAX_LLM_RETRIES = 3;

type ReportProvider = 'codex' | 'openai';

type PersonalizedSection = {
  title: string;
  body: string;
};

type PersonalizedYearFocus = {
  year: number;
  focus: string;
};

type PersonalizedLoveText = {
  summary: string;
  highlight: string;
  caution: string;
  timingHint: string;
  scoreRationales: LoveScoreRationales;
  concernAnswer: LoveConcernAnswer;
  detailedSections: PersonalizedSection[];
  yearlyGuidance: PersonalizedYearFocus[];
};

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiConfig = {
  apiKey: string;
  model: string;
  timeoutMs: number;
};

type PersonalizeOptions = {
  preferCodex?: boolean;
};

type ProviderResult = {
  personalized: PersonalizedLoveText;
  model: string;
  provider: ReportProvider;
  attempts: number;
};

function normalizeConcern(input: LoveJobInput) {
  const concern = input.concern?.trim();
  return concern ? concern : '미입력';
}

function normalizeBirthPlace(input: LoveJobInput) {
  const birthPlace = input.birthPlace?.trim();
  return birthPlace ? birthPlace : '대한민국';
}

function buildBirthPlaceGuide(birthPlace: string) {
  if (birthPlace === '대한민국') {
    return '생활권 리듬(이동 시간, 약속 시간)을 일정하게 맞추는 조언을 포함하세요.';
  }

  return `${birthPlace} 출생 배경을 고려해 지역 생활 리듬(이동 시간, 약속 시간)에 맞춘 조언을 포함하세요.`;
}

function yearRangeText(result: LoveJobResult) {
  const years = result.yearlyGuidance.map((row) => row.year).sort((a, b) => a - b);
  if (!years.length) return '연도별 가이드';
  return `${years[0]}~${years[years.length - 1]}년 ${years.length}개 연도`;
}

function getOpenAiConfig(): OpenAiConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();

  if (!apiKey) {
    throw new Error('openai_api_key_missing');
  }

  if (!model) {
    throw new Error('openai_model_missing');
  }

  const rawTimeout = Number(process.env.OPENAI_TIMEOUT_MS ?? DEFAULT_OPENAI_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0 ? Math.floor(rawTimeout) : DEFAULT_OPENAI_TIMEOUT_MS;

  return {
    apiKey,
    model,
    timeoutMs,
  };
}

function getCodexConfig() {
  const rawTimeout = Number(process.env.CODEX_REPORT_TIMEOUT_MS ?? DEFAULT_CODEX_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0 ? Math.floor(rawTimeout) : DEFAULT_CODEX_TIMEOUT_MS;
  const bin = process.env.CODEX_REPORT_BIN?.trim() || 'codex';
  const model = process.env.CODEX_REPORT_MODEL?.trim() || 'local-codex';

  return { bin, model, timeoutMs };
}

function normalizeModelToken(model: string) {
  return model.replace(/[^\w.-]/g, '_');
}

function buildModelVersionWithLlm(baseModelVersion: string, llmTag: string) {
  return `${baseModelVersion}+llm:${llmTag}`;
}

function buildDefaultScoreRationales(result: LoveJobResult): LoveScoreRationales {
  return {
    love: `연애 점수 ${result.loveScore}점은 인연 유입 가능성, 배우자궁 안정도, 도화·홍란·홍염처럼 관계를 움직이는 신호를 함께 반영한 값입니다. 현재 근거 신호는 ${result.evidenceCodes.length}개이며, 강한 오행 ${result.dominantElement}과 약한 오행 ${result.weakestElement}의 균형을 어떻게 맞추는지가 관계 표현에 영향을 줍니다. 점수 자체보다 이 점수가 말하는 행동 방향을 읽는 것이 중요합니다.`,
    marriage: `혼인 안정 점수 ${result.marriageScore}점은 장기 관계로 이어질 때의 안정성, 약속을 지키는 힘, 관계를 공식화할 수 있는 흐름을 함께 본 값입니다. 추천 연도와 신뢰도 ${Math.round(result.confidence * 100)}%를 함께 보면, 좋은 시기에는 만남의 양보다 관계 규칙을 구체화하는 대화가 더 중요합니다. 생활 리듬과 기대치를 맞추면 안정 점수의 장점이 현실에서 살아납니다.`,
    risk: `갈등 리스크 ${result.riskScore}점은 감정 기복, 배우자궁 충돌 가능성, 연락·속도 차이에서 생길 수 있는 오해를 반영한 값입니다. 리스크가 있다는 말은 관계가 실패한다는 뜻이 아니라, 어떤 상황에서 불필요한 소모가 커지는지 미리 보라는 의미입니다. 감정이 올라온 날에는 즉시 결론 내리기보다 대화 시간을 나눠 잡는 것이 안전합니다.`,
  };
}

function toPercent(value: number) {
  if (!Number.isFinite(value)) return '확인 불가';
  return `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`;
}

function toLevel(value: number, highLabel = '높음', middleLabel = '보통', lowLabel = '낮음') {
  if (!Number.isFinite(value)) return '확인 불가';
  if (value >= 0.7) return highLabel;
  if (value >= 0.45) return middleLabel;
  return lowLabel;
}

function toRiskLevel(value: number) {
  if (!Number.isFinite(value)) return '확인 불가';
  if (value >= 0.65) return '주의 필요';
  if (value >= 0.4) return '관리 필요';
  return '낮은 편';
}

function signalPresenceLabel(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '강하게 잡히지 않음';
  if (count >= 2) return '뚜렷하게 잡힘';
  return '약하게 잡힘';
}

function summarizeRomanceStars(result: LoveJobResult) {
  const stars = result.sajuSnapshot?.romanceStars;
  if (!stars) return '확인 가능한 보조 신호가 제한적입니다.';

  const peachCount = stars.peachInner + stars.peachOuter;
  const hongLuan = signalPresenceLabel(stars.hongLuanCount);
  const hongYan = signalPresenceLabel(stars.hongYanCount);

  if (peachCount <= 0 && stars.hongLuanCount <= 0 && stars.hongYanCount <= 0) {
    return '도화·홍란·홍염 신호는 강하게 잡히지 않습니다. 첫인상으로 강하게 밀어붙이기보다 편안함과 신뢰를 쌓는 방식이 더 잘 맞습니다.';
  }

  return `도화 신호는 ${signalPresenceLabel(peachCount)}, 홍란 신호는 ${hongLuan}, 홍염 신호는 ${hongYan}으로 읽습니다. 강한 매력 연출보다 관계 흐름에 맞춘 표현이 중요합니다.`;
}

function buildPromptContext(result: LoveJobResult) {
  const snapshot = result.sajuSnapshot;
  const topYears = result.topYears.map((row) => ({
    연도: `${row.year}년`,
    연애_기대: toPercent(row.loveChance),
    갈등_리스크: toPercent(row.breakupRisk),
  }));
  const yearlyGuidance = result.yearlyGuidance.map((row) => ({
    year: row.year,
    연애_기대: toPercent(row.loveChance),
    갈등_리스크: toPercent(row.breakupRisk),
    기존_초점: row.focus,
  }));

  return {
    고정_점수: {
      연애_점수: `${result.loveScore}점`,
      혼인_안정: `${result.marriageScore}점`,
      갈등_리스크: `${result.riskScore}점`,
      강한_오행: result.dominantElement,
      보완할_오행: result.weakestElement,
      근거_신호_수: `${result.evidenceCodes.length}개`,
    },
    만세력_요약: snapshot
      ? {
          사주팔자: `${snapshot.pillars.year} / ${snapshot.pillars.month} / ${snapshot.pillars.day} / ${snapshot.pillars.hour}`,
          일간_강약: `${toLevel(snapshot.dayMaster.strength, '강한 편', '보통', '낮은 편')} (${toPercent(snapshot.dayMaster.strength)})`,
          오행_균형: `${toLevel(snapshot.elementProfile.balanceScore, '고른 편', '보완 필요', '많이 치우친 편')}`,
          오행_설명: `${snapshot.elementProfile.dominant} 기운이 강하고 ${snapshot.elementProfile.weakest} 기운 보완이 필요합니다.`,
          배우자궁: {
            안정도: `${toLevel(snapshot.spousePalace.stability, '안정적인 편', '보통', '약한 편')} (${toPercent(snapshot.spousePalace.stability)})`,
            충돌_가능성: `${toRiskLevel(snapshot.spousePalace.conflictRisk)} (${toPercent(snapshot.spousePalace.conflictRisk)})`,
            관계_신호: snapshot.spousePalace.relations.length > 0 ? snapshot.spousePalace.relations.join(', ') : '큰 합충 신호 없음',
          },
          배우자별: {
            활성도: `${toLevel(snapshot.spouseStar.presence, '높은 편', '중간 이상', '낮은 편')} (${toPercent(snapshot.spouseStar.presence)})`,
            균형: `${toLevel(snapshot.spouseStar.balance, '안정적인 편', '보통', '보완 필요')} (${toPercent(snapshot.spouseStar.balance)})`,
            혼잡도: `${toRiskLevel(snapshot.spouseStar.conflictRisk)} (${toPercent(snapshot.spouseStar.conflictRisk)})`,
          },
          도화_홍란_홍염: summarizeRomanceStars(result),
        }
      : '만세력 세부 요약 없음',
    추천_연도: topYears,
    연도별_가이드: yearlyGuidance,
    기본_문장: {
      요약: result.summary,
      좋은_흐름: result.highlight,
      주의_포인트: result.caution,
      타이밍_힌트: result.timingHint,
      상세_섹션: result.detailedSections.map((section) => ({
        title: section.title,
        기존_본문: section.body,
      })),
    },
  };
}

function baselineForPrompt(result: LoveJobResult) {
  return buildPromptContext({
    ...result,
    scoreRationales: result.scoreRationales ?? buildDefaultScoreRationales(result),
  });
}

function buildPersonalizerPrompt(input: LoveJobInput, baselineResult: LoveJobResult) {
  const birthPlace = normalizeBirthPlace(input);
  const concern = normalizeConcern(input);
  const hasConcern = concern !== '미입력';
  const guidanceRange = yearRangeText(baselineResult);

  return [
    '아래 엔진 산출값과 만세력 요약을 바탕으로 이메일로 보낼 사주 연애 리포트 문장을 새로 작성하세요.',
    '반드시 JSON으로만 응답하세요. 마크다운, 설명문, 코드블록은 금지합니다.',
    '',
    '[출력해야 하는 키]',
    '- summary',
    '- highlight',
    '- caution',
    '- timingHint',
    '- scoreRationales: { love, marriage, risk }',
    '- concernAnswer: { concern, answer, actionItems }',
    '- detailedSections[{title, body}]',
    `- yearlyGuidance[{year, focus}] (${guidanceRange} 전체)`,
    '',
    '[절대 규칙: 엔진 값 보존]',
    '- 출력 JSON 키는 영어로 유지하되, 각 값에 들어가는 문장은 반드시 한국어 자연문으로 작성한다',
    '- 연애 점수, 혼인 안정, 갈등 리스크, 연도는 절대 변경하거나 새로 만들지 말 것',
    '- LLM은 텍스트만 작성한다. 점수/확률/연도는 입력에 있는 한국어 요약값만 언급한다',
    '- detailedSections는 기본_문장.상세_섹션의 title을 그대로 유지하고 body만 다시 작성한다',
    `- yearlyGuidance는 연도별_가이드의 year를 그대로 유지하고 ${guidanceRange}를 하나도 빠뜨리지 않는다`,
    '- confidence, presence, balance, stability, conflictRisk, traces, evidenceCodes, spouseRelations, loveChance, breakupRisk 같은 내부 키 이름을 문장에 쓰지 말 것',
    '- 0.688095238 같은 소수 원자료를 절대 쓰지 말 것. 필요한 경우 69%, 보통, 중간 이상, 낮은 편처럼 사용자용 표현만 쓸 것',
    '',
    '[문체 규칙]',
    '- 상담사가 직접 설명하는 듯한 자연스러운 존댓말로 쓴다',
    '- 사람이 바로 이해할 수 있게 쉬운 한국어를 우선한다',
    '- 사주 용어를 쓰면 바로 괄호나 다음 문장으로 쉬운 뜻을 풀어준다',
    '- 고어체, 무속 광고체, 과장된 예언체 금지: 글월, 사옵니다, 반드시 성공, 무조건 결혼 같은 표현을 쓰지 않는다',
    '- 단정적 예언, 공포 조장, 빈약한 추상 문장, 같은 말 반복을 금지한다',
    '',
    '[품질 규칙]',
    '- summary는 4~6문장으로 작성하고 전체 결론, 점수 의미, 고민/관계 상태, 실행 방향을 모두 담는다',
    '- scoreRationales love/marriage/risk는 각각 3문장 이상으로 쓰고 해당 점수의 근거를 반드시 설명한다',
    '- detailedSections 각 body는 5~7문장으로 작성하고 반드시 "사주 근거 → 관계 해석 → 현실적인 행동 제안" 흐름을 따른다',
    '- yearlyGuidance.focus는 각 연도별로 2~3문장 작성하고 무엇을 시도할지와 무엇을 조심할지 모두 포함한다',
    `- yearlyGuidance는 반드시 ${guidanceRange} 전체를 연도 오름차순으로 작성한다`,
    '- highlight/caution/timingHint는 각각 3~4문장으로 작성한다',
    '- 배우자궁, 배우자별, 도화, 홍란, 홍염, 일간 강약, 오행 균형 중 실제 입력에 있는 근거를 활용한다',
    '- birthPlace 맥락 조언을 최소 1회 포함한다',
    hasConcern
      ? '- concern이 입력되어 있으므로 summary, caution, timingHint, concernAnswer, 상세 섹션, 연도별 가이드가 이 고민과 연결되어야 한다'
      : '- concern이 없으므로 concernAnswer는 concern="", answer="", actionItems=[]로 둔다. 고민을 지어내지 않는다',
    '',
    `[relationshipStatus]: ${input.relationshipStatus}`,
    `[birthPlace]: ${birthPlace}`,
    `[concern]: ${concern}`,
    '[출생지 맞춤 가이드]',
    buildBirthPlaceGuide(birthPlace),
    '',
    '[사용자용으로 정리한 엔진 산출값 및 만세력 요약(JSON)]',
    JSON.stringify(baselineForPrompt(baselineResult), null, 2),
  ].join('\n');
}

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sentenceCount(value: string) {
  return compactText(value)
    .split(/[.!?。！？]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8).length;
}

function assertMinimumTextQuality(value: string, minLength: number, minSentences: number, code: string) {
  const compact = compactText(value);
  if (compact.length < minLength) {
    throw new Error(code);
  }
  if (sentenceCount(compact) < minSentences) {
    throw new Error(`${code}_sentences`);
  }
}

function assertNoForbiddenTone(value: string) {
  const compact = compactText(value);
  for (const pattern of FORBIDDEN_TONE_PATTERNS) {
    if (pattern.test(compact)) {
      throw new Error('llm_forbidden_tone');
    }
  }
}

function assertNoInternalLeak(value: string) {
  const compact = compactText(value);
  for (const pattern of FORBIDDEN_INTERNAL_PATTERNS) {
    if (pattern.test(compact)) {
      throw new Error('llm_internal_metric_leak');
    }
  }
}

function assertNoRepeatedSentences(value: string) {
  const sentences = compactText(value)
    .split(/[.!?。！？]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 18);
  const seen = new Set<string>();

  for (const sentence of sentences) {
    if (seen.has(sentence)) {
      throw new Error('llm_repeated_sentence');
    }
    seen.add(sentence);
  }
}

function assertConcernReflected(input: LoveJobInput, personalized: PersonalizedLoveText) {
  const concern = input.concern?.trim();
  if (!concern) return;

  const keywords = concern
    .split(/[^\p{L}\p{N}]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !['고민', '해결', '방법', '있을까요'].includes(part))
    .slice(0, 6);
  const target = [
    personalized.concernAnswer.concern,
    personalized.summary,
    personalized.caution,
    personalized.timingHint,
    personalized.concernAnswer.answer,
    ...personalized.concernAnswer.actionItems,
    ...personalized.detailedSections.map((section) => section.body),
    ...personalized.yearlyGuidance.map((row) => row.focus),
  ].join(' ');

  if (personalized.concernAnswer.concern.trim() !== concern) {
    throw new Error('llm_concern_answer_mismatch');
  }
  assertMinimumTextQuality(personalized.concernAnswer.answer, 120, 3, 'llm_concern_answer_too_short');
  if (personalized.concernAnswer.actionItems.length < 3) {
    throw new Error('llm_concern_action_items_missing');
  }
  if (keywords.length > 0 && !keywords.some((keyword) => target.includes(keyword))) {
    throw new Error('llm_concern_context_missing');
  }
}

function assertYearlyGuidanceCoverage(personalized: PersonalizedLoveText, expectedYears: number[], errorPrefix: string) {
  const expected = [...expectedYears].sort((a, b) => a - b);
  const actual = personalized.yearlyGuidance.map((row) => row.year).sort((a, b) => a - b);

  if (actual.length !== expected.length) {
    throw new Error(`${errorPrefix}_yearly_guidance_incomplete`);
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new Error(`${errorPrefix}_yearly_guidance_incomplete`);
    }
  }
}

function assertOutputQuality(input: LoveJobInput, personalized: PersonalizedLoveText) {
  const texts = [
    personalized.summary,
    personalized.highlight,
    personalized.caution,
    personalized.timingHint,
    personalized.scoreRationales.love,
    personalized.scoreRationales.marriage,
    personalized.scoreRationales.risk,
    personalized.concernAnswer.answer,
    ...personalized.concernAnswer.actionItems,
    ...personalized.detailedSections.map((section) => section.body),
    ...personalized.yearlyGuidance.map((row) => row.focus),
  ].filter(Boolean);

  for (const text of texts) {
    assertNoForbiddenTone(text);
    assertNoInternalLeak(text);
    assertNoRepeatedSentences(text);
  }

  assertMinimumTextQuality(personalized.summary, MIN_MAIN_TEXT_LENGTH, 4, 'llm_summary_too_short');
  assertMinimumTextQuality(personalized.highlight, 90, 3, 'llm_highlight_too_short');
  assertMinimumTextQuality(personalized.caution, 90, 3, 'llm_caution_too_short');
  assertMinimumTextQuality(personalized.timingHint, 90, 3, 'llm_timing_hint_too_short');
  assertMinimumTextQuality(personalized.scoreRationales.love, MIN_SCORE_RATIONALE_LENGTH, 3, 'llm_love_rationale_too_short');
  assertMinimumTextQuality(personalized.scoreRationales.marriage, MIN_SCORE_RATIONALE_LENGTH, 3, 'llm_marriage_rationale_too_short');
  assertMinimumTextQuality(personalized.scoreRationales.risk, MIN_SCORE_RATIONALE_LENGTH, 3, 'llm_risk_rationale_too_short');

  for (const section of personalized.detailedSections) {
    assertMinimumTextQuality(section.body, MIN_SECTION_BODY_LENGTH, 5, 'llm_section_too_short');
  }

  for (const row of personalized.yearlyGuidance) {
    assertMinimumTextQuality(row.focus, MIN_YEAR_FOCUS_LENGTH, 2, 'llm_year_focus_too_short');
  }

  assertConcernReflected(input, personalized);
}

function extractOutputText(payload: OpenAiResponsePayload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if ((content.type === 'output_text' || content.type === 'text') && typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return null;
}

function parseJsonOutput(rawText: string, errorPrefix: string) {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error(`${errorPrefix}_empty_output`);
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first < 0 || last < 0 || last <= first) {
      throw new Error(`${errorPrefix}_invalid_json`);
    }
    return JSON.parse(trimmed.slice(first, last + 1)) as unknown;
  }
}

function parseScoreRationales(value: Record<string, unknown>): LoveScoreRationales {
  const raw = value.scoreRationales as Record<string, unknown> | undefined;
  const love = typeof raw?.love === 'string' ? raw.love.trim() : '';
  const marriage = typeof raw?.marriage === 'string' ? raw.marriage.trim() : '';
  const risk = typeof raw?.risk === 'string' ? raw.risk.trim() : '';

  if (!love || !marriage || !risk) {
    throw new Error('llm_score_rationales_invalid');
  }

  return { love, marriage, risk };
}

function parseConcernAnswer(value: Record<string, unknown>): LoveConcernAnswer {
  const raw = value.concernAnswer as Record<string, unknown> | undefined;
  const concern = typeof raw?.concern === 'string' ? raw.concern.trim() : '';
  const answer = typeof raw?.answer === 'string' ? raw.answer.trim() : '';
  const actionItems = Array.isArray(raw?.actionItems)
    ? raw.actionItems.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];

  return { concern, answer, actionItems };
}

function parsePersonalizedOutput(rawText: string, input: LoveJobInput, errorPrefix: string, expectedYears: number[]): PersonalizedLoveText {
  const parsed = parseJsonOutput(rawText, errorPrefix);
  const value = parsed as Record<string, unknown>;
  const summary = typeof value.summary === 'string' ? value.summary.trim() : '';
  const highlight = typeof value.highlight === 'string' ? value.highlight.trim() : '';
  const caution = typeof value.caution === 'string' ? value.caution.trim() : '';
  const timingHint = typeof value.timingHint === 'string' ? value.timingHint.trim() : '';

  const detailedSections = Array.isArray(value.detailedSections)
    ? value.detailedSections
        .map((row) => {
          const item = row as Record<string, unknown>;
          const title = typeof item.title === 'string' ? item.title.trim() : '';
          const body = typeof item.body === 'string' ? item.body.trim() : '';

          return title && body ? { title, body } : null;
        })
        .filter((row): row is PersonalizedSection => Boolean(row))
    : [];

  const yearlyGuidance = Array.isArray(value.yearlyGuidance)
    ? value.yearlyGuidance
        .map((row) => {
          const item = row as Record<string, unknown>;
          const year = Number(item.year);
          const focus = typeof item.focus === 'string' ? item.focus.trim() : '';

          return Number.isFinite(year) && focus ? { year: Math.trunc(year), focus } : null;
        })
        .filter((row): row is PersonalizedYearFocus => Boolean(row))
    : [];

  if (!summary || !highlight || !caution || !timingHint || detailedSections.length === 0 || yearlyGuidance.length === 0) {
    throw new Error(`${errorPrefix}_schema_invalid`);
  }

  const personalized = {
    summary,
    highlight,
    caution,
    timingHint,
    scoreRationales: parseScoreRationales(value),
    concernAnswer: parseConcernAnswer(value),
    detailedSections,
    yearlyGuidance,
  };

  assertYearlyGuidanceCoverage(personalized, expectedYears, errorPrefix);
  assertOutputQuality(input, personalized);

  return personalized;
}

function mergePersonalizedText(
  result: LoveJobResult,
  personalized: PersonalizedLoveText,
  provider: ReportProvider,
  llmModel: string,
  attempts: number,
): LoveJobResult {
  const sectionBodyByTitle = new Map(personalized.detailedSections.map((section) => [section.title.trim(), section.body]));
  const yearFocusByYear = new Map(personalized.yearlyGuidance.map((row) => [row.year, row.focus]));

  const mergedSections = result.detailedSections.map((section) => ({
    ...section,
    body: sectionBodyByTitle.get(section.title.trim()) ?? section.body,
  }));

  const mergedYearly = result.yearlyGuidance
    .map((row) => ({
      ...row,
      focus: yearFocusByYear.get(row.year) ?? row.focus,
    }))
    .sort((a, b) => a.year - b.year);

  const detailedReport = mergedSections.map((section) => `${section.title}\n${section.body}`).join('\n\n');
  const concernAnswer = personalized.concernAnswer.answer ? personalized.concernAnswer : undefined;

  return {
    ...result,
    summary: personalized.summary,
    highlight: personalized.highlight,
    caution: personalized.caution,
    timingHint: personalized.timingHint,
    scoreRationales: personalized.scoreRationales,
    concernAnswer,
    detailedSections: mergedSections,
    yearlyGuidance: mergedYearly,
    detailedReport,
    generationMeta: {
      provider,
      model: llmModel,
      attempts,
      generatedAt: Date.now(),
    },
    modelVersion: buildModelVersionWithLlm(result.modelVersion, `${provider}-${normalizeModelToken(llmModel)}`),
  };
}

async function requestOpenAiPersonalizedText(input: LoveJobInput, baselineResult: LoveJobResult) {
  const config = getOpenAiConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, config.timeoutMs);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.35,
        input: [
          {
            role: 'system',
            content:
              '너는 사주 연애 리포트를 사람다운 상담 문장으로 작성하는 에디터다. 만세력 근거와 엔진 수치를 바탕으로 상세하고 이해 쉬운 해설을 작성하되, 수치와 연도는 절대 바꾸지 않는다. 반드시 JSON만 출력한다.',
          },
          {
            role: 'user',
            content: buildPersonalizerPrompt(input, baselineResult),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'love_report_generated_text',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                summary: { type: 'string' },
                highlight: { type: 'string' },
                caution: { type: 'string' },
                timingHint: { type: 'string' },
                scoreRationales: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    love: { type: 'string' },
                    marriage: { type: 'string' },
                    risk: { type: 'string' },
                  },
                  required: ['love', 'marriage', 'risk'],
                },
                concernAnswer: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    concern: { type: 'string' },
                    answer: { type: 'string' },
                    actionItems: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['concern', 'answer', 'actionItems'],
                },
                detailedSections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      title: { type: 'string' },
                      body: { type: 'string' },
                    },
                    required: ['title', 'body'],
                  },
                },
                yearlyGuidance: {
                  type: 'array',
                  minItems: 10,
                  maxItems: 10,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      year: { type: 'integer' },
                      focus: { type: 'string' },
                    },
                    required: ['year', 'focus'],
                  },
                },
              },
              required: ['summary', 'highlight', 'caution', 'timingHint', 'scoreRationales', 'concernAnswer', 'detailedSections', 'yearlyGuidance'],
            },
            strict: true,
          },
        },
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as OpenAiResponsePayload;

    if (!response.ok) {
      throw new Error(payload.error?.message || 'openai_request_failed');
    }

    const rawText = extractOutputText(payload);
    if (!rawText) {
      throw new Error('openai_empty_output');
    }

    return {
      personalized: parsePersonalizedOutput(rawText, input, 'openai', baselineResult.yearlyGuidance.map((row) => row.year)),
      model: config.model,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('openai_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestCodexPersonalizedText(input: LoveJobInput, baselineResult: LoveJobResult) {
  if (process.env.CODEX_REPORT_DISABLED === '1') {
    throw new Error('codex_report_disabled');
  }

  const config = getCodexConfig();
  const outPath = path.join(os.tmpdir(), `saju-love-report-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const prompt = [
    '당신은 로컬 Codex 에이전트입니다.',
    '아래 요청은 저장소를 수정하는 일이 아닙니다. 제공된 엔진 산출값만 근거로 이메일 리포트용 JSON을 작성하세요.',
    '파일을 읽거나 수정하지 말고, 출력 스키마에 맞는 JSON만 마지막 메시지로 남기세요.',
    '',
    buildPersonalizerPrompt(input, baselineResult),
  ].join('\n');
  const args = [
    'exec',
    '--cd',
    process.cwd(),
    '--skip-git-repo-check',
    '--sandbox',
    'read-only',
    '--output-schema',
    GENERATED_TEXT_SCHEMA_PATH,
    '--output-last-message',
    outPath,
  ];

  if (process.env.CODEX_REPORT_MODEL?.trim()) {
    args.push('--model', config.model);
  }

  args.push(prompt);

  const execResult = await new Promise<{ code: number; stderr: string; timeoutHit: boolean }>((resolve) => {
    const child = spawn(config.bin, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    let settled = false;
    let timeoutHit = false;
    const timer = setTimeout(() => {
      timeoutHit = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 3000).unref();
    }, config.timeoutMs);

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk ?? '');
    });

    child.stdout.on('data', () => {});

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr: stderr.trim(), timeoutHit });
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: 1, stderr: String(error?.message || error), timeoutHit });
    });
  });

  if (execResult.timeoutHit) {
    throw new Error(`codex_exec_timeout:${Math.round(config.timeoutMs / 1000)}s`);
  }
  if (execResult.code !== 0) {
    throw new Error(`codex_exec_failed:${execResult.stderr || 'unknown'}`);
  }

  try {
    const rawText = await readFile(outPath, 'utf8');
    return {
      personalized: parsePersonalizedOutput(rawText, input, 'codex', baselineResult.yearlyGuidance.map((row) => row.year)),
      model: config.model,
    };
  } finally {
    await rm(outPath, { force: true }).catch(() => {});
  }
}

export function markLoveResultWithLlmFallback(result: LoveJobResult) {
  return {
    ...result,
    modelVersion: buildModelVersionWithLlm(result.modelVersion, 'fallback'),
  };
}

export async function personalizeLoveResult(
  input: LoveJobInput,
  baselineResult: LoveJobResult,
  options: PersonalizeOptions = {},
) {
  const attempts: string[] = [];
  let lastError: Error | null = null;

  if (options.preferCodex) {
    attempts.push('codex');
    try {
      const codexResult = await requestCodexPersonalizedText(input, baselineResult);
      return mergePersonalizedText(baselineResult, codexResult.personalized, 'codex', codexResult.model, attempts.length);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('codex_generation_failed');
    }
  }

  attempts.push('openai');
  try {
    const openAiResult = await requestOpenAiPersonalizedText(input, baselineResult);
    return mergePersonalizedText(baselineResult, openAiResult.personalized, 'openai', openAiResult.model, attempts.length);
  } catch (error) {
    const openAiError = error instanceof Error ? error : new Error('openai_generation_failed');
    if (lastError) {
      throw new Error(`report_generation_failed: codex=${lastError.message}; openai=${openAiError.message}`);
    }
    throw openAiError;
  }
}
