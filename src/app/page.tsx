'use client';
import { useState } from 'react';
import { Briefing, GeneratedContent, ConsistencyResult, PreCheckResult } from '@/lib/types';

export default function Home() {
  const [step, setStep] = useState<number>(1);
  const [brandRules, setBrandRules] = useState<string>('');
  const [pdfInfo, setPdfInfo] = useState<{ filename: string; pages: number } | null>(null);
  const [briefing, setBriefing] = useState<Briefing>({
    projectName: '',
    targetAudience: '',
    goal: '',
    channel: 'led-wall-retail',
    additionalNotes: ''
  });
  const [preCheckResult, setPreCheckResult] = useState<PreCheckResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok || data.text) {
        setBrandRules(data.text || '');
        setPdfInfo({ filename: data.filename || file.name, pages: data.pages || 1 });
        
        if (data.note) {
          alert(data.note);
        }
      } else {
        alert(data.message || data.error || 'PDF upload mislukt');
      }
    } catch (error) {
      alert('Kon PDF niet uploaden');
    }
    setLoading(false);
  };

  const handlePreCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pre-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing, brandRules }),
      });

      const data = await response.json();
      setPreCheckResult(data);
      
      if (data.canProceed) {
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (error) {
      alert('Pre-check mislukt');
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing, brandRules }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setGeneratedContent(data);
        
        const checkResponse = await fetch('/api/consistency-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: data, brandRules }),
        });

        const checkData = await checkResponse.json();
        setConsistencyResult(checkData);
        setStep(4);
      } else {
        alert(data.error || 'Generatie mislukt');
      }
    } catch (error) {
      alert('Er ging iets fout');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Consistency Agent v2
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered consistency validation for visual concepts & event content
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-4">
            {[
              { num: 1, label: 'Input' },
              { num: 2, label: 'Pre-Check' },
              { num: 3, label: 'Generate' },
              { num: 4, label: 'Results' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex flex-col items-center ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {s.num}
                  </div>
                  <span className="text-xs mt-1">{s.label}</span>
                </div>
                {i < 3 && <div className={`w-12 h-1 ${step > s.num ? 'bg-blue-600' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Input */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Brand & Style Rules</h2>
              
              <div className="mb-4 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                  {loading ? (
                    <div className="text-blue-600">Uploaden...</div>
                  ) : pdfInfo ? (
                    <div className="text-center">
                      <div className="text-green-600 text-4xl mb-2">✓</div>
                      <div className="font-medium">{pdfInfo.filename}</div>
                      <div className="text-sm text-gray-600">{pdfInfo.pages} pagina's</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="font-medium">Upload Brandguide PDF</div>
                      <div className="text-sm text-gray-600 mt-1">Of typ hieronder</div>
                    </div>
                  )}
                </label>
              </div>

              <textarea
                className="w-full border-2 border-gray-200 rounded-lg p-4 h-32 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Typ je brand/visual guidelines (visuele stijl, do's & don'ts, constraints...)"
                value={brandRules}
                onChange={(e) => setBrandRules(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Project Briefing</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Project Naam *</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500"
                    placeholder="bijv. Summer Event 2025"
                    value={briefing.projectName}
                    onChange={(e) => setBriefing({...briefing, projectName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Doelgroep *</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500"
                    placeholder="bijv. Bezoekers, VIP's, stakeholders, medewerkers"
                    value={briefing.targetAudience}
                    onChange={(e) => setBriefing({...briefing, targetAudience: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Doel / Boodschap *</label>
                  <textarea
                    className="w-full border-2 border-gray-200 rounded-lg p-3 h-24 focus:border-blue-500"
                    placeholder="bijv. Verwelkomen bezoekers, merkbekendheid vergroten, informatie communiceren"
                    value={briefing.goal}
                    onChange={(e) => setBriefing({...briefing, goal: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Wat moet deze visual communiceren of bereiken?
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Toepassing / Medium *</label>
                  <select
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500"
                    value={briefing.channel}
                    onChange={(e) => setBriefing({...briefing, channel: e.target.value as Briefing['channel']})}
                  >
                    <option value="led-wall-retail">LED wall (retail / experience)</option>
                    <option value="digital-signage">Digital signage</option>
                    <option value="online-campaign">Online campagne (conceptfase)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    De gekozen toepassing bepaalt het formaat en de context van de gegenereerde conceptuele visuals.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Extra Notities</label>
                  <textarea
                    className="w-full border-2 border-gray-200 rounded-lg p-3 h-24 focus:border-blue-500"
                    placeholder="Overige opmerkingen, technische constraints, deadlines..."
                    value={briefing.additionalNotes}
                    onChange={(e) => setBriefing({...briefing, additionalNotes: e.target.value})}
                  />
                </div>
              </div>

              <button
                onClick={handlePreCheck}
                disabled={loading || !brandRules || !briefing.projectName}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400"
              >
                {loading ? 'Checking...' : 'Volgende: Pre-Check →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Pre-Check Results */}
        {step === 2 && preCheckResult && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Pre-Check Resultaten</h2>
            
            {preCheckResult.missing.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <h3 className="font-bold text-red-800 mb-2">❌ Ontbrekende Informatie</h3>
                <ul className="list-disc pl-5 text-red-700">
                  {preCheckResult.missing.map((m, i) => (
                    <li key={i}>{m.field}: {m.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {preCheckResult.conflicts.length > 0 && (
              <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                <h3 className="font-bold text-orange-800 mb-2">⚠️ Conflicten</h3>
                <ul className="list-disc pl-5 text-orange-700">
                  {preCheckResult.conflicts.map((c, i) => (
                    <li key={i}>{c.area}: {c.issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {preCheckResult.warnings.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <h3 className="font-bold text-yellow-800 mb-2">💡 Waarschuwingen</h3>
                <ul className="list-disc pl-5 text-yellow-700">
                  {preCheckResult.warnings.map((w, i) => (
                    <li key={i}>{w.area}: {w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
              >
                ← Terug
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !preCheckResult.canProceed}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400"
              >
                {loading ? 'Genereren...' : 'Doorgaan naar Generatie →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Generating */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">Content aan het genereren...</h2>
            <p className="text-gray-600">Dit kan 10-20 seconden duren</p>
          </div>
        )}

        {/* STEP 4: Results */}
        {step === 4 && generatedContent && consistencyResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Consistency Score</h2>
              <div className="flex items-center gap-6">
                <div className={`text-6xl font-bold ${
                  consistencyResult.score >= 90 ? 'text-green-600' :
                  consistencyResult.score >= 70 ? 'text-blue-600' :
                  consistencyResult.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {consistencyResult.score}
                </div>
                <div>
                  <div className={`text-3xl font-bold ${
                    consistencyResult.grade.color === 'green' ? 'text-green-600' :
                    consistencyResult.grade.color === 'blue' ? 'text-blue-600' :
                    consistencyResult.grade.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    Grade: {consistencyResult.grade.letter}
                  </div>
                  <div className="text-gray-600">
                    {consistencyResult.violations.length} violations found
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Generated Content</h2>
              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <p className="whitespace-pre-wrap">{generatedContent.contentCopy}</p>
              </div>
              
              <h3 className="font-bold mb-2">Visual Concept Description</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm">{generatedContent.imagePrompt}</p>
              </div>
            </div>

            {consistencyResult.violations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-red-600">Violations</h2>
                <div className="space-y-3">
                  {consistencyResult.violations.map((v, i) => (
                    <div key={i} className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <div className="font-bold">{v.rule}</div>
                      <div className="text-sm text-gray-700">{v.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Location: {v.location}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-green-600">Applied Rules ✓</h2>
              <div className="space-y-2">
                {consistencyResult.appliedRules.map((rule, i) => (
                  <div key={i} className="flex items-start bg-green-50 p-3 rounded-lg">
                    <span className="text-green-600 mr-3">✓</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setGeneratedContent(null);
                setConsistencyResult(null);
                setPreCheckResult(null);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700"
            >
              🔄 Nieuwe Generatie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}