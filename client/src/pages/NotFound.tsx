import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col items-center justify-center px-4 text-center">
      <div className="text-[8rem] font-bold text-sky-100 leading-none select-none mb-4">404</div>
      <h1 className="text-3xl font-bold text-gray-800 mb-3">Page not found</h1>
      <p className="text-gray-500 max-w-md mb-8">The page you are looking for does not exist or may have been moved.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => navigate("/")} className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-8">Go to home</Button>
        <Button variant="outline" onClick={() => window.history.back()} className="rounded-full px-8 border-sky-200 text-sky-600 hover:bg-sky-50">Go back</Button>
      </div>
      <div className="mt-10 flex gap-6 text-sm text-sky-600">
        {[["Home","/"],["Services","/services"],["About","/about"],["Contact","/contact"]].map(([l,p])=>(
          <button key={p} onClick={()=>navigate(p)} className="hover:underline">{l}</button>
        ))}
      </div>
    </div>
  );
}
