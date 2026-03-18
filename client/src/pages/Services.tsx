import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video, Server, CheckCircle2, GraduationCap, Clock, IndianRupee, Users, HelpCircle, Layout, TrendingUp } from "lucide-react";
import { SiReact, SiNextdotjs, SiNodedotjs, SiWordpress, SiShopify, SiPython, SiMongodb, SiAmazon } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import type { Service, PricingPlan } from "@shared/schema";

const WHY_CHOOSE_US = [
  { icon: GraduationCap, title: "Experienced Team", desc: "10+ years of combined expertise in digital marketing and web development." },
  { icon: BarChart3, title: "Result-Driven Approach", desc: "We focus on measurable outcomes that directly impact your business growth." },
  { icon: Clock, title: "24/7 Support", desc: "Round-the-clock customer support to address your concerns anytime." },
  { icon: IndianRupee, title: "Transparent Pricing", desc: "No hidden costs. Clear, upfront pricing for all our services." }
];

const TECH_STACK = [
  { icon: SiReact, name: "React", category: "FRONTEND" },
  { icon: SiNextdotjs, name: "Next.js", category: "FRAMEWORK" },
  { icon: SiNodedotjs, name: "Node.js", category: "BACKEND" },
  { icon: SiWordpress, name: "WordPress", category: "CMS" },
  { icon: SiShopify, name: "Shopify", category: "E-COMMERCE" },
  { icon: SiPython, name: "Python", category: "BACKEND" },
  { icon: SiMongodb, name: "MongoDB", category: "DATABASE" },
  { icon: SiAmazon, name: "AWS", category: "CLOUD" }
];

const ICON_MAP: Record<string, typeof Code> = {
  Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video, Server, Layout, TrendingUp
};

const COLOR_MAP: Record<string, string> = {
  "web-development": "from-blue-500 to-blue-600",
  "mobile-apps": "from-purple-500 to-purple-600",
  "digital-marketing": "from-orange-500 to-orange-600",
  "ui-ux-design": "from-pink-500 to-pink-600",
  "seo": "from-green-500 to-green-600",
  "graphic-design": "from-red-500 to-red-600",
  "domain-hosting": "from-cyan-500 to-cyan-600",
  "video-animation": "from-yellow-500 to-yellow-600",
  "branding": "from-red-500 to-red-600",
  "hosting": "from-cyan-500 to-cyan-600",
};

