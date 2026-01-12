// src/app/api/generate/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateContentPrompt } from '@/lib/prompts';
import { Briefing, GeneratedContent } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { briefing, brandRules } = await request.json();

    if (!briefing || !brandRules) {
      return NextResponse.json(
        { error: 'Briefing and brand rules are required' },
        { status: 400 }
      );
    }

    const prompt = generateContentPrompt(briefing as Briefing, brandRules);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional brand-consistent content generator. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    const result: GeneratedContent = JSON.parse(content || '{}');

    return NextResponse.json({
      success: true,
      ...result,
      metadata: {
        model: "gpt-4o-mini",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { 
        error: 'Content generatie mislukt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}