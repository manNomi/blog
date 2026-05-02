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
const CARD_RADIUS = '14px';
const BORDER_COLOR = '#d6dbe4';
const BG_COLOR = '#f3f7ff';
const MAIN_BG = '#f8fafc';
const SECTION_BG = '#ffffff';

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioToPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function getRiskTone(score: number) {
  if (score >= 70) return { label: '높음', color: '#ef4444', bg: '#fef2f2' };
  if (score >= 40) return { label: '보통', color: '#f59e0b', bg: '#fffbeb' };
  return { label: '낮음', color: '#16a34a', bg: '#f0fdf4' };
}

function scoreCard(label: string, score: number, barColor: string) {
  const safeScore = clampPercent(score);

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
          padding: '14px',
        },
      },
      h(Text, { style: { margin: '0 0 8px', color: '#475569', fontSize: '12px', fontWeight: 700 } }, label),
      h(
        Text,
        { style: { margin: '0', color: '#0f172a', fontSize: '24px', fontWeight: 800, lineHeight: '1.2' } },
        `${safeScore}`,
        h('span', { style: { fontSize: '12px', color: '#64748b' } }, ' / 100'),
      ),
      h(
        Section,
        {
          style: {
            marginTop: '10px',
            height: '8px',
            borderRadius: '999px',
            overflow: 'hidden',
            backgroundColor: '#e2e8f0',
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
    ),
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
            borderRadius: '18px',
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
        borderRadius: '12px',
        backgroundColor: SECTION_BG,
        padding: '10px 12px',
        marginBottom: '10px',
      },
    },
    h(
      'summary',
      {
        style: {
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '14px',
          color: '#0f172a',
          outline: 'none',
        },
      },
      title,
    ),
    h(Text, { style: { margin: '10px 0 0', fontSize: '14px', color: '#334155', lineHeight: '1.65' } }, body),
  );
}

function yearlyDetailsBlock(year: number, loveChance: number, breakupRisk: number, focus: string) {
  return detailsBlock(
    `${year}년 · 연애 ${ratioToPercent(loveChance)}% / 리스크 ${ratioToPercent(breakupRisk)}%`,
    focus,
  );
}

function loveResultTemplate(payload: LoveResultEmailPayload) {
  const result = payload.result;
  const riskScore = clampPercent(result.riskScore);
  const riskTone = getRiskTone(riskScore);
  const detailedSections = result.detailedSections ?? [];
  const yearlyGuidance = result.yearlyGuidance ?? [];

  return baseLayout(
    `${payload.name}님의 사주 리포트가 도착했습니다`,
    h(
      Section,
      { style: { padding: '20px 20px 18px' } },
      h(
        Heading,
        { as: 'h1', style: { margin: '0 0 6px', fontSize: '24px', lineHeight: '1.3' } },
        `${payload.name || '고객'}님의 사주 연애 리포트`,
      ),
      h(Text, { style: { margin: '0', fontSize: '12px', color: '#475569' } }, `요청 ID: ${payload.requestId}`),
      h(Hr, { style: { borderColor: BORDER_COLOR, margin: '14px 0' } }),
      h(
        Row,
        null,
        scoreCard('연애 점수', result.loveScore, '#2563eb'),
        scoreCard('혼인 안정', result.marriageScore, '#0ea5e9'),
        scoreCard('갈등 리스크', result.riskScore, '#ef4444'),
      ),
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '14px',
          },
        },
        h(Text, { style: { margin: '0 0 6px', fontSize: '12px', color: '#475569', fontWeight: 700 } }, '리스크 상태'),
        h(
          Text,
          { style: { margin: '0', fontSize: '14px', color: '#334155' } },
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
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '14px',
          },
        },
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: '#475569', fontWeight: 700 } }, '핵심 요약'),
        h(Text, { style: { margin: '0 0 10px', fontSize: '14px', color: '#334155', lineHeight: '1.65' } }, result.summary),
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: '#475569', fontWeight: 700 } }, '좋은 흐름'),
        h(Text, { style: { margin: '0 0 10px', fontSize: '14px', color: '#334155', lineHeight: '1.65' } }, result.highlight),
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: '#475569', fontWeight: 700 } }, '주의 포인트'),
        h(Text, { style: { margin: '0 0 10px', fontSize: '14px', color: '#334155', lineHeight: '1.65' } }, result.caution),
        h(Text, { style: { margin: '0 0 8px', fontSize: '12px', color: '#475569', fontWeight: 700 } }, '타이밍 힌트'),
        h(Text, { style: { margin: '0', fontSize: '14px', color: '#334155', lineHeight: '1.65' } }, result.timingHint),
      ),
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '14px',
          },
        },
        h(Text, { style: { margin: '0 0 10px', fontSize: '14px', color: '#0f172a', fontWeight: 800 } }, '상세 가이드 (열기/닫기)'),
        ...detailedSections.map((section) => detailsBlock(section.title, section.body)),
      ),
      h(
        Section,
        {
          style: {
            marginTop: '12px',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: CARD_RADIUS,
            backgroundColor: SECTION_BG,
            padding: '14px',
          },
        },
        h(Text, { style: { margin: '0 0 10px', fontSize: '14px', color: '#0f172a', fontWeight: 800 } }, '연도별 실행 포인트 (열기/닫기)'),
        ...yearlyGuidance.map((row) => yearlyDetailsBlock(row.year, row.loveChance, row.breakupRisk, row.focus)),
      ),
      h(
        Text,
        {
          style: {
            margin: '14px 0 0',
            color: '#64748b',
            fontSize: '12px',
            lineHeight: '1.6',
          },
        },
        `모델 버전: ${result.modelVersion} · 신뢰도 ${ratioToPercent(result.confidence)}%`,
      ),
      h(
        Text,
        {
          style: {
            margin: '6px 0 0',
            color: '#64748b',
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
  const html = await render(loveResultTemplate(payload));
  return {
    html,
    text: toPlainText(html),
  };
}

export async function renderAdminSummaryEmail(payload: AdminSummaryEmailPayload): Promise<RenderedEmail> {
  const html = await render(adminSummaryTemplate(payload));
  return {
    html,
    text: toPlainText(html),
  };
}

