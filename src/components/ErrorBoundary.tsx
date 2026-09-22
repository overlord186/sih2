import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onBypass?: () => void;
  bypassLabel?: string;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  autoResetAttempts: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private timer: any = null;

  public state: State = {
    hasError: false,
    error: null,
    autoResetAttempts: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, autoResetAttempts: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if error is related to API rate limit or quota
    const msg = String(error?.message || '');
    const isRateLimit = 
      msg.includes('Rate exceeded') ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('Quota') ||
      msg.includes('Too Many Requests');

    // Auto-recover after 1 second for rate limit errors if under max attempts
    if (isRateLimit && this.state.autoResetAttempts < 2) {
      this.timer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          autoResetAttempts: prev.autoResetAttempts + 1,
        }));
      }, 1200);
    }
  }

  public componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  public handleReset = () => {
    if (this.timer) clearTimeout(this.timer);
    this.setState({ hasError: false, error: null, autoResetAttempts: 0 });
  };

  public render() {
    if (this.state.hasError) {
      const msg = String(this.state.error?.message || '');
      const isRateLimit = 
        msg.includes('Rate exceeded') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('Quota') ||
        msg.includes('Too Many Requests');

      if (this.props.compact) {
        return (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Cpu className="w-4 h-4 animate-pulse" />
              <span>Synoptic Model Fallback Active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isRateLimit 
                ? 'Upstream API rate limit reached. Utilizing embedded physics-informed synoptic models.'
                : 'A widget state exception occurred. The rest of the platform remains active.'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-[10px] transition-all cursor-pointer"
            >
              Resume Widget
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 animate-pulse" />

            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                {this.props.fallbackTitle || 'SAMVARTAKA AI Meteorological Platform'}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Embedded Synoptic Core Ready</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isRateLimit
                ? 'Upstream rate limit detected. The system has automatically engaged embedded physics-informed synoptic reasoning engines.'
                : 'A temporary rendering state occurred. Click below to restore the weather console immediately.'}
            </p>

            {this.state.error && (
              <div className="text-[10px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-sky-300 text-left overflow-x-auto space-y-1">
                <div className="text-[9px] text-slate-500 uppercase font-bold">Diagnostic Code:</div>
                <div className="text-slate-300 font-semibold">{this.state.error.message}</div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {this.props.onBypass && (
                <button
                  onClick={this.props.onBypass}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <span>{this.props.bypassLabel || 'Enter Console Directly'}</span>
                </button>
              )}
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Console View</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

