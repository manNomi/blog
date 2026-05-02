import type { LoveJobInput, LoveJobResult, LoveResultSection } from '../love-job-types';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_TIMEOUT_MS = 20_000;
const PRACTICAL_GUIDE_SECTION_TITLE = '5) 실전 운영 가이드';

export const MAX_LLM_RETRIES = 3;

type PersonalizedLoveText = {
  summary: string;
  highlight: string;
  caution: string;
  timingHint: string;
  practicalGuideBody: string;
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

function normalizeConcern(input: LoveJobInput) {
  const concern = input.concern?.trim();
  return concern ? concern : null;
}

function getOpenAiConfig() {
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

function getPracticalGuideSection(result: LoveJobResult) {
  return result.detailedSections.find((section) => section.title.trim() === PRACTICAL_GUIDE_SECTION_TITLE)?.body?.trim() ?? '';
}

function toDetailedReport(sections: LoveResultSection[]) {
  return sections.map((section) => `${section.title}\n${section.body}`).join('\n\n');
}

function mergePersonalizedText(result: LoveJobResult, personalized: PersonalizedLoveText): LoveJobResult {
  const mergedSections = result.detailedSections.map((section) =>
    section.title.trim() === PRACTICAL_GUIDE_SECTION_TITLE
      ? {
          ...section,
          body: personalized.practicalGuideBody,
        }
      : section,
  );

  return {
    ...result,
    summary: personalized.summary,
    highlight: personalized.highlight,
    caution: personalized.caution,
    timingHint: personalized.timingHint,
    detailedSections: mergedSections,
    detailedReport: toDetailedReport(mergedSections),
  };
}

function stringifyBaseline(result: LoveJobResult) {
  return JSON.stringify(
    {
      summary: result.summary,
      highlight: result.highlight,
      caution: result.caution,
      timingHint: result.timingHint,
      practicalGuideBody: getPracticalGuideSection(result),
    },
    null,
    2,
  );
}

function buildPersonalizerPrompt(input: LoveJobInput, baselineResult: LoveJobResult, concern: string) {
  return [
    '아래 baseline 텍스트를 고민 맥락에 맞게 개인화하세요.',
    '반드시 JSON으로만 응답하세요.',
    '',
    '[출력해야 하는 키]',
    '- summary',
    '- highlight',
    '- caution',
    '- timingHint',
    '- practicalGuideBody',
    '',
    '[절대 규칙]',
    '- 점수/연도/오행/근거코드/모델 버전에 대한 수치나 사실을 새로 만들지 말 것',
    '- 예언·공포 조장·단정적 표현 금지',
    '- 공감 + 현실적인 행동 제안 중심으로 작성',
    '- relationshipStatus를 반영해 어조를 조절',
    '- 각 문장은 한국어 자연어로 작성',
    '',
    `[관계 상태]: ${input.relationshipStatus}`,
    `[사용자 고민 원문]: ${concern}`,
    '',
    '[baseline 텍스트(JSON)]',
    stringifyBaseline(baselineResult),
  ].join('\n');
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
  const practicalGuideBody = typeof value.practicalGuideBody === 'string' ? value.practicalGuideBody.trim() : '';

  if (!summary || !highlight || !caution || !timingHint || !practicalGuideBody) {
    throw new Error('openai_schema_invalid');
  }

  return {
    summary,
    highlight,
    caution,
    timingHint,
    practicalGuideBody,
  };
}

async function requestPersonalizedText(input: LoveJobInput, baselineResult: LoveJobResult, concern: string) {
  const { apiKey, model, timeoutMs } = getOpenAiConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.45,
        input: [
          {
            role: 'system',
            content:
              '너는 연애운 리포트 개인화 에디터다. 입력된 baseline을 바꾸되 사실 수치와 근거는 손대지 말고 문장만 개인화하라. 반드시 JSON만 출력하라.',
          },
          {
            role: 'user',
            content: buildPersonalizerPrompt(input, baselineResult, concern),
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
                practicalGuideBody: { type: 'string' },
              },
              required: ['summary', 'highlight', 'caution', 'timingHint', 'practicalGuideBody'],
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

    return parsePersonalizedOutput(rawText);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('openai_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function hasPersonalizationConcern(input: LoveJobInput) {
  return Boolean(normalizeConcern(input));
}

export async function personalizeLoveResult(input: LoveJobInput, baselineResult: LoveJobResult) {
  const concern = normalizeConcern(input);
  if (!concern) {
    return baselineResult;
  }

  const personalized = await requestPersonalizedText(input, baselineResult, concern);
  return mergePersonalizedText(baselineResult, personalized);
}
