import test from 'node:test';
import assert from 'node:assert/strict';

import {
  markLoveResultWithLlmFallback,
  personalizeLoveResult,
} from '../src/lib/saju/server/love-llm-personalizer.ts';

function createBaselineResult() {
  return {
    loveScore: 78,
    marriageScore: 72,
    riskScore: 34,
    confidence: 0.82,
    dominantElement: '목',
    weakestElement: '수',
    topYears: [
      { year: 2027, loveChance: 0.71, breakupRisk: 0.28 },
      { year: 2028, loveChance: 0.69, breakupRisk: 0.31 },
    ],
    evidenceCodes: ['R_SP_BASE', 'R_SSTAR_PRESENT'],
    summary: '기본 요약',
    highlight: '기본 강점',
    caution: '기본 주의',
    timingHint: '기본 타이밍',
    scoreRationales: {
      love: '연애 점수 기본 근거입니다. 배우자궁과 배우자별을 함께 본 설명입니다. 관계 행동으로 연결해야 합니다.',
      marriage: '혼인 안정 기본 근거입니다. 장기 관계의 약속과 리듬을 함께 봅니다. 공식화 대화가 중요합니다.',
      risk: '갈등 리스크 기본 근거입니다. 감정 기복과 속도 차이를 함께 봅니다. 대화 규칙이 필요합니다.',
    },
    sajuSnapshot: {
      pillars: { year: '신미', month: '경자', day: '갑인', hour: '무진' },
      dayMaster: { stem: '갑', branch: '인', strength: 0.62 },
      elementProfile: { dominant: '목', weakest: '수', balanceScore: 0.68 },
      spousePalace: { branch: '인', stability: 0.73, conflictRisk: 0.24, relations: ['월지 자(합)'] },
      spouseStar: { presence: 0.7, balance: 0.66, conflictRisk: 0.32 },
      romanceStars: { peachInner: 1, peachOuter: 0, hongLuanCount: 1, hongYanCount: 0 },
      evidenceCodes: ['R_SP_BASE', 'R_SSTAR_PRESENT'],
      traces: ['dayMaster=0.62, elementBalance=0.68', 'spousePalace(stability=0.73, risk=0.24)'],
    },
    detailedReport: '1) 전체 진단\n기본 진단',
    detailedSections: [
      { title: '1) 전체 진단', body: '기본 진단' },
      { title: '2) 현재 관계 상태 해석', body: '기본 해석' },
      { title: '3) 강점 패턴', body: '기본 강점' },
    ],
    yearlyGuidance: [
      { year: 2027, loveChance: 0.71, breakupRisk: 0.28, focus: '기본 포커스 2027' },
      { year: 2028, loveChance: 0.69, breakupRisk: 0.31, focus: '기본 포커스 2028' },
    ],
    modelVersion: 'saju-love-v2',
  };
}

