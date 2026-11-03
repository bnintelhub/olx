import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminErrorBoundaryState {
  hasError: boolean;
}

export class AdminErrorBoundary extends React.Component<React.PropsWithChildren, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AdminErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin portal rendering error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-[#06101F] text-[#F4F7FB] flex items-center justify-center p-6">
        <section
          role="alert"
          className="w-full max-w-md rounded-2xl border border-[#24334A] bg-[#101D30] p-6 text-center shadow-xl"
        >
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#F43F5E]" />
          <h1 className="text-lg font-bold">Admin workspace unavailable</h1>
          <p className="mt-2 text-sm text-[#9BAAC0]">
            Something went wrong while rendering this page. Retry the workspace or reload the browser.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FFC439] px-4 py-2 text-sm font-bold text-[#081426] transition hover:bg-[#f0b52b] focus:outline-none focus:ring-2 focus:ring-[#FFC439] focus:ring-offset-2 focus:ring-offset-[#101D30]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry workspace
          </button>
        </section>
      </main>
    );
  }
}
