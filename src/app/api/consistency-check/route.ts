// src/app/api/consistency-check/route.ts
import { NextResponse } from 'next/server';
import { calculateConsistencyScore } from '@/lib/consistency-scorer';
import { GeneratedContent } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { content, brandRules } = await request.json();

    if (!content || !brandRules) {
      return NextResponse.json(
        { error: 'Content and brand rules are required' },
        { status: 400 }
      );
    }

    // 1) Jouw bestaande algoritme
    const result = calculateConsistencyScore(content as GeneratedContent, brandRules);

    // 2) Fallback: haal toetsbare regels uit brandRules zodat appliedRules nooit leeg is
    const candidateRules = extractTestableRules(String(brandRules));
    const coverage = candidateRules.length; // 0..25
    const fallbackApplied = candidateRules.slice(0, 8);

    const appliedRules =
      Array.isArray(result.appliedRules) && result.appliedRules.length > 0
        ? result.appliedRules
        : fallbackApplied;

    // 3) Maak score realistischer als coverage laag is (dus je check is onzeker)
    let score = typeof result.score === 'number' ? result.score : 0;

    // Als je vrijwel niets kon toetsen: cap de score (anders voelt 100 nep)
    if (coverage === 0) score = Math.min(score, 70);
    else if (coverage < 5) score = Math.min(score, 82);
    else if (coverage < 10) score = Math.min(score, 90);

    // Als er geen appliedRules zijn (zelfs fallback niet), cap nog harder
    if (!appliedRules || appliedRules.length === 0) {
      score = Math.min(score, 70);
    }

    // Clamp 0..100
    score = Math.max(0, Math.min(100, score));

    return NextResponse.json({
      success: true,
      score,
      grade: getGrade(score),
      violations: result.violations ?? [],
      appliedRules: appliedRules ?? [],
      suggestions: result.suggestions ?? [],
      timestamp: new Date().toISOString(),
      meta: {
        coverage,
        coverageNote:
          coverage === 0
            ? 'Geen toetsbare regels gevonden in brandRules (score is onzeker).'
            : coverage < 5
            ? 'Weinig toetsbare regels gevonden (score is beperkt betrouwbaar).'
            : coverage < 10
            ? 'Redelijk aantal regels gevonden (score is redelijk betrouwbaar).'
            : 'Voldoende regels gevonden voor toetsing.',
        usedFallbackAppliedRules:
          !(Array.isArray(result.appliedRules) && result.appliedRules.length > 0),
      },
    });
  } catch (error) {
    console.error('Consistency check error:', error);
    return NextResponse.json(
      {
        error: 'Consistency check mislukt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function extractTestableRules(brandRules: string) {
  const lines = brandRules
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Bullet rules + headers (zoals "KLEURREGELS:")
  const bulletsOrHeaders = lines.filter(
    (l) =>
      l.startsWith('-') ||
      l.startsWith('•') ||
      /^[A-ZÄÖÜ][A-ZÄÖÜ\s]{2,}:$/.test(l) || // "KLEURREGELS:"
      /^[A-Z][A-Za-z\s]{2,}:$/.test(l) // "Typography:"
  );

  // Zinnen met toets-woorden (NL/EN)
  const keywords = [
    'moet',
    'vermijd',
    'altijd',
    'nooit',
    'gebruik',
    'niet gebruiken',
    'use',
    'avoid',
    'always',
    'never',
    'must',
    'should',
  ];

  const keywordLines = lines.filter((l) => {
    const low = l.toLowerCase();
    return l.length >= 10 && l.length <= 180 && keywords.some((k) => low.includes(k));
  });

  const merged = Array.from(new Set([...bulletsOrHeaders, ...keywordLines]))
    .filter((l) => l.length >= 3)
    .slice(0, 25);

  // Maak headers niet “los” zichtbaar als applied rule
  return merged.filter((l) => !/^[A-ZÄÖÜ][A-ZÄÖÜ\s]{2,}:$/.test(l));
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 95) return { letter: 'A+', color: 'green' };
  if (score >= 90) return { letter: 'A', color: 'green' };
  if (score >= 80) return { letter: 'B', color: 'blue' };
  if (score >= 70) return { letter: 'C', color: 'yellow' };
  if (score >= 60) return { letter: 'D', color: 'orange' };
  return { letter: 'F', color: 'red' };
}
