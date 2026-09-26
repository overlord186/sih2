import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Globe, ChevronDown, Check, Loader2, RotateCcw, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import Markdown from 'react-markdown';
import { generateMeteorologicalResponse } from '../utils/meteorologicalChatEngine';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatAssistantProps {
  isIntroActive?: boolean;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ isIntroActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'model',
    parts: [{ text: "Hello! I am your meteorological AI assistant. How can I help you analyze the monsoon regimes, bias-corrected forecasts, or synoptic dynamics today?" }]
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gemini-1.5-flash' | 'gemini-2.5-pro'>('gemini-2.0-flash');
  const [useSearch, setUseSearch] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const [customApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('samvartka_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [engineStatus, setEngineStatus] = useState<'live' | 'synoptic' | 'idle'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const searchPopoverRef = useRef<HTMLDivElement>(null);

  // Synchronize state with external events (Sidebar button, Navigation drawer, keyboard shortcut)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen(prev => !prev);

    window.addEventListener('open-chat-assistant', handleOpen);
    window.addEventListener('close-chat-assistant', handleClose);
    window.addEventListener('toggle-chat-assistant', handleToggle);

    return () => {
      window.removeEventListener('open-chat-assistant', handleOpen);
      window.removeEventListener('close-chat-assistant', handleClose);
      window.removeEventListener('toggle-chat-assistant', handleToggle);
    };
  }, []);

  // Broadcast state changes so navigation indicators can stay active
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-assistant-state', { detail: { isOpen } }));
  }, [isOpen]);

  // Close menus when tapping outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (searchPopoverRef.current && !searchPopoverRef.current.contains(event.target as Node)) {
        setIsSearchPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (overridePrompt?: string) => {
    const promptToSend = (overridePrompt || input).trim();
    if (!promptToSend || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: promptToSend }] };
    
    setMessages(prev => [...prev, userMessage]);
    if (!overridePrompt) {
      setInput('');
    }
    setIsLoading(true);

    try {
      const effectiveKey = customApiKey || 
        (typeof window !== 'undefined' ? (localStorage.getItem('samvartka_gemini_api_key') || '') : '') || 
        (import.meta as any).env?.VITE_GEMINI_API_KEY || 
        (import.meta as any).env?.GEMINI_API_KEY || 
        '';

      // Sanitize chat history for Gemini API:
      // Filter out warnings, guarantee valid alternating turns, and ensure first turn is user
      const validHistory: { role: 'user' | 'model'; parts: [{ text: string }] }[] = [];
      for (const m of messages) {
        if (!m || !m.parts || !m.parts[0]?.text) continue;
        const text = m.parts[0].text.trim();
        if (!text || text.startsWith('⚠️')) continue;

        if (validHistory.length === 0) {
          if (m.role === 'user') {
            validHistory.push({ role: 'user', parts: [{ text }] });
          }
        } else {
          const lastRole = validHistory[validHistory.length - 1].role;
          if (m.role !== lastRole) {
            validHistory.push({ role: m.role, parts: [{ text }] });
          }
        }
      }

      // If last item in validHistory is already a user message, remove it so it won't duplicate with current user prompt
      if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
        validHistory.pop();
      }

      let responseText = '';
      let isLive = false;

      // Tier 1: Try local or hosted /api/chat server with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch('/api/chat', {
          method: 'POST',
          signal: controller.signal,
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(effectiveKey ? { 'x-gemini-api-key': effectiveKey } : {})
          },
          body: JSON.stringify({
            history: validHistory,
            message: userMessage.parts[0].text,
            apiKey: effectiveKey || undefined,
            modelConfig: {
              model: model,
              useSearch: useSearch
            }
          }),
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const rawBody = await response.text();
          const trimmed = rawBody.trim();
          if (trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed);
            if (!parsed.error && parsed.text) {
              responseText = parsed.text;
              isLive = Boolean(parsed.isLive);
            }
          } else if (trimmed.length > 0 && !trimmed.startsWith('<')) {
            responseText = trimmed;
          }
        }
      } catch (backendErr) {
        console.warn("Backend /api/chat unavailable, attempting direct inference or synoptic engine:", backendErr);
      }

      // Tier 2: If backend returned no text, and an API key is available, call Google Gemini directly from client
      let keyNotice = '';

      if (!responseText && effectiveKey) {
        const candidateModels = [model, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'].filter((m, idx, arr) => arr.indexOf(m) === idx);
        for (const m of candidateModels) {
          try {
            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${effectiveKey}`;
            const systemInstruction = "You are SAMVARTAKA AI, a senior research meteorologist and synoptic forecaster for the Indian Summer Monsoon. You specialize in regime-aware post-processing, Quantile Regression Forests (QRF), Doppler radar diagnostics (dBZ), orographic convection over the Western Ghats and Himalayas, and WMO statistical verification metrics (CRPS, CSI, Taylor diagram). Provide authoritative, mathematically sound, practical, and insightful explanations.";
            
            const contentsForGemini = [
              ...validHistory,
              { role: 'user', parts: [{ text: userMessage.parts[0].text }] }
            ];

            const gRes = await fetch(geminiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: contentsForGemini,
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                  temperature: 0.4,
                  maxOutputTokens: 1600,
                }
              })
            });

            if (gRes.ok) {
              const gJson = await gRes.json();
              const candidateText = gJson.candidates?.[0]?.content?.parts?.[0]?.text;
              if (candidateText && candidateText.trim()) {
                responseText = candidateText.trim();
                isLive = true;
                break;
              }
            } else {
              const errText = await gRes.text();
              console.warn(`Direct client Gemini call (${m}) returned status ${gRes.status}:`, errText);
              if (errText.includes('API_KEY_INVALID') || errText.includes('key not valid')) {
                keyNotice = '⚠️ **Notice:** Cloud API credentials unavailable or invalid. Seamlessly utilizing offline Synoptic Intelligence.';
                break;
              } else if (errText.includes('RESOURCE_EXHAUSTED') || gRes.status === 429) {
                keyNotice = '⚠️ **Quota Notice:** API rate limit reached. Utilizing offline Synoptic Intelligence.';
                break;
              }
            }
          } catch (directErr) {
            console.warn(`Direct client Gemini API request encountered error on ${m}:`, directErr);
          }
        }
      }

      // Tier 3: Resilient high-fidelity meteorological intelligence engine
      if (!responseText) {
        const synopticText = generateMeteorologicalResponse(userMessage.parts[0].text);
        if (keyNotice) {
          responseText = `${keyNotice}\n\n---\n\n${synopticText}`;
        } else {
          responseText = synopticText;
        }
      }
      
      setEngineStatus(isLive ? 'live' : 'synoptic');
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: responseText }] }]);
    } catch (error: any) {
      console.warn("Client assistant request exception, falling back to embedded synoptic intelligence:", error);
      const fallbackAnalysis = generateMeteorologicalResponse(promptToSend);
      setEngineStatus('synoptic');
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: fallbackAnalysis }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // When closed, do not render any floating button in the bottom right corner
  if (!isOpen) {
    return null;
  }

  const quickPrompts = [
    { label: "🧭 Monsoon Regimes", prompt: "Explain the four synoptic monsoon regimes: Active, Break, Normal, and Post-Monsoon." },
    { label: "🧠 AI Post-Processing", prompt: "How does SAMVARTAKA AI use Quantile Regression Forests (QRF) to remove NWP systematic bias?" },
    { label: "🌊 Coromandel Plume", prompt: "Explain the dynamics of the Coromandel Coastal Convective Plume for Chennai (Meenambakkam)." },
    { label: "📊 CRPS & CSI Metrics", prompt: "What do CRPS (Continuous Ranked Probability Score) and CSI (Threat Score) measure in rainfall verification?" },
  ];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[22rem] sm:w-96 md:w-[28rem] max-h-[85vh] h-[620px] bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.15)] flex flex-col z-[99999] overflow-hidden border border-slate-700/80 flex-shrink-0 animate-in slide-in-from-bottom-8 fade-in duration-300 pointer-events-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-4 sm:p-5 flex flex-col gap-3 shrink-0 relative z-30 overflow-visible">
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-3xl -z-10">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/15 rounded-full blur-xl"></div>
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/25 shadow-sm">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-[14.5px] tracking-wide text-white">AI Meteorologist</h3>
                <span className="text-[9.5px] px-2 py-0.5 rounded-full font-medium bg-white/15 text-blue-100 border border-white/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Synoptic Core
                </span>
              </div>
              <p className="text-[10px] text-blue-100/85 font-medium uppercase tracking-widest mt-0.5">SAMVARTAKA Synoptic Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-white/20 p-2 rounded-xl transition-colors active:scale-95 text-white/90 hover:text-white cursor-pointer"
              title="Close AI Assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Model & Tool Selection Controls */}
        <div className="flex items-center gap-2 mt-1 relative z-40 text-xs">
          {/* Model Selector Dropdown */}
          <div className="relative" ref={modelDropdownRef}>
            <button 
              onClick={() => {
                setIsModelDropdownOpen((prev) => !prev);
                setIsSearchPopoverOpen(false);
              }}
              className="flex items-center gap-1.5 bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/15 hover:border-white/30 px-2.5 py-1.5 rounded-lg transition-all text-white font-medium shadow-sm cursor-pointer"
              title="Select AI Model"
            >
              <span className="font-medium tracking-wide">
                {model === 'gemini-2.0-flash' ? 'Gemini 2.0 Flash' : model === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : model === 'gemini-1.5-flash' ? 'Gemini 1.5 Flash' : 'Gemini 2.5 Pro'}
              </span>
              <ChevronDown size={14} className={`opacity-80 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-white/20 p-2 z-50 ring-1 ring-black/40 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                  Gemini Models
                </div>
                
                <div className="space-y-1">
                  {/* Gemini 2.0 Flash (Default) */}
                  <button 
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${model === 'gemini-2.0-flash' ? 'bg-blue-600/30 border border-blue-500/50 text-white' : 'hover:bg-slate-800/80 text-slate-200'}`}
                    onClick={() => { 
                      setModel('gemini-2.0-flash'); 
                      setIsModelDropdownOpen(false); 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">Gemini 2.0 Flash</span>
                      {model === 'gemini-2.0-flash' ? (
                        <Check size={14} className="text-sky-400" />
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-medium">Default</span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-snug">
                      Fast, highly available reasoning with live Search Grounding.
                    </p>
                  </button>

                  {/* Gemini 2.5 Flash */}
                  <button 
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${model === 'gemini-2.5-flash' ? 'bg-blue-600/30 border border-blue-500/50 text-white' : 'hover:bg-slate-800/80 text-slate-200'}`}
                    onClick={() => { 
                      setModel('gemini-2.5-flash'); 
                      setIsModelDropdownOpen(false); 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">Gemini 2.5 Flash</span>
                      {model === 'gemini-2.5-flash' && <Check size={14} className="text-sky-400" />}
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-snug">
                      Hybrid reasoning model with expanded context.
                    </p>
                  </button>

                  {/* Gemini 1.5 Flash */}
                  <button 
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${model === 'gemini-1.5-flash' ? 'bg-teal-600/30 border border-teal-500/50 text-white' : 'hover:bg-slate-800/80 text-slate-200'}`}
                    onClick={() => { 
                      setModel('gemini-1.5-flash'); 
                      setIsModelDropdownOpen(false); 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">Gemini 1.5 Flash</span>
                      {model === 'gemini-1.5-flash' && <Check size={14} className="text-teal-400" />}
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-snug">
                      Rock-solid production model with broad regional availability.
                    </p>
                  </button>

                  {/* Gemini 2.5 Pro */}
                  <button 
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${model === 'gemini-2.5-pro' ? 'bg-indigo-600/30 border border-indigo-500/50 text-white' : 'hover:bg-slate-800/80 text-slate-200'}`}
                    onClick={() => { 
                      setModel('gemini-2.5-pro'); 
                      setIsModelDropdownOpen(false); 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">Gemini 2.5 Pro</span>
                      {model === 'gemini-2.5-pro' && <Check size={14} className="text-indigo-400" />}
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-snug">
                      Deep meteorological analysis & advanced physical dynamics.
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Search Grounding Control */}
          <div className="relative" ref={searchPopoverRef}>
            <button 
              onClick={() => {
                setIsSearchPopoverOpen((prev) => !prev);
                setIsModelDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border font-medium shadow-sm cursor-pointer ${
                useSearch 
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                  : 'bg-black/25 border-white/15 text-white/85 hover:bg-black/35 hover:border-white/30'
              }`}
              title="Configure Google Search Grounding"
            >
              <Globe size={14} className={useSearch ? "text-emerald-400 animate-pulse" : "text-white/70"} />
              <span className="tracking-wide">Search Grounding</span>
              <span className={`w-2 h-2 rounded-full ${useSearch ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-400/50'}`} />
            </button>

            {/* Search Grounding Options Popover */}
            {isSearchPopoverOpen && (
              <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-white/20 p-3.5 z-50 ring-1 ring-black/40 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Globe size={15} className="text-emerald-400" />
                    <span className="font-semibold text-xs text-slate-100">Live Search Grounding</span>
                  </div>
                  <button
                    onClick={() => {
                      setUseSearch((prev) => !prev);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useSearch ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    aria-label="Toggle search grounding"
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${useSearch ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-slate-300 leading-relaxed">
                  Grounds responses with real-time web search for current IMD press releases, active cyclone tracks, and regional cloudburst alerts.
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Status:</span>
                  <span className={`font-semibold ${useSearch ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {useSearch ? 'Active • Real-time Search' : 'Offline Pre-trained'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-950/70 relative z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/30'}`}>
              {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div className={`px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' : 'bg-slate-900 text-slate-100 shadow-sm border border-slate-800 rounded-tl-sm'}`}>
              <div className={`markdown-body ${msg.role === 'user' ? 'text-white' : 'text-slate-100 prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-indigo-300 prose-a:text-sky-400 prose-code:text-sky-300 prose-code:bg-slate-950 prose-code:px-1 prose-code:rounded'}`}>
                {msg.role === 'user' ? (
                  msg.parts[0].text
                ) : (
                  <>
                    <Markdown>{msg.parts[0].text}</Markdown>
                    {msg.parts[0].text.startsWith('⚠️') && (
                      <button
                        onClick={() => {
                          const lastUserMsg = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
                          if (lastUserMsg) {
                            setInput(lastUserMsg.parts[0].text);
                          }
                        }}
                        className="mt-2.5 text-xs text-sky-400 font-semibold hover:text-sky-300 flex items-center gap-1.5 transition-colors border-t border-slate-800 pt-2"
                      >
                        <RotateCcw size={12} /> Retry this question
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Quick Suggestion Chips on First Interaction */}
        {messages.length <= 2 && !isLoading && (
          <div className="pt-2 pb-1 space-y-1.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-1">
              <Sparkles size={12} className="text-amber-400" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(qp.prompt)}
                  className="text-left px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white text-xs font-medium transition-all shadow-xs flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{qp.label}</span>
                  <Zap size={11} className="text-slate-500 group-hover:text-sky-400 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/30 shadow-sm">
              <Bot size={15} />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 rounded-tl-sm shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-sky-400" />
              <span className="text-xs text-slate-400 font-medium">Analyzing synoptic patterns...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3.5 sm:p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shrink-0">
        <div className="flex items-end gap-2 bg-slate-950/80 border border-slate-700/80 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-400 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about monsoon phenomena, bias correction, or regimes..."
            className="w-full max-h-32 min-h-[44px] bg-transparent text-xs sm:text-sm resize-none p-2.5 sm:p-3 focus:outline-none text-white placeholder-slate-500 font-medium"
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:to-indigo-500 transition-all shrink-0 mb-0.5 mr-0.5 shadow-md shadow-blue-500/20 cursor-pointer"
            title="Send Message"
          >
            <Send size={16} className={input.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};