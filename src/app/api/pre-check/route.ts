// src/app/api/pre-check/route.ts
import { NextResponse } from 'next/server';
import { validateBriefing } from '@/lib/rule-validator';
import { Briefing } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { briefing, brandRules } = await request.json();

    if (!briefing) {
      return NextResponse.json(
        { error: 'Briefing is required' },
        { status: 400 }
      );
    }

    const validation = validateBriefing(briefing as Briefing, brandRules);

    return NextResponse.json({
      valid: validation.valid,
      missing: validation.missing,
      conflicts: validation.conflicts,
      warnings: validation.warnings,
      canProceed: validation.canProceed
    });

  } catch (error) {
    console.error('Pre-check error:', error);
    return NextResponse.json(
      { error: 'Validatie mislukt' },
      { status: 500 }
    );
  }
}