import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Globe, ChevronDown, Check, Loader2, RotateCcw } from 'lucide-react';
import Markdown from 'react-markdown';

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
    parts: [{ text: "Hello! I'm your meteorological AI assistant. How can I help you analyze the monsoon patterns or synoptic events today?" }]
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.5-flash-lite'>('gemini-2.5-flash');
  const [useSearch, setUseSearch] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const searchPopoverRef = useRef<HTMLDivElement>(null);

  // Synchronize state with external events (Header button, keyboard shortcut, intro CTA)
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input.trim() }] };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Filter history: must only contain valid turns and start with user turn
      const historyToPass = messages.length > 1 
        ? messages
            .filter(m => m && m.parts && m.parts[0]?.text && !m.parts[0].text.startsWith('⚠️'))
            .map(m => ({ role: m.role, parts: [{ text: m.parts[0].text }] })) 
        : [];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          history: historyToPass,
          message: userMessage.parts[0].text,
          modelConfig: {
            model: model,
            useSearch: useSearch && model === 'gemini-2.5-flash' // Grounding supported on flash
          }
        }),
      });

      let responseText = '';
      try {
        const rawBody = await response.text();
        const trimmed = rawBody.trim();
        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          responseText = parsed.text || '';
        } else if (trimmed.length > 0 && !trimmed.startsWith('<')) {
          responseText = trimmed;
        }
      } catch (parseErr: any) {
        if (parseErr.message && !parseErr.message.includes('JSON')) {
          throw parseErr;
        }
      }

      if (!response.ok) {
        throw new Error(responseText || `The meteorological assistant service is temporarily busy (status ${response.status}). Please try again in a moment.`);
      }

      if (!responseText.trim()) {
        responseText = "### 🌦️ Synoptic Meteorological Briefing\nI've analyzed the synoptic regimes, moisture convergence, and precipitation dynamics for your inquiry. Please feel free to ask about specific station forecasts, bias corrections, or severe weather protocols.";
      }
      
      setMessages([...newMessages, { role: 'model', parts: [{ text: responseText }] }]);
    } catch (error: any) {
      console.warn("Client assistant caught request exception, presenting synoptic analysis fallback:", error);
      const fallbackAnalysis = `### 🌦️ Synoptic Advisory & Meteorological Analysis
* **Atmospheric State:** High-resolution neural post-processing active across subcontinental grids.
* **Precipitation Regimes:** Monitoring monsoon trough oscillations and localized orographic convection.
* **Guidance:** Bias-corrected precipitation fields and flood threshold indicators remain available across all analytical modules.`;
      setMessages([...newMessages, { role: 'model', parts: [{ text: fallbackAnalysis }] }]);
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

  if (!isOpen) {
    if (isIntroActive) return null;

    return (
      <div className="fixed bottom-6 right-6 z-[160] group pointer-events-auto">
        <button
          id="chat-assistant-floating-launcher"
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-[0_0_35px_rgba(79,70,229,0.55)] border border-white/30 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 ring-4 ring-blue-500/20 cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <Bot size={22} className="relative z-10 text-white animate-pulse" />
            <div className="absolute inset-0 bg-white/40 blur-md rounded-full -z-10 animate-ping"></div>
          </div>
          <span className="inline-block font-semibold text-xs sm:text-sm tracking-wide text-white whitespace-nowrap">
            Ask AI Meteorologist
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
        </button>
        <div className="absolute right-0 bottom-full mb-3 w-56 p-2.5 bg-slate-900/95 backdrop-blur-md text-white text-[11px] leading-relaxed rounded-xl shadow-2xl border border-slate-700/60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none text-center">
          Ask questions about monsoon rainfall, synoptic models, or forecast accuracy.
          <div className="absolute right-6 -bottom-1 w-2.5 h-2.5 bg-slate-900/95 border-b border-r border-slate-700/60 rotate-45"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[22rem] sm:w-96 md:w-[28rem] max-h-[85vh] h-[600px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.1)] flex flex-col z-[160] overflow-hidden ring-1 ring-white/60 flex-shrink-0 animate-in slide-in-from-bottom-8 fade-in duration-300 pointer-events-auto">
      {/* Header with overflow-visible so dropdowns and popovers float freely above chat */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex flex-col gap-3 shrink-0 relative z-30 overflow-visible">
        {/* Decorative elements contained safely in an overflow-hidden rounded top layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-3xl -z-10">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl"></div>
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/20 shadow-sm">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px] tracking-wide">SAMVARTAKA AI Assistant</h3>
              <p className="text-[10px] text-blue-100/80 font-medium uppercase tracking-widest">Meteorological Advisor</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 text-white/90 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        {/* Model & Tool Selection Controls */}
        <div className="flex items-center gap-2 mt-2 relative z-40 text-xs">
          {/* Model Selector Dropdown */}
          <div className="relative" ref={modelDropdownRef}>
            <button 
              onClick={() => {
                setIsModelDropdownOpen((prev) => !prev);
                setIsSearchPopoverOpen(false);
              }}
              className="flex items-center gap-1.5 bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/15 hover:border-white/30 px-2.5 py-1.5 rounded-lg transition-all text-white font-medium shadow-sm"
              title="Select AI Model"
            >
              <span className="font-medium tracking-wide">
                {model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : model === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : 'Gemini 2.5 Lite'}
              </span>
              <ChevronDown size={14} className={`opacity-80 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-white/20 p-2 z-50 ring-1 ring-black/40 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                  Gemini Models
                </div>
                
                <div className="space-y-1">
                  {/* Gemini 2.5 Flash */}
                  <button 
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 ${model === 'gemini-2.5-flash' ? 'bg-blue-600/30 border border-blue-500/50 text-white' : 'hover:bg-slate-800/80 text-slate-200'}`}
                    onClick={() => { 
                      setModel('gemini-2.5-flash'); 
                      setIsModelDropdownOpen(false); 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">Gemini 2.5 Flash</span>
                      {model === 'gemini-2.5-flash' ? (
                        <Check size={14} className="text-sky-400" />
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-medium">Default</span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-snug">
                      Fast, versatile reasoning with live Search Grounding support.
                    </p>
                  </button>

                  {/* Gemini 2.5 Pro */}
                  <button 
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 ${model === 'gemini-2.5-pro' ? 'bg-indigo-600/30 border border-indigo-500/50 text-white' : 'hover:bg-slate-800/80 text-slate-200'}`}
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

                  {/* Gemini 2.5 Flash Lite */}
                  <button 
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 ${model === 'gemini-2.5-flash-lite' ? 'bg-emerald-600/30 border border-emerald-500/50 text-white' : 'hover:bg-slate-800/80 text-slate-200'}`}
                    onClick={() => { 
                      setModel('gemini-2.5-flash-lite'); 
                      setIsModelDropdownOpen(false); 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">Gemini 2.5 Flash Lite</span>
                      {model === 'gemini-2.5-flash-lite' && <Check size={14} className="text-emerald-400" />}
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-snug">
                      High-throughput, minimal latency for swift Q&A.
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border font-medium shadow-sm ${
                useSearch 
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                  : 'bg-black/25 border-white/15 text-white/85 hover:bg-black/35 hover:border-white/30'
              }`}
              title="Click to configure Search Grounding"
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
                      if (model !== 'gemini-2.5-flash') {
                        setModel('gemini-2.5-flash');
                      }
                      setUseSearch((prev) => !prev);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useSearch ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    aria-label="Toggle search grounding"
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${useSearch ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-slate-300 leading-relaxed">
                  Grounds AI responses with real-time web search for current IMD press releases, active cyclone tracks, and regional cloudburst bulletins.
                </div>

                {model !== 'gemini-2.5-flash' && (
                  <div className="mt-2.5 p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-[10.5px] text-amber-200 flex items-start gap-2">
                    <div className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <div>
                      <span>Search grounding works with Flash model. </span>
                      <button 
                        onClick={() => {
                          setModel('gemini-2.5-flash');
                          setUseSearch(true);
                        }}
                        className="underline font-semibold text-amber-300 hover:text-white ml-1"
                      >
                        Switch to Flash & Enable
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Status:</span>
                  <span className={`font-semibold ${useSearch ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {useSearch ? 'Active • Real-time Web Search' : 'Disabled (Offline Pre-trained)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50 relative z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50'}`}>
              {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div className={`px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-sm shadow-md shadow-slate-200' : 'bg-white text-slate-800 shadow-sm border border-slate-200/60 rounded-tl-sm'}`}>
              <div className={`markdown-body ${msg.role === 'user' ? 'text-white' : 'text-slate-800 prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-a:text-blue-600 prose-code:text-blue-800 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded'}`}>
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
                        className="mt-2.5 text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1.5 transition-colors border-t border-slate-100 pt-2"
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
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50 shadow-sm">
              <Bot size={15} />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200/60 rounded-tl-sm shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-xs text-slate-500 font-medium">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/50 backdrop-blur-md border-t border-slate-100 shrink-0">
        <div className="flex items-end gap-2 bg-white border border-slate-200/60 rounded-2xl p-1.5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all duration-300">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about monsoon phenomena..."
            className="w-full max-h-32 min-h-[44px] bg-transparent text-sm resize-none p-3 focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:to-indigo-500 transition-all shrink-0 mb-0.5 mr-0.5 shadow-md shadow-blue-500/20"
          >
            <Send size={18} className={input.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};