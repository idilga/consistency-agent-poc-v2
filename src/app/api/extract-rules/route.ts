// src/app/api/extract-rules/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function POST(req: Request) {
  try {
    if (!openai) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ontbreekt' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const pdfText = (body?.pdfText as string | undefined) ?? '';

    if (!pdfText.trim()) {
      return NextResponse.json({ error: 'pdfText is verplicht' }, { status: 400 });
    }

    //  Groot-PDF fix: pak alleen een representatief deel (head + tail)
    // Dit voorkomt token/size issues en houdt je PoC stabiel.
    const MAX_CHUNK = 60000; // 60k chars per chunk is ruim genoeg voor brand rules
    const head = pdfText.slice(0, MAX_CHUNK);
    const tail = pdfText.length > MAX_CHUNK ? pdfText.slice(-MAX_CHUNK) : '';
    const combined = tail
      ? `${head}\n\n---\n\n[END OF DOCUMENT EXCERPT]\n\n${tail}`
      : head;

    const note =
      pdfText.length > MAX_CHUNK
        ? `Input was groot (${pdfText.length} chars). Gebruikt: eerste ${MAX_CHUNK} + laatste ${MAX_CHUNK} chars.`
        : `Input gebruikt: ${pdfText.length} chars.`;

    // LET OP: we vragen NIET om “alles”, alleen toetsbare regels voor jouw PoC
    const prompt = `
Je bent een brand guideline extractor voor een Consistency PoC.

Taak:
- Lees de aangeleverde brandguide-tekst (kan een excerpt zijn).
- Geef een compacte set "toetsbare brand rules" terug die je kunt gebruiken voor een consistency-check.
- Focus alleen op: KLEUR, TYPOGRAFIE, TONE OF VOICE, BEELDGEBRUIK, LAYOUT.
- Laat technische print/bleed/legal en logo-construction details weg.
- Schrijf regels concreet/toetsbaar (bijv. "Gebruik X als hoofdkleur" i.p.v. vage marketingtaal).

Output format (exact):
BRON: <1 zin over de bron (PDF) en dat dit een selectie/extract is>
KLEURREGELS:
- ...
TYPOGRAFIE:
- ...
TONE OF VOICE:
- ...
BEELDGEBRUIK:
- ...
LAYOUT:
- ...

Tekst (excerpt):
${combined}
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const rules = completion.choices?.[0]?.message?.content?.trim();

    if (!rules) {
      return NextResponse.json({ error: 'Kon geen brand rules extraheren' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      rules,
      note, // handig voor debug/portfolio: laat zien dat je bewust chunking gebruikt
      usedChars: {
        original: pdfText.length,
        head: head.length,
        tail: tail.length,
        combined: combined.length,
      },
      timestamp: new Date().toISOString(),
      model: 'gpt-4.1-mini',
    });
  } catch (error: any) {
    const status = error?.status ?? 500;
    const msg = error?.message || 'Onbekende fout';

    return NextResponse.json({ error: 'Extract rules mislukt', details: msg }, { status });
  }
}
