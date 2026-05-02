import type { LoveJobInput, LoveJobResult } from '../love-job-types';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_TIMEOUT_MS = 20_000;
const MIN_MAIN_TEXT_LENGTH = 48;
const MIN_SECTION_BODY_LENGTH = 140;
const MIN_YEAR_FOCUS_LENGTH = 56;

export const MAX_LLM_RETRIES = 3;

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

function normalizeModelToken(model: string) {
  return model.replace(/[^\w.-]/g, '_');
}

function buildModelVersionWithLlm(baseModelVersion: string, llmTag: string) {
  return `${baseModelVersion}+llm:${llmTag}`;
}

function baselineForPrompt(result: LoveJobResult) {
  return {
    summary: result.summary,
    highlight: result.highlight,
    caution: result.caution,
    timingHint: result.timingHint,
    detailedSections: result.detailedSections.map((section) => ({
      title: section.title,
      body: section.body,
    })),
    yearlyGuidance: result.yearlyGuidance.map((row) => ({
      year: row.year,
      focus: row.focus,
    })),
  };
}

function buildPersonalizerPrompt(input: LoveJobInput, baselineResult: LoveJobResult) {
  const birthPlace = normalizeBirthPlace(input);
  const concern = normalizeConcern(input);
  const hasConcern = concern !== '미입력';

  return [
    '아래 baseline 텍스트를 바탕으로 이메일로 보낼 사주 연애 리포트 문장을 새로 작성하세요.',
    '반드시 JSON으로만 응답하세요.',
    '',
    '[출력해야 하는 키]',
    '- summary',
    '- highlight',
    '- caution',
    '- timingHint',
    '- detailedSections[{title, body}]',
    '- yearlyGuidance[{year, focus}]',
    '',
    '[절대 규칙: 수치/근거 보존]',
    '- 점수/확률/연도 수치/오행/근거코드는 절대 수정하거나 새로 만들지 말 것',
    '- detailedSections는 baseline의 title을 그대로 유지하고 body만 다시 작성',
    '- yearlyGuidance는 baseline의 year를 그대로 유지하고 focus만 다시 작성',
    '',
    '[문체/품질 규칙]',
    '- 상담사가 직접 차분히 설명하는 듯한 자연스러운 존댓말로 작성',
    '- 각 상세 섹션 body는 반드시 "사주 근거 → 관계 해석 → 현실적인 행동 제안" 흐름으로 작성',
    '- summary/highlight/caution/timingHint는 각각 2~3문장으로 작성',
    '- detailedSections 각 body는 4~6문장으로 작성하고, 너무 짧게 쓰지 말 것',
    '- yearlyGuidance.focus는 해당 연도에 무엇을 조심하고 무엇을 시도할지 2~3문장으로 작성',
    '- 배우자궁 합/충/형/해/파, 배우자별, 도화, 홍란, 홍염, 일간 강약, 오행 균형 중 baseline에 있는 근거를 자연스럽게 풀어서 설명',
    '- 어려운 용어를 쓰면 바로 쉬운 말로 풀어 설명',
    '- 예언·공포 조장·단정적 표현 금지',
    '- 같은 말 반복, 일반론, 빈약한 위로 문장 금지',
    '- relationshipStatus, birthPlace, concern을 문맥에 반영',
    '- 출생지 맥락 조언을 최소 1회 포함',
    hasConcern
      ? '- concern이 입력되어 있으므로 모든 핵심 필드와 상세 섹션/연도별 가이드가 이 고민에 연결되어야 함'
      : '- concern이 없으므로 관계 상태와 출생지 맥락을 중심으로 개인화하되 고민을 지어내지 말 것',
    '',
    `[relationshipStatus]: ${input.relationshipStatus}`,
    `[birthPlace]: ${birthPlace}`,
    `[concern]: ${concern}`,
    '[출생지 맞춤 가이드]',
    buildBirthPlaceGuide(birthPlace),
    '',
    '[baseline(JSON)]',
    JSON.stringify(baselineForPrompt(baselineResult), null, 2),
  ].join('\n');
}

