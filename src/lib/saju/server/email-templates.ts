import * as React from 'react';
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { render, toPlainText } from '@react-email/render';
import type { LoveJobResult } from '../love-job-types';

type LoveResultEmailPayload = {
  requestId: string;
  name: string;
  concern?: string;
  result: LoveJobResult;
};

type AdminSummaryEmailPayload = {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  status: 'completed' | 'failed';
  error: string | null;
  source: 'api' | 'worker';
  result: LoveJobResult | null;
};

type RenderedEmail = {
  html: string;
  text: string;
};

const h = React.createElement;
const BASE_FONT = `'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif`;
const CARD_RADIUS = '12px';
const BORDER_COLOR = '#dfdfdf';
const BG_COLOR = '#fafafa';
const MAIN_BG = '#f3f3f3';
const SECTION_BG = '#ffffff';
const SOFT_BG = '#f0f0f0';
const TEXT_DARK = '#18181b';
const TEXT_MUTED = '#52525b';
const TEXT_SOFT = '#71717a';

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioToPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function getRiskTone(score: number) {
  if (score >= 70) return { label: '높음', color: '#b42318', bg: '#fff1f0' };
  if (score >= 40) return { label: '보통', color: '#7a4b00', bg: '#fff7df' };
  return { label: '낮음', color: '#17663a', bg: '#edf8f1' };
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function cleanPlainText(text: string) {
  return text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
}

function firstSentence(value?: string) {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const match = normalized.match(/^.+?[.!?。！？]/);
  return match?.[0] ?? normalized.slice(0, 120);
}

function providerLabel(result: LoveJobResult) {
  const provider = result.generationMeta?.provider;
  if (provider === 'codex') return 'Codex';
  if (provider === 'openai') return 'OpenAI';
  return '엔진';
}

function sortedYearlyGuidance(yearlyGuidance: LoveJobResult['yearlyGuidance']) {
  return [...yearlyGuidance].sort((a, b) => a.year - b.year);
}

function bestOpportunityYear(yearlyGuidance: LoveJobResult['yearlyGuidance']) {
  return [...yearlyGuidance].sort((a, b) => b.loveChance - a.loveChance)[0] ?? null;
}

function scoreCard(label: string, score: number, barColor: string, rationale?: string) {
  const safeScore = clampPercent(score);
  const rationaleLead = firstSentence(rationale);

  return h(
    Column,
    { width: '33.33%', style: { padding: '6px' } },
    h(
        Section,
        {
          style: {
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '15px 14px',
          },
        },
      h(Text, { style: { margin: '0 0 8px', color: TEXT_SOFT, fontSize: '12px', fontWeight: 700 } }, label),
      h(
        Text,
        { style: { margin: '0', color: TEXT_DARK, fontSize: '25px', fontWeight: 800, lineHeight: '1.2' } },
        `${safeScore}`,
        h('span', { style: { fontSize: '12px', color: TEXT_SOFT } }, ' / 100'),
      ),
      h(
        Section,
        {
          style: {
            marginTop: '10px',
            height: '8px',
            borderRadius: '999px',
            overflow: 'hidden',
            backgroundColor: SOFT_BG,
          },
        },
        h(Section, {
          style: {
            width: `${safeScore}%`,
            height: '8px',
            backgroundColor: barColor,
          },
        }),
      ),
      rationaleLead
        ? h(Text, { style: { margin: '10px 0 0', color: TEXT_MUTED, fontSize: '12px', lineHeight: '1.55' } }, rationaleLead)
        : null,
    ),
  );
}

function metricBadge(label: string, value: string, toneColor = TEXT_DARK) {
  return h(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '999px',
        border: `1px solid ${BORDER_COLOR}`,
        backgroundColor: SECTION_BG,
        color: toneColor,
        fontSize: '12px',
        fontWeight: 700,
        marginRight: '6px',
        marginBottom: '6px',
      },
    },
    `${label} ${value}`,
  );
}

function baseLayout(previewText: string, children: React.ReactNode) {
  return h(
    Html,
    { lang: 'ko' },
    h(Head),
    h(Preview, null, previewText),
    h(
      Body,
      {
        style: {
          margin: 0,
          padding: '24px 0',
          fontFamily: BASE_FONT,
          backgroundColor: MAIN_BG,
          color: '#0f172a',
        },
      },
      h(
        Container,
        {
          style: {
            backgroundColor: BG_COLOR,
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            maxWidth: '700px',
            overflow: 'hidden',
          },
        },
        children,
      ),
    ),
  );
}

