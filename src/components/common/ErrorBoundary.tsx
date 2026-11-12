import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  label?: string;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[vela] ${this.props.label ?? 'View'} crashed`, error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="max-w-sm rounded-xl border border-line bg-surface p-5 text-center">
          <TriangleAlert className="mx-auto mb-3 text-warning" size={22} />
          <h2 className="mb-1 text-[14px] font-semibold">
            {this.props.label ?? 'This view'} hit a problem
          </h2>
          <p className="mb-4 text-[12.5px] text-fg-2">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.reset}
            className="h-8 rounded-md border border-line-strong bg-raised px-3 text-[13px] transition-ui hover:bg-hover"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
