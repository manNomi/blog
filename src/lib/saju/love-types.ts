export type LoveJobInput = {
  name: string;
  email: string;
  gender: 'male' | 'female';
  calendarType: 'solar' | 'lunar';
  birthDate: string;
  birthTime: string;
  birthPlace: string;
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
