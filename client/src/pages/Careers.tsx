import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Briefcase, MapPin, Clock, Users, Heart, Zap, Award,
  GraduationCap, Coffee, Laptop, ArrowRight, ChevronDown,
  CheckCircle, Send, Globe, Rocket, Target, X
} from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useToast } from "@/hooks/use-toast";
import type { JobPosting } from "@shared/schema";

const PERKS = [
  { icon: Laptop, title: "Remote-Friendly", desc: "Work from anywhere with flexible arrangements" },
  { icon: Heart, title: "Health Insurance", desc: "Comprehensive health coverage for you and family" },
  { icon: GraduationCap, title: "Learning Budget", desc: "Annual budget for courses, books, and conferences" },
  { icon: Coffee, title: "Free Snacks", desc: "Unlimited coffee, tea, and healthy snacks" },
  { icon: Clock, title: "Flexible Hours", desc: "Work when you're most productive" },
  { icon: Users, title: "Team Events", desc: "Regular team outings and celebrations" },
  { icon: Zap, title: "Fast Growth", desc: "Clear career path with quick promotions" },
  { icon: Award, title: "Performance Bonus", desc: "Quarterly bonuses based on performance" }
];

const VALUES = [
  { icon: Target, title: "Customer First", desc: "We prioritize our clients' success above everything else" },
  { icon: Rocket, title: "Innovation", desc: "We embrace new technologies and creative solutions" },
  { icon: Users, title: "Collaboration", desc: "We believe great work comes from great teamwork" },
  { icon: Globe, title: "Inclusivity", desc: "We celebrate diversity and welcome all perspectives" }
];

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract",
  internship: "Internship", remote: "Remote",
};

