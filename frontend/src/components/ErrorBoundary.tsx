import type { ReactNode } from "react";
import { Component } from "react";
import Button from "./Button";

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
};

type ErrorBoundaryProps = {
  children: ReactNode;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({
      error,
      errorInfo: info.componentStack || null,
    });
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
          <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 md:px-6 lg:px-8">
            <div className="card-animate w-full max-w-xl rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)] md:p-7">
              <h1 className="text-lg font-semibold text-[var(--text)]">Something went wrong</h1>
              <p className="mt-2">
                A rendering error occurred. You can reload this page, or return to your profile.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => window.location.reload()}>
                  Reload page
                </Button>
                <Button type="button" variant="ghost" onClick={() => window.location.assign("/profile")}>
                  Go to Profile
                </Button>
              </div>
              {isDev && (
                <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/60 p-3">
                  <summary className="cursor-pointer text-sm text-[var(--text)]">Show details</summary>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-[var(--text-muted)]">
                    {this.state.error?.stack ?? this.state.error?.message ?? "Unknown error"}
                    {this.state.errorInfo ? `\n\nComponent stack:\n${this.state.errorInfo}` : ""}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
