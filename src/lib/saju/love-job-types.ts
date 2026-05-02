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
  concern?: string;
};

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

export type LoveScoreRationales = {
  love: string;
  marriage: string;
  risk: string;
};

export type LoveSajuSnapshot = {
  pillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  dayMaster: {
    stem: string;
    branch: string;
    strength: number;
  };
  elementProfile: {
    dominant: string;
    weakest: string;
    balanceScore: number;
  };
  spousePalace: {
    branch: string;
    stability: number;
    conflictRisk: number;
    relations: string[];
  };
  spouseStar: {
    presence: number;
    balance: number;
    conflictRisk: number;
  };
  romanceStars: {
    peachInner: number;
    peachOuter: number;
    hongLuanCount: number;
    hongYanCount: number;
  };
  evidenceCodes: string[];
  traces: string[];
};

export type LoveConcernAnswer = {
  concern: string;
  answer: string;
  actionItems: string[];
};

export type LoveGenerationMeta = {
  provider: 'codex' | 'openai' | 'engine';
  model: string;
  attempts: number;
  generatedAt: number;
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
  scoreRationales?: LoveScoreRationales;
  sajuSnapshot?: LoveSajuSnapshot;
  concernAnswer?: LoveConcernAnswer;
  generationMeta?: LoveGenerationMeta;
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
