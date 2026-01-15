'use client';

import { useEffect, useState } from 'react';
import type {
  Briefing,
  GeneratedContent,
  ConsistencyResult,
  PreCheckResult,
  CanvasSpec,
  LayoutSpec,
} from '@/lib/types';

export default function Home() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const [brandRules, setBrandRules] = useState<string>('');
  const [pdfInfo, setPdfInfo] = useState<{ filename: string; pages: number } | null>(null);

  const [pdfText, setPdfText] = useState<string>('');

  const [rulesLoading, setRulesLoading] = useState<boolean>(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [briefing, setBriefing] = useState<Briefing>({
    projectName: '',
    targetAudience: '',
    goal: '',
    channel: 'led-wall-retail',
    additionalNotes: '',
  });

  const getDefaultCanvasForChannel = (channel: Briefing['channel']): CanvasSpec => {
    if (channel === 'digital-signage') return { width: 1080, height: 1920 };
    return { width: 1600, height: 1200 };
  };

  const [canvas, setCanvas] = useState<CanvasSpec>(getDefaultCanvasForChannel('led-wall-retail'));
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [preCheckResult, setPreCheckResult] = useState<PreCheckResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyResult | null>(null);

  const [exampleImage, setExampleImage] = useState<{ dataUrl: string; filename: string } | null>(null);

  const [generatedImage, setGeneratedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    timestamp?: string;
    model?: string;
    size?: string;
  } | null>(null);

  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    setCanvas(getDefaultCanvasForChannel(briefing.channel));
    setShowAdvanced(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefing.channel]);

  const layoutSpec: LayoutSpec = {
    format: briefing.channel,
    canvas,
    safe_area: '10%',
    layout:
      briefing.channel === 'digital-signage'
        ? ['headline_top', 'visual_center', 'cta_bottom']
        : ['headline_top_left', 'visual_center', 'cta_bottom_left'],
    typography: 'bold headline + short subline',
    notes: 'Prototype supports two formats only. Image is background-only. Text is UI overlay.',
  };

  useEffect(() => {
    if (step === 3) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setRulesError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({} as any));

      if ((res.ok && data.text) || data.text) {
        const text = data.text ?? '';
        setBrandRules(text);
        setPdfText(text);

        setPdfInfo({
          filename: data.filename ?? file.name,
          pages: data.pages ?? 1,
        });

        if (data.note) alert(data.note);
      } else {
        alert(data.error || 'PDF upload mislukt');
      }
    } catch {
      alert('Kon PDF niet uploaden');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractRulesFromPdf = async () => {
    if (!pdfText.trim()) {
      alert('Upload eerst een PDF zodat er tekst beschikbaar is.');
      return;
    }

    setRulesLoading(true);
    setRulesError(null);

    try {
      const res = await fetch('/api/extract-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfText }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const details = data?.details ? ` — ${data.details}` : '';
        setRulesError((data?.error || 'Rules extractie mislukt') + details);
        return;
      }

      setBrandRules(data.rules || '');
      alert('AI rules voorstel is ingevuld. Controleer en pas aan waar nodig.');
    } catch {
      setRulesError('Onbekende fout bij rules extractie');
    } finally {
      setRulesLoading(false);
    }
  };

  const handlePreCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pre-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing, brandRules }),
      });

      const data = await res.json().catch(() => ({} as any));
      setPreCheckResult(data);

      if (data?.canProceed) setStep(3);
      else setStep(2);
    } catch {
      alert('Pre-check mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);

    setGeneratedImage(null);
    setImageError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing, brandRules, canvas, layoutSpec }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        alert(data.error || 'Generatie mislukt');
        setStep(1);
        return;
      }

      const mappedContent: GeneratedContent = {
        briefingSpec: data.briefingSpec,
        imagePrompt: data.imagePrompt,
        contentCopy: data.contentCopy,
        appliedRules: data.appliedRules ?? [],
        warnings: data.warnings ?? [],
        layoutSpec: data.layoutSpec ?? layoutSpec,
      };

      setGeneratedContent(mappedContent);

      const checkRes = await fetch('/api/consistency-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: mappedContent,
          brandRules,
        }),
      });

      const checkData = await checkRes.json().catch(() => ({} as any));

      const mappedResult: ConsistencyResult = {
        score: checkData.score,
        grade: checkData.grade,
        violations: checkData.violations ?? [],
        appliedRules: checkData.appliedRules ?? [],
        suggestions: checkData.suggestions ?? [],
      };

      setConsistencyResult(mappedResult);
      setStep(4);
    } catch {
      alert('Er ging iets fout tijdens genereren');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const buildImagePromptForModel = (basePrompt: string) => {
    const placementHint =
      briefing.channel === 'digital-signage'
        ? `\n\nLeave a clean safe area at the top for a readable headline, and a clear area at the bottom for a CTA. Keep these areas uncluttered.`
        : `\n\nLeave a clean safe area at the top-left for a readable headline, and a clear area at the bottom-left for a CTA. Keep these areas uncluttered.`;

    const qualityHint = `\nClean composition, professional, high contrast, minimal noise.`;

    return `${basePrompt.trim()}${placementHint}${qualityHint}`.trim();
  };

  const handleGenerateImage = async () => {
    if (step !== 4) {
      alert('Beeldgeneratie is pas beschikbaar in stap 4.');
      return;
    }
    if (!generatedContent?.imagePrompt?.trim()) {
      alert('Geen image prompt beschikbaar. Genereer eerst content.');
      return;
    }

    setImageLoading(true);
    setImageError(null);

    try {
      const upgradedPrompt = buildImagePromptForModel(generatedContent.imagePrompt);

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: upgradedPrompt, canvas }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const details = data?.details ? ` — ${data.details}` : '';
        setImageError((data?.error || 'Beeldgeneratie mislukt') + details);
        setGeneratedImage(null);
        return;
      }

      const mimeType = data?.mimeType || 'image/png';
      const b64 = data?.imageBase64;

      if (!b64) {
        setImageError('Beeldgeneratie gaf geen base64 terug');
        setGeneratedImage(null);
        return;
      }

      setGeneratedImage({
        dataUrl: `data:${mimeType};base64,${b64}`,
        mimeType,
        timestamp: data?.timestamp,
        model: data?.model,
        size: data?.size,
      });
    } catch {
      setImageError('Onbekende fout bij beeldgeneratie');
      setGeneratedImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!generatedContent?.imagePrompt) return;
    try {
      await navigator.clipboard.writeText(generatedContent.imagePrompt);
      alert('Image prompt is gekopieerd.');
    } catch {
      alert('Kopiëren lukt niet. Selecteer de tekst en kopieer handmatig.');
    }
  };

  const handleUploadExampleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        alert('Kon het bestand niet lezen');
        return;
      }
      setExampleImage({ dataUrl: result, filename: file.name });
    };
    reader.onerror = () => alert('Kon het bestand niet lezen');
    reader.readAsDataURL(file);
  };

  const resetAll = () => {
    setStep(1);
    setGeneratedContent(null);
    setConsistencyResult(null);
    setPreCheckResult(null);
    setExampleImage(null);

    setGeneratedImage(null);
    setImageError(null);
    setImageLoading(false);

    setPdfText('');
    setRulesError(null);
    setRulesLoading(false);
    setPdfInfo(null);
    setBrandRules('');
    setBriefing({
      projectName: '',
      targetAudience: '',
      goal: '',
      channel: 'led-wall-retail',
      additionalNotes: '',
    });

    setCanvas(getDefaultCanvasForChannel('led-wall-retail'));
    setShowAdvanced(false);
  };

  const canPreCheck =
    !!brandRules.trim() &&
    !!briefing.projectName?.trim() &&
    !!briefing.targetAudience?.trim() &&
    !!briefing.goal?.trim() &&
    !!briefing.channel;

  const aspectRatio = canvas.width / canvas.height;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Consistency Agent v2
          </h1>
          <p className="text-gray-600 mt-3">AI-ondersteunde consistentiecheck voor concept en visuele richting</p>
        </header>

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-3">Brand rules (selectie)</h2>
              <div className="text-sm text-gray-600 mb-3">
                Uploaden is ter referentie. Plak hieronder alleen de brand rules die relevant zijn voor dit project.
              </div>

              <input type="file" accept=".pdf" onChange={handlePdfUpload} />

              <button
                onClick={handleExtractRulesFromPdf}
                disabled={rulesLoading || loading || !pdfText.trim()}
                className="mt-3 w-full bg-black text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
              >
                {rulesLoading ? 'Rules extraheren…' : 'Haal rules uit PDF (AI voorstel)'}
              </button>

              {rulesError && <p className="mt-2 text-sm text-red-600">{rulesError}</p>}

              {pdfInfo && (
                <p className="text-sm text-green-700 mt-2">
                  {pdfInfo.filename} ({pdfInfo.pages} pagina&apos;s)
                </p>
              )}

              <textarea
                className="w-full mt-4 border p-3 rounded-lg h-32"
                placeholder="Plak of typ de geselecteerde brand/visual guidelines"
                value={brandRules}
                onChange={(e) => setBrandRules(e.target.value)}
              />
            </div>

            <div className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="text-xl font-bold">Briefing</h2>

              <input
                className="w-full border p-3 rounded"
                placeholder="Projectnaam"
                value={briefing.projectName}
                onChange={(e) => setBriefing({ ...briefing, projectName: e.target.value })}
              />

              <input
                className="w-full border p-3 rounded"
                placeholder="Doelgroep"
                value={briefing.targetAudience}
                onChange={(e) => setBriefing({ ...briefing, targetAudience: e.target.value })}
              />

              <textarea
                className="w-full border p-3 rounded"
                placeholder="Doel / boodschap"
                value={briefing.goal}
                onChange={(e) => setBriefing({ ...briefing, goal: e.target.value })}
              />

              <select
                className="w-full border p-3 rounded"
                value={briefing.channel}
                onChange={(e) => setBriefing({ ...briefing, channel: e.target.value as Briefing['channel'] })}
              >
                <option value="led-wall-retail">LED wall</option>
                <option value="digital-signage">Digital signage</option>
              </select>

              <div className="text-sm text-gray-600">
                Formaat (vast in prototype): <span className="font-semibold">{canvas.width}×{canvas.height}px</span>
              </div>

              <textarea
                className="w-full border p-3 rounded"
                placeholder="Extra notities"
                value={briefing.additionalNotes}
                onChange={(e) => setBriefing({ ...briefing, additionalNotes: e.target.value })}
              />

              <button
                disabled={!canPreCheck || loading}
                onClick={handlePreCheck}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
              >
                Volgende: pre-check
              </button>
            </div>
          </div>
        )}

        {step === 2 && preCheckResult && (
          <div className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-bold">Pre-check resultaten</h2>

            {(preCheckResult as any)?.missing?.map((m: any, i: number) => (
              <p key={i} className="text-red-700">
                Ontbreekt: {m.field} — {m.reason}
              </p>
            ))}

            {(preCheckResult as any)?.conflicts?.map((c: any, i: number) => (
              <p key={i} className="text-orange-700">
                Conflict: {c.area} — {c.issue}
              </p>
            ))}

            {(preCheckResult as any)?.warnings?.map((w: any, i: number) => (
              <p key={i} className="text-yellow-700">
                Waarschuwing: {w.area} — {w.message}
              </p>
            ))}

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 border py-3 rounded">
                Terug
              </button>
              <button
                disabled={!(preCheckResult as any)?.canProceed}
                onClick={() => setStep(3)}
                className="flex-1 bg-blue-600 text-white py-3 rounded disabled:bg-gray-400"
              >
                Start generatie
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white p-12 rounded-xl shadow text-center">
            <div className="h-12 w-12 border-b-4 border-blue-600 rounded-full mx-auto mb-4 animate-spin" />
            <p>Content wordt gegenereerd…</p>
          </div>
        )}

        {step === 4 && generatedContent && consistencyResult && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-2">Consistency score</h2>
              <p className="text-4xl font-bold">{(consistencyResult as any)?.score}</p>
              <p className="text-gray-600">Grade: {(consistencyResult as any)?.grade?.letter}</p>
              <p className="text-sm text-gray-600 mt-2">
                Canvas: <span className="font-semibold">{canvas.width}×{canvas.height}</span> — aspect{' '}
                <span className="font-semibold">{(canvas.width / canvas.height).toFixed(2)}</span>
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-2">Gegenereerde content</h2>
              <pre className="whitespace-pre-wrap">{generatedContent.contentCopy}</pre>

              <h3 className="font-bold mt-4 mb-2">Visuele richting (image prompt)</h3>
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-sm text-gray-800">{generatedContent.imagePrompt}</p>
              </div>

              <button
                onClick={handleCopyPrompt}
                disabled={loading}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
              >
                Kopieer image prompt
              </button>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full border py-3 rounded-lg font-semibold bg-white"
                >
                  {showAdvanced ? 'Verberg Advanced view' : 'Toon Advanced view: Layout / Template spec (JSON)'}
                </button>

                {showAdvanced && (
                  <div className="mt-3 border rounded-lg p-4 bg-gray-50 space-y-2">
                    <div className="text-sm text-gray-700">
                      Deze JSON maakt expliciet welke layout-aannames en safe-areas gelden voor dit format.
                    </div>

                    <textarea
                      readOnly
                      className="w-full border p-3 rounded-lg h-40 font-mono text-xs bg-white"
                      value={JSON.stringify(generatedContent.layoutSpec ?? layoutSpec, null, 2)}
                    />

                    <button
                      type="button"
                      className="w-full bg-black text-white py-3 rounded-lg font-semibold"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            JSON.stringify(generatedContent.layoutSpec ?? layoutSpec, null, 2)
                          );
                          alert('Layout spec gekopieerd.');
                        } catch {
                          alert('Kopiëren lukt niet. Selecteer handmatig.');
                        }
                      }}
                    >
                      Kopieer layout spec
                    </button>
                  </div>
                )}
              </div>

              {generatedContent.imagePrompt?.trim() && (
                <button
                  onClick={handleGenerateImage}
                  disabled={imageLoading || loading}
                  className="mt-3 w-full bg-black text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
                >
                  {imageLoading ? 'Image genereren…' : 'Genereer image (OpenAI)'}
                </button>
              )}

              {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}

              {generatedImage && (
                <div className="mt-4">
                  <div className="text-xs text-gray-500">
                    {generatedImage.model ? `Model: ${generatedImage.model} — ` : ''}
                    {generatedImage.size ? `Size: ${generatedImage.size} — ` : ''}
                    {generatedImage.timestamp ? `Tijd: ${generatedImage.timestamp}` : ''}
                  </div>

                  <div
                    className="mt-2 mx-auto max-w-xl rounded-lg shadow overflow-hidden bg-black/5"
                    style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
                  >
                    <img src={generatedImage.dataUrl} alt="AI gegenereerde afbeelding" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="mt-6 border-t pt-6">
                <h3 className="font-bold mb-2">.)</h3>
                <p className="text-sm text-gray-600 mb-3">
                  .
                </p>

                <input type="file" accept="image/*" onChange={handleUploadExampleImage} />

                {exampleImage && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">{exampleImage.filename}</p>
                    <div
                      className="mt-2 mx-auto max-w-xl rounded-lg shadow overflow-hidden bg-black/5"
                      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
                    >
                      <img src={exampleImage.dataUrl} alt="Voorbeeldafbeelding" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-bold mb-2">Overtredingen</h3>
                {(consistencyResult as any)?.violations?.length === 0 ? (
                  <p className="text-sm text-gray-600">Geen overtredingen gevonden.</p>
                ) : (
                  <ul className="space-y-2">
                    {(consistencyResult as any)?.violations?.map((v: any, i: number) => (
                      <li key={i} className="border rounded-lg p-3">
                        <div className="font-semibold">{v.rule}</div>
                        <div className="text-sm text-gray-700">{v.description}</div>
                        <div className="text-xs text-gray-500 mt-1">Locatie: {v.location}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-bold mb-2">Toegepaste regels</h3>
                {(consistencyResult as any)?.appliedRules?.length === 0 ? (
                  <p className="text-sm text-gray-600">Geen toegepaste regels gevonden.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                    {(consistencyResult as any)?.appliedRules?.map((r: any, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-bold mb-2">Suggesties</h3>
                {(consistencyResult as any)?.suggestions?.length === 0 ? (
                  <p className="text-sm text-gray-600">Geen suggesties.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                    {(consistencyResult as any)?.suggestions?.map((s: any, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <button onClick={resetAll} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">
              Nieuwe run / opnieuw beginnen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
