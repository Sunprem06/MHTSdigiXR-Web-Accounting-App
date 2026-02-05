import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ChevronDown, HelpCircle, ArrowRight, MessageSquare, Search, Code, Smartphone, BarChart3, Palette, Server, Video, Monitor } from "lucide-react";

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

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    title: "General Questions",
    icon: HelpCircle,
    color: "from-sky-500 to-sky-600",
    faqs: [
      {
        question: "What services does MHTSdigiX offer?",
        answer: "MHTSdigiX offers comprehensive digital solutions including Web Development, Mobile App Development, Digital Marketing, UI/UX Design, SEO Optimization, Branding & Graphics, Domain & Hosting, and Video & Animation services. We provide end-to-end solutions to help businesses establish and grow their digital presence."
      },
      {
        question: "How long has MHTSdigiX been in business?",
        answer: "Maanagaram Hi Tech Solutions has been serving clients since 2015, with over 10+ years of combined expertise in digital marketing and web development. We have successfully delivered 500+ projects across various industries."
      },
      {
        question: "Do you work with clients outside India?",
        answer: "Yes, we serve clients globally! While we are based in Chennai, India, we have successfully completed projects for clients across USA, UK, UAE, Australia, and other countries. We use modern collaboration tools to ensure seamless communication regardless of timezone."
      },
      {
        question: "What makes MHTSdigiX different from other agencies?",
        answer: "We combine creativity with data-driven strategies to deliver measurable results. Our differentiators include: 24/7 customer support, transparent pricing with no hidden costs, dedicated project managers, 100% money-back guarantee, and a focus on ROI-driven solutions."
      },
      {
        question: "How can I get a quote for my project?",
        answer: "Getting a quote is easy! You can fill out our contact form, chat with Meena (our AI assistant), call us at +91 4447740195, or WhatsApp us at +91 7358105995. We typically respond within 2-4 hours and provide detailed proposals within 24-48 hours."
      }
    ]
  },
  {
    title: "Web Development",
    icon: Code,
    color: "from-blue-500 to-blue-600",
    faqs: [
      {
        question: "What types of websites do you develop?",
        answer: "We develop all types of websites including corporate websites, e-commerce platforms, portfolio sites, landing pages, blog websites, educational portals, booking systems, real estate websites, and custom web applications. We use modern technologies like React, Next.js, WordPress, and Shopify."
      },
      {
        question: "How long does it take to build a website?",
        answer: "Timeline varies based on complexity: Basic websites (5-7 pages) take 2-3 weeks, custom websites (10-15 pages) take 4-6 weeks, e-commerce sites take 6-8 weeks, and complex web applications can take 8-12+ weeks. Rush delivery options are available at additional cost."
      },
      {
        question: "Will my website be mobile-friendly?",
        answer: "Absolutely! All our websites are 100% responsive and optimized for all devices - desktops, tablets, and smartphones. We follow mobile-first design principles and test across multiple devices and browsers before delivery."
      },
      {
        question: "Do you provide website maintenance?",
        answer: "Yes, we offer comprehensive maintenance packages starting from ₹2,000/month. This includes security updates, bug fixes, content updates, performance monitoring, daily backups, and 24/7 technical support."
      },
      {
        question: "Can you redesign my existing website?",
        answer: "Yes! We specialize in website redesigns. We'll analyze your current site, understand your goals, preserve SEO value, migrate content safely, and deliver a modern, high-performing website that better represents your brand."
      }
    ]
  },
  {
    title: "Mobile App Development",
    icon: Smartphone,
    color: "from-purple-500 to-purple-600",
    faqs: [
      {
        question: "Do you build iOS and Android apps?",
        answer: "Yes, we develop for both platforms! We offer native development (Swift for iOS, Kotlin for Android) and cross-platform solutions using React Native and Flutter. Cross-platform apps are cost-effective and maintain 95% code sharing between platforms."
      },
      {
        question: "How much does a mobile app cost?",
        answer: "App costs vary based on features: Simple apps (basic features) start from ₹50,000, medium complexity apps from ₹1,50,000, and enterprise apps from ₹3,00,000+. We provide detailed cost breakdowns after understanding your requirements."
      },
      {
        question: "Will you publish the app to App Store and Play Store?",
        answer: "Yes! We handle the entire publishing process including app store optimization (ASO), creating app listings, screenshots, descriptions, and managing the review process. We also assist with setting up developer accounts if needed."
      },
      {
        question: "Do you provide app maintenance and updates?",
        answer: "Yes, we offer app maintenance packages starting from ₹5,000/month. This covers bug fixes, OS compatibility updates, security patches, minor feature updates, and performance optimization."
      },
      {
        question: "Can you integrate third-party services in apps?",
        answer: "Absolutely! We integrate payment gateways (Razorpay, PayTM, Stripe), social logins, maps, push notifications, analytics, chat systems, cloud storage, and any API-based services your app needs."
      }
    ]
  },
  {
    title: "Digital Marketing",
    icon: BarChart3,
    color: "from-orange-500 to-orange-600",
    faqs: [
      {
        question: "What digital marketing services do you offer?",
        answer: "We offer comprehensive digital marketing including SEO, Social Media Marketing (SMM), Pay-Per-Click (PPC) advertising, Content Marketing, Email Marketing, Influencer Marketing, WhatsApp Marketing, and Marketing Automation."
      },
      {
        question: "How quickly can I see results from digital marketing?",
        answer: "Results timeline varies: PPC ads show results within 1-2 weeks, Social Media Marketing within 2-4 weeks, while SEO typically takes 3-6 months for significant results. We provide monthly reports showing progress and ROI."
      },
      {
        question: "What is your minimum marketing budget requirement?",
        answer: "Our digital marketing packages start from ₹10,000/month (excluding ad spend). For optimal results, we recommend a minimum ad budget of ₹15,000-25,000/month for PPC and social media advertising."
      },
      {
        question: "Do you manage Google Ads and Facebook Ads?",
        answer: "Yes! We are Google Ads certified and Meta Business Partner. We manage campaigns across Google Search, Display, YouTube, Facebook, Instagram, LinkedIn, and Twitter with advanced targeting and optimization."
      },
      {
        question: "How do you measure marketing success?",
        answer: "We track KPIs including website traffic, leads generated, conversion rates, cost per lead, return on ad spend (ROAS), engagement rates, and revenue growth. You receive detailed monthly reports with insights and recommendations."
      }
    ]
  },
  {
    title: "UI/UX Design",
    icon: Monitor,
    color: "from-pink-500 to-pink-600",
    faqs: [
      {
        question: "What is included in your UI/UX design service?",
        answer: "Our UI/UX service includes user research, competitor analysis, user personas, information architecture, wireframing, high-fidelity mockups, interactive prototypes, design systems, usability testing, and design handoff to developers."
      },
      {
        question: "What design tools do you use?",
        answer: "We use industry-standard tools including Figma, Adobe XD, Sketch, and InVision for design and prototyping. We also use tools like Hotjar and UserTesting for usability research and analysis."
      },
      {
        question: "Can you redesign my existing app or website?",
        answer: "Yes! We conduct UX audits to identify pain points, analyze user behavior data, and create redesigns that improve user experience, increase conversions, and align with modern design trends."
      },
      {
        question: "Do you provide design files after completion?",
        answer: "Absolutely! You receive complete ownership of all design files, assets, and components. We provide organized Figma files, exported assets in all required formats, and comprehensive design documentation."
      },
      {
        question: "How many design revisions are included?",
        answer: "Our packages include 3 rounds of revisions at each stage (wireframes, mockups, prototypes). Additional revisions are available at nominal charges. We ensure you're 100% satisfied with the final design."
      }
    ]
  },
  {
    title: "SEO Optimization",
    icon: Search,
    color: "from-green-500 to-green-600",
    faqs: [
      {
        question: "What is included in your SEO service?",
        answer: "Our SEO service includes keyword research, on-page optimization, technical SEO audit, content optimization, link building, local SEO, Google My Business optimization, competitor analysis, and monthly ranking reports."
      },
      {
        question: "How long does SEO take to show results?",
        answer: "SEO is a long-term strategy. Initial improvements can be seen in 1-2 months, significant ranking improvements in 3-4 months, and substantial organic traffic growth in 6-12 months. Results depend on competition and current site status."
      },
      {
        question: "Do you guarantee first page rankings?",
        answer: "While we don't guarantee specific rankings (as no ethical SEO agency can), we guarantee improved visibility, increased organic traffic, and measurable ROI. We've achieved first-page rankings for 90% of our clients."
      },
      {
        question: "Will you help with local SEO?",
        answer: "Yes! We specialize in local SEO including Google My Business optimization, local citations, review management, local keyword targeting, and map pack optimization. Perfect for businesses targeting local customers."
      },
      {
        question: "Do you provide SEO reports?",
        answer: "Yes, you receive detailed monthly reports covering keyword rankings, organic traffic, backlink profile, technical health score, competitor comparison, and actionable recommendations for continued growth."
      }
    ]
  },
  {
    title: "Branding & Graphics",
    icon: Palette,
    color: "from-red-500 to-red-600",
    faqs: [
      {
        question: "What branding services do you offer?",
        answer: "We offer complete branding solutions including logo design, brand identity development, brand guidelines, business cards, letterheads, brochures, social media kits, packaging design, and marketing collateral."
      },
      {
        question: "How many logo concepts will I receive?",
        answer: "Our standard logo package includes 3-5 unique concepts. After you select a direction, we provide unlimited revisions until you're completely satisfied. You receive final files in all formats (AI, EPS, PNG, JPG, SVG)."
      },
      {
        question: "Do you create brand guidelines?",
        answer: "Yes! Our brand identity package includes comprehensive brand guidelines covering logo usage, color palette, typography, imagery style, voice & tone, and application examples across various media."
      },
      {
        question: "Can you design social media content?",
        answer: "Absolutely! We create custom social media templates, post designs, story templates, cover images, and ad creatives. We can also provide monthly content design packages for consistent posting."
      },
      {
        question: "What file formats do I receive?",
        answer: "You receive all deliverables in multiple formats: source files (AI, PSD, Figma), vector formats (EPS, SVG), web formats (PNG, JPG, WebP), and print-ready PDFs. All files are properly organized and named."
      }
    ]
  },
  {
    title: "Domain & Hosting",
    icon: Server,
    color: "from-cyan-500 to-cyan-600",
    faqs: [
      {
        question: "Do you help with domain registration?",
        answer: "Yes! We help you find and register the perfect domain name. We search across all TLDs (.com, .in, .co, .io, etc.), check availability, and handle the complete registration process."
      },
      {
        question: "What type of hosting do you provide?",
        answer: "We offer various hosting solutions: Shared Hosting (for small sites), VPS Hosting (for growing businesses), Cloud Hosting (for high traffic), and Dedicated Servers (for enterprise needs). All include SSL certificates."
      },
      {
        question: "What is your uptime guarantee?",
        answer: "We guarantee 99.9% uptime for all our hosting plans. Our servers are monitored 24/7, and we have automated failover systems to ensure your website stays online."
      },
      {
        question: "Is SSL certificate included?",
        answer: "Yes! All our hosting packages include free SSL certificates (Let's Encrypt or premium options). SSL ensures your website is secure and trusted by browsers and search engines."
      },
      {
        question: "Do you provide email hosting?",
        answer: "Yes, we provide professional email hosting with your domain (e.g., you@yourcompany.com). Our packages include spam protection, 25GB+ storage per mailbox, and mobile sync capabilities."
      }
    ]
  },
  {
    title: "Video & Animation",
    icon: Video,
    color: "from-yellow-500 to-yellow-600",
    faqs: [
      {
        question: "What types of videos do you create?",
        answer: "We create explainer videos, product demos, corporate videos, social media reels, testimonial videos, animated logos, motion graphics, whiteboard animations, 3D animations, and video ads."
      },
      {
        question: "How long does video production take?",
        answer: "Timeline varies: Simple motion graphics take 1-2 weeks, explainer videos 2-3 weeks, and complex 3D animations 4-6 weeks. Rush delivery is available for urgent projects at additional cost."
      },
      {
        question: "Do you provide scriptwriting?",
        answer: "Yes! Our video packages include professional scriptwriting. We develop compelling scripts that communicate your message effectively, aligned with your brand voice and target audience."
      },
      {
        question: "What video formats do you deliver?",
        answer: "We deliver videos in multiple formats optimized for different platforms: MP4, MOV, WebM, and platform-specific formats for YouTube, Instagram, Facebook, LinkedIn, and websites."
      },
      {
        question: "Can you create videos for social media?",
        answer: "Absolutely! We create short-form content optimized for Instagram Reels, YouTube Shorts, TikTok, and Facebook Stories. We understand platform-specific requirements and best practices."
      }
    ]
  },
  {
    title: "Pricing & Payment",
    icon: HelpCircle,
    color: "from-emerald-500 to-emerald-600",
    faqs: [
      {
        question: "What are your payment terms?",
        answer: "We typically work with 50% advance payment to start the project and 50% upon completion. For larger projects, we offer milestone-based payments. We accept bank transfers, UPI, credit cards, and PayPal."
      },
      {
        question: "Do you offer EMI or payment plans?",
        answer: "Yes! For projects above ₹50,000, we offer flexible payment plans spread across 3-6 months. This makes it easier for businesses to invest in quality digital solutions without financial strain."
      },
      {
        question: "Is there a refund policy?",
        answer: "Yes, we offer a 100% money-back guarantee for website projects if we fail to deliver as per the agreed scope. Refund requests must be made within 7 days of project delivery with valid reasons."
      },
      {
        question: "Do you provide invoices with GST?",
        answer: "Yes, we are a GST-registered company and provide proper tax invoices for all transactions. Our GSTIN is available on request for businesses needing input tax credit."
      },
      {
        question: "Are there any hidden costs?",
        answer: "No hidden costs! We provide detailed quotations upfront covering all aspects of the project. Any additional requirements beyond the agreed scope are discussed and quoted separately before proceeding."
      }
    ]
  }
];

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

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>("General Questions");
  const [searchQuery, setSearchQuery] = useState("");

  const toggleItem = (categoryTitle: string, questionIndex: number) => {
    const key = `${categoryTitle}-${questionIndex}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCategories = searchQuery
    ? FAQ_CATEGORIES.map(category => ({
        ...category,
        faqs: category.faqs.filter(
          faq =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.faqs.length > 0)
    : FAQ_CATEGORIES;

  const activeData = filteredCategories.find(c => c.title === activeCategory) || filteredCategories[0];

  return (
    <div className="pt-24 pb-20">
      {/* Hero Section */}
      <section className="relative bg-slate-900 dark:bg-black py-20 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/30 to-emerald-900/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        
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

        {/* Still Have Questions CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-12">
            <MessageSquare className="w-16 h-16 text-sky-500 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Still Have Questions?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Can't find what you're looking for? Our team is here to help. Chat with Meena, our AI assistant, or reach out to us directly.
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
