import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
          <div className="text-3xl mb-4">✂️</div>
          <h1 className="font-heading text-2xl text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm font-mono text-muted-foreground mb-6 max-w-md">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2 rounded-full bg-foreground text-background text-xs font-mono"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