function detailsBlock(title: string, body: string) {
  return h(
    'details',
    {
      style: {
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: CARD_RADIUS,
        backgroundColor: SECTION_BG,
        padding: '13px 14px',
        marginBottom: '10px',
      },
    },
    h(
      'summary',
      {
        style: {
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '15px',
          color: TEXT_DARK,
          outline: 'none',
        },
      },
      title,
    ),
    h(Text, { style: { margin: '10px 0 0', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.75' } }, body),
  );
}

function readableRatio(value: number) {
  return `${ratioToPercent(value)}%`;
}

function sajuSnapshotBlock(result: LoveJobResult) {
  const snapshot = result.sajuSnapshot;
  if (!snapshot) return null;

  const relationText = snapshot.spousePalace.relations.length > 0 ? snapshot.spousePalace.relations.join(', ') : '큰 합충 신호 없음';
  const rows = [
    ['사주팔자', `${snapshot.pillars.year} / ${snapshot.pillars.month} / ${snapshot.pillars.day} / ${snapshot.pillars.hour}`],
    ['일간 강약', `${readableRatio(snapshot.dayMaster.strength)} · 감정 표현과 관계 속도 조절의 기본 체력으로 봅니다.`],
    ['오행 균형', `${snapshot.elementProfile.dominant} 기운이 강하고 ${snapshot.elementProfile.weakest} 기운 보완이 필요합니다. 균형도 ${readableRatio(snapshot.elementProfile.balanceScore)}.`],
    ['배우자궁', `안정도 ${readableRatio(snapshot.spousePalace.stability)}, 충돌 가능성 ${readableRatio(snapshot.spousePalace.conflictRisk)} · ${relationText}`],
    ['배우자별', `활성도 ${readableRatio(snapshot.spouseStar.presence)}, 균형 ${readableRatio(snapshot.spouseStar.balance)}, 혼잡도 ${readableRatio(snapshot.spouseStar.conflictRisk)}`],
    ['도화/홍란/홍염', `도화 안쪽 ${snapshot.romanceStars.peachInner}, 도화 바깥 ${snapshot.romanceStars.peachOuter}, 홍란 ${snapshot.romanceStars.hongLuanCount}, 홍염 ${snapshot.romanceStars.hongYanCount}`],
  ];

  return h(
    Section,
    {
      style: {
        marginTop: '12px',
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: CARD_RADIUS,
        backgroundColor: SECTION_BG,
        padding: '16px',
      },
    },
    h(Text, { style: { margin: '0 0 6px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '만세력 근거 요약'),
    h(Text, { style: { margin: '0 0 12px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.55' } }, '아래 항목은 점수와 해석에 사용한 원자료입니다. 어려운 용어는 관계에서 어떤 의미로 읽었는지 함께 적었습니다.'),
    h(
      'table',
      { role: 'presentation', width: '100%', cellPadding: 0, cellSpacing: 0, style: { borderCollapse: 'collapse' } },
      h(
        'tbody',
        null,
        ...rows.map(([label, value]) =>
          h(
            'tr',
            { key: label },
            h('td', { style: { width: '96px', padding: '8px 10px 8px 0', borderTop: `1px solid ${BORDER_COLOR}`, color: TEXT_SOFT, fontSize: '12px', fontWeight: 800, verticalAlign: 'top' } }, label),
            h('td', { style: { padding: '8px 0', borderTop: `1px solid ${BORDER_COLOR}`, color: TEXT_MUTED, fontSize: '13px', lineHeight: '1.6', verticalAlign: 'top' } }, value),
          ),
        ),
      ),
    ),
  );
}

function scoreRationaleBlock(result: LoveJobResult) {
  const rationales = result.scoreRationales;
  if (!rationales) return null;

  const items = [
    ['연애 점수 근거', rationales.love],
    ['혼인 안정 근거', rationales.marriage],
    ['갈등 리스크 근거', rationales.risk],
  ];

  return h(
    Section,
    {
      style: {
        marginTop: '12px',
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: CARD_RADIUS,
        backgroundColor: SECTION_BG,
        padding: '16px',
      },
    },
    h(Text, { style: { margin: '0 0 10px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '왜 이 점수인가'),
    ...items.map(([title, body]) =>
      h(
        Section,
        { key: title, style: { marginTop: '10px', padding: '12px', borderRadius: '10px', backgroundColor: SOFT_BG } },
        h(Text, { style: { margin: '0 0 6px', fontSize: '13px', color: TEXT_DARK, fontWeight: 800 } }, title),
        h(Text, { style: { margin: 0, fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.68' } }, body),
      ),
    ),
  );
}

function concernAnswerBlock(result: LoveJobResult, fallbackConcern: string | null) {
  const answer = result.concernAnswer;
  if (!answer?.answer) return null;
  const concern = answer.concern || fallbackConcern;

  return h(
    Section,
    {
      style: {
        marginTop: '12px',
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#f7f2ea',
        padding: '16px',
      },
    },
    h(Text, { style: { margin: '0 0 8px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '고민에 대한 직접 답변'),
    concern ? h(Text, { style: { margin: '0 0 10px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.6' } }, `입력하신 고민: ${concern}`) : null,
    h(Text, { style: { margin: '0 0 12px', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.75' } }, answer.answer),
    answer.actionItems.length > 0
      ? h(
          Section,
          { style: { marginTop: '8px' } },
          h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 800 } }, '바로 해볼 행동'),
          ...answer.actionItems.map((item, index) =>
            h(Text, { key: item, style: { margin: '0 0 6px', fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.6' } }, `${index + 1}. ${item}`),
          ),
        )
      : null,
  );
}

function sectionCard(title: string, body: string) {
  return h(
    Section,
    {
      style: {
        marginBottom: '10px',
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: CARD_RADIUS,
        backgroundColor: SECTION_BG,
        padding: '14px',
      },
    },
    h(Text, { style: { margin: '0 0 8px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, title),
    h(Text, { style: { margin: 0, fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.78' } }, body),
  );
}

function yearlyChartBlock(yearlyGuidance: LoveJobResult['yearlyGuidance']) {
  const sorted = sortedYearlyGuidance(yearlyGuidance);
  const bestYear = bestOpportunityYear(yearlyGuidance);
  const rows = sorted.map((row) => {
    const love = ratioToPercent(row.loveChance);
    const risk = ratioToPercent(row.breakupRisk);
    const riskTone = getRiskTone(risk);
    const isBest = bestYear?.year === row.year;

    return h(
      'tr',
      { key: row.year },
      h(
        'td',
        {
          style: {
            padding: '13px 0',
            borderTop: `1px solid ${BORDER_COLOR}`,
            verticalAlign: 'top',
            width: '72px',
          },
        },
        h(Text, { style: { margin: 0, color: TEXT_DARK, fontSize: '13px', fontWeight: 800 } }, `${row.year}년`),
        isBest
          ? h(
              'span',
              {
                style: {
                  display: 'inline-block',
                  marginTop: '6px',
                  padding: '3px 7px',
                  borderRadius: '999px',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                },
              },
              '최고 기회',
            )
          : null,
      ),
      h(
        'td',
        {
          style: {
            padding: '13px 10px',
            borderTop: `1px solid ${BORDER_COLOR}`,
            verticalAlign: 'top',
          },
        },
        h(
          'table',
          { role: 'presentation', width: '100%', cellPadding: 0, cellSpacing: 0, style: { borderCollapse: 'collapse' } },
          h(
            'tbody',
            null,
            h(
              'tr',
              null,
              h(
                'td',
                {
                  style: {
                    height: '10px',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    backgroundColor: SOFT_BG,
                  },
                },
                h('div', {
                  style: {
                    width: `${love}%`,
                    height: '10px',
                    backgroundColor: TEXT_DARK,
                    borderRadius: '999px',
                  },
                }),
              ),
              h(
                'td',
                { style: { width: '48px', paddingLeft: '8px', color: TEXT_DARK, fontSize: '13px', fontWeight: 800 } },
                `${love}%`,
              ),
            ),
          ),
        ),
        h(Text, { style: { margin: '8px 0 0', color: TEXT_MUTED, fontSize: '13px', lineHeight: '1.6' } }, row.focus),
      ),
      h(
        'td',
        {
          style: {
            padding: '13px 0',
            borderTop: `1px solid ${BORDER_COLOR}`,
            verticalAlign: 'top',
            width: '76px',
            textAlign: 'right',
          },
        },
        h(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '999px',
              backgroundColor: riskTone.bg,
              color: riskTone.color,
              fontSize: '12px',
              fontWeight: 700,
            },
          },
          `리스크 ${risk}%`,
        ),
      ),
    );
  });

  return h(
    Section,
    {
      style: {
        marginTop: '12px',
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: CARD_RADIUS,
        backgroundColor: SECTION_BG,
        padding: '16px',
      },
    },
    h(Text, { style: { margin: '0 0 4px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '연도별 연애운 차트'),
    h(Text, { style: { margin: '0 0 12px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.55' } }, '표시는 연도순입니다. 막대는 연애운 흐름, 배지는 갈등 리스크를 뜻하고, 최고 기회 배지는 연애 기대값이 가장 높은 해를 뜻합니다. 숫자는 엔진 산출값을 그대로 사용했습니다.'),
    h(
      'table',
      { role: 'presentation', width: '100%', cellPadding: 0, cellSpacing: 0, style: { borderCollapse: 'collapse' } },
      h('tbody', null, ...rows),
    ),
  );
}

function loveResultTemplate(payload: LoveResultEmailPayload) {
  const result = payload.result;
  const riskScore = clampPercent(result.riskScore);
  const riskTone = getRiskTone(riskScore);
  const detailedSections = result.detailedSections ?? [];
  const yearlyGuidance = sortedYearlyGuidance(result.yearlyGuidance ?? []);
  const concern = normalizeOptionalText(payload.concern);
  const directConcernAnswer = concernAnswerBlock(result, concern);

  return baseLayout(
    `${payload.name}님의 사주 리포트가 도착했습니다`,
    h(
      Section,
      { style: { padding: '20px 20px 18px' } },
      h(
        Heading,
        { as: 'h1', style: { margin: '0 0 6px', fontSize: '25px', lineHeight: '1.32', color: TEXT_DARK, fontWeight: 800 } },
        `${payload.name || '고객'}님의 사주 연애 리포트`,
      ),
      h(Text, { style: { margin: '0', fontSize: '12px', color: TEXT_SOFT } }, `요청 ID: ${payload.requestId}`),
      h(Text, { style: { margin: '10px 0 0', fontSize: '15px', color: TEXT_MUTED, lineHeight: '1.7' } }, result.summary),
      h(Hr, { style: { borderColor: BORDER_COLOR, margin: '14px 0' } }),
      h(
        Row,
        null,
        scoreCard('연애 점수', result.loveScore, TEXT_DARK, result.scoreRationales?.love),
        scoreCard('혼인 안정', result.marriageScore, '#52525b', result.scoreRationales?.marriage),
        scoreCard('갈등 리스크', result.riskScore, '#a1a1aa', result.scoreRationales?.risk),
      ),
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '16px',
          },
        },
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '리스크 상태'),
        h(
          Text,
          { style: { margin: '0', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.7' } },
          `현재 갈등 리스크는 `,
          h(
            'span',
            {
              style: {
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: riskTone.bg,
                color: riskTone.color,
                fontWeight: 700,
              },
            },
            `${riskScore}% (${riskTone.label})`,
          ),
          ' 구간입니다.',
        ),
      ),
      scoreRationaleBlock(result),
      sajuSnapshotBlock(result),
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '16px',
          },
        },
        h(Text, { style: { margin: '0 0 10px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '핵심 요약'),
        h(Text, { style: { margin: '0 0 12px', fontSize: '15px', color: TEXT_MUTED, lineHeight: '1.75' } }, result.summary),
        h(
          'div',
          { style: { marginTop: '4px' } },
          metricBadge('신뢰도', `${ratioToPercent(result.confidence)}%`),
          ' ',
          metricBadge('근거', `${result.evidenceCodes.length}개`),
          ' ',
          metricBadge('상세', `${detailedSections.length}개 섹션`),
          ' ',
          metricBadge('생성', providerLabel(result)),
        ),
        h(Text, { style: { margin: '12px 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '좋은 흐름'),
        h(Text, { style: { margin: '0 0 12px', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, result.highlight),
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '주의 포인트'),
        h(Text, { style: { margin: '0 0 12px', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, result.caution),
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '타이밍 힌트'),
        h(Text, { style: { margin: '0', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, result.timingHint),
      ),
      directConcernAnswer,
      !directConcernAnswer && concern
        ? h(
            Section,
            {
              style: {
                marginTop: '12px',
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: CARD_RADIUS,
                backgroundColor: SOFT_BG,
                padding: '16px',
              },
            },
            h(Text, { style: { margin: '0 0 8px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '고민 중심 해석'),
            h(Text, { style: { margin: '0 0 10px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.6' } }, `입력하신 고민: ${concern}`),
            h(Text, { style: { margin: '0', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, '아래 해석은 이 고민을 기준으로 관계의 흐름, 조심할 지점, 시도해볼 행동을 연결해 정리했습니다.'),
          )
        : null,
      yearlyGuidance.length > 0 ? yearlyChartBlock(yearlyGuidance) : null,
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '16px',
          },
        },
        h(Text, { style: { margin: '0 0 10px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '상세 해석'),
        ...detailedSections.map((section) => sectionCard(section.title, section.body)),
      ),
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '16px',
          },
        },
        h(Text, { style: { margin: '0 0 10px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '연도별 실행 포인트 (열기/닫기)'),
        ...yearlyGuidance.map((row) => detailsBlock(`${row.year}년 · 연애 ${ratioToPercent(row.loveChance)}% / 리스크 ${ratioToPercent(row.breakupRisk)}%`, row.focus)),
      ),
      h(
        Text,
        {
          style: {
            margin: '14px 0 0',
            color: TEXT_SOFT,
            fontSize: '12px',
            lineHeight: '1.6',
          },
        },
        `모델 버전: ${result.modelVersion} · 신뢰도 ${ratioToPercent(result.confidence)}%`,
        result.generationMeta ? ` · 생성 ${providerLabel(result)}(${result.generationMeta.model})` : '',
      ),
      h(
        Text,
        {
          style: {
            margin: '6px 0 0',
            color: TEXT_SOFT,
            fontSize: '12px',
            lineHeight: '1.6',
          },
        },
        '이 결과는 참고용 해석이며, 실제 관계 의사결정은 당사자 간 대화를 우선해 주세요.',
      ),
    ),
  );
}

function adminSummaryTemplate(payload: AdminSummaryEmailPayload) {
  const statusLabel = payload.status === 'completed' ? '성공' : '실패';
  const statusColor = payload.status === 'completed' ? '#16a34a' : '#dc2626';
  const scoreSummary = payload.result
    ? `연애 ${clampPercent(payload.result.loveScore)} / 결혼 ${clampPercent(payload.result.marriageScore)} / 리스크 ${clampPercent(payload.result.riskScore)}`
    : '점수 없음';

  return baseLayout(
    `[관리자] ${payload.requestId} ${statusLabel}`,
    h(
      Section,
      { style: { padding: '20px' } },
      h(Heading, { as: 'h1', style: { margin: '0 0 8px', fontSize: '22px', lineHeight: '1.3' } }, `[관리자 요약] 사주 처리 ${statusLabel}`),
      h(
        Text,
        { style: { margin: '0 0 6px', fontSize: '14px', color: '#334155' } },
        `요청 ID: ${payload.requestId}`,
      ),
      h(Text, { style: { margin: '0 0 6px', fontSize: '14px', color: '#334155' } }, `이름: ${payload.requesterName || '(미입력)'}`),
      h(Text, { style: { margin: '0 0 6px', fontSize: '14px', color: '#334155' } }, `신청 이메일: ${payload.requesterEmail || '(없음)'}`),
      h(Text, { style: { margin: '0 0 6px', fontSize: '14px', color: '#334155' } }, `처리 경로: ${payload.source}`),
      h(
        Text,
        { style: { margin: '0 0 6px', fontSize: '14px', color: '#334155' } },
        '결과 상태: ',
        h('span', { style: { color: statusColor, fontWeight: 700 } }, statusLabel),
      ),
      h(Text, { style: { margin: '0 0 6px', fontSize: '14px', color: '#334155' } }, `점수: ${scoreSummary}`),
      h(Text, { style: { margin: '0 0 6px', fontSize: '14px', color: '#334155' } }, `오류: ${payload.error ?? '없음'}`),
      h(Text, { style: { margin: 0, fontSize: '14px', color: '#334155' } }, `모델 버전: ${payload.result?.modelVersion ?? '-'}`),
    ),
  );
}

export async function renderLoveResultEmail(payload: LoveResultEmailPayload): Promise<RenderedEmail> {
  const html = (await render(loveResultTemplate(payload))).replace(/\u0000/g, '');
  return {
    html,
    text: cleanPlainText(toPlainText(html)),
  };
}

export async function renderAdminSummaryEmail(payload: AdminSummaryEmailPayload): Promise<RenderedEmail> {
  const html = (await render(adminSummaryTemplate(payload))).replace(/\u0000/g, '');
  return {
    html,
    text: cleanPlainText(toPlainText(html)),
  };
}
