// lib/consistency-scorer.ts
import { GeneratedContent, Violation } from './types';

export function calculateConsistencyScore(
  content: GeneratedContent,
  brandRules: string
): {
  score: number;
  violations: Violation[];
  appliedRules: string[];
  suggestions: string[];
} {
  let score = 100;
  const violations: Violation[] = [];
  const appliedRules: string[] = [];

  const rulesText = brandRules.toLowerCase();
  const contentText = JSON.stringify(content).toLowerCase();

  // Check 1: Word count constraints
  const wordCountMatch = rulesText.match(/max(?:imum)?\s+(\d+)\s+word/i);
  if (wordCountMatch) {
    const maxWords = parseInt(wordCountMatch[1]);
    const wordCount = content.contentCopy?.split(/\s+/).length || 0;
    
    if (wordCount > maxWords) {
      score -= 15;
      violations.push({
        rule: `Maximum ${maxWords} words`,
        severity: 'high',
        description: `Content has ${wordCount} words, exceeds limit by ${wordCount - maxWords}`,
        location: 'contentCopy'
      });
    } else {
      appliedRules.push(`Word count within limit (${wordCount}/${maxWords})`);
    }
  }

  // Check 2: Voice preference (we vs I)
  if (rulesText.includes('we') && rulesText.includes('not') && rulesText.includes('i')) {
    const hasI = /\bi\b/i.test(contentText);
    if (hasI) {
      score -= 10;
      violations.push({
        rule: "Use 'we' instead of 'I'",
        severity: 'medium',
        description: "Content contains first-person singular 'I'",
        location: 'contentCopy'
      });
    } else {
      appliedRules.push("Correctly uses 'we' instead of 'I'");
    }
  }

  // Check 3: Tone requirements
  if (rulesText.includes('positive')) {
    const negativeWords = ['bad', 'worst', 'terrible', 'awful', 'hate', 'never'];
    const hasNegative = negativeWords.some(word => contentText.includes(word));
    
    if (hasNegative) {
      score -= 8;
      violations.push({
        rule: 'Positive tone required',
        severity: 'medium',
        description: 'Content contains negative language',
        location: 'contentCopy'
      });
    } else {
      appliedRules.push('Maintains positive tone');
    }
  }

  // Check 4: Forbidden words/jargon
  if (rulesText.includes('avoid jargon') || rulesText.includes('no jargon')) {
    const jargonWords = ['leverage', 'synergy', 'paradigm', 'ecosystem', 'disrupt'];
    const hasJargon = jargonWords.some(word => contentText.includes(word));
    
    if (hasJargon) {
      score -= 12;
      violations.push({
        rule: 'Avoid jargon',
        severity: 'high',
        description: 'Content contains business jargon',
        location: 'contentCopy'
      });
    } else {
      appliedRules.push('Jargon-free language');
    }
  }

  // Check 5: Call-to-action requirement
  if (rulesText.includes('cta') || rulesText.includes('call-to-action') || rulesText.includes('call to action')) {
    const hasCTA = /\b(click|visit|discover|learn more|get started|sign up|subscribe|join)\b/i.test(contentText);
    
    if (!hasCTA) {
      score -= 10;
      violations.push({
        rule: 'Include call-to-action',
        severity: 'high',
        description: 'No clear call-to-action found',
        location: 'contentCopy'
      });
    } else {
      appliedRules.push('Includes clear call-to-action');
    }
  }

  // Check 6: Emoji usage
  if (rulesText.includes('emoji')) {
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(contentText);
    
    if (rulesText.includes('no emoji') && hasEmoji) {
      score -= 5;
      violations.push({
        rule: 'No emoji allowed',
        severity: 'low',
        description: 'Content contains emojis',
        location: 'contentCopy'
      });
    } else if (!rulesText.includes('no') && hasEmoji) {
      appliedRules.push('Appropriate emoji usage');
    }
  }

  // Check 7: Active voice
  if (rulesText.includes('active voice')) {
    const passiveIndicators = ['was', 'were', 'been', 'being'];
    const passiveCount = passiveIndicators.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (contentText.match(regex) || []).length;
    }, 0);
    
    if (passiveCount > 2) {
      score -= 8;
      violations.push({
        rule: 'Use active voice',
        severity: 'medium',
        description: 'Multiple passive voice constructions detected',
        location: 'contentCopy'
      });
    } else {
      appliedRules.push('Primarily active voice');
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    score,
    violations,
    appliedRules,
    suggestions: generateSuggestions(violations)
  };
}

function generateSuggestions(violations: Violation[]): string[] {
  const suggestions: string[] = [];
  
  violations.forEach(v => {
    if (v.rule.includes('word')) {
      suggestions.push('Consider shortening sentences and removing unnecessary words');
    }
    if (v.rule.includes('we')) {
      suggestions.push("Replace 'I' with 'we' to emphasize collective brand voice");
    }
    if (v.rule.includes('jargon')) {
      suggestions.push('Use simpler, more accessible language');
    }
    if (v.rule.includes('call-to-action')) {
      suggestions.push('Add a clear next step (e.g., "Learn more", "Get started")');
    }
  });
  
  return [...new Set(suggestions)]; // Remove duplicates
}