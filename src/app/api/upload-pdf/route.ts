// src/app/api/upload-pdf/route.ts
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Geen bestand gevonden' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Alleen PDF bestanden zijn toegestaan' },
        { status: 400 }
      );
    }

    // Convert to array buffer
    const bytes = await file.arrayBuffer();
    
    // Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(bytes, { 
      ignoreEncryption: true 
    });
    
    const numPages = pdfDoc.getPageCount();
    
    // Get form fields and metadata as text
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    let extractedText = '';
    
    // Try to get text from form fields
    fields.forEach(field => {
      const name = field.getName();
      try {
        // @ts-ignore
        const value = field.constructor.name.includes('Text') ? field.getText() : '';
        if (value) {
          extractedText += `${name}: ${value}\n`;
        }
      } catch (e) {
        // Skip fields that can't be read
      }
    });
    
    // Get metadata
    const title = pdfDoc.getTitle();
    const subject = pdfDoc.getSubject();
    const author = pdfDoc.getAuthor();
    
    if (title) extractedText += `Title: ${title}\n`;
    if (subject) extractedText += `Subject: ${subject}\n`;
    if (author) extractedText += `Author: ${author}\n`;
    
    // If no text found, return instructions
    if (!extractedText.trim()) {
      extractedText = `PDF uploaded successfully (${numPages} pages).\n\nNote: Text extraction from this PDF type is limited.\nPlease copy-paste your brand rules manually into the text area below.`;
    }

    // Clean up text
    const cleanedText = extractedText
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Try to extract structured rules
    const extractedRules = extractBrandRules(cleanedText);

    return NextResponse.json({
      text: cleanedText,
      pages: numPages,
      filename: file.name,
      extractedRules,
      note: 'Limited text extraction - please verify and edit below'
    });

  } catch (error) {
    console.error('PDF parse error:', error);
    return NextResponse.json(
      { 
        error: 'PDF loaded but text extraction failed',
        message: 'Please copy-paste your brand rules manually',
        details: (error as Error).message 
      },
      { status: 200 } // Return 200 so user can still use the app
    );
  }
}

function extractBrandRules(text: string) {
  const rules = {
    tone: null as string | null,
    style: [] as string[],
    constraints: [] as string[]
  };

  // Extract tone
  const toneMatch = text.match(/tone[:\s]+(.*?)(?:\n|\.)/i);
  if (toneMatch) {
    rules.tone = toneMatch[1].trim();
  }

  // Extract style guidelines
  const styleMatches = text.match(/(?:style|voice|writing)[:\s]+([^\n]+)/gi);
  if (styleMatches) {
    rules.style = styleMatches.map(m => m.replace(/(?:style|voice|writing)[:\s]+/i, '').trim());
  }

  // Extract constraints
  const constraintKeywords = ['must', 'should', 'maximum', 'minimum', 'avoid', 'never', 'always'];
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const lineLower = line.toLowerCase();
    if (constraintKeywords.some(keyword => lineLower.includes(keyword))) {
      if (line.trim().length > 10 && line.trim().length < 200) {
        rules.constraints.push(line.trim());
      }
    }
  });

  return rules;
}