// lib/types.ts

export interface Briefing {
  projectName: string;
  targetAudience: string;
  goal: string;
channel: 'led-wall-retail' | 'digital-signage' | 'online-campaign';  
additionalNotes?: string;
}

export interface BrandRules {
  source?: 'pdf' | 'manual' | 'ai-analyzed';
  tone?: string;
  style?: string[];
  constraints?: string[];
  rawText?: string;
}

export interface GeneratedContent {
  briefingSpec: {
    summary: string;
    targetAudience: string;
    keyMessages: string[];
    channel: string;
    constraints: string[];
  };
  imagePrompt: string;
  contentCopy: string;
  appliedRules: string[];
  warnings: string[];
}

export interface Violation {
  rule: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  location: string;
}

export interface ConsistencyResult {
  score: number;
  grade: {
    letter: string;
    color: string;
  };
  violations: Violation[];
  appliedRules: string[];
  suggestions: string[];
}

export interface PreCheckResult {
  valid: boolean;
  missing: Array<{
    field: string;
    reason: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  conflicts: Array<{
    area: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  warnings: Array<{
    area: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  canProceed?: boolean;
}