function ApplyModal({ job, onClose }: { job: JobPosting; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    applicantName: "", applicantEmail: "", applicantPhone: "",
    experience: "", message: "", linkedinUrl: "", portfolioUrl: "",
  });

  const applyMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", `/api/jobs/${job.id}/apply`, data),
    onSuccess: () => {
      toast({ title: "Application submitted!", description: "We'll review your application and get back to you." });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" data-testid="button-close-apply">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Apply for {job.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{job.department} - {job.location}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
            <input className={inputClass} value={form.applicantName} onChange={e => setForm(f => ({ ...f, applicantName: e.target.value }))} placeholder="Your full name" data-testid="input-apply-name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
            <input type="email" className={inputClass} value={form.applicantEmail} onChange={e => setForm(f => ({ ...f, applicantEmail: e.target.value }))} placeholder="your@email.com" data-testid="input-apply-email" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input className={inputClass} value={form.applicantPhone} onChange={e => setForm(f => ({ ...f, applicantPhone: e.target.value }))} placeholder="+91 98765 43210" data-testid="input-apply-phone" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Experience</label>
              <input className={inputClass} value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="e.g. 3 years" data-testid="input-apply-experience" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">LinkedIn URL</label>
              <input className={inputClass} value={form.linkedinUrl} onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/..." data-testid="input-apply-linkedin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Portfolio URL</label>
              <input className={inputClass} value={form.portfolioUrl} onChange={e => setForm(f => ({ ...f, portfolioUrl: e.target.value }))} placeholder="https://yourportfolio.com" data-testid="input-apply-portfolio" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tell us why you'd be a great fit..." data-testid="input-apply-message"
            />
          </div>
          <button
            onClick={() => applyMutation.mutate(form)}
            disabled={!form.applicantName || !form.applicantEmail || applyMutation.isPending}
            className="w-full py-3 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="button-submit-application"
          >
            <Send className="w-4 h-4" /> {applyMutation.isPending ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function JobCard({ job, isExpanded, onToggle, onApply }: { job: JobPosting; isExpanded: boolean; onToggle: () => void; onApply: () => void }) {
  const reqs = (job.requirements as string[]) || [];
  const resps = (job.responsibilities as string[]) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        data-testid={`button-job-${job.id}`}
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{job.title}</h3>
            <span className="px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 text-xs font-semibold">
              {job.department}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {JOB_TYPE_LABELS[job.type] || job.type}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" /> {job.experience}
            </span>
            {job.vacancies > 1 && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {job.vacancies} vacancies
              </span>
            )}
            {job.closingDate && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" /> Closes {job.closingDate}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-6 h-6 text-sky-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-6 pb-6 border-t border-slate-100 dark:border-slate-700"
        >
          <p className="text-slate-600 dark:text-slate-300 mt-4 mb-6">{job.description}</p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {reqs.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">Requirements</h4>
                <ul className="space-y-2">
                  {reqs.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resps.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">Responsibilities</h4>
                <ul className="space-y-2">
                  {resps.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={onApply}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all"
            data-testid={`button-apply-${job.id}`}
          >
            <Send className="w-4 h-4" /> Apply Now
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Careers() {
  const s = useSiteSettings();
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>("All");
  const [applyingJob, setApplyingJob] = useState<JobPosting | null>(null);

  const { data: dbJobs = [], isLoading } = useQuery<JobPosting[]>({
    queryKey: ["/api/jobs"],
    staleTime: 60 * 1000,
  });

  const departments = ["All", ...Array.from(new Set(dbJobs.map(j => j.department)))];
  const filteredJobs = filterDepartment === "All"
    ? dbJobs
    : dbJobs.filter(j => j.department === filterDepartment);

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
              <Briefcase className="w-4 h-4" />
              Join Our Team
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Build Your <span className="text-sky-400">Career</span> With Us
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Join a team of passionate professionals working on exciting projects for clients worldwide. Grow your skills and make an impact.
            </p>
            <a
              href="#openings"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg"
              data-testid="button-view-openings"
            >
              View Open Positions <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        {/* Why Join Us */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wider mb-3">WHY JOIN {s.brandName.toUpperCase()}</p>
            <h2 className="text-3xl md:text-5xl font-bold dark:text-white">
              Where Talent <span className="text-sky-500 italic">Thrives</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {VALUES.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="text-lg font-bold mb-2 dark:text-white">{value.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Perks & Benefits */}
        <section className="mb-20">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-12">
              <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wider mb-3">PERKS & BENEFITS</p>
              <h2 className="text-3xl md:text-4xl font-bold dark:text-white">
                We Take Care of <span className="text-sky-500 italic">Our Team</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PERKS.map((perk, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-slate-800 p-6 rounded-xl text-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center mx-auto mb-4">
                    <perk.icon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h3 className="font-bold mb-1 dark:text-white">{perk.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{perk.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section id="openings" className="mb-20 scroll-mt-24">
          <div className="text-center mb-12">
            <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wider mb-3">OPEN POSITIONS</p>
            <h2 className="text-3xl md:text-5xl font-bold dark:text-white">
              Find Your <span className="text-sky-500 italic">Dream Role</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mt-4">
              We're always looking for talented individuals to join our team. Check out our current openings below.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Loading openings...</div>
          ) : dbJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2" data-testid="text-no-openings">No Current Openings</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">We don't have any open positions right now, but we're always looking for talented people.</p>
              {s.careersEmail && (
                <a
                  href={`mailto:${s.careersEmail}?subject=General Application`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all"
                  data-testid="button-send-resume-empty"
                >
                  <Send className="w-4 h-4" /> Send Your Resume
                </a>
              )}
            </div>
          ) : (
            <>
              {departments.length > 2 && (
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setFilterDepartment(dept)}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                        filterDepartment === dept
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      data-testid={`button-filter-${dept.toLowerCase()}`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-4 max-w-4xl mx-auto">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isExpanded={expandedJob === job.id}
                    onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                    onApply={() => setApplyingJob(job)}
                  />
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No positions in this department</h3>
                  <p className="text-slate-500 dark:text-slate-400">Check back later or try another department</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Don't See Your Role? */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-br from-sky-50 to-sky-50 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Don't See Your Role?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              We're always looking for talented people. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {s.careersEmail && (
                <a
                  href={`mailto:${s.careersEmail}?subject=General Application`}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg"
                  data-testid="button-send-resume"
                >
                  <Send className="w-5 h-5" /> Send Your Resume
                </a>
              )}
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-sky-500 text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all"
                data-testid="button-contact-careers"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </motion.section>
      </div>

      {applyingJob && <ApplyModal job={applyingJob} onClose={() => setApplyingJob(null)} />}
    </div>
  );
}
