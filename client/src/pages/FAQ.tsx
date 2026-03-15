import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ChevronDown, HelpCircle, ArrowRight, MessageSquare, Search, Code, Smartphone, BarChart3, Palette, Server, Video, Monitor } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { FaqItem } from "@shared/schema";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: typeof HelpCircle;
  color: string;
  faqs: FAQItem[];
}


function FAQAccordion({ item, isOpen, onClick }: { item: FAQItem; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-5 px-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        data-testid={`button-faq-${item.question.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span className="font-semibold text-slate-900 dark:text-white pr-4">{item.question}</span>
        <ChevronDown className={`w-5 h-5 text-sky-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CATEGORY_STYLES: Record<string, { icon: typeof HelpCircle; color: string }> = {
  "General Questions": { icon: HelpCircle, color: "from-sky-500 to-sky-600" },
  "Web Development": { icon: Code, color: "from-blue-500 to-blue-600" },
  "Mobile App Development": { icon: Smartphone, color: "from-purple-500 to-purple-600" },
  "Digital Marketing": { icon: BarChart3, color: "from-orange-500 to-orange-600" },
  "UI/UX Design": { icon: Monitor, color: "from-pink-500 to-pink-600" },
  "SEO Optimization": { icon: Search, color: "from-green-500 to-green-600" },
  "SEO": { icon: Search, color: "from-green-500 to-green-600" },
  "Design": { icon: Palette, color: "from-pink-500 to-pink-600" },
  "Branding & Graphics": { icon: Palette, color: "from-red-500 to-red-600" },
  "Domain & Hosting": { icon: Server, color: "from-cyan-500 to-cyan-600" },
  "Video & Animation": { icon: Video, color: "from-yellow-500 to-yellow-600" },
  "Pricing & Payment": { icon: HelpCircle, color: "from-sky-500 to-sky-600" },
  "Pricing": { icon: HelpCircle, color: "from-sky-500 to-sky-600" },
  "Support": { icon: MessageSquare, color: "from-teal-500 to-teal-600" },
};

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>("General Questions");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: apiFaqs = [], isLoading } = useQuery<FaqItem[]>({ queryKey: ["/api/faqs"] });

  const toggleItem = (categoryTitle: string, questionIndex: number) => {
    const key = `${categoryTitle}-${questionIndex}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const buildCategories = (): FAQCategory[] => {
    const catMap = new Map<string, FAQItem[]>();
    apiFaqs.forEach(faq => {
      const cat = faq.category || "General Questions";
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push({ question: faq.question, answer: faq.answer });
    });
    return Array.from(catMap.entries()).map(([title, faqs]) => ({
      title,
      icon: CATEGORY_STYLES[title]?.icon || HelpCircle,
      color: CATEGORY_STYLES[title]?.color || "from-sky-500 to-sky-600",
      faqs,
    }));
  };

  const resolvedCategories = buildCategories();

  const filteredCategories = searchQuery
    ? resolvedCategories.map(category => ({
        ...category,
        faqs: category.faqs.filter(
          faq =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.faqs.length > 0)
    : resolvedCategories;

  const activeData = filteredCategories.find(c => c.title === activeCategory) || filteredCategories[0];

  return (
    <div className="pt-24 pb-20 bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative bg-slate-900 dark:bg-black py-20 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/30 to-sky-900/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/20 text-sky-300 text-sm font-semibold mb-6">
              <HelpCircle className="w-4 h-4" />
              Got Questions? We Have Answers
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Frequently Asked <span className="text-sky-400">Questions</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Find answers to common questions about our services, pricing, and processes.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                data-testid="input-faq-search"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        {isLoading ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">Loading FAQs...</div>
        ) : apiFaqs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">No FAQs available yet. Check back soon!</div>
        ) : (<>
        {/* Category Tabs */}
        <div className="mb-12 overflow-x-auto">
          <div className="flex flex-wrap gap-3 justify-center min-w-max md:min-w-0">
            {filteredCategories.map((category) => (
              <button
                key={category.title}
                onClick={() => setActiveCategory(category.title)}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === category.title
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                data-testid={`button-category-${category.title.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <category.icon className="w-4 h-4" />
                {category.title}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeCategory === category.title
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {category.faqs.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto">
          {activeData && (
            <motion.div
              key={activeData.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className={`bg-gradient-to-r ${activeData.color} p-6 flex items-center gap-4`}>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <activeData.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{activeData.title}</h2>
                  <p className="text-white/80 text-sm">{activeData.faqs.length} questions</p>
                </div>
              </div>
              
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {activeData.faqs.map((faq, index) => (
                  <FAQAccordion
                    key={index}
                    item={faq}
                    isOpen={openItems[`${activeData.title}-${index}`] || false}
                    onClick={() => toggleItem(activeData.title, index)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {searchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No results found</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Try different keywords or browse categories above
              </p>
            </div>
          )}
        </div>

        </>)}
        {/* Still Have Questions CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-12">
            <MessageSquare className="w-16 h-16 text-sky-500 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Still Have Questions?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Can't find what you're looking for? Our team is here to help. Chat with Kayal, our AI assistant, or reach out to us directly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/contact" 
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg"
                data-testid="button-faq-contact"
              >
                Contact Us <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/services" 
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-sky-500 text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all"
                data-testid="button-faq-services"
              >
                View Services
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
