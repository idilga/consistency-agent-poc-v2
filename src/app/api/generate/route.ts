// src/app/api/generate/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { Briefing, CanvasSpec, LayoutSpec } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type GenerateRequestBody = {
  briefing: Briefing;
  brandRules: string;
  canvas?: CanvasSpec;
  layoutSpec?: LayoutSpec;
};

type GenerateResponseBody = {
  briefingSpec: any; // je kunt dit later typeren
  contentCopy: string;
  imagePrompt: string;
  appliedRules: string[];
  warnings: string[];
  layoutSpec?: LayoutSpec;
};

function clean(s: unknown) {
  return typeof s === 'string' ? s.trim() : '';
}

function buildGenerationPrompt(input: {
  briefing: Briefing;
  brandRules: string;
  canvas?: CanvasSpec;
  layoutSpec?: LayoutSpec;
}) {
  const { briefing, brandRules, canvas, layoutSpec } = input;

  const canvasLine =
    canvas?.width && canvas?.height ? `${canvas.width}x${canvas.height}px` : 'not provided';

  const layoutLine = layoutSpec?.layout?.length ? layoutSpec.layout.join(', ') : 'not provided';

  return `
You are an assistant for a creative concept workflow.

TASK
Given a project briefing and selected brand rules, generate:
1) A short, ready-to-use copy text (contentCopy) suitable for the chosen channel.
2) A strong, descriptive image prompt (imagePrompt) for a background-only visual (no text).
3) A concise briefingSpec JSON that captures the intent and constraints.
4) A short list of appliedRules (max 10) and warnings (max 5).

INPUT
Briefing:
- projectName: ${clean(briefing.projectName)}
- targetAudience: ${clean(briefing.targetAudience)}
- goal: ${clean(briefing.goal)}
- channel: ${clean(briefing.channel)}
- additionalNotes: ${clean(briefing.additionalNotes)}

Selected Brand Rules:
${clean(brandRules)}

Format / Canvas:
- canvas: ${canvasLine}
- safe_area: ${layoutSpec?.safe_area ? layoutSpec.safe_area : '10%'}
- layout: ${layoutLine}
- typography: ${layoutSpec?.typography ? layoutSpec.typography : 'bold headline + short subline'}

OUTPUT RULES
- imagePrompt: describe a background-only image. No text, no letters, no logos, no typography.
- Must leave clean negative space in safe areas for UI overlay.
- Keep copy short, clear, and channel-appropriate.
- Return strictly valid JSON with keys:
  briefingSpec, contentCopy, imagePrompt, appliedRules, warnings
`.trim();
}

function tryParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GenerateRequestBody>;
    const briefing = body.briefing as Briefing | undefined;
    const brandRules = clean(body.brandRules);
    const canvas = body.canvas;
    const layoutSpec = body.layoutSpec;

    //  Validatie: geen "prompt required" meer, maar briefing/brandRules checks
    if (!briefing) {
      return NextResponse.json({ error: 'Briefing is required' }, { status: 400 });
    }
    if (!clean(briefing.projectName)) {
      return NextResponse.json({ error: 'briefing.projectName is required' }, { status: 400 });
    }
    if (!clean(briefing.targetAudience)) {
      return NextResponse.json({ error: 'briefing.targetAudience is required' }, { status: 400 });
    }
    if (!clean(briefing.goal)) {
      return NextResponse.json({ error: 'briefing.goal is required' }, { status: 400 });
    }
    if (!clean(briefing.channel)) {
      return NextResponse.json({ error: 'briefing.channel is required' }, { status: 400 });
    }
    if (!brandRules) {
      return NextResponse.json({ error: 'brandRules is required' }, { status: 400 });
    }

    const generationPrompt = buildGenerationPrompt({ briefing, brandRules, canvas, layoutSpec });

    //  LLM call (Responses API). Werkt met moderne OpenAI SDK.
    const resp = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: generationPrompt,
      // Je kunt temperatuur aanpassen als je wil:
      // temperature: 0.7,
    });

    // Responses API kan outputtekst in meerdere chunks hebben.
    // Deze helper pakt het belangrijkste tekstveld.
    const outputText =
      // ts-expect-error - SDK types verschillen soms per versie
      resp.output_text ||
      // fallback: probeer 'output' te joinen als het bestaat
      JSON.stringify(resp);

    // We verwachten JSON als output. Probeer te parsen.
    const parsed = tryParseJSON<GenerateResponseBody>(outputText);

    if (!parsed) {
      // Als model toch extra tekst geeft, probeer JSON uit codeblock te halen (extra robust).
      const match = outputText.match(/\{[\s\S]*\}/);
      const rescued = match ? tryParseJSON<GenerateResponseBody>(match[0]) : null;

      if (!rescued) {
        return NextResponse.json(
          {
            error: 'Generatie gaf geen geldige JSON terug',
            details: 'Model output could not be parsed as JSON',
            raw: outputText.slice(0, 2000),
          },
          { status: 500 }
        );
      }

      // Return geredde JSON
      return NextResponse.json({
        ...rescued,
        layoutSpec: layoutSpec ?? rescued.layoutSpec,
      });
    }

    //  Normaliseer arrays
    const appliedRules = Array.isArray(parsed.appliedRules) ? parsed.appliedRules : [];
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

    return NextResponse.json({
      briefingSpec: parsed.briefingSpec ?? {},
      contentCopy: parsed.contentCopy ?? '',
      imagePrompt: parsed.imagePrompt ?? '',
      appliedRules,
      warnings,
      layoutSpec: layoutSpec ?? parsed.layoutSpec,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      {
        error: 'Generatie mislukt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
