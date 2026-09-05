import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Globe, ChevronDown, Check, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'model',
    parts: [{ text: "Hello! I'm your meteorological AI assistant. How can I help you analyze the monsoon patterns or synoptic events today?" }]
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [useSearch, setUseSearch] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // Remove the very first welcome message from the history sent to the model 
      // as it might just be decorative, or include it if desired. Let's include it.
      const historyToPass = messages.length > 1 ? messages.map(m => ({ role: m.role, parts: [{ text: m.parts[0].text }] })) : [];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyToPass,
          message: userMessage.parts[0].text,
          modelConfig: {
            model: model,
            useSearch: useSearch && model === 'gemini-3.5-flash' // Grounding primarily suggested for 3.5-flash
          }
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(response.ok ? 'Invalid response format' : 'Service is currently unavailable or restarting. Please try again in a moment.');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to get response');
      }
      
      setMessages([...newMessages, { role: 'model', parts: [{ text: data.text }] }]);
    } catch (error: any) {
      const errMsg = error.message || "I encountered an error while analyzing that request.";
      setMessages([...newMessages, { role: 'model', parts: [{ text: `⚠️ ${errMsg}` }] }]);
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
    return (
      <div className="fixed bottom-6 right-6 z-50 group">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-4 rounded-full shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-2 ring-4 ring-blue-500/10"
        >
          <div className="relative">
            <MessageSquare size={24} className="relative z-10" />
            <div className="absolute inset-0 bg-white/20 blur-md rounded-full -z-10 animate-pulse"></div>
          </div>
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-medium pr-2 pl-1 tracking-wide">Ask AI Assistant</span>
        </button>
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 w-48 p-2.5 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none text-center">
          Open your personal AI Meteorological Advisor
          <div className="absolute -right-1 top-1/2 -mt-1 w-2 h-2 bg-slate-800/95 rotate-45"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[22rem] sm:w-96 md:w-[28rem] max-h-[85vh] h-[600px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)] flex flex-col z-50 overflow-hidden ring-1 ring-white/50 flex-shrink-0 animate-in slide-in-from-bottom-8 fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex flex-col gap-3 shrink-0 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/20 shadow-sm">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px] tracking-wide">Monsoon AI Assistant</h3>
              <p className="text-[10px] text-blue-100/80 font-medium uppercase tracking-widest">Meteorological Advisor</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95">
            <X size={18} />
          </button>
        </div>
        
        {/* Model & Tool Selection */}
        <div className="flex items-center gap-2 mt-2 relative z-20 text-xs">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <span className="font-medium tracking-wide">{model === 'gemini-3.1-pro-preview' ? 'Pro (Complex)' : model === 'gemini-3.5-flash' ? 'Flash (General)' : 'Flash Lite (Fast)'}</span>
              <ChevronDown size={14} className="opacity-70" />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-white/90 backdrop-blur-xl text-slate-800 rounded-xl shadow-2xl border border-white/50 py-1.5 z-30 ring-1 ring-black/5 overflow-visible">
                <div className="group/btn relative">
                  <button 
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50/80 flex items-center justify-between transition-colors font-medium"
                    onClick={() => { setModel('gemini-3.1-pro-preview'); setIsDropdownOpen(false); }}
                  >
                    <span>Gemini 3.1 Pro (Complex)</span>
                    {model === 'gemini-3.1-pro-preview' && <Check size={14} className="text-blue-600" />}
                  </button>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-52 p-2.5 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all z-40 pointer-events-none">
                    Best for heavy reasoning, deep analysis, and complex problem solving.
                    <div className="absolute -left-1 top-1/2 -mt-1 w-2 h-2 bg-slate-800/95 rotate-45"></div>
                  </div>
                </div>
                <div className="group/btn relative">
                  <button 
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50/80 flex items-center justify-between transition-colors font-medium"
                    onClick={() => { setModel('gemini-3.5-flash'); setIsDropdownOpen(false); }}
                  >
                    <span>Gemini 3.5 Flash (General)</span>
                    {model === 'gemini-3.5-flash' && <Check size={14} className="text-blue-600" />}
                  </button>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-52 p-2.5 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all z-40 pointer-events-none">
                    The balanced default. Fast and smart for general chat and questions.
                    <div className="absolute -left-1 top-1/2 -mt-1 w-2 h-2 bg-slate-800/95 rotate-45"></div>
                  </div>
                </div>
                <div className="group/btn relative">
                  <button 
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50/80 flex items-center justify-between transition-colors font-medium"
                    onClick={() => { setModel('gemini-3.1-flash-lite'); setIsDropdownOpen(false); }}
                  >
                    <span>Gemini 3.1 Flash Lite (Fast)</span>
                    {model === 'gemini-3.1-flash-lite' && <Check size={14} className="text-blue-600" />}
                  </button>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-52 p-2.5 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all z-40 pointer-events-none">
                    Extremely fast, lower cost model for simple back-and-forth chat.
                    <div className="absolute -left-1 top-1/2 -mt-1 w-2 h-2 bg-slate-800/95 rotate-45"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="group relative flex items-center">
            <button 
              onClick={() => setUseSearch(!useSearch)}
              disabled={model !== 'gemini-3.5-flash'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border ${useSearch ? 'bg-emerald-400/20 border-emerald-400/30 text-emerald-100 shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]' : 'bg-black/10 border-white/10 text-white/80 hover:bg-black/20'} ${model !== 'gemini-3.5-flash' ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Globe size={14} className={useSearch ? "animate-pulse" : ""} />
              <span className="font-medium tracking-wide">Search Grounding</span>
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-2.5 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40 pointer-events-none text-center">
              {model !== 'gemini-3.5-flash' ? "Search is only available when using the Flash model in this application." : "Connects the AI to Google Search to fetch real-time information and current events."}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full -mb-1 w-2 h-2 bg-slate-800/95 rotate-45"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50">
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
                  <Markdown>{msg.parts[0].text}</Markdown>
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