export default function Services() {
  const { data: servicesList = [], isLoading: servicesLoading } = useQuery<Service[]>({ queryKey: ["/api/services"], staleTime: 5 * 60 * 1000 });
  const { data: pricingPlans = [], isLoading: pricingLoading } = useQuery<PricingPlan[]>({ queryKey: ["/api/pricing-plans"], staleTime: 5 * 60 * 1000 });

  return (
    <div className="pt-24 pb-20 bg-white dark:bg-slate-900">
      <section className="relative bg-slate-900 dark:bg-black py-20 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/30 to-sky-900/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/20 text-sky-300 text-sm font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              World-Class Solutions
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">Our Services</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Comprehensive digital solutions crafted with precision to help your business dominate online.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        {servicesLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : servicesList.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No services available.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicesList.map((service, index) => {
              const IconComponent = ICON_MAP[service.icon] || Globe;
              const color = COLOR_MAP[service.slug] || "from-sky-500 to-sky-600";
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8 }}
                >
                  <Link href={`/services/${service.slug}`} data-testid={`link-service-${service.slug}`}>
                    <div className="h-full bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 cursor-pointer group" data-testid={`card-service-${service.slug}`}>
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={service.image}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                            const placeholder = target.nextElementSibling as HTMLElement | null;
                            if (placeholder) placeholder.style.display = "flex";
                          }}
                        />
                        <div className={`absolute inset-0 bg-gradient-to-br ${color} hidden items-center justify-center`}>
                          <IconComponent className="w-16 h-16 text-white opacity-60" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className={`absolute top-4 left-4 w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-3 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors dark:text-white">{service.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4 leading-relaxed text-sm">{service.description}</p>
                        <ul className="space-y-2 mb-6">
                          {(service.features || []).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-sky-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center text-sky-600 dark:text-sky-400 font-bold group-hover:translate-x-2 transition-transform" data-testid={`text-learn-more-${service.slug}`}>
                          Learn more <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        <section className="mt-24 mb-20">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl py-16 px-8">
            <div className="text-center mb-12">
              <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wider mb-3">WHY CHOOSE US</p>
              <h2 className="text-3xl md:text-5xl font-bold dark:text-white">
                Your Success is <span className="text-sky-500 italic">Our Mission</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {WHY_CHOOSE_US.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow text-center">
                  <div className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center mx-auto mb-6">
                    <item.icon className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 dark:text-white">{item.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-24">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl py-16 px-8">
            <div className="text-center mb-12">
              <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wider mb-3">TECHNOLOGY STACK</p>
              <h2 className="text-3xl md:text-5xl font-bold dark:text-white">
                Powered by <span className="text-sky-500 italic">Modern Tech</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mt-4">
                We leverage cutting-edge technologies to build scalable, secure, and high-performance solutions.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {TECH_STACK.map((tech, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} whileHover={{ y: -5 }}
                  className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all text-center cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                    <tech.icon className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{tech.name}</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{tech.category}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {pricingLoading && (
          <section className="mb-20">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl py-16 px-8">
              <div className="text-center mb-12">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-3 animate-pulse" />
                <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded mx-auto animate-pulse" />
              </div>
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg animate-pulse">
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                    <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-6" />
                    <div className="space-y-3 mb-8">
                      {[1,2,3,4].map(j => <div key={j} className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />)}
                    </div>
                    <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {!pricingLoading && pricingPlans.length > 0 && (
          <section className="mb-20">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl py-16 px-8">
              <div className="text-center mb-12">
                <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wider mb-3">PRICING PLANS</p>
                <h2 className="text-3xl md:text-5xl font-bold dark:text-white">
                  Transparent <span className="text-sky-500 italic">Pricing</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mt-4">
                  Choose the plan that fits your needs. All plans include our quality guarantee.
                </p>
              </div>
              <div className={`grid gap-8 max-w-5xl mx-auto ${pricingPlans.length === 1 ? 'md:grid-cols-1 max-w-md' : pricingPlans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3'}`}>
                {pricingPlans.map((plan, i) => {
                  const features = Array.isArray(plan.features) ? plan.features as string[] : [];
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg ${plan.isPopular ? 'ring-2 ring-sky-500 scale-105' : ''}`}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                          RECOMMENDED
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-2">
                        {plan.price !== "Custom" && <span className="text-2xl font-bold text-slate-900 dark:text-white">₹</span>}
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">{plan.period}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{plan.description}</p>
                      <ul className="space-y-3 mb-8">
                        {features.map((feature, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/contact"
                        className={`block w-full py-3 rounded-full text-center font-bold transition-all ${
                          plan.isPopular
                            ? 'bg-sky-500 text-white hover:bg-sky-600'
                            : 'bg-transparent text-sky-600 dark:text-sky-400 border-2 border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20'
                        }`}
                        data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                      >
                        {plan.ctaLabel || "Get Started"}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-10 h-10 text-sky-500" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Have Questions?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Find answers to common questions about our services, pricing, timelines, and processes in our comprehensive FAQ section.
            </p>
            <Link href="/faq" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/30" data-testid="button-services-faq">
              <HelpCircle className="w-5 h-5" />
              View FAQ & Common Questions
            </Link>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <div className="bg-gradient-to-br from-sky-50 to-sky-50 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Need a Custom Solution?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Every business is unique. Let's discuss how we can create a tailored solution that perfectly fits your needs.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg" data-testid="button-custom-solution">
              Start Your Project <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
