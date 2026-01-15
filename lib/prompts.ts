// lib/prompts.ts
import { Briefing, CanvasSpec, LayoutSpec } from './types';

export const generateContentPrompt = (
  briefing: Briefing,
  brandRules: string,
  canvas?: CanvasSpec,
  layoutSpec?: LayoutSpec
): string => {
  const canvasText = canvas ? `${canvas.width}x${canvas.height}px` : 'Not specified';
  const providedLayout = layoutSpec ? JSON.stringify(layoutSpec, null, 2) : 'Not provided';

  const channelGuidance =
    briefing.channel === 'digital-signage'
      ? `Kanaal: Digital signage
- Context: informatiescherm (vaak portrait)
- Tekst: extra kort en scanbaar (max 2 korte zinnen)
- Beeld: rustige achtergrond, veel witruimte/negative space voor overlay-tekst`
      : `Kanaal: LED wall
- Context: groot formaat scherm in experience/retail omgeving
- Tekst: kort en premium (2–3 korte zinnen max)
- Beeld: clean, high-impact achtergrond met duidelijke negatieve ruimte voor overlay-tekst`;

  return `Je bent een AI Content Consistency Assistant voor de Creative Studio van First Impression.
Je ondersteunt de conceptfase door briefing + geselecteerde brand rules te vertalen naar richtinggevende output.
Je vervangt de creative niet: je levert een gestructureerd startpunt dat controleerbaar en reproduceerbaar is (human-in-the-loop).

BRAND RULES (MOET JE STRIKT VOLGEN):
${brandRules}

Belangrijk:
- Brand rules zijn de bron van waarheid voor tone of voice, stijl, constraints en do/don'ts.
- Als de brand rules "Preferred wording examples" en/of "Avoid wording" bevatten, volg die dan strikt in de contentCopy.
- Als die voorbeelden ontbreken, houd de contentCopy alsnog consistent met de aanwezige tone/stijl regels.

BRIEFING:
Project: ${briefing.projectName || 'Niet gespecificeerd'}
Doelgroep: ${briefing.targetAudience || 'Niet gespecificeerd'}
Doel / boodschap: ${briefing.goal || 'Niet gespecificeerd'}
Kanaal: ${briefing.channel || 'Niet gespecificeerd'}
Extra notities: ${briefing.additionalNotes || 'Geen'}

CANVAS (target deliverable):
${canvasText}

${channelGuidance}

OPTIONAL PROVIDED LAYOUT SPEC (template/assumpties vanuit UI):
${providedLayout}

TAKEN:
Genereer output die strikt voldoet aan alle brand rules. Return ALLEEN een JSON object met exact deze structuur en keys:

{
  "briefingSpec": {
    "summary": "Korte samenvatting van wat de output moet communiceren",
    "targetAudience": "Aangescherpte doelgroepomschrijving",
    "keyMessages": ["boodschap 1", "boodschap 2", "boodschap 3"],
    "channel": "korte interpretatie van het kanaal voor deze deliverable",
    "constraints": ["constraint 1", "constraint 2"]
  },
  "contentCopy": "Nederlandstalige concepttekst die voldoet aan brand rules en kanaal-lengte.",
  "imagePrompt": "ENGLISH background-only image prompt that fits the canvas. IMPORTANT: no text, no letters, no logos, no typography in the image. Leave clean negative space for UI text overlay.",
  "layoutSpec": {
    "format": "${briefing.channel}",
    "canvas": { "width": ${canvas?.width ?? 1600}, "height": ${canvas?.height ?? 1200} },
    "safe_area": "10%",
    "layout": ["headline_top_left", "visual_center", "cta_bottom_left"],
    "typography": "bold headline + short subline",
    "notes": "Background-only image. Text will be applied as UI overlay."
  },
  "appliedRules": ["regel die is toegepast", "regel die is toegepast"],
  "warnings": ["mogelijke issue / ontbrekende info / suggestie voor betere input"]
}

REGELS VOOR contentCopy (NEDERLANDS):
- Schrijf in het Nederlands.
- Houd het conceptfase-waardig: richtinggevend, helder, minimal.
- Tone of voice moet matchen met brand rules (en met Preferred wording examples als die bestaan).
- Vermijd Avoid wording (en close varianten) als dit in de brand rules staat.
- Kanaal-lengte:
  - Digital signage: maximaal 2 korte zinnen.
  - LED wall: maximaal 2–3 korte zinnen, nog steeds minimal/premium.
- Vermijd overdreven claims of “salesy” taal tenzij brand rules dat expliciet toestaan.

REGELS VOOR imagePrompt (ENGLISH):
- Must fit the canvas: ${canvasText}.
- Background-only. No text, no typography, no logos, no letters.
- Leave clear negative space in safe areas for UI overlay text.
- Be specific about style, mood, composition, lighting, materials, and key elements.
- Keep it reproducible: avoid vague words like "beautiful"; describe what to generate.

REGELS VOOR layoutSpec:
- Laat de keys exact zo staan (format/canvas/safe_area/layout/typography/notes).
- Layout moet passen bij het kanaal:
  - LED wall: ["headline_top_left","visual_center","cta_bottom_left"]
  - Digital signage: ["headline_top","visual_center","cta_bottom"]
- Als er een layoutSpec is meegegeven in de input, neem die over en verbeter alleen als het echt conflicteert met kanaal/canvas.

CRITICAL:
- Return ONLY valid JSON (geen markdown, geen backticks, geen uitleg).
- Houd JSON-keys exact gelijk aan het schema hierboven.
- imagePrompt mag nooit tekst-in-beeld vragen.
- Zorg dat de JSON parsebaar is.`;
};

