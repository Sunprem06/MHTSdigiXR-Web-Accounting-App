import { cn } from "@/lib/utils";
export function PageLoader({ message="Loading..." }: { message?: string }) {
  return <div className="min-h-screen flex flex-col items-center justify-center"><div className="h-16 w-16 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin mb-4"/><p className="text-sky-600 font-medium text-sm">{message}</p></div>;
}
export function Spinner({ className }: { className?: string }) {
  return <div className={cn("h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin", className)}/>;
}
export function SkeletonCard() {
  return <div className="rounded-xl border border-gray-100 p-6 space-y-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-2/3"/><div className="h-3 bg-gray-100 rounded w-full"/><div className="h-3 bg-gray-100 rounded w-4/5"/><div className="h-8 bg-gray-200 rounded w-1/3 mt-4"/></div>;
}
export function SkeletonTable({ rows=5 }: { rows?: number }) {
  return <div className="animate-pulse"><div className="h-10 bg-gray-100 rounded mb-2"/>{Array.from({length:rows}).map((_,i)=><div key={i} className="h-12 bg-gray-50 rounded mb-1"/>)}</div>;
}