function generatedPayload() {
  return {
    summary: '연락 템포가 흔들리는 고민은 상대 마음을 맞히는 문제라기보다 두 사람이 편하게 유지할 리듬을 찾는 문제에 가깝습니다. 엔진에서는 배우자궁 안정도와 배우자별 활성도가 함께 보여 관계를 이어갈 기본 재료는 있는 편으로 읽힙니다. 다만 수 기운이 약하게 잡혀 감정을 말로 풀기 전까지 혼자 해석이 길어질 수 있습니다. 지금은 결론을 재촉하기보다 원하는 연락 빈도와 만남 방식을 짧게 제안하는 쪽이 가장 현실적입니다.',
    highlight: '강점은 관계를 단번에 밀어붙이는 힘보다 꾸준히 신뢰를 쌓는 힘에 있습니다. 배우자별 활성도가 있어 호감이 생겼을 때 관계를 실제 만남으로 옮길 가능성이 살아납니다. 연락 템포 고민도 짧고 반복 가능한 약속을 만들면 장점으로 바뀔 수 있습니다.',
    caution: '주의할 점은 답장 속도 하나로 상대 마음을 단정하는 습관입니다. 사주 근거상 감정이 올라오면 표현보다 해석이 먼저 길어질 수 있어 오해가 커질 수 있습니다. 중요한 이야기는 문자로 길게 묻기보다 통화나 만남에서 차분히 꺼내는 편이 안전합니다.',
    timingHint: '2027년은 관계 방향을 다시 맞추기 좋은 시기로 읽힙니다. 이 시기에는 소개나 만남을 늘리는 것만큼 이후의 연락 규칙을 분명히 하는 일이 중요합니다. 연락 템포 고민은 상대를 시험하기보다 서로 가능한 빈도를 합의하는 방식으로 풀어야 안정됩니다.',
    scoreRationales: {
      love: '연애 점수는 배우자궁 안정도와 배우자별 활성도가 함께 반영된 값입니다. 현재 근거에서는 관계가 시작될 재료가 있지만 감정 표현을 정리하지 않으면 기회가 흐려질 수 있습니다. 그래서 점수의 의미는 기다리기보다 만남 이후의 연락 리듬을 직접 설계하라는 쪽에 가깝습니다.',
      marriage: '혼인 안정 점수는 장기 관계에서 약속을 지키는 힘과 관계를 공식화할 수 있는 흐름을 함께 본 값입니다. 배우자궁이 안정적으로 읽히면 오래 가는 관계를 만들 기반은 있지만, 생활 리듬이 맞지 않으면 안정감이 늦게 생길 수 있습니다. 따라서 진지한 관계로 가려면 감정 확인보다 일정, 만남 빈도, 미래 계획을 구체적으로 맞추는 대화가 필요합니다.',
      risk: '갈등 리스크는 감정 기복과 연락 속도 차이에서 생기는 오해 가능성을 반영한 값입니다. 현재 수 기운 보완이 필요하다는 점은 감정을 말로 풀기 전에 혼자 판단이 앞설 수 있음을 뜻합니다. 리스크를 낮추려면 서운함이 커진 날 바로 결론을 내리지 말고 대화 주제와 시간을 나누어 잡는 방식이 좋습니다.',
    },
    concernAnswer: {
      concern: '연락 템포 고민',
      answer: '연락 템포 고민은 상대가 나를 덜 좋아한다는 증거로 바로 연결하지 않는 것이 먼저입니다. 사주 흐름에서는 관계를 이어갈 재료가 있으나, 기대하는 리듬을 말하지 않으면 혼자 불안이 커지기 쉬운 모습입니다. 이번에는 상대를 추궁하기보다 내가 편한 연락 빈도와 만남 방식을 한 문장으로 제안해보는 것이 해결의 출발점입니다.',
      actionItems: [
        '이번 주 안에 원하는 연락 빈도와 만남 간격을 한 문장으로 정리해 상대에게 부드럽게 제안하세요.',
        '답장이 늦은 날에는 바로 의미를 붙이지 말고 하루 단위로 반복 패턴이 있는지만 확인하세요.',
        '중요한 이야기는 긴 문자보다 통화나 짧은 만남에서 말하고, 요청은 비난이 아니라 제안 형태로 표현하세요.',
      ],
    },
    detailedSections: [
      {
        title: '1) 전체 진단',
        body: '사주 근거로 보면 배우자궁 안정도와 배우자별 활성도가 함께 보여 관계를 만들 재료는 충분한 편입니다. 다만 약한 수 기운은 감정을 말로 정리하기 전에 혼자 해석이 길어질 수 있음을 뜻합니다. 그래서 연락 템포 고민이 생기면 상대 마음을 단정하기보다 내가 원하는 리듬을 먼저 알아야 합니다. 관계 해석상 지금은 빠르게 확답을 받는 시기라기보다 서로 맞는 속도를 조율하는 시기입니다. 현실적으로는 연락 빈도, 만남 간격, 표현 방식을 각각 한 줄씩 정리한 뒤 상대에게 부담 없는 제안으로 꺼내는 편이 좋습니다.',
      },
      {
        title: '2) 현재 관계 상태 해석',
        body: '현재 관계 상태를 연애 중으로 놓고 보면 새 인연을 찾는 문제보다 지금 관계의 신뢰를 유지하는 방식이 핵심입니다. 배우자궁이 안정적으로 읽히는 점은 관계를 오래 끌고 갈 기반이 있다는 뜻입니다. 하지만 연락 템포 차이가 반복되면 마음이 식었다는 오해로 번지기 쉽습니다. 관계 해석상 상대를 시험하거나 기다리게 하기보다 서로 가능한 소통 방식을 합의하는 것이 좋습니다. 이번 주에는 길게 따지기보다 통화 시간을 정하고 편한 연락 리듬을 함께 정하는 대화를 시도하세요.',
      },
      {
        title: '3) 강점 패턴',
        body: '강점은 감정이 한 번에 폭발하는 방식보다 꾸준한 약속과 반복되는 표현에서 살아납니다. 배우자별 활성도는 관계가 실제 만남으로 이어질 가능성이 있다는 신호로 볼 수 있습니다. 도화와 홍란 신호는 매력 노출이나 관계 공식화의 계기가 생길 때 장점으로 작동합니다. 다만 이 장점은 막연히 기다릴 때보다 만남 이후 후속 연락을 안정적으로 이어갈 때 더 잘 드러납니다. 현실적으로는 첫 만남 뒤 48시간 안에 짧은 후속 연락을 하고, 다음 약속을 너무 늦추지 않는 방식이 좋습니다.',
      },
    ],
    yearlyGuidance: [
      {
        year: 2027,
        focus: '2027년은 관계 방향을 다시 맞추기 좋은 해입니다. 연락 템포 고민은 혼자 판단하지 말고 소통 빈도와 약속 방식을 함께 정하는 대화로 풀어가세요. 특히 첫 제안은 짧고 구체적으로 남기는 편이 안정적입니다.',
      },
      {
        year: 2028,
        focus: '2028년에는 감정 표현이 커질 수 있어 서운함을 오래 쌓아두지 않는 것이 중요합니다. 중요한 이야기는 문자보다 통화나 만남에서 짧고 분명하게 나누는 편이 좋습니다. 대화 뒤에는 다음 약속을 확인해 불안을 줄이세요.',
      },
    ],
  };
}

