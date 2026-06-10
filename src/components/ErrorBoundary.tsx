import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-100 h-full min-h-[200px]">
            <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 text-center mb-6 max-w-xs">
                {this.state.error?.message || "An unexpected error occurred while loading this component."}
            </p>
            <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-sm"
            >
                <RefreshCw size={16} /> Try Again
            </button>
        </div>
      );
    }

    return this.props.children ?? null;
  }
}

export default ErrorBoundary;