export const consistencyCheckPrompt = (content: any, brandRules: string): string => {
  return `Je bent een brand consistency auditor voor de Creative Studio (First Impression).
Je controleert of de gegenereerde concept-output voldoet aan de brand rules. De gebruiker blijft eindverantwoordelijk (human-in-the-loop).

BRAND RULES:
${brandRules}

GENERATED CONTENT TO AUDIT:
${JSON.stringify(content, null, 2)}

TAKEN:
Audit deze output tegen de brand rules. Return ALLEEN een JSON object:

{
  "score": 85,
  "violations": [
    {
      "rule": "welke specifieke regel is overtreden",
      "severity": "high",
      "description": "wat is er precies mis en waarom",
      "location": "waar in content (briefingSpec/imagePrompt/contentCopy)"
    }
  ],
  "appliedRules": ["regel die aantoonbaar goed gevolgd is", "regel die goed gevolgd is"],
  "suggestions": ["concrete verbeteractie 1", "concrete verbeteractie 2"]
}

Extra beoordelingsregels:
- Als brand rules "Preferred wording examples" bevatten: contentCopy moet daar duidelijk op lijken.
- Als brand rules "Avoid wording" bevatten: gebruik ervan (of close variant) is een overtreding.
- Als imagePrompt tekst/logos/typography in het beeld vraagt: severity high.
- Als contentCopy te lang is voor het kanaal (signage/LED): severity medium.

Score calculation:
- 100 = Perfect adherence
- 90-99 = Minor issues
- 70-89 = Some violations
- 50-69 = Major violations
- <50 = Critical violations

CRITICAL: Return ONLY valid JSON.`;
};

export const analyzeExamplesPrompt = (examples: string[]): string => {
  return `Je bent een brand voice analyzer.
Je analyseert alleen de meegegeven voorbeelden (geen externe aannames).

EXAMPLE CONTENT:
${examples.join('\n\n---\n\n')}

TAKEN:
Analyseer de voorbeelden en extraheer brand rules. Return ALLEEN een JSON object:

{
  "tone": "beschrijving van tone of voice",
  "style": "schrijfpatronen en structuur",
  "constraints": "observed constraints (zoals lengte, formatting, verboden/vereiste elementen)",
  "vocabulary": ["woorden/frasen die vaak terugkomen"],
  "avoid": ["patronen/woorden om te vermijden"]
}

CRITICAL: Return ONLY valid JSON.`;
};
