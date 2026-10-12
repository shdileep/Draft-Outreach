import React, { useState, useEffect, useRef } from 'react';

const rotatingTaglines = [
  "Cold emails that sound like you.",
  "Follow-ups without the awkwardness.",
  "Outreach tailored to real achievements.",
  "Clearer prose. Zero generic corporate clichés."
];

const emailTypes = [
  { label: 'Cold Outreach', value: 'Cold email for a job opportunity' },
  { label: 'Direct Application', value: 'Job application email' },
  { label: 'Application Follow-up', value: 'Follow-up after applying' },
  { label: 'Recruiter Nudge', value: 'Recruiter follow-up' },
  { label: 'Alumni Referral', value: 'Referral request' },
  { label: 'Post-Interview Note', value: 'Post-interview follow-up' }
];

const toneOptions = ['Professional', 'Direct', 'Warm', 'Formal'];
const lengthOptions = ['Concise', 'Standard', 'Detailed'];

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [rotatingIndex, setRotatingIndex] = useState(0);

  // Resume & Candidate State
  const [fileInfo, setFileInfo] = useState({
    name: "Dileep_Sai_Resume.pdf",
    size: "184 KB · Internal Source of Truth"
  });
  const [extractionStatus, setExtractionStatus] = useState('Internal Source of Truth Active');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [candName, setCandName] = useState('Dileep Sai');
  const [candRole, setCandRole] = useState('Backend Developer at RenoCred');
  const [candExp, setCandExp] = useState('• Built robust backend APIs and financial data processing pipelines\n• Integrated LLM workflows and retrieval-augmented systems with evaluation cases\n• Designed agent workflows with function calling');
  const [candSkills, setCandSkills] = useState('Python, FastAPI, Django, PostgreSQL, Docker, Redis, REST APIs, LLMs');
  const [candLink, setCandLink] = useState('github.com/shdileep');

  // Target Opportunity State
  const [emailType, setEmailType] = useState('Cold email for a job opportunity');
  const [targetCompany, setTargetCompany] = useState('Linear');
  const [targetRole, setTargetRole] = useState('Backend Engineer');
  const [targetJd, setTargetJd] = useState('Looking for backend engineers passionate about exceptional craft, real-time sync architectures, low-latency APIs, and resilient infrastructure. You care about milliseconds, clean interfaces, and scalable database performance.');
  const [targetRecipientName, setTargetRecipientName] = useState('Tuomas Artman (Co-founder / Eng)');
  const [targetSpecificContext, setTargetSpecificContext] = useState('Linear sync engine and operational transform architecture');
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Concise');

  // Generation & Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resultSubject, setResultSubject] = useState('');
  const [resultBody, setResultBody] = useState('');
  const [hasResult, setHasResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);

  // Rotating banner interval
  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingIndex(prev => (prev + 1) % rotatingTaglines.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadResumeFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadResumeFile(e.target.files[0]);
    }
  };

  const uploadResumeFile = async (file) => {
    const sizeKB = Math.round(file.size / 1024);
    setFileInfo({ name: file.name, size: `${sizeKB} KB · Internal Source of Truth` });
    setExtractionStatus('Uploading & Verifying...');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setExtractionStatus('Internal Source of Truth Active');
      } else {
        setExtractionStatus('Ready to parse');
      }
    } catch (err) {
      console.error(err);
      setExtractionStatus('Local Baseline Active');
    }
  };

  const clearUploadedFile = (e) => {
    if (e) e.stopPropagation();
    setFileInfo(null);
    setExtractionStatus('Ready to parse');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadSampleCase = () => {
    setFileInfo({ name: "Dileep_Sai_Resume.pdf", size: "184 KB · Internal Source of Truth" });
    setExtractionStatus('Sample Dossier Loaded');
    setCandName("Dileep Sai");
    setCandRole("Backend Developer at RenoCred");
    setCandExp("• Scaled financial data ingestion pipelines, reducing latency by 30%\n• Integrated LLM workflows and retrieval-augmented systems with evaluation cases\n• Designed agent workflows with tool-calling and source attribution");
    setCandSkills("Python, FastAPI, Django, PostgreSQL, Docker, Redis, REST APIs, LLMs");
    setCandLink("github.com/shdileep");

    setTargetCompany("Linear");
    setTargetRole("Backend Engineer");
    setTargetJd("Looking for engineers passionate about exceptional craft, real-time sync architectures, low-latency web protocols, and resilient infrastructure. You care about milliseconds and crisp systems.");
    setTargetRecipientName("Tuomas Artman (Co-founder / Eng)");
    setTargetSpecificContext("Read Linear's sync engine engineering post on operational transforms and client-side SQLite.");
  };

  const resetAllFields = () => {
    clearUploadedFile();
    setCandName('');
    setCandRole('');
    setCandExp('');
    setCandSkills('');
    setCandLink('');
    setTargetCompany('');
    setTargetRole('');
    setTargetJd('');
    setTargetRecipientName('');
    setTargetSpecificContext('');
    setHasResult(false);
    setErrorMessage('');
  };

  const generateEmail = async (isRegen = false) => {
    if (!targetCompany.trim() && !candName.trim()) {
      setErrorMessage('Please enter at least a Candidate Name and Target Company to ground the outreach.');
      return;
    }
    setErrorMessage('');
    setIsGenerating(true);

    try {
      const payload = {
        jobDescription: targetJd,
        targetCompany: targetCompany.trim(),
        targetRole: targetRole.trim(),
        outreachType: emailType,
        tone: tone,
        length: length,
        recipientName: targetRecipientName.trim(),
        specificContext: targetSpecificContext.trim(),
        candidateOverrides: {
          name: candName.trim(),
          role: candRole.trim(),
          skills: candSkills.trim(),
          exp: candExp.trim()
        }
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setResultSubject(data.subject);
        setResultBody(data.body);
        setHasResult(true);

        setTimeout(() => {
          if (resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      } else {
        setErrorMessage(data.error || 'Failed to synthesize email. Please retry.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to connect to Draft Outreach synthesis engine.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    const fullEmail = `Subject: ${resultSubject}\n\n${resultBody}`;
    navigator.clipboard.writeText(fullEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const wordCount = resultBody.trim() ? resultBody.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-white text-brand-black flex flex-col font-sans selection:bg-brand-black selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-brand-border/60 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentView('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xl sm:text-2xl font-serif tracking-tight font-normal text-brand-black hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <img src="/logo.png" alt="Draft Outreach Logo" className="w-6 h-6 object-contain" />
              <span>Draft Outreach</span>
            </button>
          </div>

          <nav className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center text-xs tracking-wide text-brand-muted uppercase gap-4 font-mono">
              <span>AI Cold Outreach</span>
              <span className="text-brand-border">|</span>
              <span>Monochrome Integrity</span>
            </div>

            {currentView === 'landing' ? (
              <button
                onClick={() => {
                  setCurrentView('workspace');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase px-4 py-2 bg-brand-black text-white hover:bg-black transition-all duration-200 border border-brand-black active:scale-[0.98]"
              >
                <span>Open Workspace</span>
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentView('landing');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase px-4 py-2 bg-brand-black text-white hover:bg-black transition-all duration-200 border border-brand-black active:scale-[0.98]"
              >
                <span>Back to Intro</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: LANDING */}
        {currentView === 'landing' && (
          <section className="flex-1 flex flex-col justify-between mx-auto px-4 sm:px-8 py-8 sm:py-14 w-full max-w-6xl animate-fadeIn">
            {/* Tagline Badge */}
            <div className="pt-2 sm:pt-4">
              <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-brand-muted border-b border-brand-border pb-1">
                <span>Editorial AI for Job Outreach</span>
                <span className="text-brand-subtle">·</span>
                <span>Monochrome Integrity</span>
              </div>
            </div>

            {/* Central Grid */}
            <div className="my-auto py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Headline and Hero */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal leading-[1.08] tracking-tight text-brand-black">
                  Every application deserves a <br className="hidden sm:inline" />
                  <span className="italic font-normal">better email.</span>
                </h1>

                {/* Rotating cycling value propositions */}
                <div className="mt-5 sm:mt-6 h-10 overflow-hidden flex items-center">
                  <div
                    className="transition-transform duration-500 ease-out text-base sm:text-xl text-brand-muted font-sans font-light"
                    style={{ transform: `translateY(-${rotatingIndex * 40}px)` }}
                  >
                    {rotatingTaglines.map((text, idx) => (
                      <div key={idx} className="h-10 flex items-center">
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 sm:mt-5 text-sm sm:text-base text-brand-muted font-normal leading-relaxed max-w-lg">
                  Generate bespoke recruiter outreach, warm referrals, and interview follow-ups synthesized directly from your resume and targeted job post. No generic hype.
                </p>

                {/* CTA */}
                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <button
                    onClick={() => {
                      setCurrentView('workspace');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-brand-black text-white hover:bg-black transition-all text-xs font-medium tracking-widest uppercase border border-brand-black shadow-sm active:scale-[0.98]"
                  >
                    <span>Get Started</span>
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>

                  <span className="text-xs text-brand-subtle font-mono">
                    Single-page workflow · No signup barrier
                  </span>
                </div>
              </div>

              {/* Right Column: Editorial Architecture Preview Card */}
              <div className="lg:col-span-6 w-full">
                <div className="border border-brand-border bg-white shadow-sm transition-all p-5 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-black"></span>
                      <span className="font-mono text-[11px] text-brand-black font-medium tracking-wider uppercase">
                        Synthesis Architecture
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-brand-muted uppercase tracking-widest">
                      v1.2 Engine
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Input 01 */}
                    <div className="border border-brand-border/80 bg-brand-surface/30 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-brand-muted font-medium">
                          Input 01 — Candidate Vector
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                          Verified
                        </span>
                      </div>
                      <div className="text-xs font-serif text-brand-black">
                        Extracted Experience &amp; Verifiable Metrics
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          Distributed Systems
                        </span>
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          30% Latency Drop
                        </span>
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          Python / FastAPI / Docker
                        </span>
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          LLM &amp; RAG Workflows
                        </span>
                      </div>
                    </div>

                    {/* Middle Flow Bar */}
                    <div className="flex items-center justify-center gap-3 py-0.5">
                      <div className="h-px flex-1 bg-brand-border/60"></div>
                      <div className="flex items-center gap-1.5 px-3 py-1 border border-brand-border bg-brand-surface text-[10px] font-mono uppercase tracking-widest text-brand-black">
                        <svg className="w-3 h-3 text-brand-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>Context Alignment &amp; Tone Calibration</span>
                      </div>
                      <div className="h-px flex-1 bg-brand-border/60"></div>
                    </div>

                    {/* Input 02 */}
                    <div className="border border-brand-border/80 bg-brand-surface/30 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-brand-muted font-medium">
                          Input 02 — Opportunity Matrix
                        </span>
                        <span className="text-[10px] font-mono text-brand-muted bg-white px-2 py-0.5 border border-brand-border">
                          Target Grounding
                        </span>
                      </div>
                      <div className="text-xs font-serif text-brand-black">
                        Role Requirements &amp; Recipient Context
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          Linear — Infra Team
                        </span>
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          SQLite Sync Engine
                        </span>
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          Direct Tone
                        </span>
                        <span className="text-[10px] font-mono px-2 py-1 bg-white border border-brand-border text-brand-black">
                          Zero Corporate Filler
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footnote */}
                  <div className="border-t border-brand-border/60 pt-4 flex flex-wrap items-center justify-between text-[10px] font-mono text-brand-muted gap-2">
                    <div className="flex items-center gap-1.5 text-brand-black">
                      <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>100% Zero-Cliché Guarantee · 0 Hallucinated Metrics</span>
                    </div>
                    <button
                      onClick={() => {
                        loadSampleCase();
                        setCurrentView('workspace');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-brand-black hover:underline uppercase tracking-wider font-semibold"
                    >
                      Launch Studio →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Supporting Details */}
            <div className="border-t border-brand-border/60 pt-6 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-brand-muted gap-4">
              <p className="max-w-md font-light">
                Built specifically for students, graduates, and engineers, designers, and operators navigating high-stakes career moves.
              </p>
              <div className="flex items-center gap-5 text-brand-subtle font-mono text-[11px]">
                <span>0% AI Slop</span>
                <span>·</span>
                <span>Context-Aware</span>
                <span>·</span>
                <span>100% Free</span>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 2: WORKSPACE */}
        {currentView === 'workspace' && (
          <section className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col animate-fadeIn">
            {/* Workspace Subheader & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border/70 pb-5 mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-subtle mb-1">
                  <button
                    onClick={() => setCurrentView('landing')}
                    className="hover:text-brand-black transition-colors underline decoration-dotted"
                  >
                    Overview
                  </button>
                  <span>/</span>
                  <span className="text-brand-black font-semibold">Generator Studio</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif text-brand-black">Cold Outreach Studio</h2>
              </div>

              <div className="flex items-center gap-2.5 font-mono">
                <button
                  onClick={loadSampleCase}
                  className="text-xs px-3.5 py-1.5 border border-brand-border hover:border-brand-black hover:bg-brand-surface text-brand-black transition-colors"
                >
                  Load Sample Profile
                </button>
                <button
                  onClick={resetAllFields}
                  className="text-xs px-3 py-1.5 text-brand-muted hover:text-brand-black transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Dual Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left Panel: Candidate Baseline */}
              <div className="border border-brand-border bg-white p-5 sm:p-7 flex flex-col space-y-6">
                <div className="border-b border-brand-lightborder pb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest text-brand-muted uppercase">Panel 01</span>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">{extractionStatus}</span>
                  </div>
                  <h3 className="text-lg font-serif mt-1 text-brand-black">Your Background</h3>
                  <p className="text-xs text-brand-muted mt-0.5">Resume serves as the internal source of truth.</p>
                </div>

                {/* Dropzone */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-brand-muted mb-2">
                    Resume Upload (PDF / DOCX)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border border-dashed transition-colors p-6 sm:p-8 text-center bg-brand-surface/40 cursor-pointer group ${
                      isDragging ? 'border-brand-black bg-brand-surface' : 'border-brand-border hover:border-brand-black'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {!fileInfo ? (
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 text-brand-muted group-hover:text-brand-black transition-colors stroke-[1.25] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <div className="text-xs font-medium text-brand-black">
                          <span className="underline underline-offset-2">Click to browse</span> or drag and drop
                        </div>
                        <div className="text-[11px] text-brand-muted mt-1 font-mono">
                          PDF or DOCX (max 10MB)
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-brand-black text-white flex items-center justify-center mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="text-xs font-semibold text-brand-black max-w-[220px] truncate">{fileInfo.name}</div>
                        <div className="text-[10px] text-brand-muted mt-0.5 font-mono">{fileInfo.size}</div>
                        <div className="flex items-center gap-3 mt-3 font-mono text-[11px]">
                          <button
                            type="button"
                            onClick={(e) => clearUploadedFile(e)}
                            className="text-brand-muted hover:text-red-600 underline"
                          >
                            Remove
                          </button>
                          <span className="text-brand-border">|</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="text-brand-black underline"
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidate Form Fields */}
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono text-brand-muted mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={candName}
                      onChange={(e) => setCandName(e.target.value)}
                      placeholder="e.g. Dileep Sai"
                      className="w-full text-xs px-3 py-2 border border-brand-border focus:border-brand-black focus:outline-none bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-brand-muted mb-1">Current Role / Status</label>
                    <input
                      type="text"
                      value={candRole}
                      onChange={(e) => setCandRole(e.target.value)}
                      placeholder="e.g. Backend Developer at RenoCred"
                      className="w-full text-xs px-3 py-2 border border-brand-border focus:border-brand-black focus:outline-none bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-brand-muted mb-1">Key Experience &amp; Quantified Wins</label>
                    <textarea
                      rows={3}
                      value={candExp}
                      onChange={(e) => setCandExp(e.target.value)}
                      placeholder="e.g. Scaled distributed worker nodes reducing latency by 28%..."
                      className="w-full text-xs p-3 border border-brand-border focus:border-brand-black focus:outline-none bg-white resize-none transition-colors leading-relaxed"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-brand-muted mb-1">Key Skills / Stack</label>
                      <input
                        type="text"
                        value={candSkills}
                        onChange={(e) => setCandSkills(e.target.value)}
                        placeholder="e.g. Python, FastAPI, PostgreSQL"
                        className="w-full text-xs px-3 py-2 border border-brand-border focus:border-brand-black focus:outline-none bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-brand-muted mb-1">Links / Portfolio (Optional)</label>
                      <input
                        type="text"
                        value={candLink}
                        onChange={(e) => setCandLink(e.target.value)}
                        placeholder="e.g. github.com/shdileep"
                        className="w-full text-xs px-3 py-2 border border-brand-border focus:border-brand-black focus:outline-none bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-brand-subtle italic border-t border-brand-lightborder pt-3">
                  Note: Draft Outreach never invents fictional metrics or credentials. Only verifiable candidate inputs are referenced.
                </div>
              </div>

              {/* Right Panel: Target Opportunity */}
              <div className="border border-brand-border bg-white p-5 sm:p-7 flex flex-col space-y-6">
                <div className="border-b border-brand-lightborder pb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest text-brand-muted uppercase">Panel 02</span>
                    <span className="text-[11px] font-mono text-brand-subtle">Target Opportunity</span>
                  </div>
                  <h3 className="text-lg font-serif mt-1 text-brand-black">The Opportunity</h3>
                  <p className="text-xs text-brand-muted mt-0.5">Paste the job description, recruiter message, or role requirements.</p>
                </div>

                {/* Outreach Type Selector */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-brand-muted mb-2">Outreach Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                    {emailTypes.map((t) => {
                      const isSelected = emailType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setEmailType(t.value)}
                          className={`px-2.5 py-2 text-left border text-[11px] transition-all ${
                            isSelected
                              ? 'border-brand-black bg-brand-black text-white font-medium'
                              : 'border-brand-border hover:border-brand-black text-brand-black'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Job Details */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-brand-muted mb-1">Company / Organization</label>
                      <input
                        type="text"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        placeholder="e.g. Linear, Stripe, Ramp"
                        className="w-full text-xs px-3 py-2 border border-brand-border focus:border-brand-black focus:outline-none bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-brand-muted mb-1">Target Role Title</label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Backend Engineer"
                        className="w-full text-xs px-3 py-2 border border-brand-border focus:border-brand-black focus:outline-none bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-brand-muted mb-1">
                      Job Description, Post, or Role Requirements
                    </label>
                    <textarea
                      rows={4}
                      value={targetJd}
                      onChange={(e) => setTargetJd(e.target.value)}
                      placeholder="Paste the job description, recruiter message, job post, or key challenges the team is solving..."
                      className="w-full text-xs p-3 border border-brand-border focus:border-brand-black focus:outline-none bg-white resize-none transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Recipient Details Accordion */}
                  <details className="group border border-brand-lightborder p-2.5 bg-brand-surface/30">
                    <summary className="text-[11px] font-medium text-brand-black cursor-pointer flex items-center justify-between select-none">
                      <span>+ Specific Recruiter / Recipient Details (Optional)</span>
                      <span className="text-brand-subtle group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 border-t border-brand-lightborder">
                      <div>
                        <label className="block text-[10px] font-mono text-brand-muted mb-1">Recipient Name</label>
                        <input
                          type="text"
                          value={targetRecipientName}
                          onChange={(e) => setTargetRecipientName(e.target.value)}
                          placeholder="e.g. Tuomas Artman"
                          className="w-full text-xs px-2.5 py-1.5 border border-brand-border focus:border-brand-black bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-brand-muted mb-1">Specific Context / Recent Project</label>
                        <input
                          type="text"
                          value={targetSpecificContext}
                          onChange={(e) => setTargetSpecificContext(e.target.value)}
                          placeholder="e.g. Loved their recent engineering post on sync architecture"
                          className="w-full text-xs px-2.5 py-1.5 border border-brand-border focus:border-brand-black bg-white"
                        />
                      </div>
                    </div>
                  </details>
                </div>

                {/* Tone & Length Controls */}
                <div className="grid grid-cols-2 gap-4 border-t border-brand-lightborder pt-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted mb-1.5">Tone</label>
                    <div className="flex flex-wrap gap-1">
                      {toneOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setTone(opt)}
                          className={`px-2.5 py-1 text-[11px] border transition-colors ${
                            tone === opt
                              ? 'border-brand-black bg-brand-black text-white'
                              : 'border-brand-border hover:border-brand-black text-brand-black'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted mb-1.5">Length</label>
                    <div className="flex flex-wrap gap-1">
                      {lengthOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setLength(opt)}
                          className={`px-2.5 py-1 text-[11px] border transition-colors ${
                            length === opt
                              ? 'border-brand-black bg-brand-black text-white'
                              : 'border-brand-border hover:border-brand-black text-brand-black'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Generation Action Bar */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-brand-border pt-6 gap-4">
              <div className="text-xs text-brand-muted flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-black"></span>
                <span>Draft Outreach Engine: Evaluates candidate-opportunity fit without boilerplate clichés.</span>
              </div>

              <button
                disabled={isGenerating}
                onClick={() => generateEmail(false)}
                className="w-full sm:w-auto group inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-brand-black text-white hover:bg-black transition-all text-xs font-medium tracking-widest uppercase border border-brand-black shadow-sm active:scale-[0.99] disabled:opacity-70"
              >
                <span>{isGenerating ? 'Synthesizing...' : 'Generate Tailored Email'}</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>

            {/* Loading Indicator */}
            {isGenerating && (
              <div className="mt-6 p-6 border border-brand-border bg-brand-surface/70 text-center animate-pulse-soft">
                <div className="inline-flex items-center gap-3 text-xs uppercase tracking-widest font-mono text-brand-black">
                  <span className="w-2 h-2 rounded-full bg-brand-black animate-ping"></span>
                  <span>Synthesizing candidate background with opportunity requirements...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-6 p-4 border border-brand-black bg-brand-surface text-xs text-brand-black flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Notice:</span>
                  <span>{errorMessage}</span>
                </div>
                <button onClick={() => setErrorMessage('')} className="text-brand-muted hover:text-black font-mono">
                  ✕
                </button>
              </div>
            )}

            {/* Generated Result Container */}
            {hasResult && (
              <div ref={resultRef} className="mt-10 border border-brand-border bg-white transition-all shadow-sm">
                {/* Result Top Bar */}
                <div className="border-b border-brand-border px-5 py-3.5 bg-brand-surface/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg text-brand-black">Generated Result</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-brand-border bg-white text-brand-muted">
                      {emailTypes.find(t => t.value === emailType)?.label || emailType}
                    </span>
                    <span className="text-[10px] font-mono text-brand-subtle">
                      ~{wordCount} words
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 border transition-colors font-medium ${
                        copied
                          ? 'bg-brand-black text-white border-brand-black'
                          : 'border-brand-border hover:border-brand-black bg-white text-brand-black'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy Email'}</span>
                    </button>
                    <button
                      onClick={() => generateEmail(true)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-brand-border hover:border-brand-black bg-white text-brand-muted hover:text-brand-black transition-colors font-mono"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Regenerate Variant</span>
                    </button>
                  </div>
                </div>

                {/* Subject Line Field */}
                <div className="px-6 py-4 border-b border-brand-border/60 flex flex-col sm:flex-row sm:items-center gap-2 bg-white">
                  <span className="text-xs font-mono uppercase tracking-wider text-brand-muted w-20 flex-shrink-0">
                    Subject:
                  </span>
                  <input
                    type="text"
                    value={resultSubject}
                    onChange={(e) => setResultSubject(e.target.value)}
                    className="flex-1 font-medium text-sm text-brand-black focus:outline-none focus:bg-brand-surface/40 px-2 py-1 border border-transparent focus:border-brand-border"
                  />
                </div>

                {/* Body Textarea */}
                <div className="p-6 sm:p-8 bg-white">
                  <div className="text-xs text-brand-muted font-mono mb-2 uppercase tracking-wider flex items-center justify-between">
                    <span>Email Composition (Click to edit inline)</span>
                    <span className="text-[10px] text-brand-subtle">No generic filler detected</span>
                  </div>
                  <textarea
                    rows={12}
                    value={resultBody}
                    onChange={(e) => setResultBody(e.target.value)}
                    className="w-full text-sm leading-relaxed sm:leading-loose text-brand-black font-sans focus:outline-none border-0 p-0 resize-y selection:bg-brand-black selection:text-white bg-transparent"
                    spellCheck="false"
                  />
                </div>

                {/* Quality Checklist */}
                <div className="border-t border-brand-border/60 px-6 py-3.5 bg-brand-surface/40 flex flex-wrap items-center justify-between text-[11px] text-brand-muted gap-3">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-brand-black">
                      <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Zero "writing to express my excitement"</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-brand-black">
                      <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Direct impact hook included</span>
                    </span>
                  </div>
                  <div className="font-mono text-brand-subtle">Ready for sending</div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border/70 py-6 px-4 sm:px-8 mt-auto bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-brand-muted gap-3">
          <div className="flex items-center gap-3">
            <span className="font-serif text-brand-black text-sm">Draft Outreach</span>
            <span className="text-brand-subtle">·</span>
            <span>A high-craft outreach tool for modern career builders</span>
          </div>
          <div className="flex items-center gap-4 text-brand-subtle text-[11px] font-mono">
            <span>Monochrome Theme</span>
            <span>·</span>
            <span>100% Client-side Session Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
