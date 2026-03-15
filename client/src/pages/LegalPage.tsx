import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useSiteSettings } from "@/hooks/use-site-settings";

interface LegalPageData {
  id: number;
  slug: string;
  title: string;
  content: string;
  effectiveDate: string | null;
  updatedAt: string | null;
}

const SLUG_MAP: Record<string, string> = {
  "privacy-policy": "privacy-policy",
  "terms-of-service": "terms-of-service",
  "refund-policy": "refund-policy",
};

export default function LegalPage() {
  const [, params] = useRoute("/:slug");
  const slug = params?.slug || "";
  const apiSlug = SLUG_MAP[slug] || slug;
  const s = useSiteSettings();

  const { data: page, isLoading, error } = useQuery<LegalPageData>({
    queryKey: ["/api/legal", apiSlug],
    queryFn: async () => {
      const res = await fetch(`/api/legal/${apiSlug}`);
      if (!res.ok) throw new Error("Page not found");
      return res.json();
    },
    enabled: !!apiSlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="pt-24 pb-20 bg-white dark:bg-slate-900 min-h-screen">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="pt-24 pb-20 bg-white dark:bg-slate-900 min-h-screen">
        <div className="container mx-auto px-4 md:px-6 text-center py-32">
          <h1 className="text-3xl font-bold mb-4 dark:text-white" data-testid="text-legal-not-found">Page Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">The page you're looking for doesn't exist.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const paragraphs = page.content.split("\n\n");

  return (
    <div className="pt-24 pb-20 bg-white dark:bg-slate-900 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:underline mb-8" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white" data-testid="text-legal-title">
              {page.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              {page.effectiveDate && (
                <span className="flex items-center gap-1.5" data-testid="text-effective-date">
                  <Calendar className="w-4 h-4" />
                  Effective from: {new Date(page.effectiveDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
              {page.updatedAt && (
                <span data-testid="text-last-updated">
                  Last updated: {new Date(page.updatedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 md:p-12 border border-slate-100 dark:border-slate-700">
            <div className="prose prose-slate dark:prose-invert max-w-none" data-testid="text-legal-content">
              {paragraphs.map((paragraph, i) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;

                if (/^\d+\.\s/.test(trimmed)) {
                  const [heading, ...rest] = trimmed.split("\n");
                  return (
                    <div key={i} className="mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{heading}</h2>
                      {rest.length > 0 && (
                        <div className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {rest.join("\n")}
                        </div>
                      )}
                    </div>
                  );
                }

                if (trimmed.startsWith("- ") || trimmed.includes("\n- ")) {
                  const lines = trimmed.split("\n");
                  const nonBullets = lines.filter(l => !l.trim().startsWith("- "));
                  const bullets = lines.filter(l => l.trim().startsWith("- "));
                  return (
                    <div key={i} className="mb-4">
                      {nonBullets.map((line, j) => (
                        <p key={j} className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{line}</p>
                      ))}
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                        {bullets.map((bullet, j) => (
                          <li key={j}>{bullet.replace(/^-\s*/, "")}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                if (i === 0) {
                  return (
                    <h1 key={i} className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                      {trimmed}
                    </h1>
                  );
                }

                return (
                  <p key={i} className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-line">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <p>{s.companyName} ({s.brandName}) &middot; Chennai, Tamil Nadu, India</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
