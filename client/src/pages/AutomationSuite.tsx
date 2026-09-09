import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Shield, Lock, MessageSquare,
  Mail, CalendarClock, BarChart3, UserPlus, RefreshCw, Clock,
  AlertCircle, Search, Server, HelpCircle,
} from "lucide-react";

const STATS = [
  { value: "6", label: "Core Workflows" },
  { value: "24/7", label: "Runs Unattended" },
  { value: "3", label: "Ways to Own It" },
];

const INTEGRATIONS = ["Any Inbox", "Any LMS", "Any CRM", "WhatsApp / SMS", "Analytics / SEO"];

const TRUST_CARDS = [
  {
    icon: Shield,
    title: "Isolated Deployment",
    desc: "Available with Hosted SaaS and Done-For-You: your automation runs in its own environment, kept separate from your live site.",
  },
  {
    icon: MessageSquare,
    title: "Compliant Messaging",
    desc: "Pre-approved WhatsApp/SMS templates are configured on request as part of your engagement — not a default of every tier.",
  },
  {
    icon: Lock,
    title: "Encrypted by Default",
    desc: "Credential encryption is set up for you as part of Hosted SaaS and Done-For-You engagements.",
  },
];

const HOW_WE_WORK = [
  { step: 1, title: "Map Your Stack", desc: "Inbox, CRM, LMS, messaging — reviewed end to end." },
  { step: 2, title: "Configure Workflows", desc: "The 6 workflows wired to your real tools." },
  { step: 3, title: "Test & Harden", desc: "Each workflow tested before its trigger goes live." },
  { step: 4, title: "Go Live", desc: "Monitoring set up so it keeps running unattended." },
];

const PRICING_TIERS = [
  {
    name: "Template Pack",
    priceInr: "14,999",
    priceUsd: "199",
    sub: "one-time · self-hosted",
    desc: "All 6 workflow blueprints, a deployment guide and a configuration checklist. Install it yourself.",
    popular: false,
  },
  {
    name: "Hosted SaaS",
    priceInr: "7,999/mo",
    priceUsd: "99/mo",
    sub: "fully managed",
    desc: "We host, monitor and maintain the engine. You just connect your accounts and go.",
    popular: true,
  },
  {
    name: "Done-For-You",
    priceInr: "49,999",
    priceUsd: "599",
    sub: "one-time · on your server",
    desc: "We build and configure all 6 workflows for you, with QA and go-live support.",
    popular: false,
  },
];

const WORKFLOWS = [
  { icon: Mail, title: "Inbox Automation", desc: "Classify intent, auto-reply, tag leads." },
  { icon: CalendarClock, title: "Campaign Scheduler", desc: "Newsletters and promos on a set cron." },
  { icon: BarChart3, title: "Reporting & Insights", desc: "Daily traffic + social digest to chat." },
  { icon: UserPlus, title: "Enrollment Onboarding", desc: "Welcome sequence triggered on signup." },
  { icon: RefreshCw, title: "Lifecycle Follow-up", desc: "Completion, inquiry, abandoned recovery." },
  { icon: Clock, title: "Schedule Sync", desc: "Batches and allocations pushed live." },
  { icon: Shield, title: "Compliance Guardrails", desc: "Isolation, version pinning & template checks — configured on request." },
  { icon: AlertCircle, title: "Execution Monitoring", desc: "Failed runs flagged, set up as part of Hosted/DFY tiers." },
];

const COMPLIANCE_CHECKLIST = [
  "Vendor-agnostic — any inbox, CRM, LMS or messaging API",
  "Isolated deployment, configured on Hosted SaaS and Done-For-You engagements",
  "Version pinning available on request, so nothing breaks overnight",
  "Pre-approved WhatsApp/SMS templates configured when you need proactive messaging",
  "Execution monitoring included with Hosted SaaS and Done-For-You",
];

const FAQ_ITEMS = [
  {
    q: "Do I need my own server?",
    a: "Only for the Template Pack or Done-For-You tiers. Hosted SaaS needs nothing but your account logins.",
  },
  {
    q: "Is WhatsApp/SMS messaging compliant?",
    a: "Not automatically. Pre-approved templates matching Meta's Cloud API requirements are configured as part of Hosted SaaS and Done-For-You engagements when you need proactive messaging — ask us before going live with the Template Pack alone.",
  },
  {
    q: "Can I bring my own tools?",
    a: "The workflows are vendor-agnostic — any inbox, CRM, LMS or messaging API can be wired in.",
  },
  {
    q: "How fast is setup?",
    a: "It depends on the tier and how many workflows you need — we'll scope the timeline with you before you start.",
  },
];

