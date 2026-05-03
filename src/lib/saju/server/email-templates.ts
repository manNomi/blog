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
import type { ExamJobResult, ExamPreparationTimelineItem, LoveJobResult, ResultSection, SajuJobResult } from '../love-job-types';

type LoveResultEmailPayload = {
  requestId: string;
  name: string;
  concern?: string;
  result: SajuJobResult;
};

type LoveOnlyResultEmailPayload = Omit<LoveResultEmailPayload, 'result'> & {
  result: LoveJobResult;
};

type ExamOnlyResultEmailPayload = Omit<LoveResultEmailPayload, 'result'> & {
  result: ExamJobResult;
};

type AdminSummaryEmailPayload = {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  status: 'completed' | 'failed';
  error: string | null;
  source: 'api' | 'worker';
  result: SajuJobResult | null;
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

function examOutcomeCard(result: ExamJobResult) {
  const outcome = result.expectedOutcome;
  const safeScore = clampPercent(outcome?.score ?? result.examScore);
  const rationaleLead = firstSentence(result.scoreRationales?.exam);

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
      h(Text, { style: { margin: '0 0 8px', color: TEXT_SOFT, fontSize: '12px', fontWeight: 700 } }, outcome?.label ?? '예상 점수'),
      h(Text, { style: { margin: '0', color: TEXT_DARK, fontSize: '25px', fontWeight: 800, lineHeight: '1.2' } }, outcome?.value ?? `${safeScore}점대`),
      h(Text, { style: { margin: '6px 0 0', color: TEXT_SOFT, fontSize: '12px', lineHeight: '1.45' } }, outcome?.description ?? '100점 기준으로 체감 점수대를 잡은 값입니다.'),
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
            backgroundColor: TEXT_DARK,
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

function levelLabel(value: number, highLabel = '높은 편', middleLabel = '보통', lowLabel = '낮은 편') {
  if (!Number.isFinite(value)) return '확인 불가';
  if (value >= 0.7) return highLabel;
  if (value >= 0.45) return middleLabel;
  return lowLabel;
}

function ratioLevel(value: number, highLabel = '높은 편', middleLabel = '보통', lowLabel = '낮은 편') {
  return `${levelLabel(value, highLabel, middleLabel, lowLabel)} (${readableRatio(value)})`;
}

function riskLevel(value: number) {
  if (!Number.isFinite(value)) return '확인 불가';
  if (value >= 0.65) return `주의 필요 (${readableRatio(value)})`;
  if (value >= 0.4) return `관리 필요 (${readableRatio(value)})`;
  return `낮은 편 (${readableRatio(value)})`;
}

function romanceStarsSummary(snapshot: NonNullable<LoveJobResult['sajuSnapshot']>) {
  const stars = snapshot.romanceStars;
  const peachCount = stars.peachInner + stars.peachOuter;
  const total = peachCount + stars.hongLuanCount + stars.hongYanCount;

  if (total <= 0) {
    return '도화·홍란·홍염 신호는 강하게 잡히지 않습니다. 첫인상으로 밀어붙이기보다 편안함과 신뢰를 쌓는 방식이 더 잘 맞습니다.';
  }

  const signals = [];
  if (peachCount > 0) signals.push('도화 신호가 일부 보입니다');
  if (stars.hongLuanCount > 0) signals.push('홍란 신호가 보입니다');
  if (stars.hongYanCount > 0) signals.push('홍염 신호가 보입니다');
  return `도화·홍란·홍염 신호는 일부 잡힙니다. ${signals.join(', ')}. 매력 표현은 살리되 관계 속도와 기대치를 함께 조율하는 편이 좋습니다.`;
}

function sajuSnapshotBlock(result: LoveJobResult) {
  const snapshot = result.sajuSnapshot;
  if (!snapshot) return null;

  const relationText = snapshot.spousePalace.relations.length > 0 ? snapshot.spousePalace.relations.join(', ') : '큰 합충 신호 없음';
  const rows = [
    ['사주팔자', `${snapshot.pillars.year} / ${snapshot.pillars.month} / ${snapshot.pillars.day} / ${snapshot.pillars.hour}`],
    ['일간 강약', `${ratioLevel(snapshot.dayMaster.strength, '강한 편', '보통', '낮은 편')} · 감정 표현과 관계 속도 조절의 기본 체력으로 봅니다.`],
    ['오행 균형', `${levelLabel(snapshot.elementProfile.balanceScore, '고른 편', '보완 필요', '많이 치우친 편')} · ${snapshot.elementProfile.dominant} 기운이 강하고 ${snapshot.elementProfile.weakest} 기운 보완이 필요합니다.`],
    ['배우자궁', `안정도 ${ratioLevel(snapshot.spousePalace.stability, '안정적인 편', '보통', '약한 편')}, 충돌 가능성 ${riskLevel(snapshot.spousePalace.conflictRisk)} · ${relationText}`],
    ['배우자별', `활성도 ${ratioLevel(snapshot.spouseStar.presence, '높은 편', '중간 이상', '낮은 편')}, 균형 ${ratioLevel(snapshot.spouseStar.balance, '안정적인 편', '보통', '보완 필요')}, 혼잡도 ${riskLevel(snapshot.spouseStar.conflictRisk)}`],
    ['도화/홍란/홍염', romanceStarsSummary(snapshot)],
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

function resultSectionCard(section: ResultSection) {
  const evidence = section.evidence ?? [];
  const advice = section.advice ?? [];
  const confidenceLabel = section.confidence === 'high' ? '근거 충분' : section.confidence === 'medium' ? '근거 보통' : section.confidence === 'low' ? '근거 제한' : null;

  return h(
    Section,
    {
      key: section.id,
      style: {
        marginBottom: '12px',
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: CARD_RADIUS,
        backgroundColor: SECTION_BG,
        padding: '15px',
      },
    },
    h(
      Row,
      null,
      h(Column, null, h(Text, { style: { margin: '0 0 8px', fontSize: '15px', color: TEXT_DARK, fontWeight: 900 } }, section.title)),
      confidenceLabel
        ? h(
            Column,
            { style: { textAlign: 'right' } },
            h(
              'span',
              {
                style: {
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  backgroundColor: SOFT_BG,
                  color: TEXT_SOFT,
                  fontSize: '11px',
                  fontWeight: 800,
                },
              },
              confidenceLabel,
            ),
          )
        : null,
    ),
    h(Text, { style: { margin: '0 0 12px', fontSize: '14px', color: TEXT_DARK, lineHeight: '1.7', fontWeight: 700 } }, section.summary),
    evidence.length > 0
      ? h(
          Section,
          { style: { margin: '0 0 12px', padding: '11px 12px', borderRadius: '10px', backgroundColor: SOFT_BG } },
          h(Text, { style: { margin: '0 0 6px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 900 } }, '근거'),
          ...evidence.map((item) => h(Text, { key: item, style: { margin: '0 0 4px', fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.55' } }, `- ${item}`)),
        )
      : null,
    h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 900 } }, '현실적 의미'),
    h(Text, { style: { margin: '0 0 12px', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.75' } }, section.detail),
    advice.length > 0
      ? h(
          Section,
          { style: { marginTop: '8px' } },
          h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 900 } }, '실행 조언'),
          ...advice.map((item, index) => h(Text, { key: item, style: { margin: '0 0 5px', fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.6' } }, `${index + 1}. ${item}`)),
        )
      : null,
  );
}

function yearlyChartBlock(yearlyGuidance: LoveJobResult['yearlyGuidance']) {
  const sorted = sortedYearlyGuidance(yearlyGuidance);
  const bestYear = bestOpportunityYear(yearlyGuidance);
  const firstYear = sorted[0]?.year;
  const lastYear = sorted[sorted.length - 1]?.year;
  const title = firstYear && lastYear ? `${firstYear}~${lastYear} 연애운 타임라인` : '연도별 연애운 타임라인';
  const bestLove = bestYear ? ratioToPercent(bestYear.loveChance) : null;
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
            padding: '12px 0',
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
            padding: '12px 10px',
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
                    height: '12px',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    backgroundColor: SOFT_BG,
                    border: `1px solid ${BORDER_COLOR}`,
                  },
                },
                h('div', {
                  style: {
                    width: `${love}%`,
                    height: '12px',
                    backgroundColor: isBest ? '#18181b' : '#71717a',
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
            padding: '12px 0',
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
        backgroundColor: '#ffffff',
        padding: '16px',
      },
    },
    h(Text, { style: { margin: '0 0 4px', fontSize: '16px', color: TEXT_DARK, fontWeight: 900 } }, title),
    bestYear
      ? h(
          Text,
          { style: { margin: '0 0 8px', fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.6' } },
          `${bestYear.year}년이 가장 강한 기회 구간입니다. 연애운 ${bestLove}% 흐름을 기준으로, 아래 타임라인에서 준비·확장·정리 시점을 함께 보세요.`,
        )
      : null,
    h(Text, { style: { margin: '0 0 12px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.55' } }, '표시는 연도순입니다. 막대는 연애운 흐름, 배지는 갈등 리스크를 뜻합니다. 숫자는 엔진 산출값을 그대로 사용했습니다.'),
    h(
      'table',
      { role: 'presentation', width: '100%', cellPadding: 0, cellSpacing: 0, style: { borderCollapse: 'collapse' } },
      h('tbody', null, ...rows),
    ),
  );
}

function sortedExamGuidance(yearlyGuidance: NonNullable<ExamJobResult['yearlyGuidance']>) {
  return [...yearlyGuidance].sort((a, b) => a.year - b.year);
}

function bestStudyYear(yearlyGuidance: NonNullable<ExamJobResult['yearlyGuidance']>) {
  return [...yearlyGuidance].sort((a, b) => b.studyFlow - b.overloadRisk * 0.35 - (a.studyFlow - a.overloadRisk * 0.35))[0] ?? null;
}

function examScoreRationaleBlock(result: ExamJobResult) {
  const rationales = result.scoreRationales;
  if (!rationales) return null;

  const items = [
    ['시험 점수 근거', rationales.exam],
    ['과목 궁합 근거', rationales.subjectFit],
    ['노력 보정 근거', rationales.effort],
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

function subjectAnswerBlock(result: ExamJobResult) {
  const answer = result.subjectAnswer;
  if (!answer?.answer) return null;

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
    h(Text, { style: { margin: '0 0 8px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '과목에 대한 직접 답변'),
    h(Text, { style: { margin: '0 0 10px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.6' } }, `고민중인 과목: ${answer.subject}`),
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

function examYearlyChartBlock(yearlyGuidance: NonNullable<ExamJobResult['yearlyGuidance']>) {
  const sorted = sortedExamGuidance(yearlyGuidance);
  const bestYear = bestStudyYear(yearlyGuidance);
  const firstYear = sorted[0]?.year;
  const lastYear = sorted[sorted.length - 1]?.year;
  const title = firstYear && lastYear ? `${firstYear}~${lastYear} 학습 흐름 타임라인` : '연도별 학습 흐름 타임라인';
  const bestFlow = bestYear ? ratioToPercent(bestYear.studyFlow) : null;
  const rows = sorted.map((row) => {
    const flow = ratioToPercent(row.studyFlow);
    const risk = ratioToPercent(row.overloadRisk);
    const riskTone = getRiskTone(risk);
    const isBest = bestYear?.year === row.year;

    return h(
      'tr',
      { key: row.year },
      h(
        'td',
        { style: { padding: '12px 0', borderTop: `1px solid ${BORDER_COLOR}`, verticalAlign: 'top', width: '72px' } },
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
              '학습 탄력',
            )
          : null,
      ),
      h(
        'td',
        { style: { padding: '12px 10px', borderTop: `1px solid ${BORDER_COLOR}`, verticalAlign: 'top' } },
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
                    height: '12px',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    backgroundColor: SOFT_BG,
                    border: `1px solid ${BORDER_COLOR}`,
                  },
                },
                h('div', {
                  style: {
                    width: `${flow}%`,
                    height: '12px',
                    backgroundColor: isBest ? '#18181b' : '#71717a',
                    borderRadius: '999px',
                  },
                }),
              ),
              h('td', { style: { width: '48px', paddingLeft: '8px', color: TEXT_DARK, fontSize: '13px', fontWeight: 800 } }, `${flow}%`),
            ),
          ),
        ),
        h(Text, { style: { margin: '8px 0 0', color: TEXT_MUTED, fontSize: '13px', lineHeight: '1.6' } }, row.focus),
      ),
      h(
        'td',
        {
          style: {
            padding: '12px 0',
            borderTop: `1px solid ${BORDER_COLOR}`,
            verticalAlign: 'top',
            width: '82px',
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
          `과부하 ${risk}%`,
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
        backgroundColor: '#ffffff',
        padding: '16px',
      },
    },
    h(Text, { style: { margin: '0 0 4px', fontSize: '16px', color: TEXT_DARK, fontWeight: 900 } }, title),
    bestYear
      ? h(Text, { style: { margin: '0 0 8px', fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.6' } }, `${bestYear.year}년이 학습 흐름 ${bestFlow}%로 가장 탄력이 붙는 구간입니다.`)
      : null,
    h(Text, { style: { margin: '0 0 12px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.55' } }, '막대는 학습 흐름, 배지는 과부하 리스크입니다. 숫자는 참고용이며, 공부 루틴을 조정하기 위한 기준으로만 봐 주세요.'),
    h('table', { role: 'presentation', width: '100%', cellPadding: 0, cellSpacing: 0, style: { borderCollapse: 'collapse' } }, h('tbody', null, ...rows)),
  );
}

function preparationTimelineBlock(timeline: ExamPreparationTimelineItem[]) {
  if (timeline.length <= 0) return null;

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
    h(Text, { style: { margin: '0 0 4px', fontSize: '16px', color: TEXT_DARK, fontWeight: 900 } }, '시험 준비 타임라인'),
    h(Text, { style: { margin: '0 0 12px', fontSize: '13px', color: TEXT_SOFT, lineHeight: '1.55' } }, '연도별 운세 대신 시험 준비 흐름에 맞춰 바로 실행할 루틴을 정리했습니다.'),
    ...timeline.map((item, index) =>
      h(
        Section,
        {
          key: item.id,
          style: {
            marginTop: index === 0 ? 0 : '10px',
            padding: '13px',
            borderRadius: '10px',
            backgroundColor: index % 2 === 0 ? SOFT_BG : '#ffffff',
            border: `1px solid ${BORDER_COLOR}`,
          },
        },
        h(Text, { style: { margin: '0 0 6px', fontSize: '14px', color: TEXT_DARK, fontWeight: 900 } }, item.title),
        h(Text, { style: { margin: '0 0 10px', fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.65' } }, item.summary),
        item.actions.map((action, actionIndex) =>
          h(Text, { key: action, style: { margin: '0 0 5px', fontSize: '13px', color: TEXT_MUTED, lineHeight: '1.55' } }, `${actionIndex + 1}. ${action}`),
        ),
        item.caution
          ? h(Text, { style: { margin: '8px 0 0', fontSize: '12px', color: TEXT_SOFT, lineHeight: '1.55', fontWeight: 700 } }, `주의: ${item.caution}`)
          : null,
      ),
    ),
  );
}

function examResultTemplate(payload: ExamOnlyResultEmailPayload) {
  const result = payload.result;
  const detailedSections = result.detailedSections ?? [];
  const interpretationSections = result.interpretationSections ?? [];
  const preparationTimeline = result.preparationTimeline ?? [];
  const yearlyGuidance = sortedExamGuidance(result.yearlyGuidance ?? []);
  const overloadTone = getRiskTone(clampPercent(result.effortScore));

  return baseLayout(
    `${payload.name}님의 시험운 리포트가 도착했습니다`,
    h(
      Section,
      { style: { padding: '20px 20px 18px' } },
      h(
        Heading,
        { as: 'h1', style: { margin: '0 0 6px', fontSize: '25px', lineHeight: '1.32', color: TEXT_DARK, fontWeight: 800 } },
        `${payload.name || '고객'}님의 사주 시험운 리포트`,
      ),
      h(Text, { style: { margin: '0', fontSize: '12px', color: TEXT_SOFT } }, `요청 ID: ${payload.requestId}`),
      h(Text, { style: { margin: '10px 0 0', fontSize: '15px', color: TEXT_MUTED, lineHeight: '1.7' } }, result.summary),
      h(Hr, { style: { borderColor: BORDER_COLOR, margin: '14px 0' } }),
      h(
        Row,
        null,
        examOutcomeCard(result),
        scoreCard('과목 궁합', result.subjectFitScore, '#52525b', result.scoreRationales?.subjectFit),
        scoreCard('노력 보정', result.effortScore, '#a1a1aa', result.scoreRationales?.effort),
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
        h(Text, { style: { margin: '0 0 10px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '과목 맞춤 해석'),
        metricBadge('과목', result.subjectProfile.subject),
        metricBadge('분류', result.subjectProfile.category),
        metricBadge('중심 오행', result.subjectProfile.primaryElementLabel),
        metricBadge('보조 오행', result.subjectProfile.supportElementLabel),
        h(Text, { style: { margin: '10px 0 0', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, result.subjectProfile.fitReason),
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
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '노력 보정 상태'),
        h(
          Text,
          { style: { margin: '0', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.7' } },
          '현재 노력 보정은 ',
          h(
            'span',
            {
              style: {
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: overloadTone.bg,
                color: overloadTone.color,
                fontWeight: 700,
              },
            },
            `${clampPercent(result.effortScore)}점 (${overloadTone.label})`,
          ),
          ' 구간입니다. 높게 나올수록 벼락치기보다 루틴 설계가 중요합니다.',
        ),
      ),
      examScoreRationaleBlock(result),
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
        h(Text, { style: { margin: '12px 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '좋은 흐름'),
        h(Text, { style: { margin: '0 0 12px', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, result.highlight),
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '주의 포인트'),
        h(Text, { style: { margin: '0 0 12px', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, result.caution),
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: TEXT_SOFT, fontWeight: 700 } }, '루틴 타이밍'),
        h(Text, { style: { margin: '0', fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.72' } }, result.timingHint),
      ),
      subjectAnswerBlock(result),
      preparationTimeline.length > 0 ? preparationTimelineBlock(preparationTimeline) : null,
      yearlyGuidance.length > 0 ? examYearlyChartBlock(yearlyGuidance) : null,
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
        h(Text, { style: { margin: '0 0 10px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, interpretationSections.length > 0 ? '해석 리포트' : '공부 전략'),
        ...(interpretationSections.length > 0
          ? interpretationSections.map((section) => resultSectionCard(section))
          : detailedSections.map((section) => sectionCard(section.title, section.body))),
      ),
      yearlyGuidance.length > 0
        ? h(
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
            h(Text, { style: { margin: '0 0 10px', fontSize: '15px', color: TEXT_DARK, fontWeight: 800 } }, '연도별 학습 포인트 (열기/닫기)'),
            ...yearlyGuidance.map((row) => detailsBlock(`${row.year}년 · 학습 ${ratioToPercent(row.studyFlow)}% / 과부하 ${ratioToPercent(row.overloadRisk)}%`, row.focus)),
          )
        : null,
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
        '이 결과는 참고용 해석이며, 실제 시험 준비는 학습 계획과 건강 관리를 우선해 주세요.',
      ),
    ),
  );
}

function loveResultTemplate(payload: LoveOnlyResultEmailPayload) {
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
          metricBadge('근거 신호', `${result.evidenceCodes.length}개`),
          ' ',
          metricBadge('상세', `${detailedSections.length}개 섹션`),
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
        '이 결과는 참고용 해석이며, 실제 관계 의사결정은 당사자 간 대화를 우선해 주세요.',
      ),
    ),
  );
}

function adminSummaryTemplate(payload: AdminSummaryEmailPayload) {
  const statusLabel = payload.status === 'completed' ? '성공' : '실패';
  const statusColor = payload.status === 'completed' ? '#16a34a' : '#dc2626';
  const scoreSummary = payload.result
    ? payload.result.fortuneType === 'exam'
      ? `${payload.result.expectedOutcome?.label ?? '시험'} ${payload.result.expectedOutcome?.value ?? clampPercent(payload.result.examScore)} / 과목 ${clampPercent(payload.result.subjectFitScore)} / 노력 ${clampPercent(payload.result.effortScore)}`
      : `연애 ${clampPercent(payload.result.loveScore)} / 결혼 ${clampPercent(payload.result.marriageScore)} / 리스크 ${clampPercent(payload.result.riskScore)}`
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
  const html = (await render(payload.result.fortuneType === 'exam' ? examResultTemplate(payload as ExamOnlyResultEmailPayload) : loveResultTemplate(payload as LoveOnlyResultEmailPayload))).replace(/\u0000/g, '');
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
