import { GeneratedContent } from '@/lib/types';

type Violation = { rule: string; description: string; location: string };
type Result = {
  score: number;
  appliedRules: string[];
  violations: Violation[];
  suggestions: string[];
};

function splitRules(brandRules: string): string[] {
  // pakt bullets en korte regels
  return brandRules
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-•]\s*/, ''))
    .filter((l) => l.length >= 6)
    .slice(0, 40); // cap: niet eindeloos
}

function includesAny(text: string, terms: string[]) {
  const t = text.toLowerCase();
  return terms.some((x) => t.includes(x.toLowerCase()));
}

export function calculateConsistencyScore(content: GeneratedContent, brandRules: string): Result {
  const rules = splitRules(brandRules);

  const outputText = `${content.contentCopy}\n\n${content.imagePrompt}`.toLowerCase();

  const appliedRules: string[] = [];
  const violations: Violation[] = [];
  const suggestions: string[] = [];

  // Heuristiek: detecteer categorieën + termen
  const mustColorTerms = ['kleur', 'colors', 'colour', 'hex', '#', 'primary', 'secondary'];
  const mustToneTerms = ['tone', 'toon', 'voice', 'vriendelijk', 'direct', 'motiverend', 'energiek'];
  const mustImageTerms = ['beeld', 'foto', 'photography', 'imagery', 'contrast', 'witruimte', 'layout'];

  // 1) Als brandrules helemaal leeg/te klein zijn → score niet 100
  if (rules.length < 3) {
    return {
      score: 55,
      appliedRules: [],
      violations: [
        {
          rule: 'Te weinig brand rules',
          description: 'Er zijn te weinig regels om een echte consistency-check te doen.',
          location: 'brandRules input',
        },
      ],
      suggestions: ['Voeg minimaal 8–12 toetsbare regels toe (kleur, tone of voice, beeld, layout).'],
    };
  }

  // 2) Applied rules: regels die “matchen” op output (simpel: keywords uit regel)
  for (const r of rules) {
    const keywords = r
      .toLowerCase()
      .replace(/[^\w\s#-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 5)
      .slice(0, 6);

    if (keywords.length === 0) continue;

    const hit = keywords.some((k) => outputText.includes(k));
    if (hit) appliedRules.push(r);
  }

  // 3) Violations: basis checks die altijd betekenis geven
  // KLEUR: als regels over kleur praten maar prompt noemt geen kleur
  const rulesMentionColor = includesAny(brandRules, mustColorTerms);
  const outputMentionsColor = includesAny(outputText, ['#', 'hex', 'kleur', 'oranje', 'zwart', 'wit', 'blauw', 'geel', 'rood']);

  if (rulesMentionColor && !outputMentionsColor) {
    violations.push({
      rule: 'Kleurtoepassing ontbreekt',
      description: 'Brand rules bevatten kleurregels, maar de output noemt geen kleurgebruik.',
      location: 'imagePrompt / contentCopy',
    });
    suggestions.push('Voeg kleuren toe aan de image prompt (bijv. “oranje/zwart/wit” of hex-codes).');
  }

  // TONE: als rules tone noemen maar copy is te neutraal
  const rulesMentionTone = includesAny(brandRules, mustToneTerms);
  const outputMentionsTone = includesAny(outputText, ['motiver', 'energiek', 'welkom', 'jij kan', 'samen', 'doel']);

  if (rulesMentionTone && !outputMentionsTone) {
    violations.push({
      rule: 'Tone of voice mismatch',
      description: 'Brand rules noemen tone-of-voice, maar de tekst bevat weinig tone-indicatoren.',
      location: 'contentCopy',
    });
    suggestions.push('Maak de copy duidelijker volgens tone-of-voice (bijv. direct, motiverend, kort).');
  }

  // BEELD/LAYOUT: als rules beeld/layout noemen maar prompt is vaag
  const rulesMentionImage = includesAny(brandRules, mustImageTerms);
  const promptTooShort = (content.imagePrompt || '').trim().length < 80;

  if (rulesMentionImage && promptTooShort) {
    violations.push({
      rule: 'Image prompt te vaag',
      description: 'Brand rules noemen beeld/layout, maar de image prompt is te kort om dit te sturen.',
      location: 'imagePrompt',
    });
    suggestions.push('Maak de image prompt specifieker (setting, licht, compositie, kleuren, stijl).');
  }

  // 4) Score: start bij 92, trek af per violation, bonus als veel applied rules
  let score = 92;
  score -= violations.length * 12;
  score += Math.min(appliedRules.length, 6) * 2;

  // clamp
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    appliedRules,
    violations,
    suggestions,
  };
}
