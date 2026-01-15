// src/app/api/upload-pdf/route.ts
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand gevonden' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Alleen PDF bestanden zijn toegestaan' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    // Page count via pdf-lib
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const numPages = pdfDoc.getPageCount();

    let extractedText = '';
    let note: string | null = null;

    // ✅ pdf-parse dynamic import (werkt het vaakst met Next bundler / CJS)
    try {
      const mod: any = await import('pdf-parse');
      const pdfParse = mod?.default ?? mod;

      const parsed = await pdfParse(Buffer.from(bytes));
      extractedText = (parsed?.text || '').trim();

      // Als er amper tekst is, is het waarschijnlijk een gescande PDF / moeilijke layout
      if (extractedText.replace(/\s+/g, '').length < 200) {
        extractedText = '';
      }
    } catch {
      extractedText = '';
    }

    // Fallback: jouw oude methode (form fields + metadata)
    if (!extractedText) {
      note = 'Tekstextractie is beperkt (PDF type). Controleer en plak regels handmatig indien nodig.';

      const form = pdfDoc.getForm();
      const fields = form.getFields();
      let fallbackText = '';

      fields.forEach((field) => {
        const name = field.getName();
        try {
          // @ts-ignore
          const value = field.constructor.name.includes('Text') ? field.getText() : '';
          if (value) fallbackText += `${name}: ${value}\n`;
        } catch {
          // skip
        }
      });

      const title = pdfDoc.getTitle();
      const subject = pdfDoc.getSubject();
      const author = pdfDoc.getAuthor();

      if (title) fallbackText += `Title: ${title}\n`;
      if (subject) fallbackText += `Subject: ${subject}\n`;
      if (author) fallbackText += `Author: ${author}\n`;

      if (!fallbackText.trim()) {
        fallbackText = `PDF uploaded successfully (${numPages} pages).\n\nNote: Text extraction from this PDF type is limited.\nPlease copy-paste your brand rules manually into the text area below.`;
      }

      extractedText = fallbackText;
    }

    const cleanedText = extractedText.replace(/\n\s*\n/g, '\n').trim();

    const extractedRules = extractBrandRules(cleanedText);

    return NextResponse.json({
      text: cleanedText,
      pages: numPages,
      filename: file.name,
      extractedRules,
      note: note || undefined,
      textLength: cleanedText.length,
    });
  } catch (error) {
    console.error('PDF parse error:', error);
    return NextResponse.json(
      {
        error: 'PDF loaded but text extraction failed',
        message: 'Please copy-paste your brand rules manually',
        details: (error as Error).message,
      },
      { status: 200 }
    );
  }
}

function extractBrandRules(text: string) {
  const rules = {
    tone: null as string | null,
    style: [] as string[],
    constraints: [] as string[],
  };

  const toneMatch = text.match(/tone[:\s]+(.*?)(?:\n|\.)/i);
  if (toneMatch) rules.tone = toneMatch[1].trim();

  const styleMatches = text.match(/(?:style|voice|writing)[:\s]+([^\n]+)/gi);
  if (styleMatches) {
    rules.style = styleMatches.map((m) =>
      m.replace(/(?:style|voice|writing)[:\s]+/i, '').trim()
    );
  }

  const constraintKeywords = ['must', 'should', 'maximum', 'minimum', 'avoid', 'never', 'always'];
  text.split('\n').forEach((line) => {
    const lineLower = line.toLowerCase();
    if (constraintKeywords.some((k) => lineLower.includes(k))) {
      const t = line.trim();
      if (t.length > 10 && t.length < 200) rules.constraints.push(t);
    }
  });

  return rules;
}