async function withMockedOpenAi(payload, callback) {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'gpt-test-mini';
  let requestBody = null;

  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({ output_text: JSON.stringify(payload) }),
    };
  };

  try {
    return await callback(() => requestBody);
  } finally {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPENAI_MODEL = originalModel;
  }
}

test('personalizeLoveResult keeps numeric engine fields fixed and rewrites rich text fields', async () => {
  const baseline = createBaselineResult();

  await withMockedOpenAi(generatedPayload(), async (getRequestBody) => {
    const result = await personalizeLoveResult(
      {
        name: '홍길동',
        email: 'test@example.com',
        gender: 'male',
        calendarType: 'solar',
        birthDate: '1991-01-01',
        birthTime: '08:30',
        birthPlace: '부산',
        relationshipStatus: 'dating',
        concern: '연락 템포 고민',
      },
      baseline,
    );

    assert.equal(result.loveScore, baseline.loveScore);
    assert.equal(result.marriageScore, baseline.marriageScore);
    assert.equal(result.riskScore, baseline.riskScore);
    assert.deepEqual(result.topYears, baseline.topYears);
    assert.deepEqual(result.evidenceCodes, baseline.evidenceCodes);

    assert.match(result.summary, /연락 템포가 흔들리는 고민/);
    assert.match(result.scoreRationales?.love ?? '', /배우자궁 안정도와 배우자별 활성도/);
    assert.match(result.concernAnswer?.answer ?? '', /연락 템포 고민/);
    assert.match(result.detailedSections[0].body, /사주 근거/);
    assert.match(result.yearlyGuidance[1].focus, /중요한 이야기는 문자보다 통화나 만남/);
    assert.equal(result.generationMeta?.provider, 'openai');
    assert.match(result.modelVersion, /saju-love-v2\+llm:openai-gpt-test-mini/);
    const requestBody = JSON.stringify(getRequestBody());
    const prompt = getRequestBody().input[1].content;
    const userFacingContext = prompt.split('[사용자용으로 정리한 엔진 산출값 및 만세력 요약(JSON)]')[1] ?? '';
    assert.match(requestBody, /연락 템포 고민/);
    assert.match(requestBody, /만세력 요약/);
    assert.doesNotMatch(userFacingContext, /presence|confidence|traces|evidenceCodes|loveChance|breakupRisk/);
    assert.doesNotMatch(userFacingContext, /0\.7|0\.62|0\.82/);
  });
});

