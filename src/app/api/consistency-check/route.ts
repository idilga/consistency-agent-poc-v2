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

    // Calculate score using our algorithm
    const result = calculateConsistencyScore(content as GeneratedContent, brandRules);

    return NextResponse.json({
      success: true,
      score: result.score,
      grade: getGrade(result.score),
      violations: result.violations,
      appliedRules: result.appliedRules,
      suggestions: result.suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Consistency check error:', error);
    return NextResponse.json(
      { 
        error: 'Consistency check mislukt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 95) return { letter: 'A+', color: 'green' };
  if (score >= 90) return { letter: 'A', color: 'green' };
  if (score >= 80) return { letter: 'B', color: 'blue' };
  if (score >= 70) return { letter: 'C', color: 'yellow' };
  if (score >= 60) return { letter: 'D', color: 'orange' };
  return { letter: 'F', color: 'red' };
}