export default function AutomationSuite() {
  return (
    <div className="pt-24 pb-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6">
        {/* Hero */}
        <section className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="inline-block text-xs font-bold tracking-wider uppercase text-sky-500 mb-3">
              Automate the busywork. Sell the result.
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900 dark:text-white">
              One automation engine.<br />Three ways to <span className="text-sky-500">own it.</span>
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 mt-5 leading-relaxed max-w-md">
              We built this workflow platform to run our own inbox, campaigns, reporting and lifecycle automation. Now it's a real product line — buy the template, have us install it, or let us run it for you.
            </p>
            <div className="flex flex-wrap gap-4 mt-7">
              <Link href="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all" data-testid="button-start-automation">
                Start Your Automation <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#workflows" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold hover:border-sky-400 hover:text-sky-500 transition-all" data-testid="link-see-workflows">
                See the Workflows
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-slate-900 dark:bg-slate-950 rounded-3xl p-10 h-72 md:h-80 overflow-hidden"
          >
            <div className="absolute top-8 left-8 w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="absolute top-6 right-14 w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <Clock className="w-4 h-4 text-sky-300" />
            </div>
            <div className="absolute bottom-20 left-14 w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-sky-300" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Search className="w-7 h-7 text-white" />
            </div>
            <div className="absolute bottom-10 right-12 w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-sky-300" />
            </div>
          </motion.div>
        </section>
      </div>

      {/* Stats bar */}
      <section className="bg-slate-900 dark:bg-slate-950 py-8 mb-16">
        <div className="container mx-auto px-4 flex justify-around flex-wrap gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-white">{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        {/* Integrations */}
        <section className="mb-16 text-center">
          <div className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-5">
            Works with the stack you already run
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {INTEGRATIONS.map((tag) => (
              <span key={tag} className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Trust / safeguards */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Built With Care, Configured for You</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
                These safeguards aren't a default of every install — they're what we configure when you engage the Hosted SaaS or Done-For-You tiers.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {TRUST_CARDS.map((c) => (
                <div key={c.title} className="bg-slate-800 rounded-2xl p-6 text-center">
                  <div className="w-11 h-11 rounded-xl bg-sky-500 flex items-center justify-center mx-auto mb-4">
                    <c.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-white font-semibold text-sm mb-2">{c.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* How We Work */}
        <motion.section id="platform" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">How We Work</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">From your current stack to a running automation engine, in four steps.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_WE_WORK.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center mx-auto mb-3 font-bold">
                  {s.step}
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">{s.title}</div>
                <div className="text-slate-500 dark:text-slate-400 text-xs mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Pricing */}
        <motion.section id="pricing" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl py-16 px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">What Are My Options?</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Choose how you want to run this.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PRICING_TIERS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-8 flex flex-col ${
                    plan.popular
                      ? "bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-xl shadow-sky-500/25 md:scale-105"
                      : "bg-slate-900 dark:bg-slate-950 text-white"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-sky-600 text-xs font-bold px-4 py-1 rounded-full">
                      POPULAR
                    </div>
                  )}
                  <span className={`text-xs font-bold tracking-wider uppercase ${plan.popular ? "text-sky-100" : "text-sky-400"}`}>
                    {plan.name}
                  </span>
                  <div className="text-3xl font-extrabold mt-2">₹{plan.priceInr}</div>
                  <div className={`text-xs mb-4 ${plan.popular ? "text-sky-100" : "text-slate-400"}`}>
                    ${plan.priceUsd} · {plan.sub}
                  </div>
                  <p className={`text-sm leading-relaxed flex-1 ${plan.popular ? "text-sky-50" : "text-slate-300"}`}>{plan.desc}</p>
                  <Link
                    href="/contact"
                    className={`mt-6 inline-flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm transition-all ${
                      plan.popular ? "bg-white text-sky-600 hover:bg-sky-50" : "bg-sky-500 text-white hover:bg-sky-600"
                    }`}
                    data-testid={`button-pricing-${plan.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Workflows */}
        <motion.section id="workflows" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">The Automations</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Six workflows, generalized for any business stack.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WORKFLOWS.map((w) => (
              <div key={w.title} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center mb-4">
                  <w.icon className="w-4 h-4 text-sky-500" />
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">{w.title}</div>
                <div className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">{w.desc}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Compliance checklist */}
        <motion.section id="compliance" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-10 items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl h-36 flex items-center justify-center">
                <Lock className="w-8 h-8 text-sky-400" />
              </div>
              <div className="bg-slate-800 rounded-2xl h-36 mt-6 flex items-center justify-center">
                <Server className="w-8 h-8 text-sky-300" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                What We Set Up <span className="text-sky-500">When You Engage Us</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 mb-5 max-w-md">
                Not everything below is standard on every tier — it's what we configure as part of Hosted SaaS and Done-For-You work.
              </p>
              <div className="flex flex-col gap-3 text-sm">
                {COMPLIANCE_CHECKLIST.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20">
          <div className="text-center mb-10">
            <HelpCircle className="w-9 h-9 text-sky-500 mx-auto mb-3" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-7 max-w-4xl mx-auto">
            {FAQ_ITEMS.map((f) => (
              <div key={f.q}>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">{f.q}</div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Final CTA */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Ready to Put Automation to Work?</h2>
            <p className="text-slate-400 text-sm mt-3 mb-7 max-w-xl mx-auto">
              Book a walkthrough and we'll map your exact stack onto the six workflows above.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all" data-testid="button-cta-start-automation">
                Start Your Automation <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/services" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-slate-600 text-white font-semibold hover:border-sky-400 hover:text-sky-400 transition-all" data-testid="link-view-all-services">
                View All Services
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
