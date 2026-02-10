import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Briefcase, MapPin, Clock, Users, Heart, Zap, Award, 
  GraduationCap, Coffee, Laptop, ArrowRight, ChevronDown, 
  CheckCircle, Send, Globe, Rocket, Target
} from "lucide-react";

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
}

const JOB_POSITIONS: JobPosition[] = [
  {
    id: "fullstack-dev",
    title: "Full Stack Developer",
    department: "Engineering",
    location: "Chennai, India",
    type: "Full-time",
    experience: "3-5 years",
    description: "We're looking for a talented Full Stack Developer with expertise in both frontend and backend technologies to build complete, end-to-end web applications.",
    requirements: [
      "3+ years of experience in full stack development",
      "Strong proficiency in React.js, Next.js, and TypeScript",
      "Experience with Node.js, Express, and RESTful APIs",
      "Knowledge of databases (PostgreSQL, MongoDB, MySQL)",
      "Understanding of cloud services (AWS, GCP, or Azure)",
      "Experience with Git, Docker, and CI/CD pipelines",
      "Familiarity with Agile development methodologies",
      "Strong problem-solving and communication skills"
    ],
    responsibilities: [
      "Design and develop complete web applications (frontend + backend)",
      "Build responsive, user-friendly interfaces with React",
      "Develop robust APIs and server-side applications",
      "Optimize applications for performance and scalability",
      "Collaborate with designers and product managers",
      "Write clean, maintainable, and well-documented code",
      "Participate in code reviews and mentor junior developers"
    ]
  },
  {
    id: "ui-ux-designer",
    title: "UI/UX Designer",
    department: "Design",
    location: "Chennai, India",
    type: "Full-time",
    experience: "2-5 years",
    description: "Join our design team to create stunning user interfaces and seamless user experiences for web and mobile applications.",
    requirements: [
      "2+ years of experience in UI/UX design",
      "Proficiency in Figma, Adobe XD, or Sketch",
      "Strong portfolio demonstrating web and mobile design work",
      "Understanding of user-centered design principles",
      "Experience with design systems and component libraries",
      "Knowledge of HTML/CSS is a plus"
    ],
    responsibilities: [
      "Create wireframes, prototypes, and high-fidelity mockups",
      "Conduct user research and usability testing",
      "Develop and maintain design systems",
      "Collaborate with developers to ensure design implementation",
      "Present design concepts to clients and stakeholders"
    ]
  },
  {
    id: "digital-marketing-exec",
    title: "Digital Marketing Executive",
    department: "Marketing",
    location: "Chennai, India",
    type: "Full-time",
    experience: "1-3 years",
    description: "We're seeking a dynamic Digital Marketing Executive to plan and execute marketing campaigns across various digital channels.",
    requirements: [
      "1+ years of experience in digital marketing",
      "Knowledge of SEO, SEM, and social media marketing",
      "Experience with Google Ads and Facebook Ads Manager",
      "Familiarity with analytics tools (Google Analytics, etc.)",
      "Strong written and verbal communication skills",
      "Creative thinking and problem-solving abilities"
    ],
    responsibilities: [
      "Plan and execute digital marketing campaigns",
      "Manage social media accounts and content calendar",
      "Analyze campaign performance and prepare reports",
      "Optimize campaigns for better ROI",
      "Stay updated with latest digital marketing trends"
    ]
  },
  {
    id: "content-writer",
    title: "Content Writer",
    department: "Content",
    location: "Remote / Chennai",
    type: "Full-time",
    experience: "1-3 years",
    description: "We need a creative Content Writer to produce engaging content for websites, blogs, social media, and marketing materials.",
    requirements: [
      "1+ years of content writing experience",
      "Excellent command of English (written and verbal)",
      "Experience with SEO-optimized content writing",
      "Ability to write for different industries and audiences",
      "Familiarity with content management systems",
      "Portfolio of published articles or writing samples"
    ],
    responsibilities: [
      "Write compelling website copy and landing pages",
      "Create blog posts and articles on various topics",
      "Develop content for social media campaigns",
      "Research industry topics and trends",
      "Edit and proofread content for quality"
    ]
  },
  {
    id: "sales-exec",
    title: "Business Development Executive",
    department: "Sales",
    location: "Chennai, India",
    type: "Full-time",
    experience: "2-4 years",
    description: "Join our sales team to drive business growth by identifying new opportunities and building client relationships.",
    requirements: [
      "2+ years of experience in B2B sales",
      "Knowledge of digital services and IT industry",
      "Excellent communication and negotiation skills",
      "Experience with CRM tools (HubSpot, Salesforce)",
      "Self-motivated with a proven track record",
      "Bachelor's degree in Business or related field"
    ],
    responsibilities: [
      "Identify and pursue new business opportunities",
      "Build and maintain client relationships",
      "Prepare and deliver sales presentations",
      "Negotiate contracts and close deals",
      "Achieve monthly and quarterly sales targets"
    ]
  }
];

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

function JobCard({ job, isExpanded, onToggle }: { job: JobPosition; isExpanded: boolean; onToggle: () => void }) {
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
              <Clock className="w-4 h-4" /> {job.type}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" /> {job.experience}
            </span>
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
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3">Requirements</h4>
              <ul className="space-y-2">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3">Responsibilities</h4>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    {resp}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <a
            href="mailto:careers@maanagaram.com?subject=Application for {job.title}"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all"
            data-testid={`button-apply-${job.id}`}
          >
            <Send className="w-4 h-4" /> Apply Now
          </a>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Careers() {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>("All");

  const departments = ["All", ...Array.from(new Set(JOB_POSITIONS.map(j => j.department)))];
  const filteredJobs = filterDepartment === "All" 
    ? JOB_POSITIONS 
    : JOB_POSITIONS.filter(j => j.department === filterDepartment);

  return (
    <div className="pt-24 pb-20">
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
            <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wider mb-3">WHY JOIN MHTSDIGIX</p>
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

          {/* Department Filter */}
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

          {/* Job Listings */}
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isExpanded={expandedJob === job.id}
                onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
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
              <a 
                href="mailto:careers@maanagaram.com?subject=General Application"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg"
                data-testid="button-send-resume"
              >
                <Send className="w-5 h-5" /> Send Your Resume
              </a>
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
    </div>
  );
}
