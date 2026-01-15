// src/app/api/generate-image/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CanvasSpec } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SupportedSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';

function pickImageSize(canvas?: CanvasSpec): SupportedSize {
  // Als je geen gedoe wilt: return 'auto';
  if (!canvas || !canvas.width || !canvas.height) return 'auto';

  const r = canvas.width / canvas.height;

  // portrait
  if (r < 0.9) return '1024x1536';

  // landscape
  if (r > 1.1) return '1536x1024';

  // square-ish
  return '1024x1024';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, canvas } = body as { prompt: string; canvas?: CanvasSpec };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const size = pickImageSize(canvas);

    const finalPrompt =
      `${prompt}\n\n` +
      `Hard requirements:\n` +
      `- No text, no letters, no logos, no typography.\n` +
      `- Background-only visual.\n` +
      `- Leave clean negative space in safe areas for UI overlay.\n`;

    const img = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: finalPrompt,
      size, // nu altijd supported
    });

    const b64 = (img as any)?.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: 'Beeldgeneratie gaf geen base64 terug', details: 'Missing b64_json in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageBase64: b64,
      mimeType: 'image/png',
      size,
      timestamp: new Date().toISOString(),
      model: 'gpt-image-1',
    });
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json(
      {
        error: 'Beeldgeneratie mislukt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
