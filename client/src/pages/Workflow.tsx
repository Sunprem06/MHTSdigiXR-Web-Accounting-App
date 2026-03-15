import { motion } from "framer-motion";
import { MessageSquare, FileText, Code, CheckCircle, Rocket, LifeBuoy, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const STEPS = [
  {
    icon: MessageSquare,
    title: "1. Discovery",
    desc: "We discuss your ideas, requirements, and business goals to understand the scope of the project.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80",
    color: "from-sky-500 to-sky-600"
  },
  {
    icon: FileText,
    title: "2. Planning",
    desc: "We create a comprehensive roadmap, sitemap, and wireframes to outline the project structure.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
    color: "from-sky-500 to-sky-600"
  },
  {
    icon: Code,
    title: "3. Development",
    desc: "Our developers write clean, efficient code to bring the designs to life using modern technologies.",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80",
    color: "from-purple-500 to-purple-600"
  },
  {
    icon: CheckCircle,
    title: "4. Testing",
    desc: "Rigorous testing across devices and browsers to ensure a bug-free and smooth experience.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
    color: "from-orange-500 to-orange-600"
  },
  {
    icon: Rocket,
    title: "5. Launch",
    desc: "We deploy your project to the live environment and ensure everything is running perfectly.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80",
    color: "from-pink-500 to-pink-600"
  },
  {
    icon: LifeBuoy,
    title: "6. Support",
    desc: "Ongoing maintenance and support to keep your digital solution updated and secure.",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=80",
    color: "from-teal-500 to-teal-600"
  }
];

export default function Workflow() {
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
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Transparent Process
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">Our Workflow</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              A transparent, agile process designed to deliver exceptional results on time and within budget.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {STEPS.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={step.image} 
                    alt={step.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className={`absolute top-4 left-4 w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 dark:text-white">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Ready to Start Your Project?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Let's work together to bring your ideas to life. Contact us today to get started.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg" data-testid="button-start-project">
              Start Your Project <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
