// lib/rule-validator.ts
import { Briefing, PreCheckResult } from './types';

export function validateBriefing(briefing: Briefing, brandRules: string): PreCheckResult {
  const missing: PreCheckResult['missing'] = [];
  const conflicts: PreCheckResult['conflicts'] = [];
  let valid = true;

  // Check required fields
  const requiredFields: Array<{ key: keyof Briefing; label: string }> = [
    { key: 'projectName', label: 'Project Name' },
    { key: 'targetAudience', label: 'Target Audience' },
    { key: 'goal', label: 'Goal' },
    { key: 'channel', label: 'Channel' }
  ];

  requiredFields.forEach(field => {
    const value = briefing[field.key];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push({
        field: field.label,
        reason: 'This field is required',
        severity: 'high'
      });
      valid = false;
    }
  });

  // Check for conflicts with brand rules
  if (brandRules) {
    const rulesLower = brandRules.toLowerCase();
    const briefingText = JSON.stringify(briefing).toLowerCase();

    // Check 1: Tone conflicts
    if (rulesLower.includes('professional') && briefingText.includes('casual')) {
      conflicts.push({
        area: 'Tone',
        issue: 'Briefing suggests casual tone, but brand requires professional',
        severity: 'high'
      });
      valid = false;
    }

    // Check 2: Channel appropriateness
    if (rulesLower.includes('no social media') && briefing.channel === 'social' as Briefing['channel']) {
      conflicts.push({
        area: 'Channel',
        issue: 'Social media not allowed according to brand rules',
        severity: 'high'
      });
      valid = false;
    }

    // Check 3: Length requirements
    const wordLimitMatch = rulesLower.match(/max(?:imum)?\s+(\d+)\s+word/);
    if (wordLimitMatch && briefing.additionalNotes) {
      const maxWords = parseInt(wordLimitMatch[1]);
      const notesWords = briefing.additionalNotes.split(/\s+/).length;
      
      if (notesWords > maxWords * 1.5) {
        conflicts.push({
          area: 'Length',
          issue: `Briefing seems too detailed for ${maxWords} word limit`,
          severity: 'medium'
        });
      }
    }

    // Check 4: Audience alignment
    if (rulesLower.includes('b2b') && briefingText.includes('consumer')) {
      conflicts.push({
        area: 'Audience',
        issue: 'Brand is B2B but briefing targets consumers',
        severity: 'high'
      });
      valid = false;
    }
  }

  return {
    valid,
    missing,
    conflicts,
    warnings: generateWarnings(briefing, brandRules),
    canProceed: valid && conflicts.length === 0
  };
}

function generateWarnings(briefing: Briefing, brandRules: string): PreCheckResult['warnings'] {
  const warnings: PreCheckResult['warnings'] = [];

  // Warning 1: Vague goal
  if (briefing.goal && briefing.goal.length < 20) {
    warnings.push({
      area: 'Goal',
      message: 'Goal description is quite short. Consider being more specific.',
      severity: 'low'
    });
  }

  // Warning 2: Generic audience
  if (briefing.targetAudience && 
      (briefing.targetAudience.toLowerCase().includes('everyone') || 
       briefing.targetAudience.toLowerCase().includes('general'))) {
    warnings.push({
      area: 'Target Audience',
      message: 'Audience is too broad. More specific targeting improves consistency.',
      severity: 'medium'
    });
  }

  // Warning 3: No brand rules
  if (!brandRules || brandRules.trim().length < 50) {
    warnings.push({
      area: 'Brand Rules',
      message: 'Brand rules seem incomplete. More detailed rules improve output quality.',
      severity: 'high'
    });
  }

  return warnings;
}