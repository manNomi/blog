export const RELATIONSHIP_STATUSES = ['none', 'interested', 'dating', 'unknown'] as const;

export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

export type LoveJobInput = {
  name: string;
  email: string;
  gender: 'male' | 'female';
  calendarType: 'solar' | 'lunar';
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  relationshipStatus: RelationshipStatus;
};

export type RelationshipStatus = "none" | "interested" | "dating" | "unknown";

export type LoveResultSection = {
  title: string;
  body: string;
};

export type LoveYearGuide = {
  year: number;
  loveChance: number;
  breakupRisk: number;
  focus: string;
};

export type LoveJobResult = {
  loveScore: number;
  marriageScore: number;
  riskScore: number;
  confidence: number;
  dominantElement: string;
  weakestElement: string;
  topYears: Array<{ year: number; loveChance: number; breakupRisk: number }>;
  evidenceCodes: string[];
  summary: string;
  highlight: string;
  caution: string;
  timingHint: string;
  detailedReport: string;
  detailedSections: LoveResultSection[];
  yearlyGuidance: LoveYearGuide[];
  modelVersion: string;
};

export type LoveJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type LoveEmailInfo = {
  to: string;
  provider: 'resend' | 'console';
  messageId: string | null;
  sent: boolean;
  sentAt: number | null;
  error: string | null;
};

export type LoveJob = {
  id: string;
  status: LoveJobStatus;
  input: LoveJobInput;
  result: LoveJobResult | null;
  error: string | null;
  email: LoveEmailInfo;
  accessTokenHash: string;
  createdAt: number;
  updatedAt: number;
  processingStartedAt: number | null;
  processingCompletedAt: number | null;
  retryCount: number;
  requestMeta: {
    ip: string;
    ua: string;
  };
};

export type LoveJobPublic = Omit<LoveJob, 'accessTokenHash' | 'requestMeta'>;

export const LOVE_JOBS_COLLECTION = 'sajuRequests';