test('personalizeLoveResult falls back from local Codex failure to OpenAI', async () => {
  const baseline = createBaselineResult();
  const originalBin = process.env.CODEX_REPORT_BIN;
  process.env.CODEX_REPORT_BIN = 'definitely-missing-codex-binary';

  try {
    await withMockedOpenAi(generatedPayload(), async () => {
      const result = await personalizeLoveResult(
        {
          name: '홍길동',
          email: 'test@example.com',
          gender: 'male',
          calendarType: 'solar',
          birthDate: '1991-01-01',
          birthTime: '08:30',
          birthPlace: '부산',
          relationshipStatus: 'dating',
          concern: '연락 템포 고민',
        },
        baseline,
        { preferCodex: true },
      );

      assert.equal(result.generationMeta?.provider, 'openai');
      assert.equal(result.generationMeta?.attempts, 2);
      assert.match(result.modelVersion, /\+llm:openai-gpt-test-mini/);
    });
  } finally {
    process.env.CODEX_REPORT_BIN = originalBin;
  }
});

test('markLoveResultWithLlmFallback appends fallback marker for legacy callers only', () => {
  const baseline = createBaselineResult();
  const fallback = markLoveResultWithLlmFallback(baseline);

  assert.equal(fallback.modelVersion, 'saju-love-v2+llm:fallback');
  assert.equal(fallback.loveScore, baseline.loveScore);
});

test('personalizeLoveResult rejects sparse section bodies', async () => {
  const sparse = generatedPayload();
  sparse.detailedSections[0] = { title: '1) 전체 진단', body: '너무 짧은 본문입니다.' };

  await withMockedOpenAi(sparse, async () => {
    await assert.rejects(
      () =>
        personalizeLoveResult(
          {
            name: '홍길동',
            email: 'test@example.com',
            gender: 'male',
            calendarType: 'solar',
            birthDate: '1991-01-01',
            birthTime: '08:30',
            birthPlace: '부산',
            relationshipStatus: 'dating',
            concern: '연락 템포 고민',
          },
          createBaselineResult(),
        ),
      /llm_section_too_short/,
    );
  });
});

test('personalizeLoveResult rejects archaic or unreadable tone', async () => {
  const archaic = generatedPayload();
  archaic.summary = `${archaic.summary} 청하신 풀이 글월이 도착했사옵니다.`;

  await withMockedOpenAi(archaic, async () => {
    await assert.rejects(
      () =>
        personalizeLoveResult(
          {
            name: '홍길동',
            email: 'test@example.com',
            gender: 'male',
            calendarType: 'solar',
            birthDate: '1991-01-01',
            birthTime: '08:30',
            birthPlace: '부산',
            relationshipStatus: 'dating',
            concern: '연락 템포 고민',
          },
          createBaselineResult(),
        ),
      /llm_forbidden_tone/,
    );
  });
});

test('personalizeLoveResult rejects raw internal metrics in generated prose', async () => {
  const leaked = generatedPayload();
  leaked.summary = `${leaked.summary} confidence 0.82와 presence 0.6880952380952382를 보면 좋습니다.`;

  await withMockedOpenAi(leaked, async () => {
    await assert.rejects(
      () =>
        personalizeLoveResult(
          {
            name: '홍길동',
            email: 'test@example.com',
            gender: 'male',
            calendarType: 'solar',
            birthDate: '1991-01-01',
            birthTime: '08:30',
            birthPlace: '부산',
            relationshipStatus: 'dating',
            concern: '연락 템포 고민',
          },
          createBaselineResult(),
        ),
      /llm_internal_metric_leak/,
    );
  });
});
