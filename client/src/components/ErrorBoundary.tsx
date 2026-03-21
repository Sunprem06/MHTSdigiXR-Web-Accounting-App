import { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-50 rounded-full p-4 mb-4"><span className="text-3xl">⚠️</span></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-6 max-w-md">This section had an error. The rest of the app is fine.</p>
        <Button onClick={() => this.setState({ hasError: false })} className="bg-sky-500 hover:bg-sky-600 text-white rounded-full">Try again</Button>
      </div>
    );
    return this.props.children;
  }
}
