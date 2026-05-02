import type { LoveJobResult } from '../love-job-types';
import { createHash } from "node:crypto";
import { renderAdminSummaryEmail, renderLoveResultEmail } from './email-templates';

type EmailSendPayload = {
  to: string;
  name: string;
  requestId: string;
  result: LoveJobResult;
};

type EmailSendResult = {
  provider: "resend" | "console";
  messageId: string | null;
};

type AdminSummaryPayload = {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  status: "completed" | "failed";
  error: string | null;
  source: "api" | "worker";
  result: LoveJobResult | null;
};

const ADMIN_NOTIFY_EMAIL = "hanmw110@naver.com";

function toAsciiIdempotencyKey(prefix: string, raw: string) {
  const digest = createHash("sha256").update(raw).digest("hex");
  return `${prefix}-${digest.slice(0, 40)}`;
}

async function sendWithResend(payload: EmailSendPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("resend_not_configured");
  }

  const rendered = await renderLoveResultEmail({
    requestId: payload.requestId,
    name: payload.name,
    result: payload.result,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": toAsciiIdempotencyKey("love-job", payload.requestId),
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: "[사주 결과] 청하신 연애운 풀이 글월이 도착했사옵니다",
      text: rendered.text,
      html: rendered.html,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(body?.error?.message ?? "resend_send_failed");
  }

  return {
    provider: "resend",
    messageId: body.id ?? null,
  };
}

async function sendAdminSummaryWithResend(payload: AdminSummaryPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("resend_not_configured");
  }

  const rendered = await renderAdminSummaryEmail(payload);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": toAsciiIdempotencyKey(
        "love-job-admin",
        `${payload.requestId}:${payload.status}`,
      ),
    },
    body: JSON.stringify({
      from,
      to: [ADMIN_NOTIFY_EMAIL],
      subject: `[관리자] ${payload.requestId} ${payload.status === "completed" ? "성공" : "실패"}`,
      text: rendered.text,
      html: rendered.html,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(body?.error?.message ?? "resend_admin_summary_failed");
  }

  return {
    provider: "resend",
    messageId: body.id ?? null,
  };
}

export async function sendLoveResultEmail(payload: EmailSendPayload): Promise<EmailSendResult> {
  const mode = process.env.EMAIL_PROVIDER ?? (process.env.RESEND_API_KEY ? "resend" : "console");

  if (mode === "resend") {
    return sendWithResend(payload);
  }

  // Console mode for local/dev tests.
  console.info(
    JSON.stringify({
      level: "info",
      event: "email_console_preview",
      to: payload.to,
      requestId: payload.requestId,
      summary: payload.result.summary,
    }),
  );

  return {
    provider: "console",
    messageId: null,
  };
}

export async function sendAdminJobSummaryEmail(payload: AdminSummaryPayload): Promise<EmailSendResult> {
  const mode = process.env.EMAIL_PROVIDER ?? (process.env.RESEND_API_KEY ? "resend" : "console");

  if (mode === "resend") {
    return sendAdminSummaryWithResend(payload);
  }

  console.info(
    JSON.stringify({
      level: "info",
      event: "admin_email_console_preview",
      adminTo: ADMIN_NOTIFY_EMAIL,
      requestId: payload.requestId,
      status: payload.status,
      requesterName: payload.requesterName,
      requesterEmail: payload.requesterEmail,
      error: payload.error ?? null,
      source: payload.source,
    }),
  );

  return {
    provider: "console",
    messageId: null,
  };
}
