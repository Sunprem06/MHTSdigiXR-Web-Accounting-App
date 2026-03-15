import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CaseStudy } from "@shared/schema";

const FALLBACK_PROJECTS = [
  {
    id: 1,
    title: "E-commerce Platform for Fashion Brand",
    client: "StyleVista",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
    category: "Web Development",
    description: "",
    results: ["150% Increase in Sales", "3x Faster Load Time"]
  },
  {
    id: 2,
    title: "Healthcare Appointment App",
    client: "MediCare Plus",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80",
    category: "Mobile App",
    description: "",
    results: ["50k+ Downloads", "4.8 Star Rating"]
  },
  {
    id: 3,
    title: "Corporate Rebranding",
    client: "TechFlow Inc",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80",
    category: "Branding",
    description: "",
    results: ["Modern Identity", "Unified Brand Voice"]
  },
  {
    id: 4,
    title: "SEO Campaign for Real Estate",
    client: "Urban Properties",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80",
    category: "Digital Marketing",
    description: "",
    results: ["#1 Ranking for Keywords", "200% More Leads"]
  }
];

export default function CaseStudies() {
  const { data: apiStudies = [] } = useQuery<CaseStudy[]>({ queryKey: ["/api/case-studies"] });

  const projects = apiStudies.length > 0
    ? apiStudies.map(s => ({
        id: s.id,
        title: s.title,
        client: s.client,
        image: s.image,
        category: s.category || "Web Development",
        description: s.description,
        results: (Array.isArray(s.results) ? s.results : []) as string[],
      }))
    : FALLBACK_PROJECTS;

  return (
    <div className="pt-24 pb-20">
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
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Our Portfolio
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">Case Studies</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Real results for real businesses. Explore how we've helped our clients achieve their goals.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all"
              data-testid={`card-case-study-${project.id}`}
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={project.image} 
                  alt={project.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {project.category}
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" data-testid={`text-case-title-${project.id}`}>{project.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Client: {project.client}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.results.map((result, i) => (
                    <span key={i} className="px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-sm font-medium rounded-lg">
                      {result}
                    </span>
                  ))}
                </div>

                <Link href="/contact" className="inline-flex items-center font-bold text-slate-900 dark:text-white group-hover:translate-x-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-all" data-testid={`link-view-case-${project.id}`}>
                  View Case Study <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
