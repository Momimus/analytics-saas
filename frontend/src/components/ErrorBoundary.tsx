import type { ReactNode } from "react";
import { Component } from "react";

type ErrorBoundaryState = {
  hasError: boolean;
};

type ErrorBoundaryProps = {
  children: ReactNode;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
          <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 md:px-6 lg:px-8">
            <div className="card-animate w-full max-w-xl rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)] md:p-7">
              Something went wrong
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
