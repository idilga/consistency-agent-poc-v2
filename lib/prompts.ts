// lib/prompts.ts
import { Briefing } from './types';

export const generateContentPrompt = (briefing: Briefing, brandRules: string): string => {
  return `You are a professional brand-consistent content generator.

BRAND RULES (MUST FOLLOW STRICTLY):
${brandRules}

BRIEFING:
Project: ${briefing.projectName || 'Not specified'}
Target Audience: ${briefing.targetAudience || 'Not specified'}
Goal: ${briefing.goal || 'Not specified'}
Channel: ${briefing.channel || 'Not specified'}
Additional Notes: ${briefing.additionalNotes || 'None'}

TASK:
Generate content that strictly follows ALL brand rules. Return ONLY a JSON object with this structure:

{
  "briefingSpec": {
    "summary": "Brief summary of the project",
    "targetAudience": "Refined audience description",
    "keyMessages": ["message 1", "message 2", "message 3"],
    "channel": "specific channel details",
    "constraints": ["constraint 1", "constraint 2"]
  },
  "imagePrompt": "Detailed visual description for image generation (50-100 words, specific style/mood/elements)",
  "contentCopy": "The actual content text (following all brand rules)",
  "appliedRules": ["rule 1 that was applied", "rule 2 that was applied"],
  "warnings": ["any potential issues or suggestions"]
}

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;
};

export const consistencyCheckPrompt = (content: any, brandRules: string): string => {
  return `You are a brand consistency auditor.

BRAND RULES:
${brandRules}

GENERATED CONTENT TO AUDIT:
${JSON.stringify(content, null, 2)}

TASK:
Audit this content against the brand rules. Return ONLY a JSON object:

{
  "score": 85,
  "violations": [
    {
      "rule": "specific rule that was violated",
      "severity": "high",
      "description": "what exactly is wrong",
      "location": "where in content (briefingSpec/imagePrompt/contentCopy)"
    }
  ],
  "appliedRules": ["rule 1 that was correctly followed", "rule 2..."],
  "suggestions": ["suggestion 1 for improvement", "suggestion 2..."]
}

Score calculation:
- 100 = Perfect adherence
- 90-99 = Minor issues
- 70-89 = Some violations
- 50-69 = Major violations
- <50 = Critical violations

CRITICAL: Return ONLY valid JSON.`;
};

export const analyzeExamplesPrompt = (examples: string[]): string => {
  return `You are a brand voice analyzer.

EXAMPLE CONTENT:
${examples.join('\n\n---\n\n')}

TASK:
Analyze these examples and extract the brand rules. Return ONLY a JSON object:

{
  "tone": "description of tone (e.g., professional but friendly)",
  "style": "writing style patterns (e.g., short sentences, active voice)",
  "constraints": "observed constraints (e.g., word count, formatting)",
  "vocabulary": ["common words/phrases used"],
  "avoid": ["patterns to avoid based on what's NOT in examples"]
}

CRITICAL: Return ONLY valid JSON.`;
};