function assertMinimumTextQuality(value: string, minLength: number, code: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length < minLength) {
    throw new Error(code);
  }
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

function parsePersonalizedOutput(rawText: string): PersonalizedLoveText {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('openai_invalid_json');
  }

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
    throw new Error('openai_schema_invalid');
  }

  assertMinimumTextQuality(summary, MIN_MAIN_TEXT_LENGTH, 'openai_summary_too_short');
  assertMinimumTextQuality(highlight, MIN_MAIN_TEXT_LENGTH, 'openai_highlight_too_short');
  assertMinimumTextQuality(caution, MIN_MAIN_TEXT_LENGTH, 'openai_caution_too_short');
  assertMinimumTextQuality(timingHint, MIN_MAIN_TEXT_LENGTH, 'openai_timing_hint_too_short');

  for (const section of detailedSections) {
    assertMinimumTextQuality(section.body, MIN_SECTION_BODY_LENGTH, 'openai_section_too_short');
  }

  for (const row of yearlyGuidance) {
    assertMinimumTextQuality(row.focus, MIN_YEAR_FOCUS_LENGTH, 'openai_year_focus_too_short');
  }

  return {
    summary,
    highlight,
    caution,
    timingHint,
    detailedSections,
    yearlyGuidance,
  };
}

function mergePersonalizedText(result: LoveJobResult, personalized: PersonalizedLoveText, llmModel: string): LoveJobResult {
  const sectionBodyByTitle = new Map(personalized.detailedSections.map((section) => [section.title.trim(), section.body]));
  const yearFocusByYear = new Map(personalized.yearlyGuidance.map((row) => [row.year, row.focus]));

  const mergedSections = result.detailedSections.map((section) => ({
    ...section,
    body: sectionBodyByTitle.get(section.title.trim()) ?? section.body,
  }));

  const mergedYearly = result.yearlyGuidance.map((row) => ({
    ...row,
    focus: yearFocusByYear.get(row.year) ?? row.focus,
  }));

  const detailedReport = mergedSections.map((section) => `${section.title}\n${section.body}`).join('\n\n');

  return {
    ...result,
    summary: personalized.summary,
    highlight: personalized.highlight,
    caution: personalized.caution,
    timingHint: personalized.timingHint,
    detailedSections: mergedSections,
    yearlyGuidance: mergedYearly,
    detailedReport,
    modelVersion: buildModelVersionWithLlm(result.modelVersion, normalizeModelToken(llmModel)),
  };
}

async function requestPersonalizedText(input: LoveJobInput, baselineResult: LoveJobResult) {
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
        temperature: 0.45,
        input: [
          {
            role: 'system',
            content:
              '너는 사주 연애 리포트를 사람다운 상담 문장으로 작성하는 에디터다. 수치와 근거는 절대 바꾸지 말고, 사용자의 고민과 관계 상태를 중심으로 충분히 상세한 해설과 행동 제안을 작성하라. 반드시 JSON만 출력하라.',
          },
          {
            role: 'user',
            content: buildPersonalizerPrompt(input, baselineResult),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'love_report_personalized_text',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                summary: { type: 'string' },
                highlight: { type: 'string' },
                caution: { type: 'string' },
                timingHint: { type: 'string' },
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
              required: ['summary', 'highlight', 'caution', 'timingHint', 'detailedSections', 'yearlyGuidance'],
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
      personalized: parsePersonalizedOutput(rawText),
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

export function markLoveResultWithLlmFallback(result: LoveJobResult) {
  return {
    ...result,
    modelVersion: buildModelVersionWithLlm(result.modelVersion, 'fallback'),
  };
}

export async function personalizeLoveResult(input: LoveJobInput, baselineResult: LoveJobResult) {
  const { personalized, model } = await requestPersonalizedText(input, baselineResult);
  return mergePersonalizedText(baselineResult, personalized, model);
}
