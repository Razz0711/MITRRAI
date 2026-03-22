'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label shown in the error card (e.g. "Arya Chat") */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-base font-semibold text-[var(--foreground)] mb-1">
            {this.props.label ? `${this.props.label} crashed` : 'Something went wrong'}
          </p>
          <p className="text-sm text-[var(--muted-strong)] mb-5 max-w-xs">
            {this.state.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
